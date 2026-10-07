import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sniffImageMime,
  isMp4,
  checkGlbHeader,
  checkUploadedContent,
  normalizeTourUrl,
  isAllowedImageUrl,
} from "./validate";

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...Buffer.from(p, "latin1")] : p)));

function glb(totalLength: number, version = 2, chunkType = "JSON"): Uint8Array {
  const buf = Buffer.alloc(20);
  buf.write("glTF", 0, "latin1");
  buf.writeUInt32LE(version, 4);
  buf.writeUInt32LE(totalLength, 8);
  buf.writeUInt32LE(4, 12);
  buf.write(chunkType, 16, "latin1");
  return new Uint8Array(buf);
}

test("sniffImageMime recognizes real image signatures only", () => {
  assert.equal(sniffImageMime(bytes([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(sniffImageMime(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  assert.equal(sniffImageMime(bytes("RIFF", [0, 0, 0, 0], "WEBP")), "image/webp");
  assert.equal(sniffImageMime(bytes([0, 0, 0, 0x1c], "ftypavif")), "image/avif");
  assert.equal(sniffImageMime(bytes("<svg xmlns=")), null);
  assert.equal(sniffImageMime(bytes("<!DOCTYPE html>")), null);
});

test("isMp4 accepts MP4 brands and rejects QuickTime and HTML", () => {
  assert.ok(isMp4(bytes([0, 0, 0, 0x20], "ftypisom")));
  assert.ok(isMp4(bytes([0, 0, 0, 0x20], "ftypmp42")));
  assert.ok(!isMp4(bytes([0, 0, 0, 0x14], "ftypqt  ")));
  assert.ok(!isMp4(bytes("<html><script>")));
});

test("checkGlbHeader validates magic, version, length and first chunk", () => {
  assert.equal(checkGlbHeader(glb(1000), 1000), null);
  assert.match(checkGlbHeader(glb(1000, 1), 1000)!, /2\.0/);
  assert.match(checkGlbHeader(glb(1000), 999)!, /truncated/);
  assert.match(checkGlbHeader(glb(1000, 2, "BIN\0"), 1000)!, /corrupted/);
  assert.match(checkGlbHeader(bytes("PK\x03\x04 not a model at all"), 25)!, /Not a GLB/);
});

test("checkUploadedContent ties content to the declared kind and type", () => {
  const jpeg = bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(checkUploadedContent("poster", "image/jpeg", jpeg, 100), null);
  assert.notEqual(checkUploadedContent("poster", "image/webp", jpeg, 100), null);
  assert.notEqual(checkUploadedContent("video", "video/mp4", jpeg, 100), null);
  assert.equal(checkUploadedContent("model3d", "model/gltf-binary", glb(500), 500), null);
});

test("normalizeTourUrl enforces https and the host allowlist", () => {
  const hosts = ["my.matterport.com", "kuula.co"];
  assert.equal(
    normalizeTourUrl("https://my.matterport.com/show/?m=abc123", hosts),
    "https://my.matterport.com/show/?m=abc123"
  );
  assert.equal(normalizeTourUrl("  https://kuula.co/share/collection/7abc  ", hosts), "https://kuula.co/share/collection/7abc");
  assert.equal(normalizeTourUrl("http://my.matterport.com/show/?m=1", hosts), null);
  assert.equal(normalizeTourUrl("javascript:alert(1)", hosts), null);
  assert.equal(normalizeTourUrl("https://evil.com/?u=my.matterport.com", hosts), null);
  assert.equal(normalizeTourUrl("https://my.matterport.com.evil.com/", hosts), null);
  assert.equal(normalizeTourUrl("https://user:pw@my.matterport.com/", hosts), null);
  assert.equal(normalizeTourUrl("https://my.matterport.com:8443/", hosts), null);
  assert.equal(normalizeTourUrl('<iframe src="https://kuula.co/x">', hosts), null);
});

test("isAllowedImageUrl only allows bundled images and our buckets", () => {
  const supa = "https://abc.supabase.co";
  const buckets = ["property-images", "property-media"];
  assert.ok(isAllowedImageUrl("/images/property-1.png", supa, buckets));
  assert.ok(isAllowedImageUrl(`${supa}/storage/v1/object/public/property-images/uploads/x.jpg`, supa, buckets));
  assert.ok(!isAllowedImageUrl("/images/../server/secret", supa, buckets));
  assert.ok(!isAllowedImageUrl("javascript:alert(1)", supa, buckets));
  assert.ok(!isAllowedImageUrl("https://evil.com/storage/v1/object/public/property-images/x.jpg", supa, buckets));
  assert.ok(!isAllowedImageUrl(`${supa}/storage/v1/object/public/other-bucket/x.jpg`, supa, buckets));
  assert.ok(!isAllowedImageUrl(`${supa}/storage/v1/object/public/property-images/x.jpg?download`, supa, buckets));
  assert.ok(!isAllowedImageUrl("https://x.jpg", undefined, buckets));
});
