import {
  date,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const machineStatusEnum = pgEnum("machine_status", [
  "active",
  "maintenance",
  "offline",
]);

export const workerRoleEnum = pgEnum("worker_role", ["admin", "worker"]);

export const shiftTypeEnum = pgEnum("shift_type", ["DAY", "NIGHT"]);

export const checkLogStatusEnum = pgEnum("check_log_status", [
  "PENDING",
  "COMPLETED",
  "REJECTED",
]);

export const machines = pgTable("machines", {
  id: serial("id").primaryKey(),
  machineCode: varchar("machine_code", { length: 50 }).notNull().unique(),
  machineName: varchar("machine_name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  status: machineStatusEnum("status").default("active").notNull(),
});

export const workers = pgTable("workers", {
  id: serial("id").primaryKey(),
  workerCode: varchar("worker_code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password", { length: 255 }).notNull(),
  role: workerRoleEnum("role").default("worker").notNull(),
});

export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  workerId: integer("worker_id").notNull(),
  machineId: integer("machine_id").notNull(),
  assignedDate: date("assigned_date").notNull(),
  shiftType: shiftTypeEnum("shift_type").default("DAY").notNull(),
});

export const machineCheckingLogs = pgTable("machine_checking_logs", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").notNull(),
  workerId: integer("worker_id").notNull(),
  machineId: integer("machine_id").notNull(),
  checkedAt: timestamp("checked_at").defaultNow().notNull(),
  mediaUrl: text("media_url").notNull(),
  status: checkLogStatusEnum("status").default("COMPLETED").notNull(),
});

export const machinesRelations = relations(machines, ({ many }) => ({
  shifts: many(shifts),
  checkingLogs: many(machineCheckingLogs),
}));

export const workersRelations = relations(workers, ({ many }) => ({
  shifts: many(shifts),
  checkingLogs: many(machineCheckingLogs),
}));

export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  worker: one(workers, {
    fields: [shifts.workerId],
    references: [workers.id],
  }),
  machine: one(machines, {
    fields: [shifts.machineId],
    references: [machines.id],
  }),
  checkingLogs: many(machineCheckingLogs),
}));

export const machineCheckingLogsRelations = relations(
  machineCheckingLogs,
  ({ one }) => ({
    shift: one(shifts, {
      fields: [machineCheckingLogs.shiftId],
      references: [shifts.id],
    }),
    worker: one(workers, {
      fields: [machineCheckingLogs.workerId],
      references: [workers.id],
    }),
    machine: one(machines, {
      fields: [machineCheckingLogs.machineId],
      references: [machines.id],
    }),
  })
);

export type Machine = typeof machines.$inferSelect;
export type InsertMachine = typeof machines.$inferInsert;
export type Worker = typeof workers.$inferSelect;
export type InsertWorker = typeof workers.$inferInsert;
export type Shift = typeof shifts.$inferSelect;
export type InsertShift = typeof shifts.$inferInsert;
export type MachineCheckingLog = typeof machineCheckingLogs.$inferSelect;
export type InsertMachineCheckingLog = typeof machineCheckingLogs.$inferInsert;
