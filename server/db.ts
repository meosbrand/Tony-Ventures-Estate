import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const databaseUrl = new URL(process.env.DATABASE_URL);
// Force node-postgres to use non-validated TLS when needed (e.g., Supabase)
databaseUrl.searchParams.delete("sslmode");

export const pool = new Pool({
  connectionString: databaseUrl.toString(),
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle(pool, { schema });
