import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets, releases, tracks } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { notFound, unauthorized, forbidden } from "@/lib/api";

// Serves uploaded artwork and audio stored in Postgres. Artwork is public;
// audio is served only to its owner/admin or when it belongs to an approved
// release (listeners reach it through /api/stream/[trackId]).
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return notFound("Media not found");

  const rows = await db
    .select({
      kind: mediaAssets.kind,
      mimeType: mediaAssets.mimeType,
      data: mediaAssets.data,
      byteSize: mediaAssets.byteSize,
      ownerUserId: mediaAssets.ownerUserId,
    })
    .from(mediaAssets)
    .where(eq(mediaAssets.id, id))
    .limit(1);
  const asset = rows[0];
  if (!asset) return notFound("Media not found");

  if (asset.kind === "audio") {
    const approved = await db
      .select({ id: releases.id })
      .from(tracks)
      .innerJoin(releases, eq(releases.id, tracks.releaseId))
      .where(and(eq(tracks.audioPath, `/api/media/${id}`), eq(releases.status, "approved")))
      .limit(1);
    if (approved.length === 0) {
      const user = await getCurrentUser();
      const privileged = user && (user.role === "admin" || user.id === asset.ownerUserId);
      if (!privileged) return user ? forbidden() : unauthorized();
    }
  }

  return new Response(new Uint8Array(asset.data), {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(asset.byteSize),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
