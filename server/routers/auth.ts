import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

export const authRouter = router({
  login: publicProcedure
    .input(z.object({ username: z.string().min(1), password: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, input.username))
        .limit(1);

      if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });

      const token = jwt.sign(
        { id: user.id, username: user.username, name: user.name, role: user.role },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      return {
        token,
        user: { id: user.id, name: user.name, username: user.username, role: user.role },
      };
    }),

  me: protectedProcedure.query(({ ctx }) => ctx.user),

  logout: protectedProcedure.mutation(() => ({ success: true })),
});
