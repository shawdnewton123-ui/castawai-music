# CASTAWAI MUSIC — Build Plan

**Owner:** CastAWAI Media Group · Tagline: *Music. Technology. Culture.*

## Goal and users
A production-oriented, responsive music streaming platform for human, AI-assisted and AI-generated music. Users: **Listeners** (free ad-supported / premium), **Artists** (Starter $4.99 / Pro $9.99 / Label $19.99 tiers), **Labels**, and **Administrators**. "Working" = real database-backed auth, catalog, listening, playlists, uploads under review, and subscription infrastructure — not a static mockup.

## Design brief
- **Who / job:** music listeners and artists; each screen drives discovery → listening → membership.
- **Mood:** cinematic, premium, editorial.
- **Direction:** "Cinematic Stage" — dark midnight-navy stage (`#05070D`), chrome-silver type (`#DCE3F0`/`#E8EDF7`), one electric-blue accent (`#2F7BFF`), full-bleed album artwork as the focal point.
- **Memorable:** every release rendered as a full-bleed poster wall; eyebrow line "CASTAWAI MEDIA GROUP PRESENTS".

## Scope (overall)
**In scope (eventually):** listener experience, artist studio + uploads, admin dashboard, charts, royalties accounting (design + infra, no invented rate), advertising, awards section, shared REST API for web + future React Native apps.
**Out of scope for now:** real payment processing (Stripe keys required), CDN/transcoding (object storage required), activated fan voting, real royalty payouts — each is clearly flagged in-app and below.

## Architecture
- **Web:** Next.js 15 App Router + React 19 + TypeScript; Tailwind CSS v4 with one token file (design direction above).
- **API:** route handlers under `src/app/api/*` — the same REST surface a React Native client consumes. Validation with Zod.
- **DB:** PostgreSQL (local dev: `castawai` database) + Drizzle ORM, schema in `src/db/schema.ts`, SQL migrations in `src/db/migrations/`.
- **Auth:** database-backed sessions (HttpOnly cookie, hashed password via node:crypto scrypt), roles: `listener | artist | label | admin`.
- **Media:** demo audio generated locally with ffmpeg, artwork as generated assets; a `/api/stream/[trackId]` endpoint serves validated tracks. Production would swap this for object storage + CDN (flagged).
- **Payments:** subscription *plans* are modeled; checkout requires Stripe credentials (flagged, Phase 4).
- **Hosting:** Vercel (web + API); Postgres moves to Neon/managed in deploy.
- Secrets from env only (`.env`, never committed; see `.env.example`).

### Data model (core)
`users` (role) · `sessions` · `artists` (profile, verification) · `releases` (type, `creative_method`: human | ai_assisted | ai_generated, status: draft → pending_review → approved/rejected, explicit flag, ownership/distribution declarations) · `tracks` (number, duration, audio path, disclosures) · `plays` (validated listening events) · `playlists` + `playlist_tracks` · `follows` · `saved_tracks` · `subscription_plans` / `subscriptions` · later: `rights_holders`, `royalty_periods`, `ads`, `audit_log`, `chart_snapshots`, `awards`.

### Key routes
Pages: `/` landing · `/browse` · `/search` · `/releases/[slug]` · `/artists/[slug]` · `/playlists` · `/login` · `/register` · later `/studio`, `/admin`, `/premium`, `/awards`.
API: `/api/auth/*`, `/api/releases`, `/api/tracks`, `/api/plays`, `/api/playlists(+/[id],/[id]/tracks)`, `/api/follows`, `/api/search`, `/api/stream/[trackId]`.

## Risks and assumptions
- No external storage/CDN/payment credentials in this environment → those integrations are stubbed behind real interfaces and clearly labeled; demo audio/artwork is generated locally and marked **Demo content**.
- Chart/royalty integrity rules are enforced at the application layer first; manipulation protections hardened later.
- Single Next.js process serves web + API so a future React Native app can point at the same `/api` routes.

## Phase 1: Foundation + listener core (this run)
Thin vertical slice through every layer: real DB, real API, real UI.
- [ ] Drizzle schema + migrations applied to Postgres (`castawai`)
- [ ] Auth: register / login / logout / me with hashed passwords + session cookies and roles
- [ ] API routes for releases, tracks, plays, playlists (CRUD), follows, search, streaming
- [ ] Cinematic landing page + browsable discovery sections (New Releases, spotlights, genre rails)
- [ ] Working player: play/pause/skip/volume/queue/shuffle/repeat, play events recorded in DB
- [ ] Playlists: create, rename, add/remove tracks, reorder — persisted per user
- [ ] Release and artist pages with follow; search across artists/releases/tracks
- [ ] Demo seed script (clearly labeled) with generated artwork + audio

**Acceptance:** a visitor can register, log in, browse the cinematic home, search, play tracks through the streaming endpoint, follow an artist, build a playlist, reload and see everything come back from Postgres.

## Phase 2: Artist studio
- [ ] Artist account creation tied to paid tiers (Starter/Pro/Label), profile customization
- [ ] Audio + artwork upload with validation, metadata, creative-method disclosures, release scheduling
- [ ] Uploads enter `pending_review`; Label tier supports multiple artist profiles
- **Acceptance:** an artist can upload a release with disclosures and see it queued for admin review.

## Phase 3: Administrator dashboard
- [ ] Admin review queue (approve/reject releases), user/artist management, moderation
- [ ] Audit log, role permissions, suspicious-stream monitoring basics, category & featured-content management
- **Acceptance:** an admin approves a pending release and it appears in discovery.

## Phase 4: Subscriptions + advertising
- [ ] Subscription plans modeled; Stripe checkout + webhooks (needs credentials — flagged)
- [ ] Premium = ad-free; free tier gets audio/display ad placements; ad admin interface
- **Acceptance:** plan comparison works end-to-end in test mode with clear disclosure.

## Phase 5: Charts, royalties, awards, docs + deploy
- [ ] Chart jobs from validated plays (anti-manipulation guards), Top 100 / AI / Human / genre charts
- [ ] Royalty accounting schema: rights holders, periods, allocation reports; no payable claim until rules ship
- [ ] Awards landing (voting disabled), API docs, deployment guide, Vercel deploy
- **Acceptance:** charts compute from real plays; docs + live deployment.
