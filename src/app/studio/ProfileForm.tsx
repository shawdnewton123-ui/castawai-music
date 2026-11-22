"use client";

import { useActionState } from "react";
import { createArtistProfile, type ActionState } from "./actions";

const initial: ActionState = {};

export function ProfileForm() {
  const [state, formAction, pending] = useActionState(createArtistProfile, initial);
  return (
    <form action={formAction} className="card space-y-4 p-6">
      <div>
        <label className="eyebrow" htmlFor="artist-name">Artist name</label>
        <input id="artist-name" name="name" required minLength={2} maxLength={80} className="field mt-1 w-full" placeholder="Your artist name" />
      </div>
      <div>
        <label className="eyebrow" htmlFor="artist-bio">Bio (optional)</label>
        <textarea id="artist-bio" name="bio" rows={3} maxLength={1000} className="field mt-1 w-full" placeholder="Tell listeners who you are." />
      </div>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Creating…" : "Create artist profile"}
      </button>
    </form>
  );
}
