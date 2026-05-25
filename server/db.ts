import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: Pool | null = null;

export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      if (!_pool) {
        _pool = new Pool({
          connectionString: ENV.databaseUrl,
          max: ENV.isProduction ? 1 : 10, // Vercel serverless: keep pool small
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
          ssl: { rejectUnauthorized: false }, // Required for Neon
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
