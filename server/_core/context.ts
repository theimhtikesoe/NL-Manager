import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Request, Response } from "express-serve-static-core";
import jwt from "jsonwebtoken";
import { ENV } from "./env";

export type AuthUser = {
  id: number;
  workerCode: string;
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

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
