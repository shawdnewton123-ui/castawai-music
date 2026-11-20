import Link from "next/link";
import { searchCatalog } from "@/lib/catalog";
import { TrackList } from "@/components/TrackList";
import { MethodBadge } from "@/components/ReleaseCard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = query ? await searchCatalog(query) : { artists: [], releases: [], tracks: [] };
  const empty = query && results.artists.length + results.releases.length + results.tracks.length === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6">
      <p className="eyebrow">Search</p>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
        {query ? `Results for “${query}”` : "Find artists, songs and albums"}
      </h1>

      {empty && (
        <p className="card mt-8 p-8 text-center text-sm text-[var(--color-muted)]">
          No matches. Try an artist name, song, album or genre like “Gospel”.
        </p>
      )}

      {results.tracks.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-xl font-bold">Songs</h2>
          <div className="card p-2 sm:p-4">
            <TrackList tracks={results.tracks} />
          </div>
        </section>
      )}

      {results.releases.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-xl font-bold">Albums &amp; singles</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.releases.map((r) => (
              <Link key={r.id} href={`/releases/${r.slug}`} className="card flex items-center gap-4 p-3 hover:border-[var(--color-accent)]">
                {r.coverUrl && <img src={r.coverUrl} alt="" width={56} height={56} className="h-14 w-14 rounded-[var(--radius-sm)] object-cover" />}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-heading)]">{r.title}</p>
                  <p className="truncate text-xs text-[var(--color-muted)]">{r.artistName} · {r.type}</p>
                  <span className="mt-1"><MethodBadge method={r.creativeMethod} /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {results.artists.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-xl font-bold">Artists</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.artists.map((a) => (
              <Link key={a.id} href={`/artists/${a.slug}`} className="card flex items-center gap-4 p-3 hover:border-[var(--color-accent)]">
                <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-[var(--color-surface-2)] font-display text-lg font-bold text-[var(--color-accent)]">
                  {a.name.charAt(0)}
                </div>
                <p className="truncate text-sm font-semibold text-[var(--color-heading)]">{a.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
