import Link from "next/link";
import { notFound } from "next/navigation";
import { getReleaseBySlug } from "@/lib/catalog";
import { MethodBadge } from "@/components/ReleaseCard";
import { TrackList } from "@/components/TrackList";

export const dynamic = "force-dynamic";

export default async function ReleasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const release = await getReleaseBySlug(slug);
  if (!release) notFound();

  const methodLabel = {
    human: "Human-created — performed and recorded by the credited artists.",
    ai_assisted: "AI-assisted — human creators used AI tools in the creative process.",
    ai_generated: "AI-generated — created with generative AI tools.",
  } as const;

  return (
    <div>
      {/* Full-bleed artwork header */}
      <header className="relative overflow-hidden">
        {release.coverUrl && (
          <div className="absolute inset-0" aria-hidden>
            <img src={release.coverUrl} alt="" className="h-full w-full scale-110 object-cover opacity-25 blur-2xl" />
          </div>
        )}
        <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-12 sm:flex-row sm:items-end sm:px-6">
          {release.coverUrl && (
            <img
              src={release.coverUrl}
              alt={`${release.title} album artwork`}
              width={280}
              height={280}
              className="w-48 flex-none rounded-[var(--radius-lg)] sm:w-56"
              style={{ boxShadow: "var(--shadow-2)" }}
            />
          )}
          <div className="min-w-0">
            <p className="eyebrow">CastAWAI Media Group presents · {release.type}</p>
            <h1 className="mt-2 font-display text-3xl font-bold sm:text-5xl">{release.title}</h1>
            <p className="mt-2 text-base text-[var(--color-text)]">
              <Link href={`/artists/${release.artistSlug}`} className="font-semibold text-[var(--color-heading)] hover:underline">
                {release.artistName}
              </Link>{" "}
              · {release.genre} · {new Date(release.releaseDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              {release.explicit && <span className="ml-2 rounded-sm border border-[var(--color-border)] px-1 text-[10px] font-bold text-[var(--color-muted)]">EXPLICIT</span>}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <MethodBadge method={release.creativeMethod} />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="card p-4 sm:p-6">
          <TrackList tracks={release.tracks.map((t) => ({
            id: t.id,
            title: t.title,
            durationSec: t.durationSec,
            artistName: release.artistName,
            artistSlug: release.artistSlug,
            releaseTitle: release.title,
            releaseSlug: release.slug,
            coverUrl: release.coverUrl,
          }))} />
        </div>

        {release.description && (
          <section className="mt-10 max-w-3xl">
            <h2 className="font-display text-xl font-bold">About this release</h2>
            <p className="mt-3 leading-relaxed text-[var(--color-text)]">{release.description}</p>
          </section>
        )}

        <section className="mt-8 max-w-3xl">
          <h2 className="font-display text-xl font-bold">Creative method &amp; disclosures</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-text)]">{methodLabel[release.creativeMethod]}</p>
          {release.aiToolDisclosures && (
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">AI tools disclosed: {release.aiToolDisclosures}</p>
          )}
          <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted)]">
            Classification reflects the creator&apos;s declaration at upload and does not determine copyright
            status. AI-generated works may still be protected or restricted; rights are reviewed before publication.
          </p>
        </section>
      </div>
    </div>
  );
}
