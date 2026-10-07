import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, boolean, decimal, uuid, index, type AnyPgColumn } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  shortDescription: text("short_description").notNull(),
  propertyType: text("property_type").notNull(),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  area: integer("area"),
  imageUrl: text("image_url"),
  images: text("images").array(),
  featured: boolean("featured").default(false),
  status: text("status").notNull().default("available"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const propertiesRelations = relations(properties, ({ many }) => ({
  leads: many(leads),
}));

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
});

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

// Videos, 3D models, virtual tour links and floor plans attached to a property.
// Files live in Supabase Storage at `storage_path`; rows start as "pending" when an
// upload URL is issued and become "ready" only after the server verifies the object.
export const MEDIA_KINDS = ["video", "poster", "model3d", "floorplan", "tour"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];
export const MEDIA_STATUSES = ["pending", "ready"] as const;
export type MediaStatus = (typeof MEDIA_STATUSES)[number];

export const propertyMedia = pgTable(
  "property_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: integer("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    kind: text("kind").$type<MediaKind>().notNull(),
    status: text("status").$type<MediaStatus>().notNull().default("pending"),
    storagePath: text("storage_path"),
    url: text("url").notNull(),
    posterId: uuid("poster_id").references((): AnyPgColumn => propertyMedia.id, {
      onDelete: "set null",
    }),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    durationSec: integer("duration_sec"),
    width: integer("width"),
    height: integer("height"),
    title: text("title"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => [index("property_media_property_kind_idx").on(table.propertyId, table.kind, table.status)]
);

export type PropertyMedia = typeof propertyMedia.$inferSelect;
export type InsertPropertyMedia = typeof propertyMedia.$inferInsert;

/** Media as exposed on the public property endpoint (ready items only, no storage internals). */
export interface PublicPropertyMedia {
  id: string;
  kind: Exclude<MediaKind, "poster">;
  url: string;
  posterUrl: string | null;
  mimeType: string | null;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  title: string | null;
  sortOrder: number;
}

/** Admin view of a media row, with the poster resolved to a URL. */
export type AdminPropertyMedia = PropertyMedia & { posterUrl: string | null };

export type PropertyWithMediaFlags = Property & { hasVideo: boolean; has3d: boolean };
export type PropertyWithMedia = PropertyWithMediaFlags & { media: PublicPropertyMedia[] };

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message"),
  propertyId: integer("property_id").references(() => properties.id),
  source: text("source").notNull().default("website"),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const leadsRelations = relations(leads, ({ one }) => ({
  property: one(properties, {
    fields: [leads.propertyId],
    references: [properties.id],
  }),
}));

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

export * from "./models/chat";
