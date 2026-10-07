import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { IMAGE_MIMES, IMAGE_MAX_BYTES, UPLOAD_KIND_SPECS, MB } from "@shared/media-limits";

/** Listing photos (main image). */
export const IMAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "property-images";
/** Videos, posters, 3D models and floor plans. */
export const MEDIA_BUCKET = process.env.SUPABASE_MEDIA_BUCKET || "property-media";

const MEDIA_BUCKET_MIMES = Array.from(
  new Set(Object.values(UPLOAD_KIND_SPECS).flatMap((spec) => Object.keys(spec.mimes)))
);
// Supabase Free caps every file at 50 MB; a bucket limit above the plan limit is rejected.
const MEDIA_BUCKET_MAX_BYTES = 50 * MB;

let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  // Bucket management and signed upload URLs need the service role key; the anon key
  // would fail at runtime in confusing ways, so it's deliberately not used here.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return supabase;
}

function requireClient(): SupabaseClient {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return client;
}

export function isSupabaseConfigured(): boolean {
  return !!getSupabaseClient();
}

async function ensureOneBucket(
  client: SupabaseClient,
  name: string,
  options: { public: boolean; fileSizeLimit: number; allowedMimeTypes: string[] }
): Promise<void> {
  const { data } = await client.storage.getBucket(name);
  const { error } = data
    ? await client.storage.updateBucket(name, options)
    : await client.storage.createBucket(name, options);
  if (error) throw new Error(`Failed to configure bucket "${name}": ${error.message}`);
}

/** Creates both buckets if missing and (re)applies their type and size restrictions. */
export async function ensureBuckets(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  await ensureOneBucket(client, IMAGE_BUCKET, {
    public: true,
    fileSizeLimit: IMAGE_MAX_BYTES,
    allowedMimeTypes: Object.keys(IMAGE_MIMES),
  });
  await ensureOneBucket(client, MEDIA_BUCKET, {
    public: true,
    fileSizeLimit: MEDIA_BUCKET_MAX_BYTES,
    allowedMimeTypes: MEDIA_BUCKET_MIMES,
  });
}

/** Uploads a listing photo. The caller has already verified the type; the name is server-chosen. */
export async function uploadImage(fileBuffer: Buffer, mime: string): Promise<string> {
  const client = requireClient();
  const ext = IMAGE_MIMES[mime];
  if (!ext) throw new Error(`Unsupported image type: ${mime}`);
  const objectName = `uploads/${randomUUID()}.${ext}`;

  const { error } = await client.storage.from(IMAGE_BUCKET).upload(objectName, fileBuffer, {
    contentType: mime,
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  return client.storage.from(IMAGE_BUCKET).getPublicUrl(objectName).data.publicUrl;
}

export function mediaPublicUrl(path: string): string {
  return requireClient().storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Signed URL the browser PUTs the file to directly (valid for 2 hours, one path, no overwrite). */
export async function createMediaUploadUrl(path: string): Promise<string> {
  const { data, error } = await requireClient().storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`Could not create upload URL: ${error?.message}`);
  return data.signedUrl;
}

/** Size and stored content type of a media object, or null if it doesn't exist. */
export async function getMediaObjectInfo(
  path: string
): Promise<{ size: number; contentType: string | null } | null> {
  const bucket = requireClient().storage.from(MEDIA_BUCKET);
  const { data, error } = await bucket.info(path);
  if (!error && data) {
    // storage-js camel-cases the response at runtime even though its types are snake_case.
    const info = data as unknown as Record<string, any>;
    const size = info.size ?? info.metadata?.size;
    if (typeof size === "number") {
      return { size, contentType: info.contentType ?? info.content_type ?? info.metadata?.mimetype ?? null };
    }
  }

  // Older Storage versions have no /object/info endpoint; list() metadata works everywhere.
  const slash = path.lastIndexOf("/");
  const { data: items } = await bucket.list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 10 });
  const item = items?.find((i) => i.name === path.slice(slash + 1));
  const size = item?.metadata?.size;
  if (typeof size !== "number") return null;
  return { size, contentType: item?.metadata?.mimetype ?? null };
}

/** Reads the first `maxBytes` of a media object without downloading the whole file. */
export async function readMediaObjectHead(path: string, maxBytes = 64): Promise<Uint8Array> {
  const url = `${process.env.SUPABASE_URL}/storage/v1/object/authenticated/${MEDIA_BUCKET}/${encodeObjectPath(path)}`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}`, apikey: key, Range: `bytes=0-${maxBytes - 1}` },
  });
  if (!res.ok || !res.body) throw new Error(`Could not read uploaded object (HTTP ${res.status})`);

  // A server that ignores Range sends the whole file; stop reading once we have enough.
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (received < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
  }
  await reader.cancel().catch(() => {});

  const head = new Uint8Array(Math.min(received, maxBytes));
  let offset = 0;
  for (const chunk of chunks) {
    const part = chunk.subarray(0, head.length - offset);
    head.set(part, offset);
    offset += part.length;
    if (offset >= head.length) break;
  }
  return head;
}

export async function removeMediaObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await requireClient().storage.from(MEDIA_BUCKET).remove(paths);
  if (error) throw new Error(`Failed to delete media: ${error.message}`);
}

/** Deletes a listing photo by its public URL. URLs outside our image bucket are ignored. */
export async function deleteImageByUrl(publicUrl: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const objectName = extractObjectName(publicUrl, IMAGE_BUCKET);
  if (!objectName) return;

  await client.storage.from(IMAGE_BUCKET).remove([objectName]);
}

function extractObjectName(publicUrl: string, bucket: string): string | null {
  const base = process.env.SUPABASE_URL;
  if (!base) return null;
  try {
    const url = new URL(publicUrl);
    if (url.origin !== new URL(base).origin) return null;
    const prefix = `/storage/v1/object/public/${bucket}/`;
    return url.pathname.startsWith(prefix) ? decodeURIComponent(url.pathname.slice(prefix.length)) : null;
  } catch {
    return null;
  }
}

function encodeObjectPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}
