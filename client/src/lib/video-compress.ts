import { MAX_VIDEO_SECONDS, VIDEO_TARGET_MAX_BYTES, UPLOAD_KIND_SPECS } from "@shared/media-limits";

// In-browser video compression for property walkthroughs. Uses WebCodecs (hardware
// encoders where available) through mediabunny, which is only loaded on the admin page.

const MAX_LONG_SIDE = 1280;
const MAX_SHORT_SIDE = 720;
const MAX_VIDEO_BITRATE = 1_500_000;
const AUDIO_BITRATE = 96_000;
const MAX_FPS = 30;
const POSTER_WIDTH = 1280;

export interface CompressedVideo {
  video: Blob;
  poster: Blob | null;
  width: number;
  height: number;
  durationSec: number;
  /** False when the browser couldn't encode and an already-small MP4 is uploaded as-is. */
  reencoded: boolean;
  audioDropped: boolean;
}

export class VideoCompressionError extends Error {}

let aacReady: Promise<void> | null = null;
/** Chrome on Linux (and some other browsers) can't encode AAC natively; use the WASM encoder there. */
function ensureAacEncoder(mb: typeof import("mediabunny")): Promise<void> {
  aacReady ??= (async () => {
    if (await mb.canEncodeAudio("aac")) return;
    const { registerAacEncoder } = await import("@mediabunny/aac-encoder");
    registerAacEncoder();
  })().catch(() => {
    aacReady = null;
  });
  return aacReady;
}

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

export async function compressVideo(
  file: File,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
): Promise<CompressedVideo> {
  const mb = await import("mediabunny");
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });

  try {
    let videoTrack;
    try {
      videoTrack = await input.getPrimaryVideoTrack();
    } catch {
      throw new VideoCompressionError("This file isn't a video format the browser can read. Try an MP4 or MOV file.");
    }
    if (!videoTrack) throw new VideoCompressionError("This file has no video in it.");

    const durationSec = await input.computeDuration();
    if (durationSec > MAX_VIDEO_SECONDS + 0.5) {
      throw new VideoCompressionError(
        `Video is ${Math.ceil(durationSec / 60)} minutes long. Please trim it to ${MAX_VIDEO_SECONDS / 60} minutes or less.`
      );
    }

    const srcW = videoTrack.displayWidth;
    const srcH = videoTrack.displayHeight;
    const scale = Math.min(1, MAX_LONG_SIDE / Math.max(srcW, srcH), MAX_SHORT_SIDE / Math.min(srcW, srcH));
    const width = even(srcW * scale);
    const height = even(srcH * scale);

    // Spend at most the size budget across the whole clip.
    const budgetBits = VIDEO_TARGET_MAX_BYTES * 8 * 0.95;
    const videoBitrate = Math.max(
      250_000,
      Math.min(MAX_VIDEO_BITRATE, Math.floor(budgetBits / Math.max(durationSec, 1)) - AUDIO_BITRATE)
    );

    const stats = await videoTrack.computePacketStats(120).catch(() => null);
    const frameRate = stats && stats.averagePacketRate > MAX_FPS + 1 ? MAX_FPS : undefined;

    const canEncode =
      (await videoTrack.canDecode()) &&
      (await mb.canEncodeVideo("avc", { width, height, bitrate: videoBitrate }));

    if (!canEncode) {
      // Last resort: an MP4 that's already small enough goes up untouched.
      if (file.type === "video/mp4" && file.size <= VIDEO_TARGET_MAX_BYTES) {
        return {
          video: file,
          poster: await extractPoster(mb, videoTrack, durationSec).catch(() => null),
          width: srcW,
          height: srcH,
          durationSec,
          reencoded: false,
          audioDropped: false,
        };
      }
      throw new VideoCompressionError(
        "This browser can't compress video. Please use the latest Chrome or Edge on a computer."
      );
    }

    const audioTrack = await input.getPrimaryAudioTrack();
    if (audioTrack) await ensureAacEncoder(mb);
    const keepAudio =
      !!audioTrack &&
      (await audioTrack.canDecode()) &&
      (await mb.canEncodeAudio("aac", { bitrate: AUDIO_BITRATE }));

    const output = new mb.Output({
      format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }),
      target: new mb.BufferTarget(),
    });

    const conversion = await mb.Conversion.init({
      input,
      output,
      video: {
        codec: "avc",
        width,
        height,
        fit: "contain",
        frameRate,
        keyFrameInterval: 2,
        quality: new mb.Quality({ bitrate: videoBitrate }),
        forceTranscode: true,
      },
      audio: keepAudio
        ? { codec: "aac", quality: new mb.Quality({ bitrate: AUDIO_BITRATE }), forceTranscode: true }
        : { discard: true },
    });

    if (!conversion.isValid) {
      const reasons = conversion.discardedTracks.map((t) => t.reason).join(", ");
      throw new VideoCompressionError(`This video can't be converted (${reasons || "unsupported format"}).`);
    }

    const onAbort = () => void conversion.cancel();
    signal?.addEventListener("abort", onAbort, { once: true });
    conversion.onProgress = (p) => onProgress(Math.min(99, p * 100));
    try {
      await conversion.execute();
    } finally {
      signal?.removeEventListener("abort", onAbort);
    }
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");

    const buffer = output.target.buffer;
    if (!buffer) throw new VideoCompressionError("Compression produced no output.");
    const video = new Blob([buffer], { type: "video/mp4" });
    if (video.size > UPLOAD_KIND_SPECS.video.maxBytes) {
      throw new VideoCompressionError("The compressed video is still too large. Please upload a shorter clip.");
    }
    onProgress(100);

    return {
      video,
      poster: await extractPoster(mb, videoTrack, durationSec).catch(() => null),
      width,
      height,
      durationSec,
      reencoded: true,
      audioDropped: !!audioTrack && !keepAudio,
    };
  } finally {
    input.dispose();
  }
}

/** Grabs a frame about one second in (or the middle of very short clips) as a JPEG poster. */
async function extractPoster(
  mb: typeof import("mediabunny"),
  track: import("mediabunny").InputVideoTrack,
  durationSec: number
): Promise<Blob | null> {
  const sink = new mb.CanvasSink(track, { width: Math.min(POSTER_WIDTH, track.displayWidth) });
  const start = await track.getFirstTimestamp();
  const frame = await sink.getCanvas(start + Math.min(1, durationSec / 2));
  if (!frame) return null;

  const { canvas } = frame;
  if ("convertToBlob" in canvas) {
    return canvas.convertToBlob({ type: "image/jpeg", quality: 0.82 });
  }
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
}
