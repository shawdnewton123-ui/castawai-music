import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tracks, releases, artists } from "@/db/schema";
import { json, notFound } from "@/lib/api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const releaseSlug = searchParams.get("release");
  if (!releaseSlug) return notFound("Missing release parameter");
  const rows = await db
    .select({
      id: tracks.id,
      title: tracks.title,
      durationSec: tracks.durationSec,
      artistName: artists.name,
      artistSlug: artists.slug,
      releaseTitle: releases.title,
      releaseSlug: releases.slug,
      coverUrl: releases.coverUrl,
    })
    .from(tracks)
    .innerJoin(releases, eq(releases.id, tracks.releaseId))
    .innerJoin(artists, eq(artists.id, releases.artistId))
    .where(and(eq(releases.slug, releaseSlug), eq(releases.status, "approved")))
    .orderBy(asc(tracks.trackNumber));
  return json({ tracks: rows });
}
