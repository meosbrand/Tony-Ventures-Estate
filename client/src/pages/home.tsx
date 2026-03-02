import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PropertyCard } from "@/components/PropertyCard";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import {
  ArrowRight,
  Building2,
  Shield,
  TrendingUp,
  Users,
  MapPin,
  Star,
} from "lucide-react";
import type { Property } from "@shared/schema";

export default function Home() {
  const { data: featuredProperties, isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties/featured"],
  });

  const { data: allProperties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  return (
    <div className="min-h-screen">
      <section className="relative py-20 md:py-32 px-4 overflow-visible">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="max-w-7xl mx-auto relative">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4" data-testid="badge-hero-tag">
              Premium Real Estate
            </Badge>
            <h1
              className="font-sans text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
              data-testid="text-hero-title"
            >
              Find Your Dream{" "}
              <span className="text-primary">Property</span> With
              Tony Multi Ventures
            </h1>
            <p
              className="font-mono text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl"
              data-testid="text-hero-subtitle"
            >
              Discover premium properties across Nigeria's most sought-after
              locations. From luxury villas to modern apartments, we bring your
              vision home.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/properties">
                <Button size="lg" className="gap-2" data-testid="button-browse-properties">
                  Browse Properties
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#contact">
                <Button size="lg" variant="secondary" data-testid="button-contact-us">
                  Contact Us
                </Button>
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-6 mt-12 pt-8 border-t">
              <div data-testid="stat-properties">
                <p className="font-sans text-2xl font-bold">{allProperties?.length || 0}+</p>
                <p className="text-sm text-muted-foreground font-mono">Properties</p>
              </div>
              <div className="w-px h-10 bg-border" />
              <div data-testid="stat-clients">
                <p className="font-sans text-2xl font-bold">200+</p>
                <p className="text-sm text-muted-foreground font-mono">Happy Clients</p>
              </div>
              <div className="w-px h-10 bg-border" />
              <div data-testid="stat-years">
                <p className="font-sans text-2xl font-bold">10+</p>
                <p className="text-sm text-muted-foreground font-mono">Years Experience</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-sans text-2xl md:text-3xl font-bold mb-2" data-testid="text-featured-title">
                Featured Properties
              </h2>
              <p className="text-muted-foreground font-mono" data-testid="text-featured-subtitle">
                Handpicked premium listings for you
              </p>
            </div>
            <Link href="/properties">
              <Button variant="ghost" className="gap-2 shrink-0" data-testid="button-view-all">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <Skeleton className="aspect-[4/3] rounded-t-[inherit]" />
                  <CardContent className="p-5 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredProperties && featuredProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground font-mono" data-testid="text-no-featured">
                  No featured properties yet. Check back soon!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-sans text-2xl md:text-3xl font-bold mb-2" data-testid="text-why-title">
              Why Choose Tony Multi Ventures
            </h2>
            <p className="text-muted-foreground font-mono max-w-xl mx-auto" data-testid="text-why-subtitle">
              We deliver exceptional real estate experiences with integrity and expertise
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Shield,
                title: "Trusted & Verified",
                desc: "All properties are thoroughly verified and documented for your peace of mind",
              },
              {
                icon: TrendingUp,
                title: "Best Value",
                desc: "Competitive pricing with transparent fees and no hidden charges",
              },
              {
                icon: Users,
                title: "Expert Guidance",
                desc: "Dedicated agents with deep local market knowledge to guide your decisions",
              },
              {
                icon: Star,
                title: "Premium Selection",
                desc: "Curated portfolio of premium properties in the best locations",
              },
            ].map((item, i) => (
              <Card key={i} className="hover-elevate" data-testid={`card-feature-${i}`}>
                <CardContent className="p-6 text-center">
                  <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-sans font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground font-mono">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="font-sans text-2xl md:text-3xl font-bold mb-2" data-testid="text-contact-title">
                Get In Touch
              </h2>
              <p className="text-muted-foreground font-mono mb-6" data-testid="text-contact-subtitle">
                Interested in a property? Leave your details and we'll reach out to you.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold">Office Location</p>
                    <p className="text-sm text-muted-foreground font-mono">Lagos, Nigeria</p>
                  </div>
                </div>
              </div>
            </div>
            <LeadCaptureForm />
          </div>
        </div>
      </section>

      <footer className="border-t py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="font-sans font-semibold">Tony Multi Ventures</span>
          </div>
          <p className="text-sm text-muted-foreground font-mono" data-testid="text-copyright">
            &copy; {new Date().getFullYear()} Tony Multi Ventures. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
