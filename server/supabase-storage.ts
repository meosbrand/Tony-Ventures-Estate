import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || "property-images";

let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  supabase = createClient(url, key);
  return supabase;
}

export function isSupabaseConfigured(): boolean {
  return !!getSupabaseClient();
}

export async function ensureBucket(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { data } = await client.storage.getBucket(BUCKET_NAME);
  if (!data) {
    await client.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10485760,
    });
  }
}

export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  const ext = fileName.split(".").pop() || "bin";
  const objectName = `uploads/${randomUUID()}.${ext}`;

  const { error } = await client.storage
    .from(BUCKET_NAME)
    .upload(objectName, fileBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  const { data: urlData } = client.storage
    .from(BUCKET_NAME)
    .getPublicUrl(objectName);

  return urlData.publicUrl;
}

export async function deleteFile(filePath: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const objectName = extractObjectName(filePath);
  if (!objectName) return;

  await client.storage.from(BUCKET_NAME).remove([objectName]);
}

function extractObjectName(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const match = url.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
