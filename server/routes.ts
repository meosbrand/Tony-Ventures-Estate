import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { insertPropertySchema, insertLeadSchema } from "@shared/schema";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const PgStore = connectPg(session);
  const sessionStore = new PgStore({
    conString: process.env.DATABASE_URL,
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

  registerChatRoutes(app);
  registerObjectStorageRoutes(app);

  app.get("/api/properties", async (req, res) => {
    try {
      const props = await storage.getProperties();
      res.json(props);
    } catch (error) {
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
      const id = parseInt(req.params.id);
      const property = await storage.getProperty(id);
      if (!property) return res.status(404).json({ error: "Property not found" });
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
      const id = parseInt(req.params.id);
      const partialSchema = insertPropertySchema.partial();
      const parsed = partialSchema.parse(req.body);
      const property = await storage.updateProperty(id, parsed);
      if (!property) return res.status(404).json({ error: "Property not found" });
      res.json(property);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid property data" });
    }
  });

  app.delete("/api/properties/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
      const { status } = req.body;
      if (!status || !["new", "contacted", "qualified", "closed"].includes(status)) {
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
      const id = parseInt(req.params.id);
      await storage.deleteLead(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
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
      const propertyContext = allProperties.map(p =>
        `- ${p.name}: ${p.propertyType} in ${p.location}, Price: ₦${Number(p.price).toLocaleString()}, ${p.bedrooms || 'N/A'} beds, ${p.bathrooms || 'N/A'} baths, ${p.area || 'N/A'} sqft. ${p.shortDescription}`
      ).join("\n");

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

      const messages: any[] = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.map((m: any) => ({ role: m.role, content: m.content })),
        { role: "user", content: message },
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages,
        stream: true,
        max_completion_tokens: 8192,
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Chatbot error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to generate response" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to generate response" });
      }
    }
  });

  return httpServer;
}
