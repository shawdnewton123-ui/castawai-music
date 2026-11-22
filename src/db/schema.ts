import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  customType,
  pgEnum,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const userRoleEnum = pgEnum("user_role", ["listener", "artist", "label", "admin"]);
export const releaseTypeEnum = pgEnum("release_type", ["album", "ep", "single"]);
export const creativeMethodEnum = pgEnum("creative_method", ["human", "ai_assisted", "ai_generated"]);
export const releaseStatusEnum = pgEnum("release_status", [
  "draft",
  "pending_review",
  "approved",
  "rejected",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    role: userRoleEnum("role").notNull().default("listener"),
    country: text("country"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)]
);

export const sessions = pgTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)]
);

export const artists = pgTable(
  "artists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    bio: text("bio"),
    imageUrl: text("image_url"),
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("artists_slug_unique").on(t.slug)]
);

export const releases = pgTable(
  "releases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    type: releaseTypeEnum("type").notNull().default("single"),
    creativeMethod: creativeMethodEnum("creative_method").notNull(),
    genre: text("genre").notNull(),
    releaseDate: timestamp("release_date", { withTimezone: true }).notNull(),
    coverUrl: text("cover_url"),
    description: text("description"),
    status: releaseStatusEnum("status").notNull().default("pending_review"),
    explicit: boolean("explicit").notNull().default(false),
    ownershipDeclaration: boolean("ownership_declaration").notNull().default(false),
    distributionRights: text("distribution_rights"),
    aiToolDisclosures: text("ai_tool_disclosures"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("releases_slug_unique").on(t.slug),
    index("releases_artist_idx").on(t.artistId),
    index("releases_status_idx").on(t.status),
  ]
);

export const tracks = pgTable(
  "tracks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    releaseId: uuid("release_id")
      .notNull()
      .references(() => releases.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    trackNumber: integer("track_number").notNull().default(1),
    durationSec: integer("duration_sec").notNull(),
    audioPath: text("audio_path").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("tracks_release_idx").on(t.releaseId)]
);

export const plays = pgTable(
  "plays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    trackId: uuid("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("plays_track_idx").on(t.trackId), index("plays_user_idx").on(t.userId)]
);

export const playlists = pgTable(
  "playlists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("playlists_user_idx").on(t.userId)]
);

export const playlistTracks = pgTable(
  "playlist_tracks",
  {
    playlistId: uuid("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    trackId: uuid("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.playlistId, t.trackId] })]
);

export const follows = pgTable(
  "follows",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.artistId] })]
);

export const savedTracks = pgTable(
  "saved_tracks",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    trackId: uuid("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.trackId] })]
);

// Uploaded audio and artwork, stored in Postgres so uploads work on
// serverless hosting (no writable filesystem). Served via /api/media/[id].
export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // "audio" | "artwork"
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    data: bytea("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("media_assets_owner_idx").on(t.ownerUserId)]
);
