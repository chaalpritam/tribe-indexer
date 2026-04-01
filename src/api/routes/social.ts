import { FastifyInstance } from "fastify";
import { db } from "../../storage/db";

export async function socialRoutes(server: FastifyInstance) {
  server.get<{
    Params: { fid: string };
    Querystring: { limit?: string; cursor?: string };
  }>("/followers/:fid", async (request) => {
    const limit = Math.min(parseInt(request.query.limit || "50", 10), 100);
    const result = await db.query(
      `SELECT sg.follower_fid, sg.created_at, f.username, f.custody_address
       FROM social_graph sg
       LEFT JOIN fids f ON f.fid = sg.follower_fid
       WHERE sg.following_fid = $1 AND sg.deleted_at IS NULL
       ORDER BY sg.created_at DESC
       LIMIT $2`,
      [request.params.fid, limit]
    );
    return { followers: result.rows };
  });

  server.get<{
    Params: { fid: string };
    Querystring: { limit?: string; cursor?: string };
  }>("/following/:fid", async (request) => {
    const limit = Math.min(parseInt(request.query.limit || "50", 10), 100);
    const result = await db.query(
      `SELECT sg.following_fid, sg.created_at, f.username, f.custody_address
       FROM social_graph sg
       LEFT JOIN fids f ON f.fid = sg.following_fid
       WHERE sg.follower_fid = $1 AND sg.deleted_at IS NULL
       ORDER BY sg.created_at DESC
       LIMIT $2`,
      [request.params.fid, limit]
    );
    return { following: result.rows };
  });
}
