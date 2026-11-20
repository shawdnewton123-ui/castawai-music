"use client";

import Link from "next/link";
import { useState } from "react";
import { usePlayer, type PlayerTrack } from "./player/PlayerProvider";

export type ReleaseCardData = {
  id: string;
  title: string;
  slug: string;
  type: string;
  creativeMethod: "human" | "ai_assisted" | "ai_generated";
  genre: string;
  releaseDate: string;
  coverUrl: string | null;
  explicit: boolean;
  artistName: string;
  artistSlug: string;
};

const methodLabel = {
  human: "Human",
  ai_assisted: "AI-assisted",
  ai_generated: "AI-generated",
} as const;

export function MethodBadge({ method }: { method: ReleaseCardData["creativeMethod"] }) {
  return <span className={`badge badge-${method}`}>{methodLabel[method]}</span>;
}

export function ReleaseCard({ release }: { release: ReleaseCardData }) {
  const { playTracks } = usePlayer();
  const [busy, setBusy] = useState(false);

  async function playRelease() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tracks?release=${release.slug}`);
      const data = await res.json();
      if (data.tracks?.length) playTracks(data.tracks as PlayerTrack[], 0);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="group w-40 flex-none sm:w-48">
      <div className="relative overflow-hidden rounded-[var(--radius-lg)]" style={{ boxShadow: "var(--shadow-1)" }}>
        <Link href={`/releases/${release.slug}`} aria-label={`${release.title} by ${release.artistName}`}>
          {release.coverUrl ? (
            <img
              src={release.coverUrl}
              alt={`${release.title} album artwork`}
              width={400}
              height={400}
              className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="aspect-square w-full bg-[var(--color-surface-2)]" />
          )}
        </Link>
        <button
          onClick={playRelease}
          disabled={busy}
          aria-label={`Play ${release.title}`}
          className="absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-accent)] text-white opacity-0 shadow-lg transition-opacity duration-200 hover:bg-[#4a8cff] focus-visible:opacity-100 group-hover:opacity-100"
        >
          {busy ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5l12 7-12 7z" /></svg>
          )}
        </button>
      </div>
      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/releases/${release.slug}`} className="block truncate text-sm font-semibold text-[var(--color-heading)] hover:underline">
            {release.title}
          </Link>
          <Link href={`/artists/${release.artistSlug}`} className="block truncate text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]">
            {release.artistName}
          </Link>
        </div>
        {release.explicit && (
          <span className="mt-0.5 flex-none rounded-sm border border-[var(--color-border)] px-1 text-[10px] font-bold text-[var(--color-muted)]" title="Explicit content">E</span>
        )}
      </div>
      <div className="mt-1.5">
        <MethodBadge method={release.creativeMethod} />
      </div>
    </article>
  );
}

export function ReleaseRail({ title, releases, note }: { title: string; releases: ReleaseCardData[]; note?: string }) {
  if (releases.length === 0) return null;
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-bold sm:text-2xl">{title}</h2>
        {note && <p className="text-xs text-[var(--color-muted)]">{note}</p>}
      </div>
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" role="list">
        {releases.map((r) => (
          <div role="listitem" key={r.id}>
            <ReleaseCard release={r} />
          </div>
        ))}
      </div>
    </section>
  );
}
