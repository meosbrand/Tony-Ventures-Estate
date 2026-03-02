import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Bed, Bath, Maximize, MessageCircle, ArrowRight } from "lucide-react";
import type { Property } from "@shared/schema";

interface PropertyCardProps {
  property: Property;
}

function formatPrice(price: string | number) {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
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
    <Card
      className="group hover-elevate flex flex-col"
      data-testid={`card-property-${property.id}`}
    >
      <div className="relative aspect-[4/3] rounded-t-[inherit]">
        <img
          src={property.imageUrl || "/images/property-1.png"}
          alt={property.name}
          className="w-full h-full object-cover rounded-t-[inherit]"
          data-testid={`img-property-${property.id}`}
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge variant="secondary" data-testid={`badge-type-${property.id}`}>
            {property.propertyType}
          </Badge>
          {property.featured && (
            <Badge data-testid={`badge-featured-${property.id}`}>
              Featured
            </Badge>
          )}
        </div>
        <div className="absolute bottom-3 right-3">
          <Badge variant="secondary" className="text-base font-bold px-3 py-1" data-testid={`badge-price-${property.id}`}>
            {formatPrice(property.price)}
          </Badge>
        </div>
      </div>

      <CardContent className="flex flex-col flex-1 p-5 gap-3">
        <div>
          <h3
            className="font-sans text-lg font-semibold line-clamp-1"
            data-testid={`text-name-${property.id}`}
          >
            {property.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="font-mono text-sm line-clamp-1" data-testid={`text-location-${property.id}`}>
              {property.location}
            </span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 flex-1" data-testid={`text-desc-${property.id}`}>
          {property.shortDescription}
        </p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground py-2 border-t">
          {property.bedrooms != null && (
            <div className="flex items-center gap-1.5">
              <Bed className="h-4 w-4" />
              <span data-testid={`text-beds-${property.id}`}>{property.bedrooms} Beds</span>
            </div>
          )}
          {property.bathrooms != null && (
            <div className="flex items-center gap-1.5">
              <Bath className="h-4 w-4" />
              <span data-testid={`text-baths-${property.id}`}>{property.bathrooms} Baths</span>
            </div>
          )}
          {property.area != null && (
            <div className="flex items-center gap-1.5">
              <Maximize className="h-4 w-4" />
              <span data-testid={`text-area-${property.id}`}>{property.area.toLocaleString()} sqft</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <a href={getWhatsAppUrl(property)} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button variant="default" className="w-full gap-2" data-testid={`button-enquire-${property.id}`}>
              <MessageCircle className="h-4 w-4" />
              Enquire
            </Button>
          </a>
          <Link href={`/properties/${property.id}`} className="flex-1">
            <Button variant="secondary" className="w-full gap-2" data-testid={`button-learn-more-${property.id}`}>
              Learn More
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
