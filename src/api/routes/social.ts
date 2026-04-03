import { FastifyInstance } from "fastify";
import { db } from "../../storage/db";

export async function socialRoutes(server: FastifyInstance) {
  server.get<{
    Params: { tid: string };
    Querystring: { limit?: string; cursor?: string };
  }>("/followers/:tid", async (request) => {
    const limit = Math.min(parseInt(request.query.limit || "50", 10), 100);
    const result = await db.query(
      `SELECT sg.follower_tid, sg.created_at, f.username, f.custody_address
       FROM social_graph sg
       LEFT JOIN tids f ON f.tid = sg.follower_tid
       WHERE sg.following_tid = $1 AND sg.deleted_at IS NULL
       ORDER BY sg.created_at DESC
       LIMIT $2`,
      [request.params.tid, limit]
    );
    return { followers: result.rows };
  });

  server.get<{
    Params: { tid: string };
    Querystring: { limit?: string; cursor?: string };
  }>("/following/:tid", async (request) => {
    const limit = Math.min(parseInt(request.query.limit || "50", 10), 100);
    const result = await db.query(
      `SELECT sg.following_tid, sg.created_at, f.username, f.custody_address
       FROM social_graph sg
       LEFT JOIN tids f ON f.tid = sg.following_tid
       WHERE sg.follower_tid = $1 AND sg.deleted_at IS NULL
       ORDER BY sg.created_at DESC
       LIMIT $2`,
      [request.params.tid, limit]
    );
    return { following: result.rows };
  });
}
