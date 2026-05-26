import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createServer } from "http";

import { appRouter } from "../routers/index";
import { createContext } from "./context";
import { ENV } from "./env";

const app = express();

// Middleware — limit payload for Vercel serverless compatibility (4.5MB)
app.use(express.json({ limit: "4.5mb" }));
app.use(express.urlencoded({ extended: true, limit: "4.5mb" }));

// Health Check
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "NL Manager API is running",
    env: ENV.nodeEnv,
  });
});

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ path, error }) {
      console.error(`[tRPC Error] at "${path}":`, error.message);
    },
  })
);

// ── Development server with Vite HMR ──────────────────
if (ENV.isDevelopment) {
  (async () => {
    try {
      const { setupVite } = await import("./vite");
      const server = createServer(app);
      await setupVite(app, server);

      const port = ENV.port;
      server.listen(port, "0.0.0.0", () => {
        console.log(`\n  🏭 NL Manager Dev Server`);
        console.log(`  ➜ Local:   http://localhost:${port}`);
        console.log(`  ➜ Network: http://0.0.0.0:${port}`);
        console.log(`  ➜ Mode:    ${ENV.nodeEnv}\n`);
      });
    } catch (error) {
      console.error("[Server] Failed to start dev server:", error);
      process.exit(1);
    }
  })();
}

export default app;
