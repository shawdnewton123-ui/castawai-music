"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "./SessionProvider";

export function SiteHeader() {
  const { user } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
    location.reload();
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  const links = [
    { href: "/browse", label: "Browse" },
    { href: "/playlists", label: "Playlists" },
    { href: "/premium", label: "Premium" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex-none font-display text-lg font-bold tracking-tight">
          <span className="chrome-text">CASTAWAI</span>
          <span className="ml-1 text-[var(--color-accent)]">MUSIC</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-heading)]">
              {l.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="ml-auto hidden max-w-xs flex-1 md:block" role="search">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, albums"
            aria-label="Search songs, artists, albums"
            className="field !min-h-10 text-sm"
          />
        </form>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {user ? (
            <div className="hidden items-center gap-3 md:flex">
              <span className="text-sm text-[var(--color-muted)]">{user.displayName}</span>
              {user.role === "admin" && (
                <Link href="/admin" className="text-sm text-[var(--color-accent)] hover:underline">Admin</Link>
              )}
              <button onClick={logout} className="btn btn-ghost !min-h-9 px-3 text-sm">Sign out</button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/login" className="btn btn-ghost !min-h-9 px-3 text-sm">Log in</Link>
              <Link href="/register" className="btn btn-primary !min-h-9 px-3 text-sm">Sign up free</Link>
            </div>
          )}
          <button
            className="flex h-11 w-11 items-center justify-center md:hidden"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-[var(--color-border)] px-4 py-4 md:hidden" aria-label="Mobile">
          <form onSubmit={submitSearch} role="search" className="mb-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search songs, artists, albums"
              aria-label="Search songs, artists, albums"
              className="field"
            />
          </form>
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-[var(--radius-sm)] px-2 py-3 text-base font-medium hover:bg-[var(--color-surface)]">
                {l.label}
              </Link>
            ))}
            {user?.role === "admin" && (
              <Link href="/admin" onClick={() => setOpen(false)} className="rounded-[var(--radius-sm)] px-2 py-3 text-base font-medium text-[var(--color-accent)] hover:bg-[var(--color-surface)]">
                Admin
              </Link>
            )}
            {user ? (
              <button onClick={logout} className="rounded-[var(--radius-sm)] px-2 py-3 text-left text-base font-medium hover:bg-[var(--color-surface)]">
                Sign out ({user.displayName})
              </button>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="btn btn-ghost mt-2">Log in</Link>
                <Link href="/register" onClick={() => setOpen(false)} className="btn btn-primary mt-2">Sign up free</Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
