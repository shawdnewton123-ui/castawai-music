import { getReleaseCards, getTrendingReleases, getFeaturedArtists, GENRES } from "@/lib/catalog";
import { json } from "@/lib/api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get("genre") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? 12), 50);
  const [newReleases, trending, featuredArtists] = await Promise.all([
    getReleaseCards(limit, genre),
    getTrendingReleases(limit),
    getFeaturedArtists(8),
  ]);
  return json({ newReleases, trending, featuredArtists, genres: GENRES });
}
