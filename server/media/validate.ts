import type { UploadKind } from "@shared/media-limits";

// Content checks run against the first bytes of an uploaded object. The declared
// Content-Type is never trusted on its own.

const ascii = (buf: Uint8Array, start: number, end: number) =>
  Buffer.from(buf.subarray(start, end)).toString("latin1");

export function sniffImageMime(buf: Uint8Array): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => buf[i] === b)
  ) {
    return "image/png";
  }
  if (buf.length >= 12 && ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 12) === "WEBP") return "image/webp";
  if (buf.length >= 12 && ascii(buf, 4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(buf, 8, 12))) {
    return "image/avif";
  }
  return null;
}

// MP4 major brands browsers play. QuickTime ("qt  ") is deliberately excluded; the
// admin UI re-encodes .mov files to MP4 before upload.
const MP4_BRANDS = new Set(["isom", "iso2", "iso4", "iso5", "iso6", "mp41", "mp42", "avc1", "M4V ", "dash", "mmp4", "MSNV"]);

export function isMp4(buf: Uint8Array): boolean {
  return buf.length >= 12 && ascii(buf, 4, 8) === "ftyp" && MP4_BRANDS.has(ascii(buf, 8, 12));
}

/** Returns an error message, or null when the bytes are a well-formed GLB 2.0 header. */
export function checkGlbHeader(buf: Uint8Array, totalSize: number): string | null {
  if (buf.length < 20) return "File is too small to be a GLB model";
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (ascii(buf, 0, 4) !== "glTF") return "Not a GLB file";
  if (view.getUint32(4, true) !== 2) return "Only glTF 2.0 (.glb) models are supported";
  if (view.getUint32(8, true) !== totalSize) return "GLB file is truncated or corrupted";
  if (ascii(buf, 16, 20) !== "JSON") return "GLB file is corrupted";
  return null;
}

/** Checks an uploaded object's leading bytes against its kind and declared type. */
export function checkUploadedContent(
  kind: UploadKind,
  declaredMime: string,
  head: Uint8Array,
  totalSize: number
): string | null {
  switch (kind) {
    case "video":
      return isMp4(head) ? null : "File is not an MP4 video";
    case "model3d":
      return checkGlbHeader(head, totalSize);
    case "poster":
    case "floorplan":
      return sniffImageMime(head) === declaredMime ? null : "File content doesn't match its image type";
  }
}

const MAX_URL_LENGTH = 2048;

/** Returns the normalized tour URL when it's https on an allowlisted host, else null. */
export function normalizeTourUrl(raw: string, allowedHosts: string[]): string | null {
  if (typeof raw !== "string" || raw.length > MAX_URL_LENGTH) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  if (!allowedHosts.includes(url.hostname.toLowerCase())) return null;
  return url.toString();
}

/**
 * Listing images may only point at the bundled `/images/*` assets or at public objects
 * in one of our Supabase buckets.
 */
export function isAllowedImageUrl(raw: string, supabaseUrl: string | undefined, buckets: string[]): boolean {
  if (typeof raw !== "string" || raw.length > MAX_URL_LENGTH) return false;
  if (/^\/images\/[A-Za-z0-9._-]+$/.test(raw) && !raw.includes("..")) return true;
  if (!supabaseUrl) return false;
  let url: URL;
  let base: URL;
  try {
    url = new URL(raw);
    base = new URL(supabaseUrl);
  } catch {
    return false;
  }
  if (url.origin !== base.origin || url.search || url.hash || url.pathname.includes("..")) return false;
  return buckets.some((b) => url.pathname.startsWith(`/storage/v1/object/public/${b}/`));
}
