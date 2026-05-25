import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { appRouter } from "../routers";
import { createContext } from "./context";

const app = express();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health Check Route
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "NL Manager API is running",
  });
});

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// IMPORTANT:
// DO NOT use app.listen()

export default function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  return app(req, res);
}
