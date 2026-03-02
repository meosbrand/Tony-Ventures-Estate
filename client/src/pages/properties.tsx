import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PropertyCard } from "@/components/PropertyCard";
import { Building2, Search, SlidersHorizontal, X } from "lucide-react";
import { useState, useMemo } from "react";
import type { Property } from "@shared/schema";

const PROPERTY_TYPES = ["All", "Villa", "Apartment", "Mansion", "Penthouse", "Terrace", "Duplex", "Bungalow", "Land", "Commercial"];

export default function Properties() {
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("All");

  const { data: properties, isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const filtered = useMemo(() => {
    if (!properties) return [];
    let result = properties;
    if (activeType !== "All") {
      result = result.filter((p) => p.propertyType === activeType);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          p.propertyType.toLowerCase().includes(q)
      );
    }
    return result;
  }, [properties, search, activeType]);

  return (
    <div className="min-h-screen">
      <section className="relative py-14 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="max-w-7xl mx-auto relative">
          <div className="animate-fade-in-up">
            <p className="text-primary font-mono text-sm font-medium mb-2 uppercase tracking-wider">Our Portfolio</p>
            <h1 className="font-sans text-3xl md:text-4xl lg:text-5xl font-bold mb-3 tracking-tight" data-testid="text-properties-title">
              Explore Properties
            </h1>
            <p className="text-muted-foreground font-mono mb-8 max-w-lg" data-testid="text-properties-subtitle">
              Browse our curated collection of premium real estate across Nigeria
            </p>
          </div>

          <div className="animate-fade-in-up stagger-1 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-10 bg-background/80 backdrop-blur-sm"
                data-testid="input-search-properties"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-clear-search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="animate-fade-in-up stagger-2 flex flex-wrap items-center gap-2 mt-5">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground mr-1" />
            {PROPERTY_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeType === type
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                data-testid={`filter-type-${type.toLowerCase()}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 px-4 pb-20">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
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
          ) : filtered.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-muted-foreground font-mono" data-testid="text-results-count">
                  Showing {filtered.length} {filtered.length === 1 ? "property" : "properties"}
                  {activeType !== "All" && (
                    <span className="ml-1">
                      in <span className="text-foreground font-medium">{activeType}</span>
                    </span>
                  )}
                </p>
                {(search || activeType !== "All") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setSearch(""); setActiveType("All"); }}
                    className="gap-1.5 text-muted-foreground"
                    data-testid="button-clear-filters"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear filters
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((property, i) => (
                  <div key={property.id} className={`animate-fade-in-up stagger-${Math.min(i + 1, 5)}`}>
                    <PropertyCard property={property} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Card className="animate-scale-in">
              <CardContent className="py-16 text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-sans text-lg font-semibold mb-2" data-testid="text-no-results-title">
                  No Properties Found
                </h3>
                <p className="text-muted-foreground font-mono mb-4" data-testid="text-no-results-desc">
                  {search || activeType !== "All" ? "Try adjusting your search or filters" : "Check back soon for new listings"}
                </p>
                {(search || activeType !== "All") && (
                  <Button
                    variant="secondary"
                    onClick={() => { setSearch(""); setActiveType("All"); }}
                    data-testid="button-reset-filters"
                  >
                    Reset Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
