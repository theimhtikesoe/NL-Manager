import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ──────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["admin", "worker"]);

export const machineStatusEnum = pgEnum("machine_status", [
  "active",
  "maintenance",
  "offline",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "created",
  "assigned",
  "in_progress",
  "waiting_review",
  "completed",
  "rejected",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
]);

export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);

export const reviewStatusEnum = pgEnum("review_status", [
  "pending",
  "approved",
  "rejected",
]);

export const scheduleStatusEnum = pgEnum("schedule_status", [
  "scheduled",
  "completed",
  "cancelled",
]);

// ─── Tables ─────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: userRoleEnum("role").default("worker").notNull(),
  avatar: text("avatar"),
  department: varchar("department", { length: 100 }),
  shiftId: integer("shift_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  startTime: varchar("start_time", { length: 10 }).notNull(),
  endTime: varchar("end_time", { length: 10 }).notNull(),
  color: varchar("color", { length: 20 }).default("#f97316").notNull(),
});

export const machines = pgTable("machines", {
  id: serial("id").primaryKey(),
  machineCode: varchar("machine_code", { length: 50 }).notNull().unique(),
  machineName: varchar("machine_name", { length: 255 }).notNull(),
  status: machineStatusEnum("status").default("active").notNull(),
  location: varchar("location", { length: 255 }),
  assignedWorkerId: integer("assigned_worker_id"),
  lastMaintenance: timestamp("last_maintenance"),
});

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  workerId: integer("worker_id").notNull(),
  machineId: integer("machine_id").notNull(),
  shiftId: integer("shift_id").notNull(),
  date: date("date").notNull(),
  status: scheduleStatusEnum("status").default("scheduled").notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  priority: taskPriorityEnum("priority").default("medium").notNull(),
  status: taskStatusEnum("status").default("created").notNull(),
  assignedTo: integer("assigned_to"),
  machineId: integer("machine_id"),
  dueDate: date("due_date"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const taskProofs = pgTable("task_proofs", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  uploadedBy: integer("uploaded_by").notNull(),
  mediaUrl: text("media_url").notNull(),
  mediaType: mediaTypeEnum("media_type").default("image").notNull(),
  note: text("note"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  reviewStatus: reviewStatusEnum("review_status").default("pending").notNull(),
  reviewedBy: integer("reviewed_by"),
  reviewNote: text("review_note"),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  readStatus: boolean("read_status").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Relations ──────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  shift: one(shifts, {
    fields: [users.shiftId],
    references: [shifts.id],
  }),
  assignedTasks: many(tasks, { relationName: "assignedTasks" }),
  createdTasks: many(tasks, { relationName: "createdTasks" }),
  schedules: many(schedules),
  taskProofs: many(taskProofs, { relationName: "uploadedProofs" }),
  notifications: many(notifications),
}));

export const shiftsRelations = relations(shifts, ({ many }) => ({
  users: many(users),
  schedules: many(schedules),
}));

export const machinesRelations = relations(machines, ({ one, many }) => ({
  assignedWorker: one(users, {
    fields: [machines.assignedWorkerId],
    references: [users.id],
  }),
  schedules: many(schedules),
  tasks: many(tasks),
}));

export const schedulesRelations = relations(schedules, ({ one }) => ({
  worker: one(users, {
    fields: [schedules.workerId],
    references: [users.id],
  }),
  machine: one(machines, {
    fields: [schedules.machineId],
    references: [machines.id],
  }),
  shift: one(shifts, {
    fields: [schedules.shiftId],
    references: [shifts.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  assignee: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
    relationName: "assignedTasks",
  }),
  creator: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
    relationName: "createdTasks",
  }),
  machine: one(machines, {
    fields: [tasks.machineId],
    references: [machines.id],
  }),
  proofs: many(taskProofs),
}));

export const taskProofsRelations = relations(taskProofs, ({ one }) => ({
  task: one(tasks, {
    fields: [taskProofs.taskId],
    references: [tasks.id],
  }),
  uploader: one(users, {
    fields: [taskProofs.uploadedBy],
    references: [users.id],
    relationName: "uploadedProofs",
  }),
  reviewer: one(users, {
    fields: [taskProofs.reviewedBy],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// ─── Type Exports ───────────────────────────────────────

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Shift = typeof shifts.$inferSelect;
export type InsertShift = typeof shifts.$inferInsert;
export type Machine = typeof machines.$inferSelect;
export type InsertMachine = typeof machines.$inferInsert;
export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = typeof schedules.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;
export type TaskProof = typeof taskProofs.$inferSelect;
export type InsertTaskProof = typeof taskProofs.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
