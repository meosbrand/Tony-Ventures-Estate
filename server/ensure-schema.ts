import { readFile } from "fs/promises";
import path from "path";
import { pool } from "./db";

// The Docker image doesn't run `drizzle-kit push`, so create any missing tables on startup.
// migrations/schema.sql is idempotent and is copied into the image (see Dockerfile).
export async function ensureSchema(): Promise<void> {
  const sql = await readFile(path.resolve(process.cwd(), "migrations/schema.sql"), "utf8");
  await pool.query(sql);
}
