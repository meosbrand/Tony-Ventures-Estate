# Tony Multi Ventures - Real Estate Platform

A full-stack real estate web application for Tony Multi Ventures. Admins manage property listings through a dedicated dashboard, while visitors browse properties, view details, and inquire via WhatsApp. Features an AI-powered chatbot with a persuasive salesman personality and a lead capture system.

## Features

- **Property Listings** — Browse, search, and view detailed property pages with images, specs, and pricing in Nigerian Naira
- **Admin Dashboard** — Secure admin panel to create, edit, and delete property listings and manage leads
- **AI Chatbot** — Conversational AI assistant ("Tony") that recommends properties, creates urgency, and drives action. Supports both OpenAI and Google Gemini
- **Lead Capture** — Collect visitor inquiries and manage them through the admin panel with status tracking
- **WhatsApp Integration** — One-click WhatsApp inquiry buttons on every property
- **Image Uploads** — Upload property images via Supabase Storage (or Replit Object Storage)
- **Responsive Design** — Mobile-friendly interface with dark mode support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, TailwindCSS, Shadcn/UI |
| Backend | Express 5, Node.js |
| Database | PostgreSQL (via Drizzle ORM) |
| AI | OpenAI GPT or Google Gemini (configurable) |
| Storage | Supabase Storage |
| Routing | Wouter |
| State | TanStack React Query |

## Prerequisites

- **Node.js** 20+
- **PostgreSQL** database (local, Supabase, or any hosted provider)
- **AI API Key** — OpenAI API key or Google Gemini API key
- **Supabase account** (free tier) — for image storage

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Secret for session encryption (use a long random string) |
| `PORT` | No | Server port (default: 5000) |
| `AI_PROVIDER` | No | `openai` or `gemini` (default: openai) |
| `OPENAI_API_KEY` | If using OpenAI | OpenAI API key |
| `OPENAI_MODEL` | No | OpenAI model name (default: gpt-4o-mini) |
| `GEMINI_API_KEY` | If using Gemini | Google Gemini API key |
| `GEMINI_MODEL` | No | Gemini model name (default: gemini-1.5-flash) |
| `SUPABASE_URL` | For image uploads | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | For image uploads | Supabase service role key |
| `SUPABASE_STORAGE_BUCKET` | No | Storage bucket name (default: property-images) |

## Quick Start (Local Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/tony-multi-ventures.git
   cd tony-multi-ventures
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser** at `http://localhost:5000`

## Admin Access

On first run, a default admin account is created automatically:

| Field | Value |
|-------|-------|
| Username | `Admin` |
| Password | `admin01` |

Access the admin panel at `/admin`. **Change the default password after first login.**

## Supabase Setup

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. **For the database:** Go to Settings > Database, copy the connection string and use it as `DATABASE_URL`
4. **For image storage:**
   - Go to Settings > API, copy the Project URL (`SUPABASE_URL`) and the service role key (`SUPABASE_SERVICE_ROLE_KEY`)
   - The app will automatically create a `property-images` storage bucket on startup
5. Add these values to your `.env` file or hosting environment variables

## Deployment

### Deploy on Render (Free Tier)

1. Push your code to GitHub
2. Go to [render.com](https://render.com) and create a new **Web Service**
3. Connect your GitHub repository
4. Render will detect the `render.yaml` blueprint and configure the service
5. Set the environment variables in the Render dashboard:
   - `DATABASE_URL` — Use your Supabase database connection string
   - `OPENAI_API_KEY` or `GEMINI_API_KEY` — Your AI provider key
   - `AI_PROVIDER` — Set to `openai` or `gemini`
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — For image uploads
6. Deploy

### Deploy on Railway

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) and create a new project
3. Select **Deploy from GitHub repo** and connect your repository
4. Railway will detect the `Dockerfile` and `railway.toml`
5. Add environment variables in the Railway dashboard (same as Render above)
6. Deploy

### Deploy with Docker (Self-Hosted)

For deploying on your own VPS:

1. **With Supabase as database + storage** (recommended):
   ```bash
   # Clone and configure
   cp .env.example .env
   # Edit .env with your Supabase DATABASE_URL and other settings

   # Build and run
   docker build -t tony-multi-ventures .
   docker run -d --env-file .env -p 5000:5000 tony-multi-ventures
   ```

2. **With local PostgreSQL** (using docker-compose):
   ```bash
   # Edit docker-compose.yml with your settings
   docker-compose up -d
   ```

   This starts both the app and a PostgreSQL database. Access the app at `http://localhost:5000`.

## Project Structure

```
├── client/                   # Frontend (React)
│   └── src/
│       ├── components/       # Reusable UI components
│       ├── hooks/            # Custom React hooks
│       ├── lib/              # Utilities and query client
│       └── pages/            # Page components
├── server/                   # Backend (Express)
│   ├── ai-provider.ts        # AI provider abstraction (OpenAI/Gemini)
│   ├── supabase-storage.ts   # Supabase Storage service
│   ├── routes.ts             # API route definitions
│   ├── storage.ts            # Database operations interface
│   ├── seed.ts               # Database seeding
│   └── db.ts                 # Database connection
├── shared/                   # Shared types and schemas
│   └── schema.ts             # Drizzle ORM schema + Zod validators
├── Dockerfile                # Multi-stage Docker build
├── docker-compose.yml        # Docker Compose with PostgreSQL
├── render.yaml               # Render deployment blueprint
├── railway.toml              # Railway deployment config
└── .env.example              # Environment variable template
```

## AI Provider Configuration

The chatbot supports two AI providers. Set `AI_PROVIDER` to switch:

### OpenAI (default)
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini    # optional, defaults to gpt-4o-mini
```

### Google Gemini
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=AI...
GEMINI_MODEL=gemini-1.5-flash    # optional, defaults to gemini-1.5-flash
```

## License

MIT
