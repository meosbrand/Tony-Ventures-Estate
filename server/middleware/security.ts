import type { Request, Response, NextFunction } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { DEFAULT_TOUR_HOSTS } from "@shared/media-limits";

const DEFAULT_ORIGINS = [
  "https://tonymultiventures.vercel.app",
  "https://tonymultiventures.com",
  "https://www.tonymultiventures.com",
];

/** Browser origins allowed to call the API with credentials (CLIENT_URL plus the known site domains). */
export function getAllowedOrigins(): string[] {
  const configured = (process.env.CLIENT_URL || "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return Array.from(new Set([...configured, ...DEFAULT_ORIGINS]));
}

function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * CSRF guard for state-changing requests: when the browser says where the request came
 * from (Origin, or Referer as a fallback), it must be our site. Browsers always send
 * Origin on cross-site POSTs, so a forged form or fetch from another site is rejected.
 */
export function requireSameOrigin(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method) || process.env.NODE_ENV !== "production") {
    return next();
  }
  const origin = originOf(req.get("origin")) ?? originOf(req.get("referer"));
  if (!origin) return next();

  const self = `${req.protocol}://${req.get("host")}`;
  if (origin === self || getAllowedOrigins().includes(origin)) return next();

  return res.status(403).json({ error: "Request origin not allowed" });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.adminId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

/** Parses a positive integer route param; null when malformed. */
export function parseIntParam(value: unknown): number | null {
  const s = String(value);
  if (!/^\d{1,9}$/.test(s)) return null;
  const n = Number(s);
  return n > 0 ? n : null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseUuidParam(value: unknown): string | null {
  const s = String(value);
  return UUID_RE.test(s) ? s.toLowerCase() : null;
}

const adminKey = (req: Request) => req.session.adminId ?? ipKeyGenerator(req.ip ?? "");

/** Upload URL issuance: generous for real use, stops runaway scripts filling the bucket. */
export const mediaUploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 60,
  keyGenerator: adminKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many uploads. Please wait a few minutes and try again." },
});

/** General cap on admin write operations. */
export const adminWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  keyGenerator: adminKey,
  skip: (req) => req.method === "GET",
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

/** Hosts whose virtual tours may be embedded (TOUR_EMBED_HOSTS, comma-separated). */
export function getTourHosts(): string[] {
  const configured = (process.env.TOUR_EMBED_HOSTS || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return configured.length > 0 ? configured : DEFAULT_TOUR_HOSTS;
}

/**
 * CSP for pages served by this server (the Vercel frontend sets an equivalent policy in
 * vercel.json). Media and 3D files load from Supabase Storage; tours embed from the
 * allowlisted hosts; 'wasm-unsafe-eval' is only for the self-hosted Draco/Basis decoders.
 */
export function contentSecurityPolicyDirectives(): Record<string, string[]> {
  const supabase = originOf(process.env.SUPABASE_URL);
  const storage = supabase ? [supabase] : [];
  const tourHosts = getTourHosts().map((h) => `https://${h}`);

  return {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'wasm-unsafe-eval'"],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "img-src": ["'self'", "data:", "blob:", ...storage],
    "media-src": ["'self'", "blob:", ...storage],
    "connect-src": ["'self'", ...storage],
    "worker-src": ["'self'", "blob:"],
    "frame-src": tourHosts.length ? tourHosts : ["'none'"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
  };
}
