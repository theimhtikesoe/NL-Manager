import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Request, Response } from "express-serve-static-core";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "fallback_secret_for_latyar_factory";

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
      user = jwt.verify(token, JWT_SECRET) as AuthUser;
    }
  } catch {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
