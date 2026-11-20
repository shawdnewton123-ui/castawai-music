import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { artists, plays, releases, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin" };

const METHOD_LABEL = {
  human: "HUMAN",
  ai_assisted: "AI-ASSISTED",
  ai_generated: "AI-GENERATED",
} as const;

async function setReleaseStatus(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return;
  const id = formData.get("id");
  const status = formData.get("status");
  if (
    typeof id !== "string" ||
    typeof status !== "string" ||
    !["approved", "rejected", "pending_review"].includes(status)
  ) {
    return;
  }
  await db
    .update(releases)
    .set({ status: status as "approved" | "rejected" | "pending_review" })
    .where(eq(releases.id, id));
  revalidatePath("/admin");
}

async function toggleArtistVerified(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return;
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const rows = await db.select({ verified: artists.verified }).from(artists).where(eq(artists.id, id)).limit(1);
  if (!rows[0]) return;
  await db.update(artists).set({ verified: !rows[0].verified }).where(eq(artists.id, id));
  revalidatePath("/admin");
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/login");
  }

  const [
    [userCount],
    [artistCount],
    [playCount],
    statusCounts,
    pending,
    recentUsers,
    artistList,
  ] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(artists),
    db.select({ value: count() }).from(plays),
    db
      .select({ status: releases.status, value: count() })
      .from(releases)
      .groupBy(releases.status),
    db
      .select({
        id: releases.id,
        title: releases.title,
        slug: releases.slug,
        genre: releases.genre,
        type: releases.type,
        creativeMethod: releases.creativeMethod,
        status: releases.status,
        releaseDate: releases.releaseDate,
        explicit: releases.explicit,
        ownershipDeclaration: releases.ownershipDeclaration,
        distributionRights: releases.distributionRights,
        aiToolDisclosures: releases.aiToolDisclosures,
        artistName: artists.name,
        artistSlug: artists.slug,
      })
      .from(releases)
      .innerJoin(artists, eq(artists.id, releases.artistId))
      .where(eq(releases.status, "pending_review"))
      .orderBy(desc(releases.createdAt)),
    db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(10),
    db
      .select({
        id: artists.id,
        name: artists.name,
        slug: artists.slug,
        verified: artists.verified,
      })
      .from(artists)
      .orderBy(desc(artists.verified), artists.name),
  ]);

  const byStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s.value]));
  const stats = [
    { label: "Users", value: userCount.value },
    { label: "Artist profiles", value: artistCount.value },
    { label: "Streams (demo)", value: playCount.value },
    { label: "Approved releases", value: byStatus["approved"] ?? 0 },
    { label: "Pending review", value: byStatus["pending_review"] ?? 0 },
    { label: "Rejected releases", value: byStatus["rejected"] ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6">
      <p className="eyebrow">Administrator</p>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Platform Administration</h1>
      <p className="mt-3 max-w-2xl text-sm text-[var(--color-muted)]">
        Release review, artist verification and platform activity. Figures reflect the current
        development database and include clearly labeled demo data only.
      </p>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Platform statistics">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="font-display text-2xl font-bold">{s.value}</p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl font-bold sm:text-2xl">Release Review Queue</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Releases must pass rights and moderation review before publication.
        </p>
        {pending.length === 0 ? (
          <p className="card mt-4 p-8 text-center text-sm text-[var(--color-muted)]">
            No releases are waiting for review.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pending.map((r) => (
              <li key={r.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-bold leading-tight">
                      {r.title}{" "}
                      <span className="text-xs font-normal uppercase tracking-wider text-[var(--color-accent)]">
                        {METHOD_LABEL[r.creativeMethod]}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      {r.artistName} · {r.type} · {r.genre} · {r.explicit ? "Explicit" : "Clean"} ·
                      Ownership declaration: {r.ownershipDeclaration ? "yes" : "MISSING"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--color-muted)]">
                      Rights: {r.distributionRights ?? "not provided"}
                      {r.aiToolDisclosures ? ` · AI disclosures: ${r.aiToolDisclosures}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-none gap-2">
                    <form action={setReleaseStatus}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="approved" />
                      <button className="btn btn-primary !min-h-9 px-3 text-sm">Approve</button>
                    </form>
                    <form action={setReleaseStatus}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <button className="btn btn-ghost !min-h-9 px-3 text-sm">Reject</button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="font-display text-xl font-bold sm:text-2xl">Artist Verification</h2>
          <ul className="mt-4 space-y-3">
            {artistList.map((a) => (
              <li key={a.id} className="card flex items-center justify-between gap-3 p-4">
                <Link href={`/artists/${a.slug}`} className="min-w-0 hover:text-[var(--color-accent)]">
                  <p className="truncate font-medium">{a.name}</p>
                  <p className="text-xs text-[var(--color-muted)]">{a.verified ? "Verified" : "Not verified"}</p>
                </Link>
                <form action={toggleArtistVerified} className="flex-none">
                  <input type="hidden" name="id" value={a.id} />
                  <button className="btn btn-ghost !min-h-9 px-3 text-sm">
                    {a.verified ? "Revoke" : "Verify"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold sm:text-2xl">Recent Users</h2>
          <ul className="mt-4 space-y-3">
            {recentUsers.map((u) => (
              <li key={u.id} className="card flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{u.displayName}</p>
                  <p className="truncate text-xs text-[var(--color-muted)]">{u.email}</p>
                </div>
                <span className="flex-none rounded-full border border-[var(--color-border)] px-2 py-1 text-xs uppercase tracking-wider text-[var(--color-muted)]">
                  {u.role}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
