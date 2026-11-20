import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { artists, releases, tracks, follows, plays } from "@/db/schema";

export type ReleaseCard = {
  id: string;
  title: string;
  slug: string;
  type: "album" | "ep" | "single";
  creativeMethod: "human" | "ai_assisted" | "ai_generated";
  genre: string;
  releaseDate: string;
  coverUrl: string | null;
  explicit: boolean;
  artistName: string;
  artistSlug: string;
};

const releaseCardSelect = {
  id: releases.id,
  title: releases.title,
  slug: releases.slug,
  type: releases.type,
  creativeMethod: releases.creativeMethod,
  genre: releases.genre,
  releaseDate: releases.releaseDate,
  coverUrl: releases.coverUrl,
  explicit: releases.explicit,
  artistName: artists.name,
  artistSlug: artists.slug,
};

function approved() {
  return eq(releases.status, "approved");
}

export async function getReleaseCards(limit = 12, genre?: string): Promise<ReleaseCard[]> {
  const where = genre ? and(approved(), eq(releases.genre, genre)) : approved();
  const rows = await db
    .select(releaseCardSelect)
    .from(releases)
    .innerJoin(artists, eq(artists.id, releases.artistId))
    .where(where)
    .orderBy(desc(releases.releaseDate))
    .limit(limit);
  return rows.map((r) => ({ ...r, releaseDate: r.releaseDate.toISOString() }));
}

export async function getTrendingReleases(limit = 12): Promise<ReleaseCard[]> {
  const rows = await db
    .select({
      ...releaseCardSelect,
      playCount: sql<number>`count(${plays.id})`,
    })
    .from(releases)
    .innerJoin(artists, eq(artists.id, releases.artistId))
    .leftJoin(tracks, eq(tracks.releaseId, releases.id))
    .leftJoin(plays, eq(plays.trackId, tracks.id))
    .where(approved())
    .groupBy(releases.id, artists.id)
    .orderBy(sql`count(${plays.id}) desc`, desc(releases.releaseDate))
    .limit(limit);
  return rows.map(({ playCount: _playCount, ...r }) => ({
    ...r,
    releaseDate: r.releaseDate.toISOString(),
  }));
}

export async function getFeaturedArtists(limit = 8) {
  return db
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      imageUrl: artists.imageUrl,
      bio: artists.bio,
      verified: artists.verified,
    })
    .from(artists)
    .orderBy(desc(artists.verified), asc(artists.name))
    .limit(limit);
}

export async function getReleaseBySlug(slug: string) {
  const rows = await db
    .select({
      ...releaseCardSelect,
      description: releases.description,
      aiToolDisclosures: releases.aiToolDisclosures,
      status: releases.status,
      artistId: artists.id,
      artistBio: artists.bio,
      artistImage: artists.imageUrl,
      artistVerified: artists.verified,
    })
    .from(releases)
    .innerJoin(artists, eq(artists.id, releases.artistId))
    .where(and(eq(releases.slug, slug), approved()))
    .limit(1);
  if (!rows[0]) return null;
  const release = rows[0];
  const trackRows = await db
    .select()
    .from(tracks)
    .where(eq(tracks.releaseId, release.id))
    .orderBy(asc(tracks.trackNumber));
  return {
    ...release,
    releaseDate: release.releaseDate.toISOString(),
    tracks: trackRows,
  };
}

export async function getArtistBySlug(slug: string) {
  const rows = await db
    .select()
    .from(artists)
    .where(eq(artists.slug, slug))
    .limit(1);
  if (!rows[0]) return null;
  const artist = rows[0];
  const artistReleases = await db
    .select(releaseCardSelect)
    .from(releases)
    .innerJoin(artists, eq(artists.id, releases.artistId))
    .where(and(eq(releases.artistId, artist.id), approved()))
    .orderBy(desc(releases.releaseDate));
  return {
    ...artist,
    releases: artistReleases.map((r) => ({ ...r, releaseDate: r.releaseDate.toISOString() })),
  };
}

export async function searchCatalog(query: string) {
  const q = `%${query}%`;
  const [artistRows, releaseRows, trackRows] = await Promise.all([
    db
      .select({ id: artists.id, name: artists.name, slug: artists.slug, imageUrl: artists.imageUrl })
      .from(artists)
      .where(ilike(artists.name, q))
      .limit(8),
    db
      .select(releaseCardSelect)
      .from(releases)
      .innerJoin(artists, eq(artists.id, releases.artistId))
      .where(and(approved(), ilike(releases.title, q)))
      .limit(12),
    db
      .select({
        id: tracks.id,
        title: tracks.title,
        durationSec: tracks.durationSec,
        releaseTitle: releases.title,
        releaseSlug: releases.slug,
        coverUrl: releases.coverUrl,
        artistName: artists.name,
        artistSlug: artists.slug,
        creativeMethod: releases.creativeMethod,
      })
      .from(tracks)
      .innerJoin(releases, eq(releases.id, tracks.releaseId))
      .innerJoin(artists, eq(artists.id, releases.artistId))
      .where(and(approved(), ilike(tracks.title, q)))
      .limit(20),
  ]);
  return { artists: artistRows, releases: releaseRows, tracks: trackRows };
}

export async function isFollowing(userId: string, artistId: string) {
  const rows = await db
    .select({ userId: follows.userId })
    .from(follows)
    .where(and(eq(follows.userId, userId), eq(follows.artistId, artistId)))
    .limit(1);
  return rows.length > 0;
}

export const GENRES = [
  "Gospel",
  "R&B",
  "Hip-Hop",
  "Pop",
  "Country",
  "Rock",
  "Electronic",
] as const;

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}
