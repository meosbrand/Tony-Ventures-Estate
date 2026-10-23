import express, { type Express } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { storage } from "../storage";
import {
  requireAdmin,
  requireSameOrigin,
  adminWriteLimiter,
  mediaUploadLimiter,
  parseIntParam,
  parseUuidParam,
  getTourHosts,
} from "../middleware/security";
import {
  isSupabaseConfigured,
  createMediaUploadUrl,
  mediaPublicUrl,
  getMediaObjectInfo,
  readMediaObjectHead,
  removeMediaObjects,
} from "../supabase-storage";
import { checkUploadedContent, normalizeTourUrl } from "./validate";
import {
  UPLOAD_KINDS,
  UPLOAD_KIND_SPECS,
  MAX_VIDEO_SECONDS,
  MB,
} from "@shared/media-limits";
import type {
  AdminPropertyMedia,
  Property,
  PropertyMedia,
  PropertyWithMediaFlags,
  PublicPropertyMedia,
} from "@shared/schema";

const PENDING_TTL_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;

function storageBudgetBytes(): number {
  const mb = Number(process.env.MEDIA_STORAGE_BUDGET_MB);
  return (Number.isFinite(mb) && mb > 0 ? mb : 900) * MB;
}

function posterUrlFor(row: PropertyMedia, all: PropertyMedia[]): string | null {
  if (!row.posterId) return null;
  const poster = all.find((m) => m.id === row.posterId && m.status === "ready");
  return poster?.url ?? null;
}

export function toPublicMedia(rows: PropertyMedia[]): PublicPropertyMedia[] {
  return rows
    .filter((m) => m.status === "ready" && m.kind !== "poster")
    .map((m) => ({
      id: m.id,
      kind: m.kind as PublicPropertyMedia["kind"],
      url: m.url,
      posterUrl: posterUrlFor(m, rows),
      mimeType: m.mimeType,
      durationSec: m.durationSec,
      width: m.width,
      height: m.height,
      title: m.title,
      sortOrder: m.sortOrder,
    }));
}

function toAdminMedia(rows: PropertyMedia[]): AdminPropertyMedia[] {
  return rows.map((m) => ({ ...m, posterUrl: posterUrlFor(m, rows) }));
}

export async function withMediaFlags(props: Property[]): Promise<PropertyWithMediaFlags[]> {
  const flags = await storage.getMediaFlags();
  return props.map((p) => ({ ...p, ...(flags.get(p.id) ?? { hasVideo: false, has3d: false }) }));
}

/** Storage paths of every file belonging to a property (for cleanup after deleting it). */
export async function mediaPathsForProperty(propertyId: number): Promise<string[]> {
  const rows = await storage.getMediaForProperty(propertyId, false);
  return rows.map((m) => m.storagePath).filter((p): p is string => !!p);
}

const uploadUrlSchema = z.object({
  kind: z.enum(UPLOAD_KINDS),
  contentType: z.string().max(100),
  sizeBytes: z.number().int().positive(),
  durationSec: z.number().nonnegative().max(24 * 60 * 60).optional(),
});

const dimension = z.number().int().positive().max(16384).optional();
const completeSchema = z.object({
  width: dimension,
  height: dimension,
  durationSec: z.number().nonnegative().max(24 * 60 * 60).optional(),
  posterId: z.string().uuid().optional(),
});

const updateSchema = z
  .object({
    title: z.string().trim().max(120).nullable().optional(),
    sortOrder: z.number().int().min(0).max(1000).optional(),
  })
  .strict();

const tourSchema = z.object({
  url: z.string().max(2048),
  title: z.string().trim().max(120).optional(),
});

/**
 * Admin media API. Every route here is behind requireAdmin + requireSameOrigin + a write
 * rate limit, applied once at the router so no route can forget them.
 *
 * Must be registered after /api/admin/login, /logout and /session: router-level
 * middleware runs for every /api/admin/* request that reaches the router.
 */
export function registerMediaRoutes(app: Express) {
  const admin = express.Router();
  admin.use(requireAdmin, requireSameOrigin, adminWriteLimiter);

  admin.get("/media/usage", async (_req, res) => {
    try {
      res.json({
        usedBytes: await storage.getMediaUsageBytes(),
        budgetBytes: storageBudgetBytes(),
        tourHosts: getTourHosts(),
        storageConfigured: isSupabaseConfigured(),
      });
    } catch (error) {
      console.error("Media usage error:", error);
      res.status(500).json({ error: "Failed to load storage usage" });
    }
  });

  admin.get("/properties/:propertyId/media", async (req, res) => {
    const propertyId = parseIntParam(req.params.propertyId);
    if (!propertyId) return res.status(400).json({ error: "Invalid property id" });
    try {
      res.json(toAdminMedia(await storage.getMediaForProperty(propertyId, false)));
    } catch (error) {
      console.error("List media error:", error);
      res.status(500).json({ error: "Failed to load media" });
    }
  });

  admin.post("/properties/:propertyId/media/upload-url", mediaUploadLimiter, async (req, res) => {
    const propertyId = parseIntParam(req.params.propertyId);
    if (!propertyId) return res.status(400).json({ error: "Invalid property id" });
    if (!isSupabaseConfigured()) {
      return res.status(503).json({
        error: "Media storage not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      });
    }

    const parsed = uploadUrlSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid upload request" });
    const { kind, contentType, sizeBytes, durationSec } = parsed.data;
    const spec = UPLOAD_KIND_SPECS[kind];

    const ext = spec.mimes[contentType];
    if (!ext) return res.status(400).json({ error: `File type ${contentType || "(unknown)"} is not allowed here` });
    if (sizeBytes > spec.maxBytes) {
      return res.status(413).json({ error: `File is too large (max ${Math.round(spec.maxBytes / MB)} MB)` });
    }
    if (kind === "video" && (durationSec === undefined || durationSec > MAX_VIDEO_SECONDS)) {
      return res.status(400).json({ error: `Videos must be ${MAX_VIDEO_SECONDS / 60} minutes or shorter` });
    }

    try {
      if (!(await storage.getProperty(propertyId))) {
        return res.status(404).json({ error: "Property not found" });
      }
      if ((await storage.countMedia(propertyId, kind)) >= spec.maxPerProperty) {
        return res.status(409).json({ error: `This property already has the maximum of ${spec.maxPerProperty} ${kind} files` });
      }
      if ((await storage.getMediaUsageBytes()) + sizeBytes > storageBudgetBytes()) {
        return res.status(409).json({ error: "Media storage is full. Delete unused videos or models first." });
      }

      // The browser never chooses the object path.
      const path = `properties/${propertyId}/${kind}/${randomUUID()}.${ext}`;
      const uploadUrl = await createMediaUploadUrl(path);
      const media = await storage.createMedia({
        propertyId,
        kind,
        status: "pending",
        storagePath: path,
        url: mediaPublicUrl(path),
        mimeType: contentType,
        sizeBytes,
        durationSec: kind === "video" ? Math.round(durationSec!) : null,
      });

      res.status(201).json({ mediaId: media.id, uploadUrl, contentType });
    } catch (error) {
      console.error("Upload URL error:", error);
      res.status(500).json({ error: "Could not start the upload" });
    }
  });

  admin.post("/media/:mediaId/complete", async (req, res) => {
    const mediaId = parseUuidParam(req.params.mediaId);
    if (!mediaId) return res.status(400).json({ error: "Invalid media id" });
    const parsed = completeSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "Invalid request" });

    try {
      const media = await storage.getMedia(mediaId);
      if (!media || media.kind === "tour" || !media.storagePath) {
        return res.status(404).json({ error: "Upload not found" });
      }
      if (media.status === "ready") {
        return res.json(toAdminMedia([media])[0]);
      }

      const kind = media.kind as (typeof UPLOAD_KINDS)[number];
      const info = await getMediaObjectInfo(media.storagePath);
      if (!info) {
        return res.status(400).json({ error: "The file hasn't finished uploading. Please try again." });
      }

      let problem: string | null = null;
      if (info.size <= 0 || info.size > UPLOAD_KIND_SPECS[kind].maxBytes) {
        problem = "File size is not allowed";
      } else {
        const head = await readMediaObjectHead(media.storagePath);
        problem = checkUploadedContent(kind, media.mimeType ?? "", head, info.size);
      }
      if (problem) {
        await removeMediaObjects([media.storagePath]).catch((e) => console.error("Cleanup failed:", e));
        await storage.deleteMedia([media.id]);
        return res.status(422).json({ error: problem });
      }

      let posterId: string | null = null;
      if (parsed.data.posterId) {
        const poster = await storage.getMedia(parsed.data.posterId);
        if (
          kind !== "video" ||
          !poster ||
          poster.kind !== "poster" ||
          poster.status !== "ready" ||
          poster.propertyId !== media.propertyId
        ) {
          return res.status(400).json({ error: "Invalid poster" });
        }
        posterId = poster.id;
      }

      const updated = await storage.updateMedia(media.id, {
        status: "ready",
        sizeBytes: info.size,
        width: parsed.data.width ?? null,
        height: parsed.data.height ?? null,
        durationSec:
          kind === "video" && parsed.data.durationSec !== undefined
            ? Math.round(parsed.data.durationSec)
            : media.durationSec,
        posterId,
      });
      const all = await storage.getMediaForProperty(media.propertyId, false);
      res.json(toAdminMedia(all).find((m) => m.id === updated!.id));
    } catch (error) {
      console.error("Complete upload error:", error);
      res.status(500).json({ error: "Could not verify the upload" });
    }
  });

  admin.patch("/media/:mediaId", async (req, res) => {
    const mediaId = parseUuidParam(req.params.mediaId);
    if (!mediaId) return res.status(400).json({ error: "Invalid media id" });
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid media update" });
    try {
      const updated = await storage.updateMedia(mediaId, parsed.data);
      if (!updated) return res.status(404).json({ error: "Media not found" });
      res.json(updated);
    } catch (error) {
      console.error("Update media error:", error);
      res.status(500).json({ error: "Failed to update media" });
    }
  });

  admin.delete("/media/:mediaId", async (req, res) => {
    const mediaId = parseUuidParam(req.params.mediaId);
    if (!mediaId) return res.status(400).json({ error: "Invalid media id" });
    try {
      const media = await storage.getMedia(mediaId);
      if (!media) return res.status(404).json({ error: "Media not found" });

      const doomed = [media];
      if (media.posterId) {
        const poster = await storage.getMedia(media.posterId);
        if (poster) doomed.push(poster);
      }
      await removeStoredFiles(doomed);
      await storage.deleteMedia(doomed.map((m) => m.id));
      res.status(204).send();
    } catch (error) {
      console.error("Delete media error:", error);
      res.status(500).json({ error: "Failed to delete media" });
    }
  });

  admin.put("/properties/:propertyId/tour", async (req, res) => {
    const propertyId = parseIntParam(req.params.propertyId);
    if (!propertyId) return res.status(400).json({ error: "Invalid property id" });
    const parsed = tourSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid tour link" });

    const hosts = getTourHosts();
    const url = normalizeTourUrl(parsed.data.url, hosts);
    if (!url) {
      return res.status(400).json({ error: `Tour links must be https links from: ${hosts.join(", ")}` });
    }

    try {
      if (!(await storage.getProperty(propertyId))) {
        return res.status(404).json({ error: "Property not found" });
      }
      const existing = (await storage.getMediaForProperty(propertyId, false)).filter((m) => m.kind === "tour");
      await storage.deleteMedia(existing.map((m) => m.id));
      const tour = await storage.createMedia({
        propertyId,
        kind: "tour",
        status: "ready",
        url,
        title: parsed.data.title || null,
      });
      res.json(tour);
    } catch (error) {
      console.error("Save tour error:", error);
      res.status(500).json({ error: "Failed to save tour link" });
    }
  });

  admin.delete("/properties/:propertyId/tour", async (req, res) => {
    const propertyId = parseIntParam(req.params.propertyId);
    if (!propertyId) return res.status(400).json({ error: "Invalid property id" });
    try {
      const existing = (await storage.getMediaForProperty(propertyId, false)).filter((m) => m.kind === "tour");
      await storage.deleteMedia(existing.map((m) => m.id));
      res.status(204).send();
    } catch (error) {
      console.error("Delete tour error:", error);
      res.status(500).json({ error: "Failed to remove tour link" });
    }
  });

  app.use("/api/admin", admin);
}

async function removeStoredFiles(rows: PropertyMedia[]): Promise<void> {
  const paths = rows.map((m) => m.storagePath).filter((p): p is string => !!p);
  if (paths.length > 0 && isSupabaseConfigured()) await removeMediaObjects(paths);
}

/** Deletes uploads that were started but never completed (closed tab, failed network). */
async function cleanupAbandonedUploads(): Promise<void> {
  const stale = await storage.getPendingMediaOlderThan(new Date(Date.now() - PENDING_TTL_MS));
  if (stale.length === 0) return;
  await removeStoredFiles(stale);
  await storage.deleteMedia(stale.map((m) => m.id));
  console.log(`Removed ${stale.length} abandoned media upload(s)`);
}

export function startMediaCleanup(): void {
  const run = () => cleanupAbandonedUploads().catch((e) => console.error("Media cleanup failed:", e));
  setTimeout(run, 60 * 1000).unref();
  setInterval(run, CLEANUP_INTERVAL_MS).unref();
}
