import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Request, Response } from "express-serve-static-core";
import * as jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { ENV } from "./env";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";

export type AuthUser = {
  id: number;
  username: string;
  name: string;
  role: "admin" | "worker";
};

export type TrpcContext = {
  req: Request;
  res: Response;
  user: AuthUser | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: AuthUser | null = null;

  // Mock Auth via x-mock-user header
  const mockUsername = opts.req.headers["x-mock-user"] as string | undefined;
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
          return { req: opts.req, res: opts.res, user };
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
    return { req: opts.req, res: opts.res, user };
  }

  // Standard JWT Auth
  try {
    const authHeader = opts.req.headers.authorization;
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

  return { req: opts.req, res: opts.res, user };
}
