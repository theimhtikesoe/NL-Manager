import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { workers } from "../../drizzle/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";

const JWT_SECRET =
  process.env.JWT_SECRET || "fallback_secret_for_latyar_factory";

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
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
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

        const valid = await bcrypt.compare(
          input.password,
          worker.passwordHash
        );
        if (!valid) {
          console.warn(`[Auth] Failed login attempt: invalid password for "${input.username}"`);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid username or password",
          });
        }

        const token = jwt.sign(
          {
            id: worker.id,
            workerCode: worker.workerCode,
            name: worker.name,
            role: worker.role,
          },
          JWT_SECRET,
          { expiresIn: "30d" }
        );

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

  me: protectedProcedure.query(({ ctx }) => ctx.user),

  logout: protectedProcedure.mutation(() => ({ success: true })),
});
