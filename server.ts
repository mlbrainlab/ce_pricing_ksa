import express from "express";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy to ensure IP forwarding works correctly behind load balancers
  app.set('trust proxy', true);

  // Proxy PostHog requests to bypass adblockers
  // This forwards any request from /ingest to the PostHog EU server
  app.use('/ingest', createProxyMiddleware({
    target: 'https://eu.i.posthog.com',
    changeOrigin: true,
    pathRewrite: {
      '^/ingest': '', // remove /ingest from the path
    },
    on: {
      proxyReq: (proxyReq, req: any) => {
        // Forward the original IP address so PostHog can track geolocation
        if (req.ip) {
          proxyReq.setHeader('X-Forwarded-For', req.ip);
        }
      }
    }
  }));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // SPA Fallback
    app.use((req, res, next) => {
      if (req.method === 'GET' && req.accepts('html')) {
        res.sendFile(path.join(distPath, 'index.html'));
      } else {
        next();
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
