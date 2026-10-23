import type { UploadKind } from "@shared/media-limits";
import type { AdminPropertyMedia } from "@shared/schema";

export class UploadCancelledError extends Error {
  constructor() {
    super("Upload cancelled");
  }
}

async function readError(res: Response): Promise<string> {
  const data = await res.json().catch(() => null);
  return data?.error || data?.message || `Request failed (${res.status})`;
}

/** JSON request to our API that surfaces the server's `{ error }` message on failure. */
export async function adminJson<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await readError(res));
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/** PUTs the file straight to Supabase Storage via the signed URL, reporting real progress. */
function putToSignedUrl(
  url: string,
  file: Blob,
  contentType: string,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new UploadCancelledError());

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.((e.loaded / e.total) * 100);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let message = `Storage rejected the upload (${xhr.status})`;
      try {
        const data = JSON.parse(xhr.responseText);
        message = data.message || data.error || message;
      } catch {}
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("Network error while uploading. Check your connection and try again."));
    xhr.onabort = () => reject(new UploadCancelledError());
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });

    // Same multipart shape supabase-js's uploadToSignedUrl sends for browser Blobs: storage
    // takes the object's content type from the part (checked against the bucket allowlist).
    const body = new FormData();
    // Object names are unique per upload, so the CDN can cache them indefinitely.
    body.append("cacheControl", "31536000");
    body.append("", new Blob([file], { type: contentType }));
    xhr.send(body);
  });
}

export interface MediaUploadOptions {
  propertyId: number;
  kind: UploadKind;
  file: Blob;
  contentType: string;
  durationSec?: number;
  width?: number;
  height?: number;
  posterId?: string;
  onProgress?: (percent: number) => void;
  onVerifying?: () => void;
  signal?: AbortSignal;
}

/**
 * 1. ask the API for a signed upload URL (it validates type, size, limits and quota),
 * 2. upload the bytes directly to storage,
 * 3. ask the API to verify the stored file and publish it.
 */
export async function uploadPropertyMedia(opts: MediaUploadOptions): Promise<AdminPropertyMedia> {
  const { mediaId, uploadUrl } = await adminJson<{ mediaId: string; uploadUrl: string }>(
    "POST",
    `/api/admin/properties/${opts.propertyId}/media/upload-url`,
    {
      kind: opts.kind,
      contentType: opts.contentType,
      sizeBytes: opts.file.size,
      durationSec: opts.durationSec,
    }
  );

  try {
    await putToSignedUrl(uploadUrl, opts.file, opts.contentType, opts.onProgress, opts.signal);
  } catch (err) {
    // Free the reserved slot right away rather than waiting for the 24h cleanup.
    adminJson("DELETE", `/api/admin/media/${mediaId}`).catch(() => {});
    throw err;
  }

  opts.onVerifying?.();
  return adminJson<AdminPropertyMedia>("POST", `/api/admin/media/${mediaId}/complete`, {
    width: opts.width,
    height: opts.height,
    durationSec: opts.durationSec,
    posterId: opts.posterId,
  });
}
