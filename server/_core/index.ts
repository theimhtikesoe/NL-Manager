import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createServer } from "http";
import { appRouter } from "../routers/index";
import { createContext } from "./context";
import { ENV } from "./env";

const app = express();

app.use(express.json({ limit: "4.5mb" }));
app.use(express.urlencoded({ extended: true, limit: "4.5mb" }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({ success: true, message: "NL Manager API is running", env: ENV.nodeEnv });
});

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

if (ENV.isDevelopment) {
  (async () => {
    try {
      const { setupVite } = await import("./vite");
      const server = createServer(app);
      await setupVite(app, server);
      const port = ENV.port;
      server.listen(port, "0.0.0.0", () => {
        console.log(`\n  \u{1F3ED} NL Manager Dev Server`);
        console.log(`  \u27A1 Local:   http://localhost:${port}`);
        console.log(`  \u27A1 Mode:    ${ENV.nodeEnv}\n`);
      });
    } catch (error) {
      console.error("[Server] Failed to start dev server:", error);
      process.exit(1);
    }
  })();
}

export default app;
