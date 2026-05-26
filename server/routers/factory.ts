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

  // ─── Worker: My schedules ──────────────────────────────
  getMySchedules: workerProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const today = todayDateString();
    return db
      .select({
        id: schedules.id,
        machineId: schedules.machineId,
        shiftId: schedules.shiftId,
        date: schedules.date,
        status: schedules.status,
        machineName: machines.machineName,
        machineCode: machines.machineCode,
        shiftName: shifts.name,
        shiftStart: shifts.startTime,
        shiftEnd: shifts.endTime,
        shiftColor: shifts.color,
      })
      .from(schedules)
      .leftJoin(machines, eq(schedules.machineId, machines.id))
      .leftJoin(shifts, eq(schedules.shiftId, shifts.id))
      .where(and(eq(schedules.workerId, ctx.user.id), eq(schedules.date, today)));
  }),

  // ─── Upload: Signed params (client uploads directly to Cloudinary) ───
  getUploadSignature: protectedProcedure.mutation(() => {
    if (!isCloudinaryConfigured()) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Cloudinary is not configured",
      });
    }
    return createSignedUploadParams();
  }),

  // ─── Upload: Server-side for small files (<4MB) ─────────
  uploadProof: protectedProcedure
    .input(
      z.object({
        dataBase64: z.string().min(1),
        contentType: z.string().min(1),
        fileName: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      // Import uploadMedia dynamically to avoid loading cloudinary on every request
      const { uploadMedia } = await import("../upload");
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
          message: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }),

  // ─── Task Proof: Submit ─────────────────────────────────
  submitTaskProof: workerProcedure
    .input(
      z.object({
        taskId: z.number(),
        mediaUrl: z.string().min(1),
        mediaType: z.enum(["image", "video"]),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify task ownership
      const [task] = await db.select().from(tasks).where(eq(tasks.id, input.taskId)).limit(1);
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      if (task.assignedTo !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Task not assigned to you" });
      }

      const [proof] = await db
        .insert(taskProofs)
        .values({
          taskId: input.taskId,
          uploadedBy: ctx.user.id,
          mediaUrl: input.mediaUrl,
          mediaType: input.mediaType,
          note: input.note ?? null,
          reviewStatus: "pending",
        })
        .returning({ id: taskProofs.id });

      // Update task status to waiting_review
      await db.update(tasks).set({ status: "waiting_review" }).where(eq(tasks.id, input.taskId));

      // Notify admins
      const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
      if (admins.length > 0) {
        await db.insert(notifications).values(
          admins.map((a) => ({
            userId: a.id,
            title: "Proof Submitted for Review",
            message: `${ctx.user.name} submitted proof for: "${task.title}"`,
          }))
        );
      }

      return { id: proof.id };
    }),

  // ─── Task Proof: Admin review ───────────────────────────
  getTaskProofs: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: taskProofs.id,
        taskId: taskProofs.taskId,
        uploadedBy: taskProofs.uploadedBy,
        mediaUrl: taskProofs.mediaUrl,
        mediaType: taskProofs.mediaType,
        note: taskProofs.note,
        uploadedAt: taskProofs.uploadedAt,
        reviewStatus: taskProofs.reviewStatus,
        reviewedBy: taskProofs.reviewedBy,
        reviewNote: taskProofs.reviewNote,
        uploaderName: users.name,
        taskTitle: tasks.title,
      })
      .from(taskProofs)
      .leftJoin(users, eq(taskProofs.uploadedBy, users.id))
      .leftJoin(tasks, eq(taskProofs.taskId, tasks.id))
      .orderBy(desc(taskProofs.uploadedAt))
      .limit(100);
  }),

  reviewTaskProof: adminProcedure
    .input(
      z.object({
        id: z.number(),
        reviewStatus: z.enum(["approved", "rejected"]),
        reviewNote: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Get the proof to find the task
      const [proof] = await db.select().from(taskProofs).where(eq(taskProofs.id, input.id)).limit(1);
      if (!proof) throw new TRPCError({ code: "NOT_FOUND", message: "Proof not found" });

      await db
        .update(taskProofs)
        .set({
          reviewStatus: input.reviewStatus,
          reviewedBy: ctx.user.id,
          reviewNote: input.reviewNote ?? null,
        })
        .where(eq(taskProofs.id, input.id));

      // Update task status based on review result
      const newTaskStatus = input.reviewStatus === "approved" ? "completed" : "rejected";
      await db.update(tasks).set({ status: newTaskStatus }).where(eq(tasks.id, proof.taskId));

      // Notify the worker
      const statusLabel = input.reviewStatus === "approved" ? "approved ✓" : "rejected ✗";
      await db.insert(notifications).values({
        userId: proof.uploadedBy,
        title: `Task ${statusLabel}`,
        message: input.reviewNote || `Your task proof has been ${statusLabel}.`,
      });

      return { success: true };
    }),

  // ─── Notifications ──────────────────────────────────────
  getNotifications: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, ctx.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }),

  markNotificationRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.update(notifications).set({ readStatus: true }).where(eq(notifications.id, input.id));
      return { success: true };
    }),
});
