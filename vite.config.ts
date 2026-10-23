import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

// The 3D viewer's Draco (mesh) and Basis/KTX2 (texture) decoders are served from our
// own origin instead of Google's CDN. They're copied out of `three` so they always
// match the installed version; the destination is git-ignored.
function selfHostedDecoders(): Plugin {
  const threeLibs = path.resolve(import.meta.dirname, "node_modules/three/examples/jsm/libs");
  const dest = path.resolve(import.meta.dirname, "client/public/decoders");
  const files: [string, string][] = [
    ["draco/gltf/draco_decoder.js", "draco/draco_decoder.js"],
    ["draco/gltf/draco_decoder.wasm", "draco/draco_decoder.wasm"],
    ["draco/gltf/draco_wasm_wrapper.js", "draco/draco_wasm_wrapper.js"],
    ["basis/basis_transcoder.js", "basis/basis_transcoder.js"],
    ["basis/basis_transcoder.wasm", "basis/basis_transcoder.wasm"],
  ];
  return {
    name: "self-hosted-3d-decoders",
    buildStart() {
      for (const [from, to] of files) {
        const target = path.join(dest, to);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(path.join(threeLibs, from), target);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), selfHostedDecoders()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
