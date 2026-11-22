import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { releases, tracks } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { ProfileForm } from "./ProfileForm";
import { UploadForm } from "./UploadForm";
import { getArtistForUser } from "./actions";

export const metadata = { title: "Artist Studio" };

const statusLabel: Record<string, string> = {
  pending_review: "Pending review",
  approved: "Live",
  rejected: "Rejected",
};

const methodLabel: Record<string, string> = {
  human: "Human-made",
  ai_assisted: "AI-assisted",
  ai_generated: "AI-generated",
};

const GENRE_SUGGESTIONS = [
  "Synthwave",
  "Lo-fi",
  "Ambient",
  "House",
  "Techno",
  "Indie",
  "Hip-hop",
  "R&B",
  "Rock",
  "Jazz",
  "Classical",
  "Pop",
];

const statusClass: Record<string, string> = {
  pending_review: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  approved: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  rejected: "border-red-400/40 bg-red-400/10 text-red-300",
};

export default async function StudioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/studio");
  const artist = await getArtistForUser(user.id);

  const myReleases = artist
    ? await db
        .select({
          id: releases.id,
          title: releases.title,
          slug: releases.slug,
          type: releases.type,
          status: releases.status,
          creativeMethod: releases.creativeMethod,
          genre: releases.genre,
          releaseDate: releases.releaseDate,
          coverUrl: releases.coverUrl,
          explicit: releases.explicit,
        })
        .from(releases)
        .where(eq(releases.artistId, artist.id))
        .orderBy(desc(releases.createdAt))
    : [];

  return (
    <div className="min-h-screen bg-[#05070D] text-[#DCE3F0]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <p className="eyebrow">Artist Studio</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#E8EDF7] sm:text-4xl">
          {artist ? `Welcome back, ${artist.name}` : "Make your music official"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#8B96AC]">
          {artist
            ? "Upload releases with honest creative disclosures. Every submission is reviewed by a platform admin before it goes live."
            : "Create your artist profile to upload releases. Every submission is reviewed by a platform admin before it goes live."}
        </p>

        {!artist ? (
          <section className="mt-8">
            <ProfileForm />
          </section>
        ) : (
          <>
            <section className="mt-8 grid gap-8 lg:grid-cols-2">
              <div>
                <h2 className="text-lg font-medium text-[#E8EDF7]">Upload a release</h2>
                <p className="mb-4 text-xs text-[#8B96AC]">
                  One track per upload for now. It appears in your catalog once approved.
                </p>
                <UploadForm genres={GENRE_SUGGESTIONS} />
              </div>

              <div>
                <h2 className="text-lg font-medium text-[#E8EDF7]">Your releases</h2>
                <p className="mb-4 text-xs text-[#8B96AC]">
                  {myReleases.length} submitted
                </p>
                {myReleases.length === 0 ? (
                  <div className="card p-6 text-sm text-[#8B96AC]">
                    Nothing here yet — your first upload will show up on the left.
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {myReleases.map((r) => (
                      <li key={r.id} className="card flex items-center gap-4 p-4">
                        {r.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.coverUrl} alt="" className="h-14 w-14 rounded-md object-cover" />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-[#0E1526] text-xs text-[#8B96AC]">
                            ♪
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[#E8EDF7]">
                            {r.title}
                            {r.explicit && <span className="ml-2 text-xs text-[#8B96AC]">E</span>}
                          </p>
                          <p className="truncate text-xs text-[#8B96AC]">
                            {r.type.toUpperCase()} · {r.genre} · {methodLabel[r.creativeMethod]} ·{" "}
                            {r.releaseDate.toISOString().slice(0, 10)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs ${statusClass[r.status] ?? ""}`}
                        >
                          {statusLabel[r.status] ?? r.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="mt-10">
              <h2 className="text-lg font-medium text-[#E8EDF7]">Your public page</h2>
              <p className="mt-2 text-sm text-[#8B96AC]">
                Listeners can find you at{" "}
                <Link href={`/artists/${artist.slug}`} className="text-[#2F7BFF] hover:underline">
                  /artists/{artist.slug}
                </Link>
                {artist.verified
                  ? " — your profile is verified."
                  : " — verification is granted by a platform admin."}
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
