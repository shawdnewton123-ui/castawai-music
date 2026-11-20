import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { playlists, playlistTracks } from "@/db/schema";
import { requireUser, badRequest, json, notFound } from "@/lib/api";

const createSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(400).optional(),
});

const reorderSchema = z.object({
  playlistId: z.string().uuid(),
  trackIds: z.array(z.string().uuid()),
});

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const rows = await db
    .select()
    .from(playlists)
    .where(eq(playlists.userId, auth.user.id))
    .orderBy(desc(playlists.createdAt));
  return json({ playlists: rows });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest("A playlist title is required", parsed.error.flatten());
  const [playlist] = await db
    .insert(playlists)
    .values({ userId: auth.user.id, title: parsed.data.title, description: parsed.data.description })
    .returning();
  return json({ playlist }, 201);
}

export async function PATCH(request: Request) {
  // Reorder: { playlistId, trackIds: [...] } assigns positions in order.
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null);
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) return badRequest("playlistId and trackIds are required");
  const owned = await db
    .select({ id: playlists.id })
    .from(playlists)
    .where(and(eq(playlists.id, parsed.data.playlistId), eq(playlists.userId, auth.user.id)))
    .limit(1);
  if (!owned[0]) return notFound("Playlist not found");
  for (let i = 0; i < parsed.data.trackIds.length; i++) {
    await db
      .update(playlistTracks)
      .set({ position: i })
      .where(
        and(
          eq(playlistTracks.playlistId, parsed.data.playlistId),
          eq(playlistTracks.trackId, parsed.data.trackIds[i])
        )
      );
  }
  return json({ ok: true });
}
