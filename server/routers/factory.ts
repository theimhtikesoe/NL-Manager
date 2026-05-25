import { router, adminProcedure, protectedProcedure, workerProcedure } from "../_core/trpc";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  workers,
  machines,
  shifts,
  machineCheckingLogs,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import {
  createSignedUploadParams,
  isCloudinaryConfigured,
  uploadMedia,
} from "../upload";

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export const factoryRouter = router({
  // --- Admin: Workers ---
  getWorkers: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: workers.id,
        workerCode: workers.workerCode,
        name: workers.name,
        username: workers.username,
        role: workers.role,
      })
      .from(workers);
  }),

  addWorker: adminProcedure
    .input(
      z.object({
        workerCode: z.string().min(1),
        name: z.string().min(1),
        username: z.string().min(1),
        password: z.string().min(4),
        role: z.enum(["admin", "worker"]).default("worker"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const passwordHash = await bcrypt.hash(input.password, 10);

      const [row] = await db
        .insert(workers)
        .values({
          workerCode: input.workerCode,
          name: input.name,
          username: input.username,
          passwordHash,
          role: input.role,
        })
        .returning({ id: workers.id });

      return { id: row.id };
    }),

  updateWorker: adminProcedure
    .input(
      z.object({
        id: z.number(),
        workerCode: z.string().optional(),
        name: z.string().optional(),
        username: z.string().optional(),
        password: z.string().min(4).optional(),
        role: z.enum(["admin", "worker"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const updates: Record<string, unknown> = {};
      if (input.workerCode) updates.workerCode = input.workerCode;
      if (input.name) updates.name = input.name;
      if (input.username) updates.username = input.username;
      if (input.role) updates.role = input.role;
      if (input.password) {
        updates.passwordHash = await bcrypt.hash(input.password, 10);
      }

      await db.update(workers).set(updates).where(eq(workers.id, input.id));
      return { success: true };
    }),

  deleteWorker: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(workers).where(eq(workers.id, input.id));
      return { success: true };
    }),

  // --- Admin: Machines ---
  getMachines: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(machines);
  }),

  addMachine: adminProcedure
    .input(
      z.object({
        machineCode: z.string().min(1),
        machineName: z.string().min(1),
        location: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [row] = await db
        .insert(machines)
        .values({
          machineCode: input.machineCode,
          machineName: input.machineName,
          location: input.location ?? null,
        })
        .returning({ id: machines.id });

      return { id: row.id };
    }),

  deleteMachine: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(machines).where(eq(machines.id, input.id));
      return { success: true };
    }),

  // --- Admin: Shift assignments ---
  getShifts: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select({
        id: shifts.id,
        workerId: shifts.workerId,
        machineId: shifts.machineId,
        assignedDate: shifts.assignedDate,
        shiftType: shifts.shiftType,
        workerName: workers.name,
        machineName: machines.machineName,
        machineCode: machines.machineCode,
      })
      .from(shifts)
      .leftJoin(workers, eq(shifts.workerId, workers.id))
      .leftJoin(machines, eq(shifts.machineId, machines.id))
      .orderBy(desc(shifts.assignedDate));

    return rows;
  }),

  assignShift: adminProcedure
    .input(
      z.object({
        workerId: z.number(),
        machineId: z.number(),
        assignedDate: z.string(),
        shiftType: z.enum(["DAY", "NIGHT"]).default("DAY"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [machine] = await db
        .select()
        .from(machines)
        .where(eq(machines.id, input.machineId))
        .limit(1);
      if (!machine) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Machine not found" });
      }

      const [row] = await db
        .insert(shifts)
        .values({
          workerId: input.workerId,
          machineId: input.machineId,
          assignedDate: input.assignedDate,
          shiftType: input.shiftType,
        })
        .returning({ id: shifts.id });

      return { id: row.id };
    }),

  deleteShift: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(shifts).where(eq(shifts.id, input.id));
      return { success: true };
    }),

  // --- Worker: assigned machines today ---
  getMyAssignments: workerProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const today = todayDateString();
    const rows = await db
      .select({
        shiftId: shifts.id,
        machineId: machines.id,
        machineCode: machines.machineCode,
        machineName: machines.machineName,
        location: machines.location,
        shiftType: shifts.shiftType,
        assignedDate: shifts.assignedDate,
      })
      .from(shifts)
      .innerJoin(machines, eq(shifts.machineId, machines.id))
      .where(
        and(
          eq(shifts.workerId, ctx.user.id),
          eq(shifts.assignedDate, today)
        )
      );

    const checked = await db
      .select({ machineId: machineCheckingLogs.machineId })
      .from(machineCheckingLogs)
      .where(
        and(
          eq(machineCheckingLogs.workerId, ctx.user.id),
          sql`DATE(${machineCheckingLogs.checkedAt}) = ${today}`
        )
      );

    const checkedSet = new Set(checked.map((c) => c.machineId));

    return rows.map((r) => ({
      ...r,
      checked: checkedSet.has(r.machineId),
    }));
  }),

  getUploadSignature: protectedProcedure.mutation(() => {
    if (!isCloudinaryConfigured()) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Cloudinary is not configured",
      });
    }
    return createSignedUploadParams();
  }),

  uploadProof: protectedProcedure
    .input(
      z.object({
        dataBase64: z.string().min(1),
        contentType: z.string().min(1),
        fileName: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const mediaUrl = await uploadMedia(
          input.dataBase64,
          input.contentType,
          input.fileName
        );
        return { mediaUrl };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error ? error.message : "Upload failed",
        });
      }
    }),

  submitMachineCheck: workerProcedure
    .input(
      z.object({
        shiftId: z.number(),
        machineId: z.number(),
        mediaUrl: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [assignment] = await db
        .select()
        .from(shifts)
        .where(
          and(
            eq(shifts.id, input.shiftId),
            eq(shifts.workerId, ctx.user.id),
            eq(shifts.machineId, input.machineId)
          )
        )
        .limit(1);

      if (!assignment) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This machine is not assigned to you",
        });
      }

      const [existing] = await db
        .select()
        .from(machineCheckingLogs)
        .where(
          and(
            eq(machineCheckingLogs.shiftId, input.shiftId),
            eq(machineCheckingLogs.workerId, ctx.user.id)
          )
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Already submitted for this shift",
        });
      }

      const [log] = await db
        .insert(machineCheckingLogs)
        .values({
          shiftId: input.shiftId,
          workerId: ctx.user.id,
          machineId: input.machineId,
          mediaUrl: input.mediaUrl,
          status: "COMPLETED",
        })
        .returning();

      return log;
    }),

  getLiveCheckingLogs: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    return db
      .select({
        id: machineCheckingLogs.id,
        checkedAt: machineCheckingLogs.checkedAt,
        mediaUrl: machineCheckingLogs.mediaUrl,
        status: machineCheckingLogs.status,
        workerName: workers.name,
        machineName: machines.machineName,
        machineCode: machines.machineCode,
      })
      .from(machineCheckingLogs)
      .leftJoin(workers, eq(machineCheckingLogs.workerId, workers.id))
      .leftJoin(machines, eq(machineCheckingLogs.machineId, machines.id))
      .orderBy(desc(machineCheckingLogs.checkedAt))
      .limit(50);
  }),

  getMachineStatusGrid: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const today = todayDateString();
    const allMachines = await db.select().from(machines);

    const todayLogs = await db
      .select({
        machineId: machineCheckingLogs.machineId,
        checkedAt: machineCheckingLogs.checkedAt,
      })
      .from(machineCheckingLogs)
      .where(sql`DATE(${machineCheckingLogs.checkedAt}) = ${today}`);

    const checkedMap = new Map<number, Date>();
    for (const log of todayLogs) {
      const prev = checkedMap.get(log.machineId);
      if (!prev || log.checkedAt > prev) {
        checkedMap.set(log.machineId, log.checkedAt);
      }
    }

    return allMachines.map((m) => ({
      ...m,
      checkedToday: checkedMap.has(m.id),
      lastCheckedAt: checkedMap.get(m.id) ?? null,
    }));
  }),
});
