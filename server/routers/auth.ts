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
        username: z.string().min(1),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
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

      return {
        token,
        worker: {
          id: worker.id,
          name: worker.name,
          workerCode: worker.workerCode,
          role: worker.role,
        },
      };
    }),

  me: protectedProcedure.query(({ ctx }) => ctx.user),

  logout: protectedProcedure.mutation(() => ({ success: true })),
});
