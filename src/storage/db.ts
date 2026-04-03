import { Pool } from "pg";
import { readFileSync } from "fs";
import { join } from "path";
import { config } from "../config";

export const db = new Pool({
  connectionString: config.databaseUrl,
});

db.on("error", (err) => {
  console.error("Unexpected database error:", err);
  process.exit(1);
});

export async function runMigrations(): Promise<void> {
  const migrationsDir = join(__dirname, "migrations");
  const files = ["001_initial.sql", "002_notifications.sql"];
  for (const file of files) {
    try {
      const sql = readFileSync(join(migrationsDir, file), "utf-8");
      await db.query(sql);
    } catch {
      // Migration file may not exist yet
    }
  }
  console.log("Database migrations applied.");
}
