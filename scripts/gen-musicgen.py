#!/usr/bin/env python3
"""Generate real neural music for the seeded tracks with Meta MusicGen (CPU).

Each track gets a text prompt built from its title and genre so the arrangement
matches the song. Slower than realtime on CPU but runs unattended.

Usage:
  python3 scripts/gen-musicgen.py --one "Chrome Skyline" Electronic out.mp3
  python3 scripts/gen-musicgen.py --all
"""
import argparse
import hashlib
import os
import time
import subprocess

import scipy.io.wavfile as wavfile
import torch
from transformers import MusicgenForConditionalGeneration, AutoProcessor

SR = 44100
TARGET_SECONDS = 30

SEED_MAP = {
    "public/demo-audio/demo-437-30.mp3": ("Chrome Skyline", "Electronic"),
    "public/demo-audio/demo-467-30.mp3": ("Neon Cathedral", "Electronic"),
    "public/demo-audio/demo-497-30.mp3": ("Afterglow Drive", "Electronic"),
    "public/demo-audio/demo-527-30.mp3": ("Static Bloom", "Electronic"),
    "public/demo-audio/demo-484-30.mp3": ("Glass Harbor", "Pop"),
    "public/demo-audio/demo-257-30.mp3": ("Sunday Light", "Gospel"),
    "public/demo-audio/demo-287-30.mp3": ("Riverwide", "Gospel"),
    "public/demo-audio/demo-317-30.mp3": ("Morning Man", "Gospel"),
    "public/demo-audio/demo-347-30.mp3": ("Analog Heart", "Hip-Hop"),
    "public/demo-audio/demo-377-30.mp3": ("Bitrate Blues", "Hip-Hop"),
    "public/demo-audio/demo-394-30.mp3": ("Velvet Hours", "R&B"),
}

PROMPTS = {
    "Electronic": (
        "melodic techno / synthwave instrumental, four-on-the-floor kick, warm analog "
        "supersaw chords, driving bassline, sparkling arpeggio lead, polished club production"
    ),
    "Pop": (
        "bright indie pop instrumental, acoustic and electric guitars, catchy lead melody, "
        "punchy drums, warm bass, uplifting radio-ready production"
    ),
    "Gospel": (
        "uplifting gospel instrumental, church organ, rich piano chords, handclaps and soft "
        "drums, soulful choir-style pad swells, hopeful and warm"
    ),
    "Hip-Hop": (
        "boom-bap hip-hop instrumental, dusty vinyl drums, jazzy piano loop, deep sub bass, "
        "mellow melodic hooks, warm and head-nodding"
    ),
    "R&B": (
        "smooth late-night R&B neo-soul instrumental, Rhodes electric piano chords, silky "
        "bassline, laid-back drums, mellow melodic lead, intimate mood"
    ),
}


def model_and_processor():
    torch.set_num_threads(os.cpu_count() or 8)
    model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small")
    processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
    model.eval()
    return model, processor


def generate(model, processor, prompt: str, seconds: int = TARGET_SECONDS):
    inputs = processor(text=[prompt], padding=True, return_tensors="pt")
    tokens_per_second = model.config.audio_encoder.frame_rate  # ~50
    out_sr = model.config.audio_encoder.sampling_rate
    # Deterministic per prompt: same text always yields the same song.
    torch.manual_seed(int(hashlib.sha256(prompt.encode()).hexdigest()[:8], 16))
    with torch.no_grad():
        audio = model.generate(
            **inputs,
            max_new_tokens=int(tokens_per_second * seconds),
            do_sample=True,
            guidance_scale=3.0,
        )
    wav = audio[0, 0].numpy()
    return wav, out_sr


def build_prompt(title: str, genre: str) -> str:
    if genre not in PROMPTS:
        raise ValueError(f"unknown genre '{genre}': choose from {', '.join(sorted(PROMPTS))}")
    return f"{PROMPTS[genre]}. Song mood evokes: {title}."


def to_mp3(wav, model_sr: int, out_path: str):
    pcm = (torch.clip(torch.from_numpy(wav), -1.0, 1.0) * 32767).to(torch.int16).numpy()
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(model_sr),
         "-ac", "1", "-i", "-",
         "-codec:a", "libmp3lame", "-b:a", "160k", "-ar", str(SR), out_path],
        input=pcm.tobytes(), check=True,
    )


def main():
    ap = argparse.ArgumentParser(
        description="Generate MusicGen audio for the CastAWAI seed catalog (or one custom track).",
        epilog=(
            "examples:\n"
            "  %(prog)s --all\n"
            "  %(prog)s --one 'Chrome Skyline' Electronic out.mp3\n"
            "  %(prog)s --all --dry-run\n"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument("--one", nargs=3, metavar=("TITLE", "GENRE", "OUT"),
                    help="generate one track to a given output path")
    ap.add_argument("--all", action="store_true",
                    help="generate every seed-catalog track at its DB-mapped path")
    ap.add_argument("--dry-run", action="store_true",
                    help="print what would be generated without loading the model or writing files")
    args = ap.parse_args()

    jobs = []
    if args.one:
        jobs.append((args.one[2], (args.one[0], args.one[1])))
    if args.all:
        jobs = list(SEED_MAP.items())

    if not jobs:
        ap.error("use --one or --all")

    for out_path, (title, genre) in jobs:
        try:
            print(f"{out_path}  ({title}, {genre})  prompt: {build_prompt(title, genre)!r}")
        except ValueError as exc:
            ap.error(str(exc))
    if args.dry_run:
        print(f"dry run: {len(jobs)} track(s), nothing written", flush=True)
        return

    model, processor = model_and_processor()
    for out_path, (title, genre) in jobs:
        prompt = build_prompt(title, genre)
        t0 = time.time()
        wav, out_sr = generate(model, processor, prompt)
        to_mp3(wav, out_sr, out_path)
        print(f"{out_path}  ({title}, {genre})  {time.time()-t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()
