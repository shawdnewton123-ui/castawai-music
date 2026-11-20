import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { tracks, releases } from "@/db/schema";
import { notFound } from "@/lib/api";

// Streams a track that belongs to an approved release. In production this
// proxies signed CDN/object-storage URLs; here it serves validated demo audio.
export async function GET(_request: Request, ctx: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(trackId)) return notFound("Track not found");
  const rows = await db
    .select({ audioPath: tracks.audioPath, title: tracks.title, status: releases.status })
    .from(tracks)
    .innerJoin(releases, eq(releases.id, tracks.releaseId))
    .where(and(eq(tracks.id, trackId), eq(releases.status, "approved")))
    .limit(1);
  const track = rows[0];
  if (!track) return notFound("Track not found");
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.join(process.cwd(), "public", track.audioPath);
    const data = await fs.readFile(filePath);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(data.length),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return notFound("Audio unavailable");
  }
}
