import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { setupAuth } from "./auth";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { insertPropertySchema, insertLeadSchema } from "@shared/schema";
import { pool } from "./db";
import { streamChatResponse, transcribeAudio, textToSpeech } from "./ai-provider";
import {
  isSupabaseConfigured,
  uploadFile as supabaseUpload,
  ensureBucket,
} from "./supabase-storage";

declare module "express-session" {
  interface SessionData {
    adminId?: string;
    adminUsername?: string;
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.adminId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

// Brute-force protection: 5 failed login attempts per 15 minutes per IP
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true, // only count failed attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Too many login attempts. Please wait 15 minutes before trying again.",
  },
});

// Health check rate limiter: allow monitoring platforms while preventing abuse
const healthRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const PgStore = connectPg(session);
  const sessionStore = new PgStore({
    pool,
    createTableIfMissing: true,
    tableName: "admin_sessions",
  });

  app.set("trust proxy", 1);
  app.use(
    session({
      secret: process.env.SESSION_SECRET!,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  // Health check endpoint for Render (and other platforms)
  app.get("/api/health", healthRateLimiter, async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", db: "connected" });
    } catch (error) {
      console.error("Health check DB error:", error);
      res.status(503).json({ status: "error", db: "disconnected" });
    }
  });

  // SEO & Generative AI Routes
  app.get("/robots.txt", (req, res) => {
    res.type("text/plain");
    res.send(`User-agent: *
Allow: /
Sitemap: https://tonymultiventures.com/sitemap.xml`);
  });

  app.get("/sitemap.xml", async (req, res) => {
    try {
      const allProperties = await storage.getProperties();
      
      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://tonymultiventures.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://tonymultiventures.com/properties</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://tonymultiventures.com/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;

      for (const property of allProperties) {
        xml += `
  <url>
    <loc>https://tonymultiventures.com/properties/${property.id}</loc>
    <lastmod>${new Date(property.createdAt || Date.now()).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }

      xml += `\n</urlset>`;
      
      res.header('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {
      console.error("Error generating sitemap:", error);
      res.status(500).end();
    }
  });

  if (isSupabaseConfigured()) {
    ensureBucket().catch(console.error);

    app.post(
      "/api/uploads/upload",
      requireAdmin,
      upload.single("file"),
      async (req, res) => {
        try {
          if (!req.file)
            return res.status(400).json({ error: "No file provided" });
          const publicUrl = await supabaseUpload(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype
          );
          res.json({ url: publicUrl, objectPath: publicUrl });
        } catch (error: any) {
          console.error("Upload error:", error);
          res.status(500).json({ error: error.message || "Upload failed" });
        }
      }
    );
  } else {
    app.post("/api/uploads/upload", (_req, res) => {
      res.status(503).json({
        error:
          "Image storage not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable uploads.",
      });
    });
  }

  app.get("/api/properties", async (req, res) => {
    try {
      const props = await storage.getProperties();
      res.json(props);
    } catch (error) {
      console.error("GET /api/properties error:", error);
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/featured", async (req, res) => {
    try {
      const props = await storage.getFeaturedProperties();
      res.json(props);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch featured properties" });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const property = await storage.getProperty(id);
      if (!property)
        return res.status(404).json({ error: "Property not found" });
      res.json(property);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch property" });
    }
  });

  app.post("/api/properties", requireAdmin, async (req, res) => {
    try {
      const parsed = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(parsed);
      res.status(201).json(property);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid property data" });
    }
  });

  app.patch("/api/properties/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const partialSchema = insertPropertySchema.partial();
      const parsed = partialSchema.parse(req.body);
      const property = await storage.updateProperty(id, parsed);
      if (!property)
        return res.status(404).json({ error: "Property not found" });
      res.json(property);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid property data" });
    }
  });

  app.delete("/api/properties/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      await storage.deleteProperty(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete property" });
    }
  });

  app.get("/api/leads", requireAdmin, async (req, res) => {
    try {
      const allLeads = await storage.getLeads();
      res.json(allLeads);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      const parsed = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(parsed);
      res.status(201).json(lead);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid lead data" });
    }
  });

  app.patch("/api/leads/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const { status } = req.body;
      if (
        !status ||
        !["new", "contacted", "qualified", "closed"].includes(status)
      ) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const lead = await storage.updateLeadStatus(id, status);
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      res.json(lead);
    } catch (error) {
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  app.delete("/api/leads/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      await storage.deleteLead(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });

  // Apply rate limiting to admin login — brute-force protection
  app.post("/api/admin/login", loginRateLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res
          .status(400)
          .json({ error: "Username and password are required" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      req.session.adminId = user.id;
      req.session.adminUsername = user.username;
      res.json({ id: user.id, username: user.username });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: "Logout failed" });
      res.json({ success: true });
    });
  });

  app.get("/api/admin/session", (req, res) => {
    if (req.session.adminId) {
      res.json({ id: req.session.adminId, username: req.session.adminUsername });
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  app.post("/api/chatbot", async (req, res) => {
    try {
      const { message, conversationHistory = [] } = req.body;
      if (!message) return res.status(400).json({ error: "Message is required" });

      const allProperties = await storage.getProperties();
      const propertyContext = allProperties
        .map(
          (p) =>
            `- ${p.name}: ${p.propertyType} in ${p.location}, Price: ₦${Number(p.price).toLocaleString()}, ${p.bedrooms || "N/A"} beds, ${p.bathrooms || "N/A"} baths, ${p.area || "N/A"} sqft. ${p.shortDescription}`
        )
        .join("\n");

      const systemPrompt = `You are Tony — the top real estate sales consultant at Tony Multi Ventures, a premium Nigerian real estate company. You are a world-class salesman: warm, confident, persuasive, and genuinely passionate about helping people find their dream homes.

Your personality:
- You speak like a trusted friend who happens to be a real estate expert
- You are enthusiastic and confident, but never pushy or fake
- You give strong opinions and personal recommendations — "This is hands down the best value in Lekki right now"
- You create urgency naturally — "Properties like this don't stay on the market long"
- You paint vivid pictures of lifestyle — "Imagine waking up to that ocean view every morning"
- You always end with a clear, persuasive call-to-action — "Let me set up a private viewing for you this week!"

Available Properties:
${propertyContext}

Business Information:
- Company: Tony Multi Ventures
- Location: Lagos & Abuja, Nigeria
- Services: Property sales, property management, real estate consulting
- Contact: Via WhatsApp or the website contact form

Rules:
- Always recommend specific properties based on what the visitor is looking for — don't just list features, sell the experience
- Use Nigerian Naira (₦) for all prices
- Give your honest opinion on which property is the best fit and why
- Include persuasive CTAs like: "Want me to arrange a viewing?", "Shall I send you more details?", "This one is perfect for you — let's make it happen!"
- If someone seems interested, gently push them toward taking action — contacting you, scheduling a viewing, or asking more questions
- Keep responses conversational and natural — write like you're chatting, not writing a report
- Be warm and personal — use "you" and "your" frequently
- If you don't know something specific, be honest but redirect to something you can help with
- Keep responses concise but impactful — every sentence should add value or move the conversation forward`;

      await streamChatResponse(systemPrompt, conversationHistory, message, res);
    } catch (error) {
      console.error("Chatbot error:", error);
      if (res.headersSent) {
        res.write(
          `data: ${JSON.stringify({ error: "Failed to generate response" })}\n\n`
        );
        res.end();
      } else {
        res.status(500).json({ error: "Failed to generate response" });
      }
    }
  });

  app.post("/api/voice-chat", async (req, res) => {
    try {
      const { audio, conversationHistory = [] } = req.body;
      if (!audio) return res.status(400).json({ error: "Audio data is required" });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // 1. Decode incoming audio
      const audioBuffer = Buffer.from(audio, "base64");
      
      // 2. Transcribe
      let userText: string;
      try {
        userText = await transcribeAudio(audioBuffer, "audio/webm");
        res.write(`data: ${JSON.stringify({ type: "user_transcript", data: userText })}\n\n`);
      } catch (err) {
        console.error("Transcription error:", err);
        res.write(`data: ${JSON.stringify({ type: "error", error: "Could not transcribe audio. Please try again." })}\n\n`);
        return res.end();
      }

      // 3. Generate chatbot response
      const allProperties = await storage.getProperties();
      const propertyContext = allProperties
        .map(
          (p) =>
            `- ${p.name}: ${p.propertyType} in ${p.location}, Price: ₦${Number(p.price).toLocaleString()}, ${p.bedrooms || "N/A"} beds, ${p.bathrooms || "N/A"} baths, ${p.area || "N/A"} sqft. ${p.shortDescription}`
        )
        .join("\n");

      const systemPrompt = `You are Tony — the top real estate sales consultant at Tony Multi Ventures, a premium Nigerian real estate company. You are a world-class salesman: warm, confident, persuasive, and genuinely passionate about helping people find their dream homes.

Your personality:
- You speak like a trusted friend who happens to be a real estate expert
- You are enthusiastic and confident, but never pushy or fake
- You give strong opinions and personal recommendations — "This is hands down the best value in Lekki right now"
- You create urgency naturally — "Properties like this don't stay on the market long"
- You paint vivid pictures of lifestyle — "Imagine waking up to that ocean view every morning"
- You always end with a clear, persuasive call-to-action — "Let me set up a private viewing for you this week!"

Available Properties:
${propertyContext}

Business Information:
- Company: Tony Multi Ventures
- Location: Lagos & Abuja, Nigeria
- Services: Property sales, property management, real estate consulting
- Contact: Via WhatsApp or the website contact form

Rules:
- Always recommend specific properties based on what the visitor is looking for — don't just list features, sell the experience
- Use Nigerian Naira (₦) for all prices
- Give your honest opinion on which property is the best fit and why
- Include persuasive CTAs like: "Want me to arrange a viewing?", "Shall I send you more details?", "This one is perfect for you — let's make it happen!"
- If someone seems interested, gently push them toward taking action — contacting you, scheduling a viewing, or asking more questions
- Keep responses conversational and natural — write like you're chatting, not writing a report
- Be warm and personal — use "you" and "your" frequently
- If you don't know something specific, be honest but redirect to something you can help with
- Keep responses concise but impactful — every sentence should add value or move the conversation forward`;

      // Since we need to synthesize the full text at once, we'll use a trick:
      // We pass a custom response object to streamChatResponse that captures the output
      // and relays it, while buffering the full text for TTS.
      let fullTextResponse = "";
      const customRes = {
        write: (chunk: string) => {
          // Relays the chunk directly to the real response
          // We must parse the original server-sent event
          if (chunk.startsWith("data: ")) {
            try {
              const data = JSON.parse(chunk.slice(6));
              if (data.content) {
                fullTextResponse += data.content;
                // Forward as transcript event
                res.write(`data: ${JSON.stringify({ type: "transcript", data: data.content })}\n\n`);
              }
            } catch (e) {
              // Ignore parse errors from partial chunks
            }
          }
        },
        end: async () => {
          // 4. Convert full text to speech
          if (fullTextResponse) {
            const audioOut = await textToSpeech(fullTextResponse);
            if (audioOut) {
              // Send the full audio back
              const base64Out = audioOut.toString("base64");
              res.write(`data: ${JSON.stringify({ type: "audio", data: base64Out })}\n\n`);
            }
          }
          res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
          res.end();
        },
        setHeader: (key: string, val: string) => {}, // Ignore
      } as unknown as Response;

      await streamChatResponse(systemPrompt, conversationHistory, userText, customRes);

    } catch (error) {
      console.error("Voice chat error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: "error", error: "Failed to generate response" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to process voice request" });
      }
    }
  });

  return httpServer;
}
