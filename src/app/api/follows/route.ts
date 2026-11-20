import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { follows } from "@/db/schema";
import { requireUser, badRequest, json } from "@/lib/api";

const bodySchema = z.object({ artistId: z.string().uuid(), following: z.boolean() });

export async function GET(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const artistId = new URL(request.url).searchParams.get("artistId") ?? "";
  if (!z.string().uuid().safeParse(artistId).success) return badRequest("artistId is required");
  const rows = await db
    .select({ artistId: follows.artistId })
    .from(follows)
    .where(and(eq(follows.userId, auth.user.id), eq(follows.artistId, artistId)))
    .limit(1);
  return json({ following: rows.length > 0 });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return badRequest("artistId and following are required");
  const { artistId, following } = parsed.data;

  if (following) {
    await db.insert(follows).values({ userId: auth.user.id, artistId }).onConflictDoNothing();
  } else {
    await db
      .delete(follows)
      .where(and(eq(follows.userId, auth.user.id), eq(follows.artistId, artistId)));
  }
  return json({ ok: true, following });
}
