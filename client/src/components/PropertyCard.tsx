import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Bed, Bath, Maximize, MessageCircle, ArrowRight, Film, Box } from "lucide-react";
import type { Property } from "@shared/schema";

interface PropertyCardProps {
  property: Property & { hasVideo?: boolean; has3d?: boolean };
}

function formatPrice(price: string | number) {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function getWhatsAppUrl(property: Property) {
  const message = encodeURIComponent(
    `Hi! I'm interested in the property "${property.name}" located at ${property.location}. Could you please provide more details?`
  );
  return `https://wa.me/?text=${message}`;
}

export function PropertyCard({ property }: PropertyCardProps) {
  return (
    <article className="group h-full col-span-1 flex">
      <Card
        className="w-full h-full smooth-shadow card-shine flex flex-col overflow-hidden transition-all duration-300"
        data-testid={`card-property-${property.id}`}
      >
      <div className="relative aspect-[4/3] img-zoom rounded-t-[inherit]">
        <img
          src={property.imageUrl || "/images/property-1.png"}
          alt={`Exterior view of ${property.name} in ${property.location}`}
          loading="lazy"
          className="w-full h-full object-cover rounded-t-[inherit]"
          data-testid={`img-property-${property.id}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent rounded-t-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="backdrop-blur-sm bg-background/80 text-[#6e5222]" data-testid={`badge-type-${property.id}`}>
            {property.propertyType}
          </Badge>
          {property.featured && (
            <Badge className="backdrop-blur-sm" data-testid={`badge-featured-${property.id}`}>
              Featured
            </Badge>
          )}
          {property.hasVideo && (
            <Badge variant="secondary" className="backdrop-blur-sm bg-background/80 gap-1" data-testid={`badge-video-${property.id}`}>
              <Film className="h-3 w-3" />
              Video
            </Badge>
          )}
          {property.has3d && (
            <Badge variant="secondary" className="backdrop-blur-sm bg-background/80 gap-1" data-testid={`badge-3d-${property.id}`}>
              <Box className="h-3 w-3" />
              3D
            </Badge>
          )}
        </div>
        <div className="absolute bottom-3 right-3">
          <span className="inline-flex items-center rounded-full bg-background/90 backdrop-blur-sm text-foreground text-base font-bold px-4 py-1.5 shadow-sm" data-testid={`badge-price-${property.id}`}>
            {formatPrice(property.price)}
          </span>
        </div>
      </div>

      <CardContent className="flex flex-col flex-1 p-5 gap-3">
        <div>
          <h3
            className="font-sans text-lg font-semibold line-clamp-1 group-hover:text-primary transition-colors duration-200"
            data-testid={`text-name-${property.id}`}
          >
            {property.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/60" />
            <span className="font-mono text-sm line-clamp-1" data-testid={`text-location-${property.id}`}>
              {property.location}
            </span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 flex-1 leading-relaxed" data-testid={`text-desc-${property.id}`}>
          {property.shortDescription}
        </p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground py-2.5 border-t border-dashed">
          {property.bedrooms != null && (
            <div className="flex items-center gap-1.5">
              <Bed className="h-4 w-4 text-primary/50" />
              <span data-testid={`text-beds-${property.id}`}>{property.bedrooms} Beds</span>
            </div>
          )}
          {property.bathrooms != null && (
            <div className="flex items-center gap-1.5">
              <Bath className="h-4 w-4 text-primary/50" />
              <span data-testid={`text-baths-${property.id}`}>{property.bathrooms} Baths</span>
            </div>
          )}
          {property.area != null && (
            <div className="flex items-center gap-1.5">
              <Maximize className="h-4 w-4 text-primary/50" />
              <span data-testid={`text-area-${property.id}`}>{property.area.toLocaleString()} sqft</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <a href={getWhatsAppUrl(property)} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button variant="default" className="w-full gap-2 transition-transform duration-200 active:scale-[0.98]" data-testid={`button-enquire-${property.id}`}>
              <MessageCircle className="h-4 w-4" />
              Enquire
            </Button>
          </a>
          <Link href={`/properties/${property.id}`} className="flex-1">
            <Button variant="secondary" className="w-full gap-2 transition-transform duration-200 active:scale-[0.98]" data-testid={`button-learn-more-${property.id}`}>
              Details
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Button>
          </Link>
        </div>
      </CardContent>
      </Card>
    </article>
  );
}
