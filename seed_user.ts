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
  console.log("Starting production admin verification/seeding...");

  const pool = new Pool({ 
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Neon in some environments
  });
  
  const db = drizzle(pool, { schema });

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error("CRITICAL: ADMIN_PASSWORD environment variable is not set. Admin seeding aborted.");
    process.exit(1);
  }

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

    console.log("Successfully seeded/updated admin user: username=admin");
  } catch (error) {
    console.error("Error seeding user:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
