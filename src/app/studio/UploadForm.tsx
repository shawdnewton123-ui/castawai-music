"use client";

import { useActionState, useRef, useState } from "react";
import { uploadRelease, type ActionState } from "./actions";

const initial: ActionState = {};

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function UploadForm({ genres }: { genres: string[] }) {
  const [state, formAction, pending] = useActionState(uploadRelease, initial);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [audioName, setAudioName] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function onAudioChange(file: File | undefined) {
    setDurationSec(null);
    setAudioName(file?.name ?? null);
    if (!file) return;
    const url = URL.createObjectURL(file);
    const probe = new Audio();
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      setDurationSec(probe.duration);
      URL.revokeObjectURL(url);
    };
    probe.onerror = () => URL.revokeObjectURL(url);
    probe.src = url;
  }

  if (state.success) {
    return (
      <div className="card p-6">
        <p className="text-sm text-emerald-400">{state.success}</p>
        <button className="btn btn-ghost mt-4" onClick={() => window.location.reload()}>
          Upload another
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="card space-y-4 p-6">
      <div>
        <label className="eyebrow" htmlFor="title">Release title</label>
        <input id="title" name="title" required maxLength={120} className="field mt-1 w-full" placeholder="Midnight Signal" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="eyebrow" htmlFor="type">Type</label>
          <select id="type" name="type" className="field mt-1 w-full" defaultValue="single">
            <option value="single">Single</option>
            <option value="ep">EP</option>
            <option value="album">Album</option>
          </select>
        </div>
        <div>
          <label className="eyebrow" htmlFor="genre">Genre</label>
          <input id="genre" name="genre" required list="genre-options" maxLength={60} className="field mt-1 w-full" placeholder="Synthwave" />
          <datalist id="genre-options">
            {genres.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="eyebrow" htmlFor="releaseDate">Release date</label>
          <input id="releaseDate" name="releaseDate" type="date" required className="field mt-1 w-full" />
        </div>
      </div>

      <fieldset>
        <legend className="eyebrow">How was this made?</legend>
        <div className="mt-2 space-y-2 text-sm text-[#DCE3F0]">
          <label className="flex items-start gap-2">
            <input type="radio" name="creativeMethod" value="human" defaultChecked className="mt-1" />
            <span><strong>Fully human-made</strong> — written and produced by people.</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" name="creativeMethod" value="ai_assisted" className="mt-1" />
            <span><strong>AI-assisted</strong> — human work with AI help (e.g. stems, mastering).</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" name="creativeMethod" value="ai_generated" className="mt-1" />
            <span><strong>AI-generated</strong> — substantially produced by an AI tool.</span>
          </label>
        </div>
      </fieldset>

      <div>
        <label className="eyebrow" htmlFor="aiToolDisclosures">AI tool disclosures</label>
        <textarea
          id="aiToolDisclosures"
          name="aiToolDisclosures"
          rows={2}
          maxLength={500}
          className="field mt-1 w-full"
          placeholder="Required for AI-assisted and AI-generated releases — name the tools and what they did."
        />
      </div>

      <div>
        <label className="eyebrow" htmlFor="audio">Audio file (MP3, up to 20 MB)</label>
        <input
          id="audio"
          name="audio"
          type="file"
          accept="audio/*"
          required
          className="field mt-1 w-full"
          onChange={(e) => onAudioChange(e.target.files?.[0])}
        />
        {audioName && (
          <p className="mt-1 text-xs text-[#8B96AC]">
            {audioName}
            {durationSec ? ` — ${formatDuration(durationSec)}` : " — reading duration…"}
          </p>
        )}
        <input type="hidden" name="durationSec" value={durationSec ?? ""} />
      </div>

      <div>
        <label className="eyebrow" htmlFor="cover">Cover art (optional, image up to 5 MB)</label>
        <input id="cover" name="cover" type="file" accept="image/*" className="field mt-1 w-full" />
      </div>

      <div>
        <label className="eyebrow" htmlFor="description">Description (optional)</label>
        <textarea id="description" name="description" rows={3} maxLength={1000} className="field mt-1 w-full" />
      </div>

      <div>
        <label className="eyebrow" htmlFor="distributionRights">Distribution rights (optional)</label>
        <input id="distributionRights" name="distributionRights" maxLength={200} className="field mt-1 w-full" placeholder="e.g. Self-released, exclusive to CastAWAI" />
      </div>

      <label className="flex items-start gap-2 text-sm text-[#DCE3F0]">
        <input type="checkbox" name="explicit" className="mt-1" />
        <span>Explicit lyrics — mark if the audio contains explicit content.</span>
      </label>

      <label className="flex items-start gap-2 text-sm text-[#DCE3F0]">
        <input type="checkbox" name="ownershipDeclaration" required className="mt-1" />
        <span>
          I confirm I own this recording or hold a licence to distribute it, and it does not infringe
          anyone&apos;s rights.
        </span>
      </label>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button type="submit" className="btn btn-primary w-full" disabled={pending || durationSec === null}>
        {pending ? "Uploading…" : "Submit for review"}
      </button>
    </form>
  );
}
