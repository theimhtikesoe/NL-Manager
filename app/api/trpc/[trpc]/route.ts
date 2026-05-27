import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../../../../server/routers/index";
import jwt from "jsonwebtoken";
import { ENV } from "../../../../server/_core/env";
import type { TrpcContext, AuthUser } from "../../../../server/_core/context";

async function createContext(req: Request): Promise<TrpcContext> {
  let user: AuthUser | null = null;

  // Standard JWT Auth
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        user = jwt.verify(token, ENV.jwtSecret) as AuthUser;
      } catch (verifyError) {
        console.error("[Context] Token verification failed:", verifyError instanceof Error ? verifyError.message : "Unknown error");
        user = null;
      }
    }
  } catch (error) {
    console.error("[Context] Unexpected error in createContext:", error);
    user = null;
  }

  return { user };
}

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError({ path, error }) {
      console.error(`[tRPC Error] at "${path}":`, error.message);
    },
  });

export { handler as GET, handler as POST };
