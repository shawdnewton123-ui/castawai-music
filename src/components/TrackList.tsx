"use client";

import { useEffect, useMemo, useState } from "react";
import { usePlayer, type PlayerTrack } from "./player/PlayerProvider";

type Playlist = { id: string; title: string };

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TrackList({
  tracks,
  showRelease,
}: {
  tracks: PlayerTrack[];
  showRelease?: boolean;
}) {
  const { playTracks, current, playing } = usePlayer();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        if (!me?.user) return;
        fetch("/api/playlists")
          .then((r) => r.json())
          .then((d) => setPlaylists(d.playlists ?? []))
          .catch(() => {});
      })
      .catch(() => {});
  }, []);

  const ids = useMemo(() => tracks.map((t) => t.id).join(","), [tracks]);

  async function addToPlaylist(playlistId: string, playlistTitle: string, trackId: string) {
    await fetch(`/api/playlists/${playlistId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId }),
    });
    setMenuFor(null);
    setFlash(`Added to ${playlistTitle}`);
    setTimeout(() => setFlash(null), 2500);
  }

  async function createAndAdd(trackId: string) {
    if (!newTitle.trim()) return;
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    const { playlist } = await res.json();
    if (playlist) await addToPlaylist(playlist.id, playlist.title, trackId);
    setNewTitle("");
    setPlaylists((p) => (playlist ? [playlist, ...p] : p));
  }

  if (tracks.length === 0) {
    return (
      <p className="card p-6 text-sm text-[var(--color-muted)]">
        No tracks available yet. Check back soon.
      </p>
    );
  }

  return (
    <div className="relative">
      {flash && (
        <p role="status" className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm text-white" style={{ boxShadow: "var(--shadow-2)" }}>
          {flash}
        </p>
      )}
      <ol className="divide-y divide-[var(--color-border)]">
        {tracks.map((t, i) => {
          const isCurrent = current?.id === t.id;
          return (
            <li key={`${t.id}-${i}`} className="group flex items-center gap-3 py-2">
              <button
                onClick={() => playTracks(tracks, i)}
                aria-label={`Play ${t.title}`}
                className={`flex h-11 w-11 flex-none items-center justify-center rounded-[var(--radius-sm)] ${isCurrent ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]"} hover:bg-[var(--color-surface-2)]`}
              >
                {isCurrent && playing ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>
                ) : (
                  <>
                    <span className="text-xs tabular-nums group-hover:hidden">{i + 1}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="hidden group-hover:block"><path d="M8 5l12 7-12 7z" /></svg>
                  </>
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-semibold ${isCurrent ? "text-[var(--color-accent)]" : "text-[var(--color-heading)]"}`}>{t.title}</p>
                <p className="truncate text-xs text-[var(--color-muted)]">
                  {t.artistName}
                  {showRelease && <> · {t.releaseTitle}</>}
                </p>
              </div>
              <span className="hidden text-xs tabular-nums text-[var(--color-muted)] sm:block">{fmt(t.durationSec)}</span>
              <div className="relative">
                <button
                  onClick={() => setMenuFor(menuFor === t.id ? null : t.id)}
                  aria-label={`Add ${t.title} to playlist`}
                  aria-expanded={menuFor === t.id}
                  className="flex h-11 w-11 items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-heading)]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
                </button>
                {menuFor === t.id && (
                  <div className="absolute right-0 top-12 z-30 w-56 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-raised)] p-2" style={{ boxShadow: "var(--shadow-2)" }}>
                    <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Add to playlist</p>
                    {playlists.length === 0 && (
                      <p className="px-2 py-1 text-xs text-[var(--color-muted)]">No playlists yet — create one below.</p>
                    )}
                    {playlists.map((p) => (
                      <button key={p.id} onClick={() => addToPlaylist(p.id, p.title, t.id)} className="block w-full truncate rounded-[var(--radius-sm)] px-2 py-2 text-left text-sm hover:bg-[var(--color-surface-2)]">
                        {p.title}
                      </button>
                    ))}
                    <div className="mt-1 flex gap-1 border-t border-[var(--color-border)] pt-2">
                      <input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="New playlist name"
                        aria-label="New playlist name"
                        className="field !min-h-9 flex-1 text-xs"
                      />
                      <button onClick={() => createAndAdd(t.id)} className="btn btn-primary !min-h-9 !px-3 text-xs" disabled={!newTitle.trim()}>
                        Create
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
