import express from "express";
import type { Express } from "express-serve-static-core";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // In Vercel, static files are served from the output directory directly
  // This function is mainly for local production testing and fallback
  const distPath = path.resolve(process.cwd(), "dist", "public");
  
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.use("*", (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) {
        return next();
      }
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }
}
