import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Film, Box, Compass, LayoutPanelTop } from "lucide-react";
import type { PublicPropertyMedia } from "@shared/schema";
import { PropertyVideo, formatDuration } from "./PropertyVideo";
import { ModelViewer } from "./ModelViewer";
import { TourEmbed } from "./TourEmbed";

interface PropertyMediaGalleryProps {
  media: PublicPropertyMedia[];
  propertyName: string;
}

/** Video / 3D / tour / floor plan tabs; each tab only appears when that media exists. */
export function PropertyMediaGallery({ media, propertyName }: PropertyMediaGalleryProps) {
  const videos = media.filter((m) => m.kind === "video");
  const models = media.filter((m) => m.kind === "model3d");
  const tour = media.find((m) => m.kind === "tour");
  const floorplans = media.filter((m) => m.kind === "floorplan");

  const tabs = [
    videos.length > 0 && { value: "video", label: "Video", icon: Film },
    tour && { value: "tour", label: "3D Tour", icon: Compass },
    models.length > 0 && { value: "model", label: "3D Model", icon: Box },
    floorplans.length > 0 && { value: "floorplans", label: "Floor Plans", icon: LayoutPanelTop },
  ].filter(Boolean) as { value: string; label: string; icon: typeof Film }[];

  if (tabs.length === 0) return null;

  return (
    <section className="animate-fade-in-up stagger-2" aria-label="Property media" data-testid="section-property-media">
      <Tabs defaultValue={tabs[0].value}>
        <TabsList className="mb-4 bg-muted/40 p-1 flex-wrap h-auto">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-2" data-testid={`tab-public-${t.value}`}>
              <t.icon className="h-4 w-4" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {videos.length > 0 && (
          <TabsContent value="video" className="space-y-4">
            {videos.map((v) => (
              <figure key={v.id} className="space-y-2">
                <PropertyVideo
                  src={v.url}
                  poster={v.posterUrl}
                  title={v.title || `Video tour of ${propertyName}`}
                  className="aspect-video rounded-2xl"
                />
                {(v.title || v.durationSec) && (
                  <figcaption className="text-sm text-muted-foreground font-mono">
                    {v.title}
                    {v.title && v.durationSec ? " · " : ""}
                    {formatDuration(v.durationSec)}
                  </figcaption>
                )}
              </figure>
            ))}
          </TabsContent>
        )}

        {tour && (
          <TabsContent value="tour">
            <TourEmbed url={tour.url} title={`3D tour of ${propertyName}`} className="aspect-video rounded-2xl" />
          </TabsContent>
        )}

        {models.length > 0 && (
          <TabsContent value="model" className="space-y-4">
            {models.map((m) => (
              <ModelViewer
                key={m.id}
                src={m.url}
                alt={m.title || `3D model of ${propertyName}`}
                className="aspect-[4/3] sm:aspect-video rounded-2xl overflow-hidden"
              />
            ))}
            <p className="text-xs text-muted-foreground font-mono">Drag to rotate, pinch or scroll to zoom.</p>
          </TabsContent>
        )}

        {floorplans.length > 0 && (
          <TabsContent value="floorplans" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {floorplans.map((f) => (
              <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" className="block rounded-2xl overflow-hidden border bg-white">
                <img src={f.url} alt={f.title || `Floor plan of ${propertyName}`} loading="lazy" className="w-full object-contain" />
              </a>
            ))}
          </TabsContent>
        )}
      </Tabs>
    </section>
  );
}
