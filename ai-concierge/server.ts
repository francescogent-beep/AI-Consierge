import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // OpenAI Proxy
  app.post("/api/ai/openai", async (req, res) => {
    const { message, apiKey, history } = req.body;
    if (!apiKey) return res.status(400).json({ error: "API Key is required" });

    try {
      const openai = new OpenAI({ apiKey });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          ...history.map((m: any) => ({ role: m.role, content: m.content })),
          { role: "user", content: message }
        ],
      });
      res.json({ text: response.choices[0].message.content });
    } catch (error: any) {
      console.error("OpenAI Error:", error);
      res.status(500).json({ error: error.message || "OpenAI API Error" });
    }
  });

  // Anthropic Proxy
  app.post("/api/ai/anthropic", async (req, res) => {
    const { message, apiKey, history } = req.body;
    if (!apiKey) return res.status(400).json({ error: "API Key is required" });

    try {
      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1024,
        messages: [
          ...history.map((m: any) => ({ role: m.role, content: m.content })),
          { role: "user", content: message }
        ],
      });
      // Claude response content is an array of parts
      const text = response.content
        .filter(part => part.type === 'text')
        .map(part => (part as any).text)
        .join('\n');
      res.json({ text });
    } catch (error: any) {
      console.error("Anthropic Error:", error);
      res.status(500).json({ error: error.message || "Anthropic API Error" });
    }
  });

  // Perplexity Proxy (OpenAI compatible)
  app.post("/api/ai/perplexity", async (req, res) => {
    const { message, apiKey, history } = req.body;
    if (!apiKey) return res.status(400).json({ error: "API Key is required" });

    try {
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [
            ...history.map((m: any) => ({ role: m.role, content: m.content })),
            { role: "user", content: message }
          ],
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || "Perplexity API Error");
      res.json({ text: data.choices[0].message.content });
    } catch (error: any) {
      console.error("Perplexity Error:", error);
      res.status(500).json({ error: error.message || "Perplexity API Error" });
    }
  });

  // Mock OAuth URL endpoint
  app.get("/api/auth/url", (req, res) => {
    const { provider } = req.query;
    const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/auth/callback`;
    
    // For the demo, we'll use a local mock auth page instead of real providers
    // to avoid "invalid client_id" errors.
    const authUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/mock-auth?provider=${provider}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    res.json({ url: authUrl });
  });

  // Mock Auth Page (Simulates the provider's login screen)
  app.get("/api/mock-auth", (req, res) => {
    const { provider, redirect_uri } = req.query;
    res.send(`
      <html>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f1f5f9; margin: 0;">
          <div style="text-align: center; background: white; padding: 3rem; border-radius: 1.5rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); max-width: 400px; width: 90%;">
            <div style="width: 64px; height: 64px; background: #4f46e5; border-radius: 1rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            </div>
            <h2 style="color: #1e293b; margin-bottom: 0.5rem;">Connect to ${provider}</h2>
            <p style="color: #64748b; margin-bottom: 2rem; font-size: 0.9rem;">AI Concierge is requesting access to your ${provider} account to sync conversations.</p>
            <a href="${redirect_uri}" style="display: block; background: #4f46e5; color: white; padding: 0.75rem; border-radius: 0.75rem; text-decoration: none; font-weight: bold; margin-bottom: 1rem; transition: background 0.2s;">
              Authorize AI Concierge
            </a>
            <button onclick="window.close()" style="background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 0.8rem;">Cancel</button>
          </div>
        </body>
      </html>
    `);
  });

  // OAuth Callback Handler
  app.get("/auth/callback", (req, res) => {
    // This would normally exchange the code for tokens
    res.send(`
      <html>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8f9fa;">
          <div style="text-align: center; background: white; padding: 2rem; border-radius: 1rem; shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #4f46e5;">Authentication Successful</h2>
            <p>Connecting to AI Concierge...</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                setTimeout(() => window.close(), 1000);
              } else {
                window.location.href = '/';
              }
            </script>
          </div>
        </body>
      </html>
    `);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
