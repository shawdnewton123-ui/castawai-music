"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/components/SessionProvider";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { refresh } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accountType, setAccountType] = useState<"listener" | "artist">("listener");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "login" ? { email, password } : { email, password, displayName, accountType }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      refresh();
      router.push("/");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <p className="eyebrow">CastAWAI Media Group</p>
      <h1 className="mt-2 font-display text-3xl font-bold">
        {mode === "login" ? "Welcome back" : "Join CastAWAI Music"}
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        {mode === "login"
          ? "Log in to listen, build playlists and follow artists."
          : "Free listeners get ad-supported streaming. Artists can publish releases after signing up."}
      </p>

      <form onSubmit={submit} className="card mt-8 space-y-4 p-6" noValidate={false}>
        {error && (
          <p role="alert" className="rounded-[var(--radius-sm)] border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        {mode === "register" && (
          <>
            <div>
              <label htmlFor="displayName" className="mb-1 block text-sm font-medium">Display name</label>
              <input id="displayName" className="field" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required minLength={2} autoComplete="name" />
            </div>
            <fieldset>
              <legend className="mb-1 block text-sm font-medium">Account type</legend>
              <div className="flex gap-2">
                {(["listener", "artist"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAccountType(t)}
                    aria-pressed={accountType === t}
                    className={`btn flex-1 !min-h-10 text-sm ${accountType === t ? "btn-primary" : "btn-ghost"}`}
                  >
                    {t === "listener" ? "Listener (free)" : "Artist"}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
          <input id="email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">Password</label>
          <input id="password" type="password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "register" ? 8 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          {mode === "register" && <p className="mt-1 text-xs text-[var(--color-muted)]">At least 8 characters.</p>}
        </div>
        <button type="submit" disabled={busy} className="btn btn-primary w-full">
          {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>
        <p className="text-center text-sm text-[var(--color-muted)]">
          {mode === "login" ? (
            <>New to CastAWAI? <Link href="/register" className="text-[var(--color-accent)] hover:underline">Create an account</Link></>
          ) : (
            <>Already have an account? <Link href="/login" className="text-[var(--color-accent)] hover:underline">Log in</Link></>
          )}
        </p>
      </form>
    </div>
  );
}
