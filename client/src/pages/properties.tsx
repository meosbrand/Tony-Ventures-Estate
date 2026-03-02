import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { PropertyCard } from "@/components/PropertyCard";
import { Building2, Search } from "lucide-react";
import { useState, useMemo } from "react";
import type { Property } from "@shared/schema";

export default function Properties() {
  const [search, setSearch] = useState("");

  const { data: properties, isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const filtered = useMemo(() => {
    if (!properties) return [];
    if (!search.trim()) return properties;
    const q = search.toLowerCase();
    return properties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.propertyType.toLowerCase().includes(q)
    );
  }, [properties, search]);

  return (
    <div className="min-h-screen">
      <section className="py-12 px-4 bg-muted/30 border-b">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-sans text-3xl md:text-4xl font-bold mb-2" data-testid="text-properties-title">
            Our Properties
          </h1>
          <p className="text-muted-foreground font-mono mb-6" data-testid="text-properties-subtitle">
            Explore our curated collection of premium real estate
          </p>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, location, or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-properties"
            />
          </div>
        </div>
      </section>

      <section className="py-8 px-4">
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
              <p className="text-sm text-muted-foreground font-mono mb-4" data-testid="text-results-count">
                Showing {filtered.length} {filtered.length === 1 ? "property" : "properties"}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-sans text-lg font-semibold mb-2" data-testid="text-no-results-title">
                  No Properties Found
                </h3>
                <p className="text-muted-foreground font-mono" data-testid="text-no-results-desc">
                  {search ? "Try adjusting your search terms" : "Check back soon for new listings"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
