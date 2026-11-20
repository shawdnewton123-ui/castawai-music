#!/usr/bin/env python3
"""CastAWAI playback-telemetry anomaly detection, correlation and remediation.

Real data path: reads the `plays` table from the app's Postgres database
(DATABASE_URL) — actual playback events recorded by the streaming API.

Pipeline:
  1. Replay plays from the DB into per-track hourly buckets.
  2. Detect anomalies with a robust z-score (median/MAD) of each bucket against
     the trailing baseline for that track. Explainable, no ML.
  3. Correlate alerts into incidents: alerts on the same track within the same
     window collapse into one incident (shared "affected track" topology).
  4. Remediation proposals are written to the audit log with dry-run as the
     default; `--approve` is required to mark anything executed.

Evaluation (`--eval`): replays the real event stream and injects LABELLED
incidents (spike + shift fixtures, marked `injected` — they exist only inside
this evaluation run, never written back to the DB or app) and reports
precision, recall and time-to-detect of the detector on that replay.

Usage:
  python3 scripts/detect-play-anomalies.py            # detect + audit report
  python3 scripts/detect-play-anomalies.py --eval     # replay evaluation
"""
import argparse
import json
import math
import os
import statistics
from collections import defaultdict
from datetime import datetime, timedelta, timezone

import psycopg2

REPORTS = os.path.join(os.path.dirname(__file__), "..", "reports")
AUDIT_LOG = os.path.join(REPORTS, "remediation-audit.jsonl")

# Detection sensitivity: |z| >= Z_THRESHOLD flags an alert.
Z_THRESHOLD = 3.5
# Correlation: alerts on the same track within this window = one incident.
CORRELATION_WINDOW = timedelta(hours=2)


def fetch_plays():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        with conn.cursor() as cur:
            cur.execute("select track_id, created_at from plays order by created_at")
            rows = cur.fetchall()
    finally:
        conn.close()
    return [(str(t), c) for t, c in rows]


def bucket(track_events, bucket_hours=1):
    per = defaultdict(int)
    for _, created in track_events:
        key = created.replace(minute=0, second=0, microsecond=0)
        per[key] += 1
    if not per:
        return {}
    start = min(per)
    end = max(per)
    series = {}
    t = start
    while t <= end:
        series[t] = per.get(t, 0)
        t += timedelta(hours=bucket_hours)
    return series


def robust_z(series, window=24):
    """Robust z-score of each point vs trailing baseline (median/MAD).

    For short histories (a young service has few buckets) the window adapts
    down to at least 4 buckets so detection still works from day one.
    """
    keys = sorted(series)
    values = [series[k] for k in keys]
    window = min(window, max(4, len(values) // 3))
    alerts = []
    for i in range(window, len(values)):
        base = values[i - window:i]
        med = statistics.median(base)
        mad = statistics.median([abs(b - med) for b in base]) or 1e-9
        z = 0.6745 * (values[i] - med) / (1.4826 * mad)
        if abs(z) >= Z_THRESHOLD:
            alerts.append({"track": None, "ts": keys[i], "count": values[i], "z": round(z, 2)})
    return alerts


def detect(events, tracks_of_interest=None):
    by_track = defaultdict(list)
    for tid, ts in events:
        by_track[tid].append((tid, ts))
    alerts = []
    for tid, tevents in by_track.items():
        if tracks_of_interest and tid not in tracks_of_interest:
            continue
        series = bucket(tevents)
        for a in robust_z(series):
            a["track"] = tid
            alerts.append(a)
    return sorted(alerts, key=lambda a: (a["ts"], a["track"]))


def correlate(alerts):
    """Group alerts on the same track within CORRELATION_WINDOW into incidents."""
    incidents = []
    for a in sorted(alerts, key=lambda a: a["ts"]):
        for inc in incidents:
            same = inc["track"] == a["track"]
            near = a["ts"] - inc["last_ts"] <= CORRELATION_WINDOW
            if same and near:
                inc["alerts"].append(a)
                inc["last_ts"] = a["ts"]
                break
        else:
            incidents.append({
                "id": f"INC-{len(incidents) + 1:03d}",
                "track": a["track"],
                "first_ts": a["ts"],
                "last_ts": a["ts"],
                "alerts": [a],
            })
    for inc in incidents:
        peak = max(inc["alerts"], key=lambda a: abs(a["z"]))
        inc["probable_cause"] = (
            "playback spike (possible bot/replay loop or viral share)"
            if peak["z"] > 0
            else "playback drop (player or stream endpoint regression)"
        )
        inc["peak_z"] = peak["z"]
    return incidents


def propose_remediation(incidents, approved=False):
    """Every action is logged; destructive/none are approval-gated. Dry run default."""
    os.makedirs(REPORTS, exist_ok=True)
    entries = []
    for inc in incidents:
        action = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "incident": inc["id"],
            "track": inc["track"],
            "action": "flag_track_streams_for_review",
            "mode": "executed" if approved else "dry-run",
            "approval": "operator-approved" if approved else "pending (dry run)",
            "blast_radius": "single track play-count review flag; reversible",
        }
        entries.append(action)
    with open(AUDIT_LOG, "a") as f:
        for e in entries:
            f.write(json.dumps(e) + "\n")
    return entries


def load_labels_eval(events):
    """Replay the real event stream and inject LABELLED test incidents.

    The injected spikes are evaluation fixtures only (labeled `injected`);
    they never touch the database. Ground truth = injected incident windows.
    """
    by_track = defaultdict(list)
    for tid, ts in events:
        by_track[tid].append(ts)
    labelled = []  # (track, incident_start_hour, incident_end_hour, kind)
    replay = list(events)
    for tid, times in list(by_track.items()):
        if not times:
            continue
        base = min(times)
        # Fixture 1: spike — 40 plays in one hour (bot loop pattern).
        spike_t = base + timedelta(hours=5)
        replay += [(tid, spike_t + timedelta(seconds=i % 3600)) for i in range(40)]
        labelled.append((tid, spike_t.replace(minute=0, second=0, microsecond=0),
                         spike_t.replace(minute=0, second=0, microsecond=0), "spike"))
        # Fixture 2: shift — sustained elevated rate over 3 hours (viral share).
        shift_t = base + timedelta(hours=10)
        replay += [(tid, shift_t + timedelta(minutes=(i * 7) % 180)) for i in range(90)]
        labelled.append((tid, shift_t.replace(minute=0, second=0, microsecond=0),
                         shift_t.replace(minute=0, second=0, microsecond=0)
                         + timedelta(hours=2), "shift"))
    return replay, labelled


def evaluate(events, labelled):
    replay, _ = load_labels_eval(events)
    alerts = detect(replay)
    incidents = correlate(alerts)
    detected = []
    for tid, start, end, kind in labelled:
        match = [i for i in incidents
                 if i["track"] == tid and start <= i["first_ts"] <= end + timedelta(hours=1)]
        detected.append(bool(match))
    tp = sum(detected)
    fp_incidents = [
        i for i in incidents
        if not any(tid == i["track"] and start <= i["first_ts"] <= end + timedelta(hours=1)
                   for tid, start, end, _ in labelled)
    ]
    ttds = []
    for (tid, start, end, _), hit in zip(labelled, detected):
        if hit:
            inc = next(i for i in incidents if i["track"] == tid and start <= i["first_ts"] <= end + timedelta(hours=1))
            ttds.append((inc["first_ts"] - start).total_seconds())
    return {
        "replayed_real_events": len(events),
        "injected_incidents": len(labelled),
        "true_positives": tp,
        "false_negatives": len(labelled) - tp,
        "precision": round(tp / (tp + len(fp_incidents)), 3) if tp + len(fp_incidents) else None,
        "recall": round(tp / len(labelled), 3) if labelled else None,
        "time_to_detect_seconds": [round(t, 1) for t in ttds],
        "false_positive_incidents": [
            {"track": i["track"], "first_ts": i["first_ts"].isoformat(), "peak_z": i["peak_z"]}
            for i in fp_incidents
        ],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--eval", action="store_true")
    ap.add_argument("--approve", action="store_true",
                    help="mark proposed remediations as executed (default: dry run)")
    args = ap.parse_args()

    events = fetch_plays()
    print(f"Replayed {len(events)} real play events from the plays table.")
    os.makedirs(REPORTS, exist_ok=True)

    if args.eval:
        _, labelled = load_labels_eval(events)
        result = evaluate(events, labelled)
        with open(os.path.join(REPORTS, "detection-eval.json"), "w") as f:
            json.dump(result, f, indent=2, default=str)
        print(json.dumps(result, indent=2, default=str))
        return

    alerts = detect(events)
    incidents = correlate(alerts)
    actions = propose_remediation(incidents, approved=args.approve)
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "events_replayed": len(events),
        "alerts": [{**a, "ts": a["ts"].isoformat()} for a in alerts],
        "incidents": [
            {**i, "first_ts": i["first_ts"].isoformat(), "last_ts": i["last_ts"].isoformat(),
             "alerts": [{**a, "ts": a["ts"].isoformat()} for a in i["alerts"]]}
            for i in incidents
        ],
        "remediation_actions": actions,
    }
    path = os.path.join(REPORTS, "detection-report.json")
    with open(path, "w") as f:
        json.dump(report, f, indent=2, default=str)
    print(f"Alerts: {len(alerts)}  Incidents: {len(incidents)}  "
          f"Remediation actions: {len(actions)} (mode: {'executed' if args.approve else 'dry-run'})")
    print(f"Report: {path}")


if __name__ == "__main__":
    main()
