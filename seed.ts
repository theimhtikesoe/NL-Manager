import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./drizzle/schema";
import { users, shifts, machines, schedules, tasks, notifications } from "./drizzle/schema";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

async function main() {
  console.log("🏭 NL Manager — Seeding database...\n");

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const db = drizzle(pool, { schema });
  const passwordHash = await bcrypt.hash("password123", 10);

  try {
    // ─── Users ──────────────────────────────────────────
    console.log("👤 Seeding users...");
    const userRows = [
      { username: "admin", name: "System Admin", role: "admin" as const, department: "Management" },
      { username: "worker01", name: "Ahmad Rizal", role: "worker" as const, department: "Production" },
      { username: "worker02", name: "Budi Santoso", role: "worker" as const, department: "Maintenance" },
      { username: "worker03", name: "Citra Dewi", role: "worker" as const, department: "Production" },
    ];

    const insertedUsers: { id: number; username: string }[] = [];
    for (const u of userRows) {
      const [row] = await db
        .insert(users)
        .values({ ...u, passwordHash })
        .onConflictDoUpdate({
          target: users.username,
          set: { name: u.name, role: u.role, department: u.department, passwordHash },
        })
        .returning({ id: users.id, username: users.username });
      insertedUsers.push(row);
      console.log(`   ✓ ${u.role}: ${u.username} (id: ${row.id})`);
    }

    const adminUser = insertedUsers.find((u) => u.username === "admin")!;
    const worker01 = insertedUsers.find((u) => u.username === "worker01")!;
    const worker02 = insertedUsers.find((u) => u.username === "worker02")!;
    const worker03 = insertedUsers.find((u) => u.username === "worker03")!;

    // ─── Shifts ─────────────────────────────────────────
    console.log("\n⏰ Seeding shifts...");
    const shiftRows = [
      { name: "Day Shift", startTime: "08:00", endTime: "16:00", color: "#f97316" },
      { name: "Night Shift", startTime: "16:00", endTime: "00:00", color: "#8b5cf6" },
      { name: "Morning Shift", startTime: "06:00", endTime: "14:00", color: "#06b6d4" },
    ];

    const insertedShifts: { id: number; name: string }[] = [];
    for (const s of shiftRows) {
      // Check if shift exists
      const existing = await db.select().from(shifts).where(eq(shifts.name, s.name)).limit(1);
      if (existing.length > 0) {
        insertedShifts.push({ id: existing[0].id, name: existing[0].name });
        console.log(`   ⊘ ${s.name} (already exists, id: ${existing[0].id})`);
      } else {
        const [row] = await db.insert(shifts).values(s).returning({ id: shifts.id, name: shifts.name });
        insertedShifts.push(row);
        console.log(`   ✓ ${s.name} (${s.startTime}–${s.endTime}) id: ${row.id}`);
      }
    }

    const dayShift = insertedShifts.find((s) => s.name === "Day Shift")!;
    const nightShift = insertedShifts.find((s) => s.name === "Night Shift")!;

    // ─── Machines ───────────────────────────────────────
    console.log("\n🔧 Seeding machines...");
    const machineRows = [
      { machineCode: "MC-1001", machineName: "CNC Lathe Unit A", location: "Hall A - Zone 1", status: "active" as const },
      { machineCode: "MC-1002", machineName: "Hydraulic Press B", location: "Hall A - Zone 2", status: "active" as const },
      { machineCode: "MC-1003", machineName: "Water Chiller C", location: "Utility Room", status: "maintenance" as const },
    ];

    const insertedMachines: { id: number; machineCode: string }[] = [];
    for (const m of machineRows) {
      const existing = await db.select().from(machines).where(eq(machines.machineCode, m.machineCode)).limit(1);
      if (existing.length > 0) {
        insertedMachines.push({ id: existing[0].id, machineCode: existing[0].machineCode });
        console.log(`   ⊘ ${m.machineCode} (already exists, id: ${existing[0].id})`);
      } else {
        const [row] = await db.insert(machines).values(m).returning({ id: machines.id, machineCode: machines.machineCode });
        insertedMachines.push(row);
        console.log(`   ✓ ${m.machineCode}: ${m.machineName} id: ${row.id}`);
      }
    }

    const mc1001 = insertedMachines.find((m) => m.machineCode === "MC-1001")!;
    const mc1002 = insertedMachines.find((m) => m.machineCode === "MC-1002")!;
    const mc1003 = insertedMachines.find((m) => m.machineCode === "MC-1003")!;

    // ─── Schedules (today) ──────────────────────────────
    console.log("\n📅 Seeding schedules for today...");
    const today = new Date().toISOString().slice(0, 10);
    const scheduleRows = [
      { workerId: worker01.id, machineId: mc1001.id, shiftId: dayShift.id, date: today },
      { workerId: worker02.id, machineId: mc1002.id, shiftId: dayShift.id, date: today },
      { workerId: worker03.id, machineId: mc1003.id, shiftId: nightShift.id, date: today },
    ];

    for (const s of scheduleRows) {
      try {
        await db.insert(schedules).values(s);
        console.log(`   ✓ Worker ${s.workerId} → Machine ${s.machineId} on ${s.date}`);
      } catch {
        console.log(`   ⊘ Schedule already exists`);
      }
    }

    // ─── Tasks ──────────────────────────────────────────
    console.log("\n📋 Seeding tasks...");
    const taskRows = [
      {
        title: "Machine Inspection - MC-1001",
        description: "Perform daily inspection of CNC Lathe Unit A. Check oil levels, spindle alignment, and coolant flow. Report any abnormalities.",
        priority: "high" as const,
        status: "assigned" as const,
        assignedTo: worker01.id,
        machineId: mc1001.id,
        dueDate: today,
        createdBy: adminUser.id,
      },
      {
        title: "Oil Replacement - MC-1002",
        description: "Replace hydraulic oil in Hydraulic Press B. Use ISO VG 46 grade oil. Drain old oil properly and record volume replaced.",
        priority: "medium" as const,
        status: "assigned" as const,
        assignedTo: worker02.id,
        machineId: mc1002.id,
        dueDate: today,
        createdBy: adminUser.id,
      },
      {
        title: "Safety Check - MC-1003",
        description: "Comprehensive safety check on Water Chiller C. Verify emergency stops, pressure relief valves, and temperature sensors are functioning correctly.",
        priority: "high" as const,
        status: "assigned" as const,
        assignedTo: worker01.id,
        machineId: mc1003.id,
        dueDate: today,
        createdBy: adminUser.id,
      },
      {
        title: "Production Report",
        description: "Compile daily production numbers for Hall A. Include units produced, defect rates, and downtime minutes.",
        priority: "low" as const,
        status: "assigned" as const,
        assignedTo: worker03.id,
        machineId: null,
        dueDate: today,
        createdBy: adminUser.id,
      },
      {
        title: "Belt Tension Check",
        description: "Check and adjust belt tension on CNC Lathe conveyor system. Replace if worn beyond tolerance.",
        priority: "medium" as const,
        status: "created" as const,
        assignedTo: null,
        machineId: mc1001.id,
        dueDate: today,
        createdBy: adminUser.id,
      },
    ];

    for (const t of taskRows) {
      try {
        const [row] = await db.insert(tasks).values(t).returning({ id: tasks.id });
        console.log(`   ✓ "${t.title}" → ${t.assignedTo ? `Worker ${t.assignedTo}` : "Unassigned"} (id: ${row.id})`);
      } catch {
        console.log(`   ⊘ Task may already exist`);
      }
    }

    // ─── Notifications ──────────────────────────────────
    console.log("\n🔔 Seeding notifications...");
    const notifRows = [
      { userId: worker01.id, title: "Welcome to NL Manager", message: "Your account has been set up. Check your assigned tasks for today." },
      { userId: worker01.id, title: "New Task Assigned", message: 'You have been assigned: "Machine Inspection - MC-1001"' },
      { userId: worker02.id, title: "New Task Assigned", message: 'You have been assigned: "Oil Replacement - MC-1002"' },
      { userId: worker03.id, title: "New Task Assigned", message: 'You have been assigned: "Production Report"' },
    ];

    for (const n of notifRows) {
      await db.insert(notifications).values(n);
    }
    console.log(`   ✓ ${notifRows.length} notifications created`);

    console.log("\n✅ Seeding complete!\n");
    console.log("Demo accounts:");
    console.log("  Admin:    /admin     (username: admin)");
    console.log("  Worker 1: /worker01  (username: worker01)");
    console.log("  Worker 2: /worker02  (username: worker02)");
    console.log("  Worker 3: /worker03  (username: worker03)");
    console.log("  Password: password123 (all accounts)\n");

  } catch (error) {
    console.error("\n❌ Seeding error:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
