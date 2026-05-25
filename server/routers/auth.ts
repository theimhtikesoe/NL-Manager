import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { workers } from "../../drizzle/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { ENV } from "../_core/env";

export const authRouter = router({
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1, "Username is required"),
        password: z.string().min(1, "Password is required"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          console.error("[Auth] Database connection failed during login attempt");
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed. Please try again later.",
          });
        }

        const [worker] = await db
          .select()
          .from(workers)
          .where(eq(workers.username, input.username))
          .limit(1);

        if (!worker) {
          console.warn(`[Auth] Failed login attempt: user not found "${input.username}"`);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid username or password",
          });
        }

        let valid = false;
        try {
          valid = await bcrypt.compare(
            input.password,
            worker.passwordHash
          );
        } catch (bcryptError) {
          console.error(`[Auth] Bcrypt comparison error for "${input.username}":`, bcryptError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Authentication service error",
          });
        }

        if (!valid) {
          console.warn(`[Auth] Failed login attempt: invalid password for "${input.username}"`);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid username or password",
          });
        }

        if (!ENV.jwtSecret) {
          console.error("[Auth] CRITICAL: JWT_SECRET is not configured!");
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Server configuration error",
          });
        }

        let token;
        try {
          token = jwt.sign(
            {
              id: worker.id,
              workerCode: worker.workerCode,
              name: worker.name,
              role: worker.role,
            },
            ENV.jwtSecret,
            { expiresIn: "30d" }
          );
        } catch (jwtError) {
          console.error(`[Auth] JWT signing error for "${input.username}":`, jwtError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Token generation failed",
          });
        }

        console.info(`[Auth] Successful login for "${input.username}" (role: ${worker.role})`);
        return {
          token,
          worker: {
            id: worker.id,
            name: worker.name,
            workerCode: worker.workerCode,
            role: worker.role,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Auth] Unexpected login error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred during login",
        });
      }
    }),

  me: protectedProcedure.query(({ ctx }) => {
    // TODO: Authentication temporarily disabled during workflow development
    return ctx.user;
  }),

  logout: protectedProcedure.mutation(() => {
    // TODO: Authentication temporarily disabled during workflow development
    return { success: true };
  }),
});
