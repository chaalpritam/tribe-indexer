import { FastifyInstance } from "fastify";
import { db } from "../../storage/db";

export async function feedRoutes(server: FastifyInstance) {
  server.get<{
    Params: { fid: string };
    Querystring: { limit?: string; cursor?: string };
  }>("/feed/:fid", async (request) => {
    const limit = Math.min(parseInt(request.query.limit || "20", 10), 100);
    const result = await db.query(
      `SELECT c.hash, c.fid, c.text, c.parent_hash, c.channel_id, c.mentions, c.embeds, c.timestamp,
              f.username
       FROM casts c
       LEFT JOIN fids f ON f.fid = c.fid
       WHERE c.fid = $1 AND c.deleted = false
       ORDER BY c.timestamp DESC
       LIMIT $2`,
      [request.params.fid, limit]
    );
    return { casts: result.rows };
  });

  server.get<{
    Params: { channelId: string };
    Querystring: { limit?: string; cursor?: string };
  }>("/feed/channel/:channelId", async (request) => {
    const limit = Math.min(parseInt(request.query.limit || "20", 10), 100);
    const result = await db.query(
      `SELECT c.hash, c.fid, c.text, c.parent_hash, c.channel_id, c.mentions, c.embeds, c.timestamp,
              f.username
       FROM casts c
       LEFT JOIN fids f ON f.fid = c.fid
       WHERE c.channel_id = $1 AND c.deleted = false
       ORDER BY c.timestamp DESC
       LIMIT $2`,
      [request.params.channelId, limit]
    );
    return { casts: result.rows };
  });
}
