import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./drizzle/schema";
import { workers } from "./drizzle/schema";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

async function main() {
  console.log("Seeding default admin account...");

  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });

  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  try {
    await db
      .insert(workers)
      .values({
        workerCode: "ADMIN001",
        name: "System Admin",
        username: "admin",
        passwordHash,
        role: "admin",
      })
      .onConflictDoUpdate({
        target: workers.username,
        set: {
          passwordHash,
          role: "admin",
          name: "System Admin",
        },
      });

    console.log(`Seeded admin user: username=admin password=${adminPassword === "admin123" ? "admin123 (DEFAULT)" : "********"}`);
  } catch (error) {
    console.error("Error seeding user:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
