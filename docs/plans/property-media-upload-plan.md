# Property Video & 3D Upload: Fix Plan and Routing/Security Plan

Status: **Draft, awaiting approval** · Branch: `claude/charming-bardeen-cgif1b` · Date: 2026-10-07

---

## 1. What the research found

### 1.1 Video and 3D upload do not exist in the codebase

There is no video or 3D code anywhere in this repository (`main` and this branch are identical):

- `shared/schema.ts`: the `properties` table has only `imageUrl` and an unused `images[]`. There are no video, poster, 3D model or tour fields and no media table.
- `client/src/pages/admin-dashboard.tsx`: the property form has a single `<input type="file" accept="image/*">`. It has no video or 3D inputs.
- `client/src/pages/property-detail.tsx`: it renders one `<img>` and has no player or 3D viewer.
- `server/routes.ts`: it has one upload route, `POST /api/uploads/upload`, which is for images.

So the "issue" can't be patched in place. The feature has to be built, and the existing image upload path it would build on has the problems listed below.

### 1.2 Why the current upload path can't carry video or 3D

| # | Problem | Where | Effect |
|---|---------|-------|--------|
| A | Every file is proxied through the API server and buffered fully in RAM (`multer.memoryStorage()`) | `server/routes.ts:81` | Render Free has **512 MB RAM / 0.1 CPU**. A few raw phone videos (often 200–600 MB) would crash the instance. |
| B | Uploads travel Browser → Vercel rewrite → Render | `vercel.json` | Vercel documents a 4.5 MB request-body cap for Functions. Its limit for external rewrites is undocumented, so large bodies through the proxy aren't reliable. |
| C | 10 MB cap in both multer and the bucket config | `routes.ts:83`, `supabase-storage.ts:34` | Any real video is rejected. `ensureBucket()` only *creates* the bucket and never updates an existing one, so changing the limit in code has no effect. |
| D | Supabase Free plan limits: **50 MB per file, 1 GB total storage, ~5 GB/month egress** (each pool) | Supabase plan | Uncompressed video is impossible, and even compressed video has to be budgeted carefully. |
| E | The server doesn't compress anything, and Render Free (0.1 CPU) is too weak to run ffmpeg | n/a | Compression has to happen in the admin's browser or with a third-party video service. |
| F | Dead fallback to `/api/uploads/request-url` (a Replit leftover; the route doesn't exist) | `use-upload.ts:49-73` | Errors are confusing, and the code suggests a path that can't work. |
| G | Progress jumps 10% → 100% (`fetch` has no upload progress) | `use-upload.ts` | Long uploads look frozen. |
| H | `server/routes.ts` imports `./auth`, which doesn't exist | `routes.ts:6` | `npm run check` (tsc) fails. The build passes only because esbuild drops unused imports. |

### 1.3 Security problems found in the current code

| # | Issue | Where | Severity |
|---|-------|-------|----------|
| S1 | The upload accepts **any file type**. The extension comes from the user's filename, and the bucket is public with no `allowedMimeTypes` | `routes.ts:298-316`, `supabase-storage.ts` | High: anyone with an admin session (or a stolen one) can host arbitrary files on your public bucket |
| S2 | `imageUrl` accepts any string. The same pattern would let a `javascript:` URL or an off-site iframe URL into video and tour fields | `insertPropertySchema` | High once embeds exist |
| S3 | The session isn't regenerated at login (session fixation) | `routes.ts:456` | Medium |
| S4 | State-changing admin routes don't check `Origin`. Only `SameSite=Lax` protects them | all admin POST/PATCH/DELETE | Medium |
| S5 | The request logger writes **full JSON response bodies** to logs, including all leads (names, emails, phones) | `index.ts:84-108` | Medium (privacy/NDPR) |
| S6 | The frontend on Vercel sends **no security headers or CSP**. Helmet only covers the Render origin | `vercel.json` | Medium |
| S7 | Deleting a property leaves its files in storage (orphans, which fill the 1 GB quota) | `routes.ts:382` | Low/Cost |
| S8 | `supabase-storage.ts` silently falls back to `SUPABASE_ANON_KEY` | `supabase-storage.ts:12` | Low |
| S9 | `seed.ts` creates `Admin / admin01` in production if `ADMIN_PASSWORD` is unset | `seed.ts:9` | High if it's ever hit |
| S10 | `GET /api/properties/:id` with a non-numeric id runs `parseInt` → `NaN` → DB query → 500 | `routes.ts:202` | Low |

---

## 2. Proposed design

### 2.1 Core idea: the browser compresses, then uploads directly to storage

```
Admin browser                                API (Render)                 Supabase Storage
─────────────                                ────────────                 ────────────────
1. pick video ──► compress in-browser (WebCodecs, 720p H.264 MP4) + extract poster frame
2. POST /api/admin/properties/:id/media/upload-url ──►  auth + validate kind/size/type
                                              creates media row (status=pending)
                                              server-chosen path ──► createSignedUploadUrl()
   ◄────────────────────────────── { mediaId, signedUrl } (single path, expires in 2h)
3. PUT file bytes directly to signedUrl (XHR, real progress bar) ──────────────────────────►
4. POST /api/admin/media/:id/complete ──►     info(): size + mimetype check
                                              Range GET first bytes: magic-byte check
                                              ok → status=ready   bad → delete object, status=failed
```

Why this design:
- **The file bytes never pass through Render or Vercel**, which removes problems A, B and C. Render only handles small JSON requests.
- **Compression costs nothing on the server.** The admin's own machine does the work.
- **The browser never chooses the storage path.** The server builds it (`properties/{id}/video/{uuid}.mp4`), and each signed URL is valid only for that one path.
- **Defense in depth.** The bucket enforces `allowedMimeTypes` and `fileSizeLimit` at the storage layer, *and* the server checks magic bytes before anything goes public on the site.

### 2.2 Video compression spec

Library: [`mediabunny`](https://mediabunny.dev) (v1.61.x). It uses the browser's hardware-accelerated WebCodecs encoder. It's pure TypeScript with no WASM, and it's lazy-loaded **only on the admin page**, so the public bundle is unchanged.

| Setting | Value | Why |
|---|---|---|
| Container | MP4, `fastStart: 'in-memory'` | Playback starts before the download finishes |
| Video | H.264 (`avc`), max 1280×720 (`fit: contain`), max 30 fps, keyframe every 2 s | Plays on every phone and browser |
| Bitrate | Target ~1.5 Mbps, reduced automatically so output stays ≤ 45 MB | Fits Free plan's 50 MB per file with margin |
| Audio | AAC 96 kbps (or dropped, per admin toggle) | Walkthroughs rarely need high-fidelity audio |
| Max duration | 4 min (configurable) | At the floor bitrate this stays under 45 MB |
| Poster | JPEG/WebP frame at ~1 s, 1280 px wide | Shown before play, so egress is only spent when someone presses play |

Expected size: a typical 60–90 s walkthrough comes out at **~12–18 MB**. A 400 MB phone clip compresses to roughly 15 MB.

Browser support: Chrome/Edge (desktop and Android) and Safari 17+ encode H.264 through WebCodecs. If `canEncodeVideo('avc')` returns false (some Firefox/Linux builds), the admin page shows: *"Use Chrome or Edge to compress this video."* As a fallback, a file that's already MP4/H.264 and ≤ 45 MB uploads as-is.

Viewer: native `<video controls playsInline preload="none" poster=…>`. There's no player library, nothing loads until the visitor presses play, and Supabase's CDN serves range requests so the visitor can seek.

### 2.3 3D support

Three kinds, all optional per property:

1. **3D model file (`.glb`)**: uploaded through the same signed-URL flow, max 45 MB (15 MB or less recommended). The server checks the GLB header: the `glTF` magic, version 2, and a declared length that equals the stored size. Shown with [`@google/model-viewer`](https://modelviewer.dev) v4.3.x, lazy-loaded only when a property has a model. Orbit, zoom and auto-rotate work, and Draco/Meshopt-compressed models are supported. The decoders are **self-hosted** under `/decoders/` so the site doesn't load third-party scripts.
2. **3D virtual tour link** (Matterport, Kuula, etc.): the admin pastes a URL. The server accepts it **only** if it's `https:` and the host is on an allowlist (`my.matterport.com`, `kuula.co`, plus any you name). It's stored as a URL, never as raw embed HTML, and rendered in a sandboxed `<iframe>`.
3. **2D floor plan images**: these reuse the hardened image upload, with `kind = floorplan`.

Phase 2 (optional): compress GLBs in the browser with `@gltf-transform` (prune, dedup, Meshopt, textures resized to ≤ 2048 px). This often shrinks models 5–10×.

### 2.4 Data model

A new table, so properties can have several videos, a model, a tour and floor plans without adding more columns to `properties`:

```ts
// shared/schema.ts
property_media {
  id            uuid pk default gen_random_uuid()
  property_id   integer not null references properties(id) on delete cascade
  kind          text not null   -- 'video' | 'poster' | 'model3d' | 'tour' | 'floorplan'
  status        text not null default 'pending'  -- 'pending' | 'ready' | 'failed'
  storage_path  text            -- null for 'tour'
  url           text not null   -- public URL, or validated tour URL
  poster_id     uuid null references property_media(id) on delete set null
  mime_type     text
  size_bytes    integer
  duration_sec  integer, width integer, height integer
  title         text
  sort_order    integer not null default 0
  created_at    timestamp not null default now()
}
index (property_id, kind, status)
```

Pending rows older than 24 h (abandoned uploads) are deleted together with their objects by a cleanup that runs on startup and every 6 h.

### 2.5 Storage layout

- Existing bucket `property-images` keeps images. On startup the code calls `updateBucket()` to set `allowedMimeTypes: [jpeg, png, webp, avif]` and `fileSizeLimit: 10 MB`.
- New bucket `property-media` (public read) with `allowedMimeTypes: [video/mp4, model/gltf-binary, image/jpeg, image/webp]` and `fileSizeLimit: 50 MB`.
- Paths are always built by the server: `properties/{propertyId}/{kind}/{uuid}.{ext}`, with the extension taken from the *validated type*, never from the filename.
- Storage budget: a `MEDIA_STORAGE_BUDGET_MB` env var (default 900). Uploads are refused once the sum of `size_bytes` would exceed it, and the dashboard shows usage, so the Free plan's 1 GB is never silently exceeded.

---

## 3. Routing plan

### 3.1 Middleware stack (applied per router, so no route can forget a guard)

```
publicRouter    /api/*            → rateLimit(public)
adminRouter     /api/admin/*      → requireAdmin → requireSameOrigin → rateLimit(admin-write) → zod-validated body
```

- `requireAdmin`: the existing middleware, unchanged.
- `requireSameOrigin` (new): on POST/PUT/PATCH/DELETE, rejects the request unless `Origin` (or `Referer`) is in `CLIENT_URL` or is the API's own origin. This closes S4 with no client changes, because the browser sends `Origin` automatically.
- Every `:id` / `:propertyId` / `:mediaId` param is validated with zod (int or uuid) → 400, which closes S10.

### 3.2 API routes

**Public (read-only)**

| Method | Path | Change |
|---|---|---|
| GET | `/api/health` | unchanged |
| GET | `/api/properties` | adds `hasVideo` and `has3d` flags so cards can show badges |
| GET | `/api/properties/featured` | same as above |
| GET | `/api/properties/:id` | adds `media[]` (**`status = ready` only**, no `storage_path`) |
| POST | `/api/leads`, `/api/chatbot`, `/api/voice-chat` | unchanged |

**Admin auth**

| Method | Path | Change |
|---|---|---|
| POST | `/api/admin/login` | **regenerate the session** before setting `adminId` (S3) |
| POST | `/api/admin/logout` | also clear the cookie |
| GET | `/api/admin/session` | unchanged |

**Admin property and lead CRUD.** The paths stay the same, so the frontend needs no changes. They gain the `requireSameOrigin` guard and validation.

| Method | Path | Change |
|---|---|---|
| POST/PATCH | `/api/properties[/:id]` | `imageUrl` must be a URL in our bucket or `/images/*` (S2) |
| DELETE | `/api/properties/:id` | also deletes the property's storage objects (S7) |
| POST | `/api/uploads/upload` | **images only**: allowlisted MIME types, magic-byte sniffing, server-chosen extension, 10 MB (S1). Kept for backward compatibility. |
| GET/PATCH/DELETE | `/api/leads[/:id]` | guard only |

**New admin media routes**

| Method | Path | Body / Notes |
|---|---|---|
| GET | `/api/admin/properties/:propertyId/media` | all media for the property, including pending/failed |
| POST | `/api/admin/properties/:propertyId/media/upload-url` | `{ kind: 'video'\|'poster'\|'model3d'\|'floorplan', contentType, sizeBytes, durationSec? }` → `{ mediaId, uploadUrl, path }`. Rejects bad kind/type, oversize uploads, and anything over the storage budget or per-property limits (e.g. 3 videos). |
| POST | `/api/admin/media/:mediaId/complete` | `{ width?, height?, durationSec?, posterId? }` → verifies size and magic bytes → `ready` or `failed` |
| PATCH | `/api/admin/media/:mediaId` | `{ title?, sortOrder? }` |
| DELETE | `/api/admin/media/:mediaId` | deletes the object, then the row |
| PUT | `/api/admin/properties/:propertyId/tour` | `{ url }`: https and allowlisted host only |
| DELETE | `/api/admin/properties/:propertyId/tour` | |
| GET | `/api/admin/media/usage` | `{ usedBytes, budgetBytes }` |

Server code layout: `server/routes.ts` (wiring) plus new `server/routes/media.ts`, `server/media/validate.ts` (magic bytes, URL allowlist), `server/middleware/security.ts` (`requireSameOrigin`, limiters), and an extended `server/supabase-storage.ts`.

### 3.3 Frontend routes

There are no new URLs.

| Route | Change |
|---|---|
| `/admin` | The property dialog gets tabs: **Details · Photos · Video · 3D & Tour**. Media tabs unlock once the property is saved; after "Create" the dialog stays open on the Video tab. Each upload shows *Compressing x% → Uploading y% → Verifying*, with cancel and retry. A storage usage meter sits in the dashboard header. |
| `/properties/:id` | Gallery tabs **Photos · Video · 3D Tour** (shown only when that media exists). The video player and model-viewer chunks are lazy-loaded. |
| `/properties` and the home cards | Small "Video" / "3D" badges |

### 3.4 Headers and CSP (frontend on Vercel, plus Render via helmet)

These go in `vercel.json` `headers` and are mirrored in the helmet config:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';            # wasm only for the self-hosted Draco decoder
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob: https://<project>.supabase.co;
  media-src 'self' blob: https://<project>.supabase.co;
  connect-src 'self' https://<project>.supabase.co;
  worker-src 'self' blob:;
  frame-src https://my.matterport.com https://kuula.co;
  frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), geolocation=(), microphone=(self)   # mic used by voice chat
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

The CSP first ships as **`Content-Security-Policy-Report-Only`**. It's switched to enforce once a test pass shows no violations, so the live site can't break.

### 3.5 Other hardening included

- S5: the request logger records method, path, status and timing only, with no response bodies.
- S8: drop the anon-key fallback, and log a clear error if the service role key is missing.
- S9: in production, refuse to seed an admin with the default password if `ADMIN_PASSWORD` is unset.
- H: remove the dead `./auth` import so `npm run check` passes.
- F/G: delete the Replit fallback in `use-upload.ts` and switch it to XHR for real progress.
- An upload-URL rate limit (e.g. 30 per 10 min per session).

---

## 4. Build order (after approval)

1. **Hardening and plumbing**: the `./auth` import, logger, session regeneration, `requireSameOrigin`, param validation, image upload allowlist and sniffing, `updateBucket()`, and the anon-key and seed fixes.
2. **Schema**: `property_media` table, plus a SQL migration file under `migrations/` (see §5).
3. **Server media routes**: signed URLs, the complete/verify step, delete, tour, usage, and orphan cleanup.
4. **Admin UI**: media tabs, compression worker (mediabunny), XHR upload with progress, poster extraction, GLB and tour forms, usage meter.
5. **Public UI**: gallery tabs, lazy `<video>`, lazy `model-viewer` with self-hosted decoders, card badges.
6. **Headers**: `vercel.json` plus helmet, as Report-Only.
7. **Verification**: `npm run check` and `npm run build`. Then a local run against a local Postgres with a Supabase project (or a mocked storage adapter) to upload a real phone video and a sample `.glb` end to end, play and rotate them on the property page, and try the negative cases (spoofed MIME type, HTML file renamed `.mp4`, oversize file, foreign `Origin`, non-allowlisted tour host, unauthenticated calls). I'll report what ran and what couldn't be run here.

---

## 5. Deployment notes

- **DB migration**: the Docker image doesn't run `drizzle-kit push` (it was removed from the Dockerfile in commit `beadc66`), so the new table must be created once before deploying, either with `npm run db:push` using the production `DATABASE_URL` or by running the provided SQL in the Supabase SQL editor.
- **New env vars on Render**: `SUPABASE_MEDIA_BUCKET` (default `property-media`), `MEDIA_STORAGE_BUDGET_MB` (default 900), `TOUR_EMBED_HOSTS` (default `my.matterport.com,kuula.co`).
- **Vercel**: the CSP has to name your Supabase project host, which I'll read from an env var at build time or you confirm it.
- Nothing about Render or Vercel plans needs to change for this design.

---

## 6. Decisions needed from you

1. **What is a "3D plan" for you?** (a) `.glb` model files, (b) Matterport/Kuula-style tour links, (c) 2D floor plan images, or several. The plan supports all three, and I'll drop any you don't need.
2. **Where should video live?**
   - **Option A (recommended to start): Supabase plus in-browser compression**, as designed above. It needs no new vendor and costs nothing more. The limit is Free plan quotas: at ~15 MB per video, 1 GB holds about 50 videos alongside photos, and 5 GB/month egress covers about 330 full plays. `preload="none"` means only actual plays count.
   - **Option B: a dedicated video service** (Bunny Stream, Cloudflare Stream or Mux). These give adaptive HLS streaming, which is better on weak mobile networks in Nigeria, and they offload storage and egress, but they're a paid vendor. The routes above stay the same. Only the upload target and the player change.
   - **Option C: Supabase Pro** ($25/mo): Option A with 100 GB storage and 250 GB egress, and the code stays identical.
3. **Limits**: max video length (proposed 4 min) and videos per property (proposed 3)?
4. **Tour hosts**: which providers should be on the allowlist beyond Matterport and Kuula?
5. **Is there a specific error you've been seeing?** If someone reported a broken upload in production, the message or a screenshot would help me confirm it's covered by §1.2.
