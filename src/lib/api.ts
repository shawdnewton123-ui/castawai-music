import { NextResponse } from "next/server";
import { getCurrentUser, type SessionUser } from "@/lib/auth";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function unauthorized() {
  return NextResponse.json({ error: "Authentication required" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Not allowed" }, { status: 403 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export async function requireUser(): Promise<
  { user: SessionUser } | { response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) return { response: unauthorized() };
  return { user };
}
