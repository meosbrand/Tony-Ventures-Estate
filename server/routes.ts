import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
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
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "tony-multi-ventures-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
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
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
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
        `- ${p.name}: ${p.propertyType} in ${p.location}, Price: $${p.price}, ${p.bedrooms || 'N/A'} beds, ${p.bathrooms || 'N/A'} baths, ${p.area || 'N/A'} sqft. ${p.shortDescription}`
      ).join("\n");

      const systemPrompt = `You are a helpful real estate assistant for Tony Multi Ventures, a premium real estate company. You help visitors find properties, answer questions about listings, and provide information about the company's services.

Available Properties:
${propertyContext}

Business Information:
- Company: Tony Multi Ventures
- Services: Property sales, property management, real estate consulting
- Contact: Via WhatsApp or the website inquiry form

Guidelines:
- Be friendly, professional, and helpful
- Recommend properties based on visitor preferences
- If asked about a specific property, provide detailed information
- Encourage visitors to inquire about properties they're interested in
- Keep responses concise but informative
- If you don't know something, say so honestly`;

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
