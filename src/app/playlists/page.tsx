"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { usePlayer, type PlayerTrack } from "@/components/player/PlayerProvider";

type Playlist = { id: string; title: string; description: string | null };
type PlTrack = PlayerTrack & { trackId: string };

export default function PlaylistsPage() {
  const { user } = useSession();
  const { playTracks } = usePlayer();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openTracks, setOpenTracks] = useState<PlTrack[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetch("/api/playlists")
      .then((r) => r.json())
      .then((d) => setPlaylists(d.playlists ?? []))
      .catch(() => setError("Could not load playlists."))
      .finally(() => setLoading(false));
  }, [user]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not create the playlist.");
      return;
    }
    setPlaylists((p) => [data.playlist, ...p]);
    setTitle("");
  }

  async function open(id: string) {
    setOpenId(id);
    const res = await fetch(`/api/playlists/${id}`);
    const data = await res.json();
    setOpenTracks(
      (data.tracks ?? []).map((t: Omit<PlTrack, "id"> & { trackId: string }) => ({
        ...t,
        id: t.trackId,
      }))
    );
  }

  async function removeTrack(trackId: string) {
    if (!openId) return;
    await fetch(`/api/playlists/${openId}?trackId=${trackId}`, { method: "DELETE" });
    setOpenTracks((ts) => ts.filter((t) => t.trackId !== trackId));
  }

  async function deletePlaylist(id: string) {
    await fetch(`/api/playlists/${id}`, { method: "DELETE" });
    setPlaylists((p) => p.filter((pl) => pl.id !== id));
    if (openId === id) {
      setOpenId(null);
      setOpenTracks([]);
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-3xl font-bold">Your playlists</h1>
        <p className="mt-3 text-[var(--color-muted)]">Log in to build and manage playlists.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/login" className="btn btn-ghost">Log in</Link>
          <Link href="/register" className="btn btn-primary">Sign up free</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-10 sm:px-6">
      <p className="eyebrow">Your library</p>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Playlists</h1>

      <form onSubmit={create} className="mt-6 flex gap-2">
        <label htmlFor="pl-title" className="sr-only">New playlist name</label>
        <input
          id="pl-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New playlist name"
          className="field"
          maxLength={100}
          required
        />
        <button type="submit" className="btn btn-primary flex-none" disabled={!title.trim()}>Create</button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}

      {loading ? (
        <div className="mt-8 space-y-2" aria-label="Loading playlists">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface)]" />
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <p className="card mt-8 p-8 text-center text-sm text-[var(--color-muted)]">
          No playlists yet. Find a song you love in <Link href="/browse" className="text-[var(--color-accent)] hover:underline">Browse</Link> and use the ＋ button to start your first playlist.
        </p>
      ) : (
        <ul className="mt-8 space-y-2">
          {playlists.map((p) => (
            <li key={p.id} className="card flex flex-wrap items-center gap-3 p-4">
              <button onClick={() => (openId === p.id ? setOpenId(null) : open(p.id))} className="min-w-0 flex-1 text-left" aria-expanded={openId === p.id}>
                <span className="block truncate font-semibold text-[var(--color-heading)]">{p.title}</span>
                <span className="text-xs text-[var(--color-muted)]">
                  {openId === p.id ? `${openTracks.length} track${openTracks.length === 1 ? "" : "s"}` : "Open playlist"}
                </span>
              </button>
              {openId === p.id && openTracks.length > 0 && (
                <button onClick={() => playTracks(openTracks, 0)} className="btn btn-primary !min-h-9 px-3 text-sm">Play all</button>
              )}
              <button onClick={() => deletePlaylist(p.id)} className="btn btn-ghost !min-h-9 px-3 text-sm" aria-label={`Delete playlist ${p.title}`}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {openId && openTracks.length > 0 && (
        <section className="card mt-4 p-4">
          <h2 className="mb-2 font-display text-lg font-bold">Tracks</h2>
          <ol className="divide-y divide-[var(--color-border)]">
            {openTracks.map((t, i) => (
              <li key={t.trackId} className="flex items-center gap-3 py-2">
                <span className="w-5 text-center text-xs tabular-nums text-[var(--color-muted)]">{i + 1}</span>
                <button onClick={() => playTracks(openTracks, i)} className="min-w-0 flex-1 text-left" aria-label={`Play ${t.title}`}>
                  <span className="block truncate text-sm font-semibold text-[var(--color-heading)]">{t.title}</span>
                  <span className="block truncate text-xs text-[var(--color-muted)]">{t.artistName}</span>
                </button>
                <button onClick={() => removeTrack(t.trackId)} className="btn btn-ghost !min-h-9 px-3 text-xs" aria-label={`Remove ${t.title} from playlist`}>
                  Remove
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
