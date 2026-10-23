-- Complete database schema for Tony Multi Ventures. Idempotent: safe to run on an empty
-- database (e.g. a new Supabase project) or an existing one.
--
-- The server runs this on every startup (server/media/ensure-schema.ts), so running it by
-- hand in the Supabase SQL editor is only needed if the app's database user can't create
-- tables. Mirrors shared/schema.ts; constraint names match drizzle-kit, so `npm run db:push`
-- afterwards reports no changes.

CREATE TABLE IF NOT EXISTS "admin_users" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "username" text NOT NULL,
  "password" text NOT NULL,
  CONSTRAINT "admin_users_username_unique" UNIQUE ("username")
);

CREATE TABLE IF NOT EXISTS "properties" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "location" text NOT NULL,
  "price" numeric(12, 2) NOT NULL,
  "description" text NOT NULL,
  "short_description" text NOT NULL,
  "property_type" text NOT NULL,
  "bedrooms" integer,
  "bathrooms" integer,
  "area" integer,
  "image_url" text,
  "images" text[],
  "featured" boolean DEFAULT false,
  "status" text DEFAULT 'available' NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "leads" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "message" text,
  "property_id" integer,
  "source" text DEFAULT 'website' NOT NULL,
  "status" text DEFAULT 'new' NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "leads_property_id_properties_id_fk"
    FOREIGN KEY ("property_id") REFERENCES "properties"("id")
);

CREATE TABLE IF NOT EXISTS "property_media" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" integer NOT NULL,
  "kind" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "storage_path" text,
  "url" text NOT NULL,
  "poster_id" uuid,
  "mime_type" text,
  "size_bytes" integer,
  "duration_sec" integer,
  "width" integer,
  "height" integer,
  "title" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "property_media_property_id_properties_id_fk"
    FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE,
  CONSTRAINT "property_media_poster_id_property_media_id_fk"
    FOREIGN KEY ("poster_id") REFERENCES "property_media"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "property_media_property_kind_idx"
  ON "property_media" ("property_id", "kind", "status");

CREATE TABLE IF NOT EXISTS "conversations" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "conversation_id" integer NOT NULL,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "messages_conversation_id_conversations_id_fk"
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE
);

-- Admin login sessions (same shape connect-pg-simple creates).
CREATE TABLE IF NOT EXISTS "admin_sessions" (
  "sid" varchar NOT NULL COLLATE "default" PRIMARY KEY,
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "admin_sessions" ("expire");

-- Supabase publishes the public schema through its REST API to anyone holding the project's
-- anon key. With RLS on and no policies, that API sees nothing; the app connects as the table
-- owner, which RLS doesn't apply to.
ALTER TABLE "admin_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "properties" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "property_media" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin_sessions" ENABLE ROW LEVEL SECURITY;
