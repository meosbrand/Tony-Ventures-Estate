# Tony Multi Ventures - Real Estate Web Application

## Overview
A real estate web application for Tony Multi Ventures where administrators can manage property listings and visitors can browse properties, view details, and inquire via WhatsApp with pre-filled messages. Includes an AI chatbot for visitor assistance and a lead capture system.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + Shadcn UI
- **Backend**: Express.js + PostgreSQL (Drizzle ORM)
- **AI**: OpenAI via Replit AI Integrations (chatbot)
- **File Storage**: Replit Object Storage (property images)
- **Auth**: Replit Auth (OIDC - supports Google, GitHub, Apple, X, email/password)
- **Routing**: wouter (frontend), Express (backend)

## Key Features
- Property browsing with card-based grid layout and type filter pills
- Property detail pages with full descriptions and stat cards
- WhatsApp inquiry CTAs with pre-filled messages
- AI chatbot (SSE streaming) trained on property listings
- Lead capture system for visitor inquiries
- Admin dashboard for property & lead management (Replit Auth)
- Dual theme support (light/dark mode)

## Modern Design System
- Glassmorphism navbar with backdrop-blur and scroll-aware transparency
- Pill-style navigation tabs and property type filters
- Solid primary color highlight on hero "Property" text
- Centered hero section with stats
- Smooth entrance animations (fade-in-up, slide-in, scale-in) with staggered delays
- Card hover effects: smooth-shadow elevation, card-shine sweep, img-zoom on images
- Gradient overlays on hero images and property card hovers
- Subtle pulsing gradient blobs as background decoration
- Rounded icon containers (rounded-xl/2xl) for feature and stat icons
- Dashed border separators for visual rhythm
- Micro-interactions on buttons (scale on hover/active)
- Chat widget with gradient header, rounded message bubbles, online indicator

## Authentication
- **Replit Auth** (OIDC via OpenID Connect) protects admin routes
- Login: `/api/login` → Replit OAuth flow → `/api/callback`
- Logout: `/api/logout` → end session and redirect
- User info: `/api/auth/user` → returns authenticated user
- `isAuthenticated` middleware protects all admin CRUD routes (properties, leads)
- Admin panel at `/admin` — no link in public navbar, standalone layout
- Frontend uses `useAuth()` hook from `client/src/hooks/use-auth.ts`

## Project Structure
```
client/src/
  pages/          - Page components (home, properties, property-detail, contact, admin, admin-dashboard)
  components/     - Reusable components (Navbar, PropertyCard, ChatWidget, LeadCaptureForm)
  lib/            - Utilities (queryClient, theme, utils, auth-utils)
  hooks/          - Custom hooks (use-toast, use-upload, use-auth)

server/
  routes.ts       - All API endpoints
  storage.ts      - Database storage interface (DatabaseStorage)
  seed.ts         - Seed data for properties
  db.ts           - Database connection
  replit_integrations/
    auth/         - Replit Auth (OIDC, passport, session store)
    chat/         - AI chat integration
    object_storage/ - File upload/storage

shared/
  schema.ts       - Drizzle ORM schemas (properties, leads) + re-exports auth & chat models
  models/
    auth.ts       - Users and sessions tables (Replit Auth)
    chat.ts       - Conversations and messages tables
```

## Database Tables
- `users` - Authenticated users from Replit Auth (id, email, firstName, lastName, profileImageUrl)
- `sessions` - Express sessions (sid, sess, expire) — required for Replit Auth
- `properties` - Property listings (serial ID, name, location, price, description, images, etc.)
- `leads` - Lead captures (serial ID, name, email, phone, message, propertyId, status)
- `conversations` - Chat conversations (serial ID, title)
- `messages` - Chat messages (serial ID, conversationId, role, content)

## Environment
- DATABASE_URL - PostgreSQL connection
- AI_INTEGRATIONS_OPENAI_API_KEY / AI_INTEGRATIONS_OPENAI_BASE_URL - OpenAI via Replit
- DEFAULT_OBJECT_STORAGE_BUCKET_ID / PUBLIC_OBJECT_SEARCH_PATHS / PRIVATE_OBJECT_DIR - Object storage
- SESSION_SECRET - Session management

## Theme
- Light: Warm gold (#F4CE89) primary, cream background, Lora/Space Grotesk/Geist fonts
- Dark: Bright blue (#3BA0D8) primary, black background, Open Sans/Menlo fonts
