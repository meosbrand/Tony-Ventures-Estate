import { useEffect, useRef, useState } from "react";
import { Box } from "lucide-react";

// <model-viewer> (three.js) is ~1 MB, so it's only downloaded when a 3D model is shown.
// Decoders are served from our own origin (copied from three at build time, see
// vite.config.ts) instead of Google's CDN, which keeps third-party scripts off the site.
let loader: Promise<unknown> | null = null;
function loadModelViewer() {
  if (!loader) {
    // Every <model-viewer> reads this global config in its constructor.
    (window as any).ModelViewerElement = {
      ...(window as any).ModelViewerElement,
      dracoDecoderLocation: "/decoders/draco/",
      ktx2TranscoderLocation: "/decoders/basis/",
    };
    loader = import("@google/model-viewer").catch((err) => {
      loader = null;
      throw err;
    });
  }
  return loader;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src: string;
        alt?: string;
        "camera-controls"?: string;
        "auto-rotate"?: string;
        "shadow-intensity"?: string;
        "touch-action"?: string;
        "interaction-prompt"?: string;
        loading?: string;
      };
    }
  }
}

interface ModelViewerProps {
  src: string;
  alt: string;
  className?: string;
}

export function ModelViewer({ src, alt, className }: ModelViewerProps) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    loadModelViewer()
      .then(() => active && setState("ready"))
      .catch(() => active && setState("error"));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onError = () => setState("error");
    el.addEventListener("error", onError);
    return () => el.removeEventListener("error", onError);
  }, [state]);

  if (state === "error") {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-muted/40 text-muted-foreground ${className ?? ""}`}>
        <Box className="h-8 w-8" />
        <p className="text-sm font-mono">The 3D model couldn't be loaded.</p>
      </div>
    );
  }

  return (
    <div className={`relative bg-muted/30 ${className ?? ""}`}>
      {state === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground font-mono">
          Loading 3D viewer…
        </div>
      )}
      {state === "ready" && (
        <model-viewer
          ref={ref}
          src={src}
          alt={alt}
          camera-controls=""
          auto-rotate=""
          shadow-intensity="1"
          touch-action="pan-y"
          interaction-prompt="auto"
          loading="lazy"
          style={{ width: "100%", height: "100%" }}
          data-testid="model-viewer"
        />
      )}
    </div>
  );
}
