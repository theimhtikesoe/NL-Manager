import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

const app = express();

// Body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Development / Production handling
if (process.env.NODE_ENV === "development") {
  setupVite(app).catch(console.error);
} else {
  serveStatic(app);
}

// Health check route
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    message: "NL-Manager API running",
  });
});

// IMPORTANT:
// DO NOT use app.listen() on Vercel
// Export the app as a serverless handler instead

export default function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  return app(req, res);
}
