import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PropertyCard } from "@/components/PropertyCard";
import {
  ArrowRight,
  Building2,
  Shield,
  TrendingUp,
  Users,
  Star,
  Sparkles,
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
    <main className="min-h-screen">
      <section className="relative py-24 md:py-36 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-20 right-[10%] w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-10 left-[5%] w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: "1.5s" }} />

        <div className="max-w-7xl mx-auto relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="animate-fade-in-up">
              <Badge variant="secondary" className="mb-5 gap-1.5 px-3 py-1" data-testid="badge-hero-tag">
                <Sparkles className="h-3 w-3" />
                Premium Real Estate
              </Badge>
            </div>
            <h1
              className="animate-fade-in-up stagger-1 font-sans text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] mb-6 tracking-tight"
              data-testid="text-hero-title"
            >
              Find Your Dream{" "}
              <span className="text-primary">Property</span>
              <br className="hidden sm:block" />
              {" "}With Tony Multi Ventures
            </h1>
            <p
              className="animate-fade-in-up stagger-2 font-mono text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
              data-testid="text-hero-subtitle"
            >
              Discover premium properties across Nigeria's most sought-after
              locations. From luxury villas to modern apartments, we bring your
              vision home.
            </p>
            <div className="animate-fade-in-up stagger-3 flex flex-wrap items-center justify-center gap-3">
              <Link href="/properties">
                <Button size="lg" className="gap-2 px-6 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]" data-testid="button-browse-properties">
                  Browse Properties
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="secondary" className="px-6 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]" data-testid="button-contact-us">
                  Contact Us
                </Button>
              </Link>
            </div>

            <div className="animate-fade-in-up stagger-4 flex flex-wrap items-center justify-center gap-8 mt-14 pt-8 border-t border-dashed">
              {[
                { value: `${allProperties?.length || 0}+`, label: "Properties" },
                { value: "200+", label: "Happy Clients" },
                { value: "10+", label: "Years Experience" },
              ].map((stat, i) => (
                <div key={stat.label} className="group" data-testid={`stat-${stat.label.toLowerCase().replace(" ", "-")}`}>
                  <p className="font-sans text-3xl md:text-4xl font-bold text-primary">{stat.value}</p>
                  <p className="text-sm text-muted-foreground font-mono mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between gap-4 mb-10">
            <div className="animate-fade-in-up">
              <p className="text-primary font-mono text-sm font-medium mb-2 uppercase tracking-wider">Curated Selection</p>
              <h2 className="font-sans text-2xl md:text-3xl lg:text-4xl font-bold" data-testid="text-featured-title">
                Featured Properties
              </h2>
              <p className="text-muted-foreground font-mono mt-2 max-w-lg" data-testid="text-featured-subtitle">
                Handpicked premium listings for discerning buyers
              </p>
            </div>
            <Link href="/properties">
              <Button variant="ghost" className="gap-2 shrink-0 group" data-testid="button-view-all">
                View All
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
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
              {featuredProperties.map((property, i) => (
                <div key={property.id} className={`animate-fade-in-up stagger-${i + 1}`}>
                  <PropertyCard property={property} />
                </div>
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

      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-muted/50 to-muted/30" />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-14">
            <p className="text-primary font-mono text-sm font-medium mb-2 uppercase tracking-wider animate-fade-in">Why Us</p>
            <h2 className="font-sans text-2xl md:text-3xl lg:text-4xl font-bold mb-3 animate-fade-in-up" data-testid="text-why-title">
              Why Choose Tony Multi Ventures
            </h2>
            <p className="text-muted-foreground font-mono max-w-xl mx-auto animate-fade-in-up stagger-1" data-testid="text-why-subtitle">
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
              <Card key={i} className={`group smooth-shadow border-0 animate-fade-in-up stagger-${i + 1}`} data-testid={`card-feature-${i}`}>
                <CardContent className="p-6 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-sans font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground font-mono leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="max-w-3xl mx-auto text-center relative animate-fade-in-up">
          <h2 className="font-sans text-2xl md:text-3xl lg:text-4xl font-bold mb-4" data-testid="text-cta-title">
            Ready to Find Your Dream Property?
          </h2>
          <p className="text-muted-foreground font-mono mb-8 max-w-xl mx-auto leading-relaxed">
            Get in touch with our team today. We'll help you find the perfect property that matches your needs and budget.
          </p>
          <Link href="/contact">
            <Button size="lg" className="gap-2 px-8 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]" data-testid="button-cta-contact">
              Contact Us
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-10 px-4 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <span className="font-sans font-semibold">Tony Multi Ventures</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground font-mono">
              <Link href="/properties" className="hover:text-foreground transition-colors">
                Properties
              </Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
            <p className="text-sm text-muted-foreground font-mono" data-testid="text-copyright">
              &copy; {new Date().getFullYear()} Tony Multi Ventures
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
