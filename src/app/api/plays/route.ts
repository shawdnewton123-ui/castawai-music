import { z } from "zod";
import { db } from "@/db";
import { plays } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { json, badRequest } from "@/lib/api";

const bodySchema = z.object({ trackId: z.string().uuid() });

// Records one validated listening event. Anti-manipulation: callers may not
// supply a user id or timestamp — the server derives both from the session.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return badRequest("trackId is required");
  const user = await getCurrentUser();
  await db.insert(plays).values({ trackId: parsed.data.trackId, userId: user?.id ?? null });
  return json({ ok: true }, 201);
}
