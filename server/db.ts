import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../drizzle/schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: Pool | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      if (!_pool) {
        _pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.DATABASE_URL.includes("neon.tech") || process.env.NODE_ENV === "production"
            ? { rejectUnauthorized: false }
            : undefined,
        });
        
        // Prevent idle client errors from crashing the Node process in serverless env
        _pool.on("error", (err) => {
          console.error("[Database] Idle client pool error:", err.message);
        });
      }
      _db = drizzle(_pool, { schema });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
