import { notFound } from "next/navigation";
import { getArtistBySlug } from "@/lib/catalog";
import { ReleaseRail } from "@/components/ReleaseCard";
import { FollowButton } from "@/components/FollowButton";

export const dynamic = "force-dynamic";

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  if (!artist) notFound();

  return (
    <div>
      {/* Poster-wall hero */}
      <header className="relative overflow-hidden border-b border-[var(--color-border)]">
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(900px 400px at 70% 0%, rgba(47,123,255,0.20), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <p className="eyebrow">Artist profile</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="font-display text-4xl font-bold sm:text-6xl">{artist.name}</h1>
              {artist.verified && (
                <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-[var(--color-accent)]">Verified artist</p>
              )}
              <p className="mt-4 max-w-2xl leading-relaxed text-[var(--color-text)]">{artist.bio}</p>
            </div>
            <FollowButton artistId={artist.id} artistName={artist.name} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <ReleaseRail title="Releases" releases={artist.releases} note="Every release declares its creative method" />
        {artist.releases.length === 0 && (
          <p className="card mt-10 p-8 text-center text-sm text-[var(--color-muted)]">
            No published releases yet. Releases appear here after they pass rights and moderation review.
          </p>
        )}
      </div>
    </div>
  );
}
