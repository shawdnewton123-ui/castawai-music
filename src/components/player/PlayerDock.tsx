"use client";

import Link from "next/link";
import { usePlayer } from "./PlayerProvider";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const iconProps = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true };

export function PlayerDock() {
  const { current, playing, progressSec, volume, shuffle, repeat, toggle, next, prev, setVolume, toggleShuffle, cycleRepeat } =
    usePlayer();
  if (!current) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-bg-raised)]/95 backdrop-blur"
      style={{ boxShadow: "var(--shadow-2)" }}
    >
      <div
        className="h-0.5 w-full bg-[var(--color-surface-2)]"
        role="progressbar"
        aria-label="Playback progress"
        aria-valuenow={Math.min(100, Math.round((progressSec / Math.max(1, current.durationSec)) * 100))}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-[var(--color-accent)] transition-[width] duration-300"
          style={{ width: `${Math.min(100, (progressSec / Math.max(1, current.durationSec)) * 100)}%` }}
        />
      </div>
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 sm:gap-4 sm:px-6">
        <Link
          href={`/releases/${current.releaseSlug}`}
          className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-90"
        >
          {current.coverUrl ? (
            <img src={current.coverUrl} alt="" width={44} height={44} className="h-11 w-11 flex-none rounded-[var(--radius-sm)] object-cover" />
          ) : (
            <div className="h-11 w-11 flex-none rounded-[var(--radius-sm)] bg-[var(--color-surface-2)]" />
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-[var(--color-heading)]">{current.title}</span>
            <span className="block truncate text-xs text-[var(--color-muted)]">
              {current.artistName} · {fmt(progressSec)} / {fmt(current.durationSec)}
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={toggleShuffle}
            aria-pressed={shuffle}
            aria-label={`Shuffle ${shuffle ? "on" : "off"}`}
            className={`hidden h-10 w-10 items-center justify-center rounded-full sm:flex ${shuffle ? "text-[var(--color-accent)]" : "text-[var(--color-muted)] hover:text-[var(--color-heading)]"}`}
          >
            <svg {...iconProps}>
              <path d="M17 3l4 4-4 4V8h-2.6l-2.2 3-1.8-2.4L12.9 6H17V3zM3 6h4.1l7.6 10.9H17V14l4 4-4 4v-3h-3.4L6 8H3V6zm0 12h3l1.9-2.7 1.8 2.4L7.1 20H3v-2z" />
            </svg>
          </button>
          <button onClick={prev} aria-label="Previous track" className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-heading)] hover:bg-[var(--color-surface-2)]">
            <svg {...iconProps}><path d="M6 5h2.5v14H6zM20 5v14L9.5 12z" /></svg>
          </button>
          <button
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)] text-white hover:bg-[#4a8cff]"
          >
            {playing ? (
              <svg {...iconProps}><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>
            ) : (
              <svg {...iconProps}><path d="M8 5l12 7-12 7z" /></svg>
            )}
          </button>
          <button onClick={next} aria-label="Next track" className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-heading)] hover:bg-[var(--color-surface-2)]">
            <svg {...iconProps}><path d="M15.5 5H18v14h-2.5zM4 5l10.5 7L4 19z" /></svg>
          </button>
          <button
            onClick={cycleRepeat}
            aria-pressed={repeat !== "off"}
            aria-label={`Repeat mode: ${repeat}`}
            className={`relative hidden h-10 w-10 items-center justify-center rounded-full sm:flex ${repeat !== "off" ? "text-[var(--color-accent)]" : "text-[var(--color-muted)] hover:text-[var(--color-heading)]"}`}
          >
            <svg {...iconProps}><path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" /></svg>
            {repeat === "one" && (
              <span className="absolute -bottom-0.5 text-[9px] font-bold">1</span>
            )}
          </button>
        </div>

        <label className="hidden items-center gap-2 md:flex">
          <span className="sr-only">Volume</span>
          <svg {...iconProps} className="text-[var(--color-muted)]"><path d="M4 9h3l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7l-1.2-1.2a3.3 3.3 0 0 0 0-4.6z" /></svg>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-24 accent-[var(--color-accent)]"
          />
        </label>
      </div>
    </div>
  );
}
