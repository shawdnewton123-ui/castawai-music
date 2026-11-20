#!/usr/bin/env python3
"""Generate arranged demo songs (drums, bass, chords, lead) per title/genre.

Deterministic: the same title always produces the same song. Output is MP3 via
ffmpeg. This is still demo audio, not licensed music -- but it is real
multi-part arrangement, not sine tones.

Usage:
  python3 scripts/gen-music.py --title "Chrome Skyline" --genre Electronic --out public/demo-audio/x.mp3
  python3 scripts/gen-music.py --all            # regenerate the 11 seeded files in place
"""
import argparse
import hashlib
import math
import os
import subprocess
import sys

import numpy as np

SR = 44100

SCALES = {
    "minor": [0, 2, 3, 5, 7, 8, 10],
    "major": [0, 2, 4, 5, 7, 9, 11],
    "dorian": [0, 2, 3, 5, 7, 9, 10],
}

# Style per genre: bpm, scale, chord progressions (scale degrees, 0-based),
# swing, and instrument choices.
STYLES = {
    "Electronic": dict(bpm=122, scale="minor", progs=[[0, 5, 3, 4], [0, 3, 5, 4]], pad="supersaw", lead="saw", drums="four"),
    "Pop": dict(bpm=102, scale="major", progs=[[0, 4, 5, 3], [5, 3, 0, 4]], pad="piano", lead="square", drums="pop"),
    "Gospel": dict(bpm=74, scale="major", progs=[[0, 3, 4, 0], [0, 5, 3, 4]], pad="organ", lead="choir", drums="soft"),
    "Hip-Hop": dict(bpm=88, scale="minor", progs=[[0, 5, 3, 3], [0, 2, 5, 4]], pad="piano", lead="bell", drums="boombap"),
    "R&B": dict(bpm=76, scale="dorian", progs=[[0, 3, 4, 5], [0, 5, 2, 4]], pad="rhodes", lead="vibrato", drums="slow"),
}

# Existing seed files: audio_path -> (title, genre)
SEED_MAP = {
    "demo-audio/demo-437-30.mp3": ("Chrome Skyline", "Electronic"),
    "demo-audio/demo-467-30.mp3": ("Neon Cathedral", "Electronic"),
    "demo-audio/demo-497-30.mp3": ("Afterglow Drive", "Electronic"),
    "demo-audio/demo-527-30.mp3": ("Static Bloom", "Electronic"),
    "demo-audio/demo-484-30.mp3": ("Glass Harbor", "Pop"),
    "demo-audio/demo-257-30.mp3": ("Sunday Light", "Gospel"),
    "demo-audio/demo-287-30.mp3": ("Riverwide", "Gospel"),
    "demo-audio/demo-317-30.mp3": ("Morning Man", "Gospel"),
    "demo-audio/demo-347-30.mp3": ("Analog Heart", "Hip-Hop"),
    "demo-audio/demo-377-30.mp3": ("Bitrate Blues", "Hip-Hop"),
    "demo-audio/demo-394-30.mp3": ("Velvet Hours", "R&B"),
}


def rng_from(text):
    seed = int(hashlib.sha256(text.encode()).hexdigest()[:8], 16)
    return np.random.default_rng(seed)


def note_freq(degree, root=220.0, scale=SCALES["minor"]):
    octaves = degree // len(scale)
    idx = degree % len(scale)
    semis = scale[idx] + 12 * octaves
    return root * 2 ** (semis / 12)


def env(n, attack, release, sustain=1.0):
    e = np.full(n, sustain)
    a = int(attack * SR)
    r = int(release * SR)
    if a > 0:
        e[:a] *= np.linspace(0, 1, a)
    if r > 0:
        e[-r:] *= np.linspace(1, 0, r)
    return e


def add(buf, start, sig):
    i = int(start * SR)
    j = min(i + len(sig), len(buf))
    if i < len(buf):
        buf[i:j] += sig[: j - i]


def synth_tone(freq, dur, kind, vol=0.2, detune=0.0, vibrato=0.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * (1 + detune)
    phase = 2 * np.pi * f * t
    if vibrato > 0:
        phase += vibrato * np.sin(2 * np.pi * 5.5 * t) * 2
    if kind == "saw" or kind == "supersaw":
        sig = np.sign(np.sin(phase))
        if kind == "supersaw":
            for d in (-0.01, 0.01, 0.02):
                sig += np.sign(np.sin(2 * np.pi * f * (1 + d) * t))
            sig /= 2.5
    elif kind == "square":
        sig = np.sign(np.sin(phase)) * 0.7
    elif kind == "bell":
        sig = np.sin(phase) * 0.6 + np.sin(2 * np.pi * f * 2.76 * t) * 0.25
    elif kind == "choir":
        sig = np.zeros(n)
        for d in (0.004, 0.0, -0.006):
            sig += np.sin(2 * np.pi * f * (1 + d) * t + np.sin(2 * np.pi * f * (1 + d) * t) * 1.5)
        sig /= 2.2
    elif kind == "rhodes":
        sig = np.sin(phase) * 0.6 + np.sin(2 * np.pi * f * 2 * t) * 0.2 * np.exp(-3 * t)
    else:  # organ
        sig = np.sin(phase) + np.sin(2 * phase) * 0.5 + np.sin(3 * phase) * 0.3
        sig /= 1.8
    return sig * vol


def kick(dur=0.28):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 110 * np.exp(-t * 22) + 42
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12) * 0.9


def snare():
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    return (rng_from("sn").uniform(-1, 1, n) * 0.7 + np.sin(2 * np.pi * 190 * t) * 0.4) * np.exp(-t * 18) * 0.55


def hat(open_=False):
    dur = 0.18 if open_ else 0.05
    n = int(dur * SR)
    noise = rng_from(f"hat{open_}").uniform(-1, 1, n)
    hp = noise - np.convolve(noise, np.ones(8) / 8, "same")
    return hp * np.exp(-np.arange(n) / SR * (18 if open_ else 55)) * 0.25


def drum_bar(buf, start, style, beat=60 / 122):
    one = start
    for b in range(4):
        t = one + b * beat
        if style == "four":
            add(buf, t, kick())
            add(buf, t + beat / 2, hat(open_=(b == 3)))
            add(buf, t + beat / 4, hat())
            add(buf, t + 3 * beat / 4, hat())
            if b == 1 or b == 3:
                add(buf, t, snare() * 0.7)
        elif style == "boombap":
            add(buf, t, kick() if b in (0, 2) else kick() * 0.7)
            add(buf, t, snare() if b in (1, 3) else np.zeros(1))
            add(buf, t + beat / 2, hat())
            add(buf, t + beat / 4, hat() * 0.6)
        elif style == "pop" or style == "slow":
            add(buf, t, kick() if b in (0, 2) else np.zeros(1))
            add(buf, t, snare() * 0.8 if b in (1, 3) else np.zeros(1))
            add(buf, t + beat / 2, hat() * (1.2 if style == "pop" else 0.7))
        elif style == "soft":
            if b in (0, 2):
                add(buf, t, kick() * 0.45)
            add(buf, t + beat / 2, hat() * 0.8)


def chord_freqs(deg, scale, root):
    return [note_freq(deg + d, root, scale) for d in (0, 2, 4, 6)]


def make_song(*args, title=None, genre=None, seconds=30):
    # Accepts both make_song(title, genre, seconds) and
    # make_song(genre, title=..., seconds=...); a lone positional next to a
    # keyword title is the genre.
    if len(args) == 2:
        title, genre = args
    elif len(args) == 3:
        title, genre, seconds = args
    elif len(args) == 1:
        if title is None:
            title = args[0]
        else:
            genre = args[0]
    elif len(args) > 3:
        raise TypeError("make_song takes at most title, genre and seconds positionally")
    if not title or not genre:
        raise TypeError("make_song needs a title and genre")
    rng = rng_from(title)
    style = STYLES[genre]
    scale = SCALES[style["scale"]]
    beat = 60 / style["bpm"]
    bar_len = beat * 4
    n_bars = int(math.ceil(seconds / bar_len))
    prog = style["progs"][rng.integers(len(style["progs"]))]
    total = int(seconds * SR)
    mix = np.zeros(total)

    chord_root = 110.0  # A2-ish
    lead_root = 220.0
    for bar in range(n_bars):
        t0 = bar * bar_len
        deg = prog[bar % len(prog)]
        # Chords / pad
        freqs = chord_freqs(deg, scale, chord_root)
        pad_kind = style["pad"]
        pad_dur = bar_len * (0.98 if genre != "Hip-Hop" else 0.9)
        for fi, f in enumerate(freqs):
            sig = synth_tone(f, pad_dur, pad_kind, vol=0.055)
            attack = 0.4 if genre in ("Gospel", "R&B") else 0.03
            add(mix, t0, sig * env(len(sig), attack, 0.3))
        # Bass
        if genre == "Hip-Hop":
            bass_f = note_freq(deg - 7, chord_root, scale) / 2
            pattern = [0, 0.5, 1.5, 2, 3, 3.5]
            for p in pattern:
                add(mix, t0 + p * beat, synth_tone(bass_f, beat * 0.45, "rhodes", vol=0.22))
        else:
            bass_f = note_freq(deg - 7, chord_root, scale) / 2
            for p in (0, 1.5, 2.5):
                add(mix, t0 + p * beat, synth_tone(bass_f, beat * 1.2, "rhodes", vol=0.2))
        # Drums
        drum_bar(mix, t0, style["drums"], beat)
        # Lead melody (singing-style phrasing: notes on beats with rests)
        if bar % 2 == 0:
            steps = [0, 0.5, 1.0, 2.0, 2.5, 3.5]
            for si, p in enumerate(steps):
                if rng.random() < 0.25:
                    continue  # breathe
                d = deg + int(rng.choice([0, 1, 2, 4, 5])) + (7 if rng.random() < 0.2 else 0)
                lf = note_freq(d, lead_root, scale)
                dur = beat * (1.0 if si % 3 == 0 else 0.5)
                kind = style["lead"]
                vib = 1.2 if kind == "vibrato" else (0.8 if kind == "choir" else 0.0)
                sig = synth_tone(lf, dur, kind, vol=0.16, vibrato=vib)
                add(mix, t0 + p * beat, sig * env(len(sig), 0.02, min(0.15, dur / 3)))

    # Limiter + normalize
    mix = np.tanh(mix * 1.4) * 0.85
    peak = np.max(np.abs(mix)) or 1.0
    mix = mix / peak * 0.9
    fade = int(0.15 * SR)
    mix[:fade] *= np.linspace(0, 1, fade)
    mix[-fade:] *= np.linspace(1, 0, fade)
    return (mix * 32767).astype(np.int16), SR


def render(title, genre, out, seconds=30):
    audio, sr = make_song(title, genre, seconds)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    cmd = ["ffmpeg", "-y", "-loglevel", "error",
           "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-",
           "-b:a", "160k", out]
    subprocess.run(cmd, input=audio.tobytes(), check=True)
    print(f"  {out}  <-  {title} ({genre})")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--title")
    ap.add_argument("--genre")
    ap.add_argument("--out")
    ap.add_argument("--seconds", type=int, default=30)
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()
    if args.all:
        print("Regenerating seeded demo audio in place:")
        for rel, (title, genre) in sorted(SEED_MAP.items()):
            render(title, genre, os.path.join("public", rel), args.seconds)
    elif args.title and args.genre and args.out:
        render(args.title, args.genre, args.out, args.seconds)
    else:
        print(__doc__)
        sys.exit(2)


if __name__ == "__main__":
    main()
