import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

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

  // Mock OAuth URL endpoint
  app.get("/api/auth/url", (req, res) => {
    const { provider } = req.query;
    // In a real scenario, you'd construct the provider's auth URL here
    // For now, we'll return a mock URL that points back to our callback
    const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/auth/callback`;
    
    let authUrl = "";
    if (provider === 'ChatGPT') {
      authUrl = `https://auth.openai.com/authorize?client_id=mock&redirect_uri=${redirectUri}&response_type=code`;
    } else if (provider === 'Claude') {
      authUrl = `https://console.anthropic.com/login?redirect_uri=${redirectUri}`;
    } else {
      // Fallback for demo
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=mock&redirect_uri=${redirectUri}&response_type=code&scope=email`;
    }

    res.json({ url: authUrl });
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
