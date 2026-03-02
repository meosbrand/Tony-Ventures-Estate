import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import {
  ArrowLeft,
  MapPin,
  Bed,
  Bath,
  Maximize,
  MessageCircle,
  Building2,
  Calendar,
} from "lucide-react";
import type { Property } from "@shared/schema";

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
    `Hi! I'm interested in the property "${property.name}" located at ${property.location}. Could you please provide more details and schedule a viewing?`
  );
  return `https://wa.me/?text=${message}`;
}

export default function PropertyDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id || "0");

  const { data: property, isLoading } = useQuery<Property>({
    queryKey: ["/api/properties", id],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="aspect-[16/9] rounded-md mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="font-sans text-xl font-semibold mb-2" data-testid="text-not-found">
              Property Not Found
            </h2>
            <p className="text-muted-foreground font-mono mb-4">
              The property you're looking for doesn't exist.
            </p>
            <Link href="/properties">
              <Button data-testid="button-back-to-properties">
                Back to Properties
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto py-6 px-4">
        <Link href="/properties">
          <Button variant="ghost" className="gap-2 mb-4" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Back to Properties
          </Button>
        </Link>

        <div className="relative aspect-[16/9] rounded-md mb-8">
          <img
            src={property.imageUrl || "/images/property-1.png"}
            alt={property.name}
            className="w-full h-full object-cover rounded-md"
            data-testid="img-property-detail"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-md" />
          <div className="absolute bottom-6 left-6 text-white">
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge data-testid="badge-detail-type">
                {property.propertyType}
              </Badge>
              <Badge variant="secondary" data-testid="badge-detail-status">
                {property.status}
              </Badge>
              {property.featured && <Badge data-testid="badge-detail-featured">Featured</Badge>}
            </div>
            <h1
              className="font-sans text-2xl md:text-4xl font-bold drop-shadow-lg"
              data-testid="text-detail-name"
            >
              {property.name}
            </h1>
            <div className="flex items-center gap-2 mt-2 drop-shadow">
              <MapPin className="h-4 w-4" />
              <span className="font-mono" data-testid="text-detail-location">{property.location}</span>
            </div>
          </div>
          <div className="absolute bottom-6 right-6">
            <Badge variant="secondary" className="text-xl md:text-2xl font-bold px-4 py-2" data-testid="badge-detail-price">
              {formatPrice(property.price)}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {property.bedrooms != null && (
                <Card className="hover-elevate" data-testid="card-stat-beds">
                  <CardContent className="p-4 text-center">
                    <Bed className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="font-sans text-xl font-bold">{property.bedrooms}</p>
                    <p className="text-sm text-muted-foreground font-mono">Bedrooms</p>
                  </CardContent>
                </Card>
              )}
              {property.bathrooms != null && (
                <Card className="hover-elevate" data-testid="card-stat-baths">
                  <CardContent className="p-4 text-center">
                    <Bath className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="font-sans text-xl font-bold">{property.bathrooms}</p>
                    <p className="text-sm text-muted-foreground font-mono">Bathrooms</p>
                  </CardContent>
                </Card>
              )}
              {property.area != null && (
                <Card className="hover-elevate" data-testid="card-stat-area">
                  <CardContent className="p-4 text-center">
                    <Maximize className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="font-sans text-xl font-bold">{property.area.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground font-mono">Sq Ft</p>
                  </CardContent>
                </Card>
              )}
              <Card className="hover-elevate" data-testid="card-stat-type">
                <CardContent className="p-4 text-center">
                  <Building2 className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="font-sans text-xl font-bold">{property.propertyType}</p>
                  <p className="text-sm text-muted-foreground font-mono">Type</p>
                </CardContent>
              </Card>
            </div>

            <div>
              <h2 className="font-sans text-xl font-semibold mb-3" data-testid="text-about-title">
                About This Property
              </h2>
              <p className="text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap" data-testid="text-detail-description">
                {property.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a href={getWhatsAppUrl(property)} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="gap-2" data-testid="button-detail-enquire">
                  <MessageCircle className="h-5 w-5" />
                  Enquire via WhatsApp
                </Button>
              </a>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono pt-4 border-t">
              <Calendar className="h-4 w-4" />
              <span data-testid="text-detail-date">
                Listed on {new Date(property.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-sans text-lg font-semibold mb-3" data-testid="text-inquiry-title">
                Interested in this property?
              </h3>
              <LeadCaptureForm propertyId={property.id} propertyName={property.name} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
