interface TourEmbedProps {
  url: string;
  title: string;
  className?: string;
}

/**
 * Third-party 3D tour (Matterport, Kuula…). The server only stores https URLs on an
 * allowlist and the CSP restricts frame-src to the same hosts; the sandbox still blocks
 * the frame from navigating our page or opening downloads.
 */
export function TourEmbed({ url, title, className }: TourEmbedProps) {
  if (!url.startsWith("https://")) return null;
  return (
    <iframe
      src={url}
      title={title}
      className={`w-full border-0 ${className ?? ""}`}
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
      allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer"
      allowFullScreen
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      data-testid="tour-embed"
    />
  );
}
