// Upload limits shared by the server (enforcement) and the admin UI (early feedback).

export const MB = 1024 * 1024;

/** Longest video an admin may upload, in seconds. */
export const MAX_VIDEO_SECONDS = 4 * 60;

/** Size the in-browser compressor aims to stay under (Supabase Free caps files at 50 MB). */
export const VIDEO_TARGET_MAX_BYTES = 45 * MB;

export const UPLOAD_KINDS = ["video", "poster", "model3d", "floorplan"] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

export interface UploadKindSpec {
  /** Accepted MIME type → file extension the server stores it under. */
  mimes: Record<string, string>;
  maxBytes: number;
  maxPerProperty: number;
}

export const UPLOAD_KIND_SPECS: Record<UploadKind, UploadKindSpec> = {
  video: { mimes: { "video/mp4": "mp4" }, maxBytes: 50 * MB, maxPerProperty: 3 },
  poster: { mimes: { "image/jpeg": "jpg", "image/webp": "webp" }, maxBytes: 5 * MB, maxPerProperty: 6 },
  model3d: { mimes: { "model/gltf-binary": "glb" }, maxBytes: 50 * MB, maxPerProperty: 2 },
  floorplan: {
    mimes: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" },
    maxBytes: 10 * MB,
    maxPerProperty: 10,
  },
};

/** Main listing photo (legacy `/api/uploads/upload` route). */
export const IMAGE_MIMES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
export const IMAGE_MAX_BYTES = 10 * MB;

export const DEFAULT_TOUR_HOSTS = ["my.matterport.com", "kuula.co"];
