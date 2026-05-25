import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: Pool | null = null;

export async function getDb() {
  if (!ENV.databaseUrl) {
    console.error("[Database] DATABASE_URL is not defined");
    return null;
  }

  if (!_db) {
    try {
      if (!_pool) {
        console.log("[Database] Initializing new connection pool");
        _pool = new Pool({
          connectionString: ENV.databaseUrl,
          max: ENV.isProduction ? 5 : 10, // Increased for stability, Vercel can handle a few more
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000, // Increased timeout
          ssl: { rejectUnauthorized: false },
        });

        _pool.on("error", (err) => {
          console.error("[Database] Unexpected error on idle client", err);
          _pool = null;
          _db = null;
        });
      }
      _db = drizzle(_pool, { schema });
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
    }
  }
  return _db;
}
