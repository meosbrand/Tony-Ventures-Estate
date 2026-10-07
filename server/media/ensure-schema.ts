import { pool } from "../db";

// The Docker image doesn't run `drizzle-kit push`, so create the media table on startup
// if it's missing. Idempotent; keep in sync with shared/schema.ts and
// migrations/0001_property_media.sql.
const MEDIA_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS property_media (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   integer NOT NULL,
  kind          text NOT NULL,
  status        text NOT NULL DEFAULT 'pending',
  storage_path  text,
  url           text NOT NULL,
  poster_id     uuid,
  mime_type     text,
  size_bytes    integer,
  duration_sec  integer,
  width         integer,
  height        integer,
  title         text,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Constraint names match what drizzle-kit generates, so a later db:push sees no diff.
  CONSTRAINT property_media_property_id_properties_id_fk
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT property_media_poster_id_property_media_id_fk
    FOREIGN KEY (poster_id) REFERENCES property_media(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS property_media_property_kind_idx
  ON property_media (property_id, kind, status);
`;

export async function ensureMediaSchema(): Promise<void> {
  await pool.query(MEDIA_SCHEMA_SQL);
}
