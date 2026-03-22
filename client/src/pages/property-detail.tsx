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
  Share2,
  Heart,
} from "lucide-react";
import type { Property } from "@shared/schema";

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
          <Skeleton className="aspect-[16/9] rounded-2xl mb-8" />
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
        <Card className="animate-scale-in">
          <CardContent className="py-16 text-center px-8">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="font-sans text-xl font-semibold mb-2" data-testid="text-not-found">
              Property Not Found
            </h2>
            <p className="text-muted-foreground font-mono mb-6">
              The property you're looking for doesn't exist or has been removed.
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

  const statCards = [
    property.bedrooms != null && { icon: Bed, value: property.bedrooms, label: "Bedrooms", testId: "card-stat-beds" },
    property.bathrooms != null && { icon: Bath, value: property.bathrooms, label: "Bathrooms", testId: "card-stat-baths" },
    property.area != null && { icon: Maximize, value: property.area.toLocaleString(), label: "Sq Ft", testId: "card-stat-area" },
    { icon: Building2, value: property.propertyType, label: "Type", testId: "card-stat-type" },
  ].filter(Boolean) as { icon: any; value: any; label: string; testId: string }[];

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": property.propertyType.toLowerCase().includes("apartment") ? "Apartment" : "SingleFamilyResidence",
        "name": property.name,
        "description": property.shortDescription || property.description,
        "image": property.imageUrl || "https://tonymultiventures.com/logo.png",
        "numberOfRooms": property.bedrooms,
        "floorSize": {
          "@type": "QuantitativeValue",
          "value": property.area,
          "unitCode": "SQF"
        },
        "address": {
          "@type": "PostalAddress",
          "streetAddress": property.location,
          "addressCountry": "NG"
        },
        "offers": {
          "@type": "Offer",
          "price": property.price,
          "priceCurrency": "NGN",
          "availability": "https://schema.org/InStock",
          "url": `https://tonymultiventures.com/properties/${property.id}`
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Is this property verified and documented?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, all properties listed by Tony Multi Ventures, including this one, undergo strict verification and have confirmed titles."
            }
          },
          {
            "@type": "Question",
            "name": "Can I schedule a viewing for this property?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Absolutely. You can schedule a physical or virtual viewing by contacting our agent via WhatsApp or the contact form."
            }
          }
        ]
      },
      {
        "@type": "Person",
        "name": "Tony Multi Ventures Agent",
        "jobTitle": "Premium Real Estate Consultant",
        "url": "https://tonymultiventures.com/contact"
      }
    ]
  };

  return (
    <main className="min-h-screen pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <article className="max-w-6xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-4 animate-fade-in">
          <Link href="/properties">
            <Button variant="ghost" className="gap-2 group" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
              Back to Properties
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-share">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-favorite">
              <Heart className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative aspect-[16/9] rounded-2xl mb-8 overflow-hidden animate-fade-in-up group">
          <img
            src={property.imageUrl || "/images/property-1.png"}
            alt={`High resolution view of ${property.name} located in ${property.location}`}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            data-testid="img-property-detail"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge className="backdrop-blur-sm" data-testid="badge-detail-type">
                {property.propertyType}
              </Badge>
              <Badge variant="secondary" className="backdrop-blur-sm bg-white/20 text-white border-white/20" data-testid="badge-detail-status">
                {property.status}
              </Badge>
              {property.featured && (
                <Badge className="backdrop-blur-sm" data-testid="badge-detail-featured">Featured</Badge>
              )}
            </div>
            <h1
              className="font-sans text-2xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow-lg tracking-tight"
              data-testid="text-detail-name"
            >
              {property.name}
            </h1>
            <div className="flex items-center gap-2 mt-2 text-white/90 drop-shadow">
              <MapPin className="h-4 w-4" />
              <span className="font-mono" data-testid="text-detail-location">{property.location}</span>
            </div>
          </div>
          <div className="absolute top-6 right-6">
            <span className="inline-flex items-center rounded-full bg-background/90 backdrop-blur-sm text-foreground text-xl md:text-2xl font-bold px-5 py-2.5 shadow-lg" data-testid="badge-detail-price">
              {formatPrice(property.price)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {statCards.map((stat, i) => (
                <Card key={stat.testId} className={`smooth-shadow border-0 animate-fade-in-up stagger-${i + 1}`} data-testid={stat.testId}>
                  <CardContent className="p-5 text-center">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <stat.icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="font-sans text-xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground font-mono mt-0.5">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="animate-fade-in-up stagger-3">
              <h2 className="font-sans text-xl font-semibold mb-4" data-testid="text-tldr-title">
                At a Glance (TL;DR)
              </h2>
              <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10 mb-8">
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground font-mono">
                  <li><strong>Property Type:</strong> {property.propertyType}</li>
                  <li><strong>Location:</strong> {property.location}</li>
                  <li><strong>Price:</strong> {formatPrice(property.price)} (NGN)</li>
                  <li><strong>Status:</strong> {property.status.charAt(0).toUpperCase() + property.status.slice(1)}</li>
                  <li><strong>Great For:</strong> Discerning buyers looking for premium real estate investments in Nigeria.</li>
                </ul>
              </div>

              <h2 className="font-sans text-xl font-semibold mb-4" data-testid="text-about-title">
                About This Property
              </h2>
              <div className="bg-muted/30 rounded-2xl p-6 mb-8">
                <p className="text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap" data-testid="text-detail-description">
                  {property.description}
                </p>
              </div>

              <h2 className="font-sans text-xl font-semibold mb-4" data-testid="text-faq-title">
                Frequently Asked Questions
              </h2>
              <div className="bg-muted/30 rounded-2xl p-6 space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground">Is this property verified?</h4>
                  <p className="text-sm text-muted-foreground font-mono mt-1">Yes, all Tony Multi Ventures listings undergo strict legal verification and document checks.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Can I schedule a physical viewing?</h4>
                  <p className="text-sm text-muted-foreground font-mono mt-1">Yes, please use the WhatsApp Enquire button to arrange a convenient time for a guided tour.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 animate-fade-in-up stagger-4">
              <a href={getWhatsAppUrl(property)} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="gap-2 px-6 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]" data-testid="button-detail-enquire">
                  <MessageCircle className="h-5 w-5" />
                  Enquire via WhatsApp
                </Button>
              </a>
            </div>

            <div className="flex flex-col gap-1 text-sm text-muted-foreground font-mono pt-4 border-t border-dashed">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span data-testid="text-detail-date">
                  Listed on {new Date(property.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs opacity-70">
                 <span>Last Updated: {new Date(property.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}</span>
              </div>
            </div>
          </div>

          <div className="space-y-6 animate-slide-in-right">
            <div>
              <h3 className="font-sans text-lg font-semibold mb-3" data-testid="text-inquiry-title">
                Interested in this property?
              </h3>
              <LeadCaptureForm propertyId={property.id} propertyName={property.name} />
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
