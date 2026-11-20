import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { playlists, playlistTracks, tracks, releases, artists } from "@/db/schema";
import { requireUser, badRequest, json, notFound } from "@/lib/api";

async function ownedPlaylist(playlistId: string, userId: string) {
  const rows = await db
    .select()
    .from(playlists)
    .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  const playlist = await ownedPlaylist(id, auth.user.id);
  if (!playlist) return notFound("Playlist not found");
  const rows = await db
    .select({
      trackId: tracks.id,
      title: tracks.title,
      durationSec: tracks.durationSec,
      position: playlistTracks.position,
      releaseTitle: releases.title,
      releaseSlug: releases.slug,
      coverUrl: releases.coverUrl,
      artistName: artists.name,
      artistSlug: artists.slug,
      creativeMethod: releases.creativeMethod,
    })
    .from(playlistTracks)
    .innerJoin(tracks, eq(tracks.id, playlistTracks.trackId))
    .innerJoin(releases, eq(releases.id, tracks.releaseId))
    .innerJoin(artists, eq(artists.id, releases.artistId))
    .where(eq(playlistTracks.playlistId, id))
    .orderBy(asc(playlistTracks.position));
  return json({ playlist, tracks: rows });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  const playlist = await ownedPlaylist(id, auth.user.id);
  if (!playlist) return notFound("Playlist not found");
  const body = await request.json().catch(() => null);
  const parsed = z.object({ trackId: z.string().uuid() }).safeParse(body);
  if (!parsed.success) return badRequest("trackId is required");

  const exists = await db
    .select({ id: tracks.id })
    .from(tracks)
    .where(eq(tracks.id, parsed.data.trackId))
    .limit(1);
  if (!exists[0]) return notFound("Track not found");

  const current = await db
    .select({ position: playlistTracks.position })
    .from(playlistTracks)
    .where(eq(playlistTracks.playlistId, id));
  const nextPosition = current.reduce((max, r) => Math.max(max, r.position + 1), 0);
  await db
    .insert(playlistTracks)
    .values({ playlistId: id, trackId: parsed.data.trackId, position: nextPosition })
    .onConflictDoNothing();
  return json({ ok: true }, 201);
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  const playlist = await ownedPlaylist(id, auth.user.id);
  if (!playlist) return notFound("Playlist not found");
  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get("trackId");
  if (trackId) {
    await db
      .delete(playlistTracks)
      .where(and(eq(playlistTracks.playlistId, id), eq(playlistTracks.trackId, trackId)));
    return json({ ok: true });
  }
  await db.delete(playlists).where(eq(playlists.id, id));
  return json({ ok: true });
}
