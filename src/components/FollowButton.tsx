"use client";

import { useEffect, useState } from "react";
import { useSession } from "./SessionProvider";

export function FollowButton({ artistId, artistName }: { artistId: string; artistName: string }) {
  const { user } = useSession();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Following state is resolved by the artist page API when signed in.
    fetch(`/api/follows?artistId=${artistId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setFollowing(Boolean(d?.following)))
      .catch(() => setFollowing(false));
  }, [artistId, user]);

  if (!user) {
    return (
      <a href="/login" className="btn btn-ghost text-sm">Log in to follow</a>
    );
  }

  async function toggle() {
    if (busy || following === null) return;
    setBusy(true);
    try {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId, following: !following }),
      });
      if (res.ok) setFollowing(!following);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy || following === null}
      aria-pressed={following === true}
      className={`btn text-sm ${following ? "btn-ghost" : "btn-primary"}`}
    >
      {following ? `Following ${artistName}` : `Follow ${artistName}`}
    </button>
  );
}
