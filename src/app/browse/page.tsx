import Link from "next/link";
import { getReleaseCards, getTrendingReleases, getFeaturedArtists, GENRES } from "@/lib/catalog";
import { ReleaseRail } from "@/components/ReleaseCard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Browse" };

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  const { genre } = await searchParams;
  const [newReleases, trending, artists] = await Promise.all([
    getReleaseCards(24, genre),
    getTrendingReleases(10),
    getFeaturedArtists(8),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6">
      <p className="eyebrow">Discover</p>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
        {genre ? `${genre} on CastAWAI` : "New Releases, spotlights and more"}
      </h1>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/browse" className={`btn !min-h-10 text-sm ${genre ? "btn-ghost" : "btn-primary"}`}>All</Link>
        {GENRES.map((g) => (
          <Link
            key={g}
            href={`/browse?genre=${encodeURIComponent(g)}`}
            className={`btn !min-h-10 text-sm ${genre === g ? "btn-primary" : "btn-ghost"}`}
          >
            {g}
          </Link>
        ))}
      </div>

      {genre ? (
        newReleases.length > 0 ? (
          <ReleaseRail title={`New in ${genre}`} releases={newReleases} />
        ) : (
          <p className="card mt-8 p-8 text-center text-sm text-[var(--color-muted)]">
            Nothing in {genre} yet — new releases are added as they pass review.
          </p>
        )
      ) : (
        <>
          <ReleaseRail title="New Releases" releases={newReleases} />
          <ReleaseRail title="Trending Music" releases={trending} note="From validated listening activity" />
          <ReleaseRail title="AI Music Spotlight" releases={newReleases.filter((r) => r.creativeMethod !== "human")} />
          <ReleaseRail title="Human Music Spotlight" releases={newReleases.filter((r) => r.creativeMethod === "human")} />
        </>
      )}

      <section className="mt-12">
        <h2 className="font-display text-xl font-bold sm:text-2xl">Featured Artists</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {artists.map((a) => (
            <Link key={a.id} href={`/artists/${a.slug}`} className="card p-5 hover:border-[var(--color-accent)]">
              <p className="font-display text-lg font-bold leading-tight">{a.name}</p>
              <p className="mt-2 line-clamp-2 text-xs text-[var(--color-muted)]">{a.bio}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
