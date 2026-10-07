// Quick local checks on a .glb before uploading it. The server re-checks the header;
// this just gives the admin a clear message without waiting for a 40 MB upload.

// The viewer ships the Draco and KTX2/Basis decoders. Meshopt isn't enabled.
const UNSUPPORTED_EXTENSIONS: Record<string, string> = {
  EXT_meshopt_compression:
    "This model uses Meshopt compression, which the viewer doesn't support. Re-export it with Draco compression (or none).",
};

export async function inspectGlb(file: File): Promise<void> {
  const header = new DataView(await file.slice(0, 20).arrayBuffer());
  const magic = header.byteLength >= 4 ? header.getUint32(0, true) : 0;
  if (magic !== 0x46546c67 /* "glTF" */) {
    throw new Error("This isn't a .glb file. Export the model as glTF Binary (.glb).");
  }
  if (header.getUint32(4, true) !== 2) throw new Error("Only glTF 2.0 models are supported.");
  if (header.getUint32(8, true) !== file.size) throw new Error("This .glb file is incomplete or corrupted.");

  const jsonLength = header.getUint32(12, true);
  if (header.getUint32(16, true) !== 0x4e4f534a /* "JSON" */ || jsonLength > file.size) {
    throw new Error("This .glb file is corrupted.");
  }

  let gltf: { extensionsRequired?: string[] };
  try {
    gltf = JSON.parse(await file.slice(20, 20 + jsonLength).text());
  } catch {
    throw new Error("This .glb file is corrupted.");
  }
  for (const ext of gltf.extensionsRequired ?? []) {
    if (UNSUPPORTED_EXTENSIONS[ext]) throw new Error(UNSUPPORTED_EXTENSIONS[ext]);
  }
}
