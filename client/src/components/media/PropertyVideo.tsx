interface PropertyVideoProps {
  src: string;
  poster: string | null;
  title: string;
  className?: string;
}

/** Nothing is downloaded until the visitor presses play (preload="none"), which keeps storage egress low. */
export function PropertyVideo({ src, poster, title, className }: PropertyVideoProps) {
  return (
    <video
      src={src}
      poster={poster ?? undefined}
      controls
      playsInline
      preload="none"
      aria-label={title}
      className={`w-full bg-black ${className ?? ""}`}
      data-testid="property-video"
    />
  );
}

export function formatDuration(totalSec: number | null): string {
  if (totalSec == null) return "";
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
