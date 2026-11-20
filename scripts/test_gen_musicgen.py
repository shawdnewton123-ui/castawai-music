#!/usr/bin/env python3
"""Contract tests for scripts/gen-musicgen.py.

Runs the real CLI as a subprocess. Deliberately never loads the MusicGen
model: every path under test (help, usage errors, dry-run, prompt building)
must exit before model_and_processor() is called.
"""

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

SCRIPT = Path(__file__).parent / "gen-musicgen.py"


def run_cli(*argv, env=None):
    full_env = dict(os.environ)
    if env:
        full_env.update(env)
    return subprocess.run(
        [sys.executable, str(SCRIPT), *argv],
        capture_output=True, text=True, env=full_env, timeout=60,
    )


def test_help_exits_zero_and_shows_examples():
    result = run_cli("--help")
    assert result.returncode == 0
    assert "examples:" in result.stdout
    assert "--one" in result.stdout and "--all" in result.stdout and "--dry-run" in result.stdout


def test_no_args_is_a_usage_error_exit_2():
    result = run_cli()
    assert result.returncode == 2
    assert "--one or --all" in result.stderr


def test_unknown_genre_is_a_usage_error_exit_2():
    result = run_cli("--one", "Test Title", "Jazz-Fusion-Techno", "/tmp/x.mp3")
    assert result.returncode == 2
    assert "unknown genre" in result.stderr


def test_dry_run_lists_outputs_and_writes_nothing(tmp_path):
    out = tmp_path / "never-written.mp3"
    result = run_cli("--one", "Chrome Skyline", "Electronic", str(out), "--dry-run")
    assert result.returncode == 0
    assert "dry run: 1 track(s), nothing written" in result.stdout
    assert "Chrome Skyline" in result.stdout and "Electronic" in result.stdout
    assert not out.exists()


def test_dry_run_all_lists_every_seed_track():
    result = run_cli("--all", "--dry-run")
    assert result.returncode == 0
    # The public/demo-audio/demo-NNN-30.mp3 paths are the exact paths the DB streams.
    paths = [line.split()[0] for line in result.stdout.splitlines() if line.startswith("public/")]
    assert len(paths) == 11
    assert all(p.startswith("public/demo-audio/demo-") and p.endswith("-30.mp3") for p in paths)
    assert len(set(paths)) == 11


def test_build_prompt_is_deterministic_and_title_dependent():
    import importlib.util
    spec = importlib.util.spec_from_file_location("gen_musicgen", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    a = module.build_prompt("Chrome Skyline", "Electronic")
    b = module.build_prompt("Chrome Skyline", "Electronic")
    c = module.build_prompt("Sunday Light", "Electronic")
    assert a == b, "same title+genre must give the same prompt (determinism)"
    assert a != c, "different titles must give different prompts"


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
