"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { artists, mediaAssets, releases, tracks, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ActionState = { error?: string; success?: string };

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function uniqueSlug(base: string, taken: (slug: string) => Promise<boolean>) {
  let candidate = base || "release";
  for (let n = 2; ; n++) {
    if (!(await taken(candidate))) return candidate;
    candidate = `${base}-${n}`;
  }
}

export async function createArtistProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first." };
  const existing = await db
    .select({ id: artists.id })
    .from(artists)
    .where(eq(artists.userId, user.id))
    .limit(1);
  if (existing.length > 0) return { error: "You already have an artist profile." };

  const name = String(formData.get("name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim() || null;
  if (name.length < 2 || name.length > 80) {
    return { error: "Artist name must be 2–80 characters." };
  }
  const slug = await uniqueSlug(slugify(name), async (s) => {
    const rows = await db.select({ id: artists.id }).from(artists).where(eq(artists.slug, s)).limit(1);
    return rows.length > 0;
  });
  await db.insert(artists).values({ userId: user.id, name, slug, bio });
  if (user.role === "listener") {
    await db.update(users).set({ role: "artist" }).where(eq(users.id, user.id));
  }
  revalidatePath("/studio");
  return { success: `Artist profile “${name}” created.` };
}

export async function uploadRelease(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first." };
  const artistRows = await db
    .select({ id: artists.id, name: artists.name })
    .from(artists)
    .where(eq(artists.userId, user.id))
    .limit(1);
  const artist = artistRows[0];
  if (!artist) return { error: "Create your artist profile first." };

  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "single");
  const creativeMethod = String(formData.get("creativeMethod") ?? "");
  const genre = String(formData.get("genre") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const releaseDateRaw = String(formData.get("releaseDate") ?? "");
  const explicit = formData.get("explicit") === "on";
  const ownership = formData.get("ownershipDeclaration") === "on";
  const distributionRights = String(formData.get("distributionRights") ?? "").trim() || null;
  const aiToolDisclosures = String(formData.get("aiToolDisclosures") ?? "").trim() || null;
  const durationSec = Number(formData.get("durationSec") ?? 0);
  const audio = formData.get("audio");
  const cover = formData.get("cover");

  if (title.length < 1 || title.length > 120) return { error: "Title must be 1–120 characters." };
  if (!["single", "ep", "album"].includes(type)) return { error: "Invalid release type." };
  if (!["human", "ai_assisted", "ai_generated"].includes(creativeMethod)) {
    return { error: "Pick how this release was made." };
  }
  if (genre.length < 1 || genre.length > 60) return { error: "Genre is required (max 60 characters)." };
  const releaseDate = new Date(releaseDateRaw);
  if (Number.isNaN(releaseDate.getTime())) return { error: "Pick a valid release date." };
  if (!ownership) return { error: "You must confirm you own or are licensed to distribute this release." };
  if (creativeMethod === "ai_generated" && !aiToolDisclosures) {
    return { error: "AI-generated releases must disclose the tools used." };
  }
  if (!(audio instanceof File) || audio.size === 0) return { error: "Attach an audio file." };
  if (!audio.type.startsWith("audio/")) return { error: "Audio must be an audio file." };
  if (audio.size > MAX_AUDIO_BYTES) return { error: "Audio must be 20 MB or smaller." };
  if (cover instanceof File && cover.size > 0) {
    if (!cover.type.startsWith("image/")) return { error: "Cover must be an image file." };
    if (cover.size > MAX_IMAGE_BYTES) return { error: "Cover must be 5 MB or smaller." };
  }
  if (!Number.isFinite(durationSec) || durationSec < 1 || durationSec > 60 * 60) {
    return { error: "Could not read the track duration — re-select the audio file." };
  }

  const audioBuffer = Buffer.from(await audio.arrayBuffer());
  const [audioAsset] = await db
    .insert(mediaAssets)
    .values({
      ownerUserId: user.id,
      kind: "audio",
      mimeType: audio.type,
      byteSize: audioBuffer.length,
      data: audioBuffer,
    })
    .returning({ id: mediaAssets.id });

  let coverUrl: string | null = null;
  if (cover instanceof File && cover.size > 0) {
    const coverBuffer = Buffer.from(await cover.arrayBuffer());
    const [coverAsset] = await db
      .insert(mediaAssets)
      .values({
        ownerUserId: user.id,
        kind: "artwork",
        mimeType: cover.type,
        byteSize: coverBuffer.length,
        data: coverBuffer,
      })
      .returning({ id: mediaAssets.id });
    coverUrl = `/api/media/${coverAsset.id}`;
  }

  const releaseSlug = await uniqueSlug(
    slugify(`${artist.name}-${title}`),
    async (s) => {
      const rows = await db
        .select({ id: releases.id })
        .from(releases)
        .where(eq(releases.slug, s))
        .limit(1);
      return rows.length > 0;
    }
  );

  const [release] = await db
    .insert(releases)
    .values({
      artistId: artist.id,
      title,
      slug: releaseSlug,
      type: type as "single" | "ep" | "album",
      creativeMethod: creativeMethod as "human" | "ai_assisted" | "ai_generated",
      genre,
      releaseDate,
      coverUrl,
      description,
      status: "pending_review",
      explicit,
      ownershipDeclaration: ownership,
      distributionRights,
      aiToolDisclosures,
    })
    .returning({ id: releases.id });

  await db.insert(tracks).values({
    releaseId: release.id,
    title,
    trackNumber: 1,
    durationSec: Math.round(durationSec),
    audioPath: `/api/media/${audioAsset.id}`,
  });

  revalidatePath("/studio");
  revalidatePath("/admin");
  return { success: `“${title}” submitted — it is now queued for admin review.` };
}

export async function getArtistForUser(userId: string) {
  const rows = await db
    .select()
    .from(artists)
    .where(eq(artists.userId, userId))
    .orderBy(artists.createdAt)
    .limit(1);
  return rows[0] ?? null;
}
