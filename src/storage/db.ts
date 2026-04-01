import { Pool } from "pg";
import { config } from "../config";

export const db = new Pool({
  connectionString: config.databaseUrl,
});

db.on("error", (err) => {
  console.error("Unexpected database error:", err);
  process.exit(1);
});
