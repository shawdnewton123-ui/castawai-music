import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword, createSession } from "@/lib/auth";
import { badRequest, json, unauthorized } from "@/lib/api";

const bodySchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return badRequest("Email and password are required");

  const rows = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  const user = rows[0];
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return unauthorized();
  }

  await createSession(user.id);
  return json({
    user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
  });
}
