import { db } from "./db";
import { properties, users } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const existingProperties = await db.select().from(properties);
  if (existingProperties.length > 0) return;

  const existingUsers = await db.select().from(users);
  if (existingUsers.length === 0) {
    await db.insert(users).values({
      username: "admin",
      password: "admin123",
    });
  }

  await db.insert(properties).values([
    {
      name: "Sunset Villa Estate",
      location: "Lekki Phase 1, Lagos",
      price: "450000.00",
      description: "A magnificent 5-bedroom detached duplex with breathtaking ocean views. This luxurious estate features a private swimming pool, landscaped gardens, a home cinema, and a fully equipped modern kitchen with Italian marble countertops. The master suite includes a walk-in closet and spa-like bathroom. Located in the prestigious Lekki Phase 1 neighborhood, minutes from shopping centers and top restaurants. Smart home technology throughout. 24/7 security with CCTV surveillance.",
      shortDescription: "Luxurious 5-bed duplex with pool and ocean views in Lekki",
      propertyType: "Villa",
      bedrooms: 5,
      bathrooms: 6,
      area: 5500,
      imageUrl: "/images/property-1.png",
      images: ["/images/property-1.png"],
      featured: true,
      status: "available",
    },
    {
      name: "Palm Court Apartments",
      location: "Victoria Island, Lagos",
      price: "185000.00",
      description: "Modern 3-bedroom luxury apartment in the heart of Victoria Island. Features floor-to-ceiling windows with panoramic city views, an open-plan living area, and a gourmet kitchen with premium appliances. The building offers a rooftop lounge, fitness center, underground parking, and 24-hour concierge service. Walking distance to major business districts, restaurants, and entertainment venues. Ideal for professionals and families seeking urban luxury living.",
      shortDescription: "Modern 3-bed luxury apartment with city views in VI",
      propertyType: "Apartment",
      bedrooms: 3,
      bathrooms: 3,
      area: 2200,
      imageUrl: "/images/property-2.png",
      images: ["/images/property-2.png"],
      featured: true,
      status: "available",
    },
    {
      name: "Greenfield Manor",
      location: "Ikoyi, Lagos",
      price: "720000.00",
      description: "An exclusive 6-bedroom mansion set on a sprawling 1-acre estate in the most sought-after neighborhood of Ikoyi. This architectural masterpiece boasts a grand foyer with double-height ceilings, a private library, wine cellar, entertainment wing, and a separate guest house. The outdoor area features a heated infinity pool, tennis court, and manicured tropical gardens. Premium finishes throughout including imported hardwood floors and designer fixtures.",
      shortDescription: "Exclusive 6-bed mansion on 1-acre estate in Ikoyi",
      propertyType: "Mansion",
      bedrooms: 6,
      bathrooms: 7,
      area: 8500,
      imageUrl: "/images/property-3.png",
      images: ["/images/property-3.png"],
      featured: true,
      status: "available",
    },
    {
      name: "Marina Bay Penthouse",
      location: "Banana Island, Lagos",
      price: "1200000.00",
      description: "Ultra-premium penthouse occupying the entire top floor of an exclusive waterfront development on Banana Island. This 4-bedroom masterpiece features a private elevator, a wraparound terrace with unobstructed lagoon views, a chef's kitchen, and a private rooftop pool. Interior design by a renowned international firm with custom furniture and art installations. The building provides valet parking, a yacht dock, spa facilities, and a private beach club.",
      shortDescription: "Ultra-premium waterfront penthouse on Banana Island",
      propertyType: "Penthouse",
      bedrooms: 4,
      bathrooms: 5,
      area: 6000,
      imageUrl: "/images/property-4.png",
      images: ["/images/property-4.png"],
      featured: false,
      status: "available",
    },
    {
      name: "Orchard Heights",
      location: "Abuja, FCT",
      price: "320000.00",
      description: "Contemporary 4-bedroom terrace duplex in a gated community in Abuja's diplomatic zone. Features an open-concept living space, designer kitchen, home office, and a private garden. The community offers shared amenities including a clubhouse, children's playground, jogging tracks, and round-the-clock security. Energy-efficient design with solar panels and backup power. Close to international schools, hospitals, and government offices.",
      shortDescription: "Contemporary 4-bed terrace in Abuja's diplomatic zone",
      propertyType: "Terrace",
      bedrooms: 4,
      bathrooms: 4,
      area: 3200,
      imageUrl: "/images/property-5.png",
      images: ["/images/property-5.png"],
      featured: false,
      status: "available",
    },
  ]);

  console.log("Database seeded successfully");
}
