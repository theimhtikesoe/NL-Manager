import { router, publicProcedure, adminProcedure, protectedProcedure, workerProcedure } from "../_core/trpc";
import { z } from "zod";
import { and, desc, eq, sql, count, inArray } from "drizzle-orm";
import {
  users,
  machines,
  shifts,
  schedules,
  tasks,
  taskProofs,
  notifications,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import {
  createSignedUploadParams,
  isCloudinaryConfigured,
} from "../upload";

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export const factoryRouter = router({
  // ─── Stats ──────────────────────────────────────────────
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { totalWorkers: 0, totalMachines: 0, activeTasks: 0, pendingReviews: 0, completedToday: 0, machinesByStatus: {} as Record<string, number> };

    const [workerCount] = await db.select({ c: count() }).from(users).where(eq(users.role, "worker"));
    const [machineCount] = await db.select({ c: count() }).from(machines);
    const [activeTaskCount] = await db.select({ c: count() }).from(tasks).where(
      inArray(tasks.status, ["assigned", "in_progress", "waiting_review"])
    );
    const [pendingCount] = await db.select({ c: count() }).from(taskProofs).where(eq(taskProofs.reviewStatus, "pending"));

    const today = todayDateString();
    const [completedCount] = await db.select({ c: count() }).from(tasks).where(
      and(eq(tasks.status, "completed"), sql`DATE(${tasks.createdAt}) = ${today}`)
    );

    const machineStatuses = await db
      .select({ status: machines.status, c: count() })
      .from(machines)
      .groupBy(machines.status);

    const machinesByStatus: Record<string, number> = {};
    machineStatuses.forEach((s) => { machinesByStatus[s.status] = s.c; });

    return {
      totalWorkers: workerCount.c,
      totalMachines: machineCount.c,
      activeTasks: activeTaskCount.c,
      pendingReviews: pendingCount.c,
      completedToday: completedCount.c,
      machinesByStatus,
    };
  }),

  // ─── Workers CRUD ───────────────────────────────────────
  getWorkers: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        department: users.department,
        avatar: users.avatar,
      })
      .from(users);
  }),

  addWorker: adminProcedure
    .input(
      z.object({
        name: z.string().min(2),
        username: z.string().min(3),
        password: z.string().min(4),
        role: z.enum(["admin", "worker"]).default("worker"),
        department: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const existing = await db.select().from(users).where(eq(users.username, input.username)).limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Username already exists" });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);
      const [row] = await db
        .insert(users)
        .values({
          name: input.name,
          username: input.username.toLowerCase(),
          passwordHash,
          role: input.role,
          department: input.department ?? null,
        })
        .returning({ id: users.id });

      return { id: row.id };
    }),

  updateWorker: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        username: z.string().optional(),
        password: z.string().min(4).optional(),
        role: z.enum(["admin", "worker"]).optional(),
        department: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const updates: Record<string, unknown> = {};
      if (input.name) updates.name = input.name;
      if (input.username) updates.username = input.username;
      if (input.role) updates.role = input.role;
      if (input.department !== undefined) updates.department = input.department;
      if (input.password) {
        updates.passwordHash = await bcrypt.hash(input.password, 10);
      }

      await db.update(users).set(updates).where(eq(users.id, input.id));
      return { success: true };
    }),

  deleteWorker: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(users).where(eq(users.id, input.id));
      return { success: true };
    }),

  // ─── Machines CRUD ──────────────────────────────────────
  getMachines: protectedProcedure.query(async () => {
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
        status: z.enum(["active", "maintenance", "offline"]).optional(),
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
          status: input.status ?? "active",
        })
        .returning({ id: machines.id });

      return { id: row.id };
    }),

  updateMachine: adminProcedure
    .input(
      z.object({
        id: z.number(),
        machineName: z.string().optional(),
        status: z.enum(["active", "maintenance", "offline"]).optional(),
        location: z.string().optional(),
        assignedWorkerId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const updates: Record<string, unknown> = {};
      if (input.machineName) updates.machineName = input.machineName;
      if (input.status) updates.status = input.status;
      if (input.location !== undefined) updates.location = input.location;
      if (input.assignedWorkerId !== undefined) updates.assignedWorkerId = input.assignedWorkerId;

      await db.update(machines).set(updates).where(eq(machines.id, input.id));
      return { success: true };
    }),

  deleteMachine: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(machines).where(eq(machines.id, input.id));
      return { success: true };
    }),

  // ─── Shifts ─────────────────────────────────────────────
  getShifts: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(shifts);
  }),

  assignShift: adminProcedure
    .input(
      z.object({
        workerId: z.number(),
        machineId: z.number(),
        date: z.string(),
        shiftType: z.enum(["DAY", "NIGHT"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Check if a shift with name DAY/NIGHT exists, if not create or map to existing shift IDs
      // For simplicity in this industrial demo, we'll map them to shift records
      let [shift] = await db.select().from(shifts).where(eq(shifts.name, input.shiftType)).limit(1);
      
      if (!shift) {
        const [newShift] = await db.insert(shifts).values({
          name: input.shiftType,
          startTime: input.shiftType === "DAY" ? "08:00" : "20:00",
          endTime: input.shiftType === "DAY" ? "20:00" : "08:00",
          color: input.shiftType === "DAY" ? "#f97316" : "#6366f1",
        }).returning();
        shift = newShift;
      }

      const [row] = await db
        .insert(schedules)
        .values({
          workerId: input.workerId,
          machineId: input.machineId,
          shiftId: shift.id,
          date: input.date,
        })
        .returning({ id: schedules.id });

      return { id: row.id };
    }),

  deleteShift: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(schedules).where(eq(schedules.id, input.id));
      return { success: true };
    }),

  // ─── Machine Status Grid ────────────────────────────────
  getMachineStatusGrid: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select({
      id: machines.id,
      machineCode: machines.machineCode,
      machineName: machines.machineName,
      status: machines.status,
    }).from(machines);
  }),

  // ─── Live Checking Logs ─────────────────────────────────
  getLiveCheckingLogs: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: taskProofs.id,
        taskId: taskProofs.taskId,
        workerName: users.name,
        machineName: machines.machineName,
        mediaUrl: taskProofs.mediaUrl,
        mediaType: taskProofs.mediaType,
        note: taskProofs.note,
        status: taskProofs.reviewStatus,
        uploadedAt: sql<string>`TO_CHAR(${taskProofs.uploadedAt}, 'HH24:MI')`,
      })
      .from(taskProofs)
      .leftJoin(users, eq(taskProofs.uploadedBy, users.id))
      .leftJoin(tasks, eq(taskProofs.taskId, tasks.id))
      .leftJoin(machines, eq(tasks.machineId, machines.id))
      .orderBy(desc(taskProofs.uploadedAt))
      .limit(20);
  }),

  reviewCheckingLog: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["approved", "rejected", "pending"]).transform(v => v === "approved" ? "approved" : v as "pending" | "approved" | "rejected"),
        adminComment: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Map "approved" to "approved" (though schema uses "approved")
      const statusValue = input.status === "approved" ? "approved" : input.status;

      await db.update(taskProofs)
        .set({
          reviewStatus: statusValue as any,
          reviewedBy: ctx.user.id,
          reviewNote: input.adminComment ?? null,
        })
        .where(eq(taskProofs.id, input.id));

      return { success: true };
    }),

  // ─── Schedules ──────────────────────────────────────────
  getSchedules: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: schedules.id,
        workerId: schedules.workerId,
        machineId: schedules.machineId,
        shiftId: schedules.shiftId,
        date: schedules.date,
        status: schedules.status,
        workerName: users.name,
        machineName: machines.machineName,
        shiftName: shifts.name,
        shiftStart: shifts.startTime,
        shiftEnd: shifts.endTime,
        shiftColor: shifts.color,
      })
      .from(schedules)
      .leftJoin(users, eq(schedules.workerId, users.id))
      .leftJoin(machines, eq(schedules.machineId, machines.id))
      .leftJoin(shifts, eq(schedules.shiftId, shifts.id))
      .orderBy(desc(schedules.date));
  }),

  createSchedule: adminProcedure
    .input(
      z.object({
        workerId: z.number(),
        machineId: z.number(),
        shiftId: z.number(),
        date: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [row] = await db
        .insert(schedules)
        .values({
          workerId: input.workerId,
          machineId: input.machineId,
          shiftId: input.shiftId,
          date: input.date,
        })
        .returning({ id: schedules.id });

      return { id: row.id };
    }),

  deleteSchedule: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(schedules).where(eq(schedules.id, input.id));
      return { success: true };
    }),

  // ─── Tasks CRUD ─────────────────────────────────────────
  getTasks: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        priority: tasks.priority,
        status: tasks.status,
        assignedTo: tasks.assignedTo,
        machineId: tasks.machineId,
        dueDate: tasks.dueDate,
        createdBy: tasks.createdBy,
        createdAt: tasks.createdAt,
        assigneeName: users.name,
        machineName: machines.machineName,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .leftJoin(machines, eq(tasks.machineId, machines.id))
      .orderBy(desc(tasks.createdAt));
  }),

  createTask: adminProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        assignedTo: z.number().optional(),
        machineId: z.number().optional(),
        dueDate: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [row] = await db
        .insert(tasks)
        .values({
          title: input.title,
          description: input.description ?? null,
          priority: input.priority ?? "medium",
          status: input.assignedTo ? "assigned" : "created",
          assignedTo: input.assignedTo ?? null,
          machineId: input.machineId ?? null,
          dueDate: input.dueDate ?? null,
          createdBy: ctx.user.id,
        })
        .returning({ id: tasks.id });

      // If assigned, create a notification
      if (input.assignedTo) {
        await db.insert(notifications).values({
          userId: input.assignedTo,
          title: "New Task Assigned",
          message: `You have been assigned: "${input.title}"`,
        });
      }

      return { id: row.id };
    }),

  updateTaskStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["created", "assigned", "in_progress", "waiting_review", "completed", "rejected"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.update(tasks).set({ status: input.status }).where(eq(tasks.id, input.id));
      return { success: true };
    }),

  deleteTask: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(tasks).where(eq(tasks.id, input.id));
      return { success: true };
    }),

  // ─── Worker: Start Task ─────────────────────────────────
  startTask: workerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [task] = await db.select().from(tasks).where(eq(tasks.id, input.id)).limit(1);
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      if (task.assignedTo !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Task not assigned to you" });
      }
      if (task.status !== "assigned" && task.status !== "rejected") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Task cannot be started from current status" });
      }

      await db.update(tasks).set({ status: "in_progress" }).where(eq(tasks.id, input.id));
      return { success: true };
    }),

  // ─── Worker: My tasks ───────────────────────────────────
  getMyTasks: workerProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        priority: tasks.priority,
        status: tasks.status,
        machineId: tasks.machineId,
        dueDate: tasks.dueDate,
        createdAt: tasks.createdAt,
        machineName: machines.machineName,
      })
      .from(tasks)
      .leftJoin(machines, eq(tasks.machineId, machines.id))
      .where(eq(tasks.assignedTo, ctx.user.id))
      .orderBy(desc(tasks.createdAt));
  }),
});
