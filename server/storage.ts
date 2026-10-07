import {
  type User, type InsertUser,
  type Property, type InsertProperty,
  type Lead, type InsertLead,
  type PropertyMedia, type InsertPropertyMedia, type MediaKind,
  users, properties, leads, propertyMedia,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, asc, inArray, lt, ne, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getProperties(): Promise<Property[]>;
  getFeaturedProperties(): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: number): Promise<void>;

  getLeads(): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLeadStatus(id: number, status: string): Promise<Lead | undefined>;
  deleteLead(id: number): Promise<void>;

  getMediaFlags(): Promise<Map<number, { hasVideo: boolean; has3d: boolean }>>;
  getMediaForProperty(propertyId: number, readyOnly: boolean): Promise<PropertyMedia[]>;
  getMedia(id: string): Promise<PropertyMedia | undefined>;
  createMedia(media: InsertPropertyMedia): Promise<PropertyMedia>;
  updateMedia(id: string, media: Partial<InsertPropertyMedia>): Promise<PropertyMedia | undefined>;
  deleteMedia(ids: string[]): Promise<void>;
  countMedia(propertyId: number, kind: MediaKind): Promise<number>;
  getMediaUsageBytes(): Promise<number>;
  getPendingMediaOlderThan(cutoff: Date): Promise<PropertyMedia[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getProperties(): Promise<Property[]> {
    return db.select().from(properties).orderBy(desc(properties.createdAt));
  }

  async getFeaturedProperties(): Promise<Property[]> {
    return db.select().from(properties).where(eq(properties.featured, true)).orderBy(desc(properties.createdAt));
  }

  async getProperty(id: number): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property || undefined;
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const [created] = await db.insert(properties).values(property).returning();
    return created;
  }

  async updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined> {
    const [updated] = await db.update(properties).set(property).where(eq(properties.id, id)).returning();
    return updated || undefined;
  }

  async deleteProperty(id: number): Promise<void> {
    await db.delete(properties).where(eq(properties.id, id));
  }

  async getLeads(): Promise<Lead[]> {
    return db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLead(id: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead || undefined;
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [created] = await db.insert(leads).values(lead).returning();
    return created;
  }

  async updateLeadStatus(id: number, status: string): Promise<Lead | undefined> {
    const [updated] = await db.update(leads).set({ status }).where(eq(leads.id, id)).returning();
    return updated || undefined;
  }

  async deleteLead(id: number): Promise<void> {
    await db.delete(leads).where(eq(leads.id, id));
  }

  async getMediaFlags(): Promise<Map<number, { hasVideo: boolean; has3d: boolean }>> {
    const rows = await db
      .selectDistinct({ propertyId: propertyMedia.propertyId, kind: propertyMedia.kind })
      .from(propertyMedia)
      .where(and(eq(propertyMedia.status, "ready"), inArray(propertyMedia.kind, ["video", "model3d", "tour"])));
    const flags = new Map<number, { hasVideo: boolean; has3d: boolean }>();
    for (const { propertyId, kind } of rows) {
      const f = flags.get(propertyId) ?? { hasVideo: false, has3d: false };
      if (kind === "video") f.hasVideo = true;
      else f.has3d = true;
      flags.set(propertyId, f);
    }
    return flags;
  }

  async getMediaForProperty(propertyId: number, readyOnly: boolean): Promise<PropertyMedia[]> {
    const where = readyOnly
      ? and(eq(propertyMedia.propertyId, propertyId), eq(propertyMedia.status, "ready"))
      : eq(propertyMedia.propertyId, propertyId);
    return db
      .select()
      .from(propertyMedia)
      .where(where)
      .orderBy(asc(propertyMedia.sortOrder), asc(propertyMedia.createdAt));
  }

  async getMedia(id: string): Promise<PropertyMedia | undefined> {
    const [media] = await db.select().from(propertyMedia).where(eq(propertyMedia.id, id));
    return media || undefined;
  }

  async createMedia(media: InsertPropertyMedia): Promise<PropertyMedia> {
    const [created] = await db.insert(propertyMedia).values(media).returning();
    return created;
  }

  async updateMedia(id: string, media: Partial<InsertPropertyMedia>): Promise<PropertyMedia | undefined> {
    const [updated] = await db.update(propertyMedia).set(media).where(eq(propertyMedia.id, id)).returning();
    return updated || undefined;
  }

  async deleteMedia(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.delete(propertyMedia).where(inArray(propertyMedia.id, ids));
  }

  async countMedia(propertyId: number, kind: MediaKind): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(propertyMedia)
      .where(and(eq(propertyMedia.propertyId, propertyId), eq(propertyMedia.kind, kind)));
    return row?.count ?? 0;
  }

  async getMediaUsageBytes(): Promise<number> {
    const [row] = await db
      .select({ total: sql<number>`coalesce(sum(${propertyMedia.sizeBytes}), 0)::bigint` })
      .from(propertyMedia)
      .where(ne(propertyMedia.kind, "tour"));
    return Number(row?.total ?? 0);
  }

  async getPendingMediaOlderThan(cutoff: Date): Promise<PropertyMedia[]> {
    return db
      .select()
      .from(propertyMedia)
      .where(and(eq(propertyMedia.status, "pending"), lt(propertyMedia.createdAt, cutoff)));
  }
}

export const storage = new DatabaseStorage();
