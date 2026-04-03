import { FastifyInstance } from "fastify";
import { db } from "../../storage/db";

export async function feedRoutes(server: FastifyInstance) {
  server.get<{
    Params: { tid: string };
    Querystring: { limit?: string; cursor?: string };
  }>("/feed/:tid", async (request) => {
    const limit = Math.min(parseInt(request.query.limit || "20", 10), 100);
    const result = await db.query(
      `SELECT c.hash, c.tid, c.text, c.parent_hash, c.channel_id, c.mentions, c.embeds, c.timestamp,
              f.username
       FROM tweets c
       LEFT JOIN tids f ON f.tid = c.tid
       WHERE c.tid = $1 AND c.deleted = false
       ORDER BY c.timestamp DESC
       LIMIT $2`,
      [request.params.tid, limit]
    );
    return { tweets: result.rows };
  });

  server.get<{
    Params: { channelId: string };
    Querystring: { limit?: string; cursor?: string };
  }>("/feed/channel/:channelId", async (request) => {
    const limit = Math.min(parseInt(request.query.limit || "20", 10), 100);
    const result = await db.query(
      `SELECT c.hash, c.tid, c.text, c.parent_hash, c.channel_id, c.mentions, c.embeds, c.timestamp,
              f.username
       FROM tweets c
       LEFT JOIN tids f ON f.tid = c.tid
       WHERE c.channel_id = $1 AND c.deleted = false
       ORDER BY c.timestamp DESC
       LIMIT $2`,
      [request.params.channelId, limit]
    );
    return { tweets: result.rows };
  });
}
