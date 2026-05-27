import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../../../../server/routers/index";
import { getDb } from "../../../../server/db";
import { users } from "../../../../drizzle/schema";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { ENV } from "../../../../server/_core/env";
import type { TrpcContext, AuthUser } from "../../../../server/_core/context";

async function createContext(req: Request): Promise<TrpcContext> {
  let user: AuthUser | null = null;

  // Mock Auth via x-mock-user header
  const mockUsername = req.headers.get("x-mock-user");
  if (mockUsername) {
    try {
      const db = await getDb();
      if (db) {
        const [dbUser] = await db
          .select({ id: users.id, username: users.username, name: users.name, role: users.role })
          .from(users)
          .where(eq(users.username, mockUsername))
          .limit(1);
        if (dbUser) {
          user = dbUser;
          return { req: req as any, res: {} as any, user };
        }
      }
    } catch (error) {
      console.error("[Context] Mock user lookup failed:", error);
    }
    const isAdmin = mockUsername === "admin";
    user = {
      id: isAdmin ? 1 : 100,
      username: mockUsername,
      name: isAdmin ? "System Admin" : mockUsername,
      role: isAdmin ? "admin" : "worker",
    };
    return { req: req as any, res: {} as any, user };
  }

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

  return { req: req as any, res: {} as any, user };
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
