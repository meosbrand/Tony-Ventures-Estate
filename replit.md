# Tony Multi Ventures - Real Estate Web Application

## Overview
A real estate web application for Tony Multi Ventures where administrators can manage property listings and visitors can browse properties, view details, and inquire via WhatsApp with pre-filled messages. Includes an AI chatbot for visitor assistance and a lead capture system.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + Shadcn UI
- **Backend**: Express.js + PostgreSQL (Drizzle ORM)
- **AI**: OpenAI via Replit AI Integrations (chatbot)
- **File Storage**: Replit Object Storage (property images)
- **Routing**: wouter (frontend), Express (backend)

## Key Features
- Property browsing with card-based grid layout and type filter pills
- Property detail pages with full descriptions and stat cards
- WhatsApp inquiry CTAs with pre-filled messages
- AI chatbot (SSE streaming) trained on property listings
- Lead capture system for visitor inquiries
- Admin dashboard for property & lead management (session-based auth)
- Dual theme support (light/dark mode)

## Modern Design System
- Glassmorphism navbar with backdrop-blur and scroll-aware transparency
- Pill-style navigation tabs and property type filters
- Gradient text effects on hero headings and stats
- Smooth entrance animations (fade-in-up, slide-in, scale-in) with staggered delays
- Card hover effects: smooth-shadow elevation, card-shine sweep, img-zoom on images
- Gradient overlays on hero images and property card hovers
- Subtle pulsing gradient blobs as background decoration
- Rounded icon containers (rounded-xl/2xl) for feature and stat icons
- Dashed border separators for visual rhythm
- Micro-interactions on buttons (scale on hover/active)
- Chat widget with gradient header, rounded message bubbles, online indicator

## Project Structure
```
client/src/
  pages/          - Page components (home, properties, property-detail, admin)
  components/     - Reusable components (Navbar, PropertyCard, ChatWidget, LeadCaptureForm)
  lib/            - Utilities (queryClient, theme, utils)
  hooks/          - Custom hooks (use-toast, use-upload)

server/
  routes.ts       - All API endpoints
  storage.ts      - Database storage interface (DatabaseStorage)
  seed.ts         - Seed data for properties
  db.ts           - Database connection
  replit_integrations/ - AI chat, image generation, object storage

shared/
  schema.ts       - Drizzle ORM schemas (users, properties, leads, conversations, messages)
```

## Database Tables
- `users` - Admin accounts (varchar ID, username, password)
- `properties` - Property listings (serial ID, name, location, price, description, images, etc.)
- `leads` - Lead captures (serial ID, name, email, phone, message, propertyId, status)
- `conversations` - Chat conversations (serial ID, title)
- `messages` - Chat messages (serial ID, conversationId, role, content)

## Admin Credentials
- Username: `admin`
- Password: `admin123`

## Environment
- DATABASE_URL - PostgreSQL connection
- AI_INTEGRATIONS_OPENAI_API_KEY / AI_INTEGRATIONS_OPENAI_BASE_URL - OpenAI via Replit
- DEFAULT_OBJECT_STORAGE_BUCKET_ID / PUBLIC_OBJECT_SEARCH_PATHS / PRIVATE_OBJECT_DIR - Object storage
- SESSION_SECRET - Session management

## Theme
- Light: Warm gold (#F4CE89) primary, cream background, Lora/Space Grotesk/Geist fonts
- Dark: Bright blue (#3BA0D8) primary, black background, Open Sans/Menlo fonts
