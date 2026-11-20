import Link from "next/link";
import { getReleaseCards, getTrendingReleases, getFeaturedArtists, GENRES } from "@/lib/catalog";
import { ReleaseRail } from "@/components/ReleaseCard";

export const dynamic = "force-dynamic";

const PREMIUM = "Try Premium — $9.99/month";

export default async function LandingPage() {
  const [newReleases, trending, artists] = await Promise.all([
    getReleaseCards(10),
    getTrendingReleases(10),
    getFeaturedArtists(8),
  ]);
  const spotlight = newReleases[0];

  return (
    <div>
      {/* Hero — one focal point: the featured release as full-bleed artwork */}
      <section className="relative overflow-hidden border-b border-[var(--color-border)]">
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(1100px 520px at 78% 10%, rgba(47,123,255,0.22), transparent 60%), radial-gradient(800px 500px at 10% 90%, rgba(47,123,255,0.10), transparent 55%)",
          }}
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
          <div>
            <p className="eyebrow">CastAWAI Media Group presents</p>
            <h1 className="mt-4 max-w-xl font-display text-4xl font-bold leading-[1.08] sm:text-6xl">
              The stage where human and machine music share the light.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-[var(--color-text)] sm:text-lg">
              Featured releases in full-bleed artwork, artist profiles that feel like poster walls,
              and a clear path from discovery to premium listening — ad-free at $9.99/month, with a
              free ad-supported tier.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/register" className="btn btn-primary">{PREMIUM}</Link>
              <Link href="/browse" className="btn btn-ghost">Start listening free</Link>
            </div>
            <p className="mt-4 text-xs text-[var(--color-muted)]">
              Free tier is ad-supported · Premium removes ads · Cancel anytime
            </p>
          </div>
          {spotlight && (
            <div className="relative mx-auto w-full max-w-md">
              <div
                className="absolute -inset-6 rounded-full opacity-60 blur-3xl"
                aria-hidden
                style={{ background: "radial-gradient(circle, rgba(47,123,255,0.35), transparent 65%)" }}
              />
              <Link href={`/releases/${spotlight.slug}`} className="relative block" aria-label={`Featured release: ${spotlight.title}`}>
                {spotlight.coverUrl && (
                  <img
                    src={spotlight.coverUrl}
                    alt={`${spotlight.title} by ${spotlight.artistName} — featured release artwork`}
                    width={640}
                    height={640}
                    className="w-full rounded-[var(--radius-lg)]"
                    style={{ boxShadow: "var(--shadow-2)" }}
                  />
                )}
              </Link>
              <p className="relative mt-3 text-center text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                AI Music Spotlight · {spotlight.title} — {spotlight.artistName}
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <ReleaseRail title="New Releases" releases={newReleases} note="Every release declares its creative method" />
        <ReleaseRail title="Trending Music" releases={trending} note="Built from validated listening activity" />

        {/* Genre strip */}
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold sm:text-2xl">Browse by genre</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <Link
                key={g}
                href={`/browse?genre=${encodeURIComponent(g)}`}
                className="btn btn-ghost !min-h-10 text-sm"
              >
                {g}
              </Link>
            ))}
            <Link href="/browse" className="btn !min-h-10 text-sm text-[var(--color-accent)] hover:underline">More genres →</Link>
          </div>
        </section>

        {/* Featured artists — poster wall */}
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold sm:text-2xl">Featured Artists</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {artists.map((a) => (
              <Link
                key={a.id}
                href={`/artists/${a.slug}`}
                className="card group relative overflow-hidden p-5 transition-colors hover:border-[var(--color-accent)]"
              >
                <p className="font-display text-lg font-bold leading-tight">{a.name}</p>
                {a.verified && (
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2l2.4 2.4 3.4-.5.5 3.4L21 9.6 19.5 12 21 14.4l-2.7 2.3-.5 3.4-3.4-.5L12 22l-2.4-2.4-3.4.5-.5-3.4L3 14.4 4.5 12 3 9.6l2.7-2.3.5-3.4 3.4.5z" /></svg>
                    Verified
                  </span>
                )}
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--color-muted)]">{a.bio}</p>
                <span className="mt-3 inline-block text-xs font-semibold text-[var(--color-accent)] opacity-0 transition-opacity group-hover:opacity-100">View profile →</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
