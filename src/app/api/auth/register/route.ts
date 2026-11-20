import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, createSession } from "@/lib/auth";
import { badRequest, json } from "@/lib/api";

const bodySchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  displayName: z.string().min(2).max(80),
  accountType: z.enum(["listener", "artist"]).default("listener"),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid registration details", parsed.error.flatten());
  const { email, password, displayName, accountType } = parsed.data;

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) return badRequest("An account with this email already exists");

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash, displayName, role: accountType })
    .returning({ id: users.id, email: users.email, displayName: users.displayName, role: users.role });

  await createSession(user.id);
  return json({ user }, 201);
}
