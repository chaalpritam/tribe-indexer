import { FastifyInstance } from "fastify";
import { db } from "../../storage/db";

export async function healthRoutes(server: FastifyInstance) {
  server.get("/health", async () => {
    const syncResult = await db.query("SELECT source, last_slot, last_timestamp, updated_at FROM sync_status");

    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      sync: syncResult.rows,
    };
  });
}
