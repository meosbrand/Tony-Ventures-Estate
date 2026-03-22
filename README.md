# Tony Multi Ventures - Real Estate Platform

A full-stack real estate web application for Tony Multi Ventures. Admins manage property listings through a dedicated dashboard, while visitors browse properties, view details, and inquire via WhatsApp. Features an AI-powered chatbot with a persuasive salesman personality and a lead capture system.

## Features

- **Property Listings** — Browse, search, and view detailed property pages with images, specs, and pricing in Nigerian Naira
- **Admin Dashboard** — Secure admin panel to create, edit, and delete property listings and manage leads
- **AI Chatbot** — Conversational AI assistant ("Tony") that recommends properties, creates urgency, and drives action. Supports both OpenAI and Google Gemini
- **Lead Capture** — Collect visitor inquiries and manage them through the admin panel with status tracking
- **WhatsApp Integration** — One-click WhatsApp inquiry buttons on every property
- **Image Uploads** — Upload property images via Supabase Storage
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
| `ADMIN_USERNAME` | No | Admin login username (default: `Admin`, used on first seed) |
| `ADMIN_PASSWORD` | **Yes** | Admin login password — **set this before first run!** |
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
   # Edit .env — set DATABASE_URL, SESSION_SECRET, ADMIN_PASSWORD, and your AI key
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

The admin account is created automatically on first server start using the `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables.

> **Set `ADMIN_PASSWORD` in your `.env` before running for the first time.**
> Using the default will print a warning and is not safe for production.

Access the admin panel at `/admin`.

### Changing the Admin Password

**Option 1 — Before first run:** Set `ADMIN_PASSWORD=your-new-password` in `.env`. The seed will use it automatically.

**Option 2 — After the database is seeded:** Update the `admin_users` table directly in Supabase (or your PostgreSQL client):

1. Generate a bcrypt hash (salt rounds = 12):
   ```bash
   node -e "const bcrypt = require('bcrypt'); bcrypt.hash('your-new-password', 12).then(h => console.log(h));"
   ```
2. Run in your database:
   ```sql
   UPDATE admin_users SET password = '<hashed-value>' WHERE username = 'Admin';
   ```

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
   - `SESSION_SECRET` — A long random string
   - `ADMIN_PASSWORD` — Your chosen admin password
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
   # Edit .env with your Supabase DATABASE_URL, ADMIN_PASSWORD, SESSION_SECRET, and other settings

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
│   ├── seed.ts               # Database seeding (reads ADMIN_PASSWORD from env)
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

The chatbot supports three AI providers. Set `AI_PROVIDER` to switch:

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

### Ollama (self-hosted)

[Ollama](https://ollama.com) lets you run open-source models (Llama, Mistral, Gemma, etc.) locally or on your own server. It exposes an OpenAI-compatible API, so no extra packages are needed.

**Use Ollama as primary provider:**
```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1  # or your server URL
OLLAMA_MODEL=llama3.2                      # any model you have pulled
```

**Use Ollama as automatic fallback** (if OpenAI or Gemini fails):
```env
AI_PROVIDER=openai         # primary
OPENAI_API_KEY=sk-...
OLLAMA_BASE_URL=http://localhost:11434/v1  # fallback kicks in if OpenAI errors
OLLAMA_MODEL=llama3.2
```

**Getting started with Ollama:**
```bash
# 1. Install Ollama (https://ollama.com/download)
curl -fsSL https://ollama.com/install.sh | sh

# 2. Pull a model
ollama pull llama3.2        # ~2 GB, good default
ollama pull mistral         # alternative
ollama pull gemma3          # Google's open model

# 3. Ollama runs automatically on http://localhost:11434
```

> **Remote Ollama**: If Ollama runs on a different machine (e.g. a home server or VPS), set `OLLAMA_BASE_URL=http://your-server-ip:11434/v1`.

| Variable | Required | Description |
|----------|----------|-------------|
| `OLLAMA_BASE_URL` | No | Ollama API URL (default: `http://localhost:11434/v1`) |
| `OLLAMA_MODEL` | No | Model name to use (default: `llama3.2`) |

## Security

- **Rate limiting** on admin login: 5 attempts per 15 minutes per IP (brute-force protection)
- **HTTP security headers** via [Helmet.js](https://helmetjs.github.io/)
- **bcrypt** password hashing (12 salt rounds)
- **Session-based auth** with secure, httpOnly cookies
- **Fail-fast** startup if `SESSION_SECRET` is missing in production

## License

MIT
