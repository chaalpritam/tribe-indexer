import { FastifyInstance } from "fastify";
import { db } from "../../storage/db";

export async function userRoutes(server: FastifyInstance) {
  server.get<{ Params: { fid: string } }>("/user/:fid", async (request, reply) => {
    const result = await db.query(
      `SELECT f.fid, f.custody_address, f.recovery_address, f.registered_at, f.username,
              (SELECT COUNT(*) FROM social_graph WHERE follower_fid = f.fid AND deleted_at IS NULL) as following_count,
              (SELECT COUNT(*) FROM social_graph WHERE following_fid = f.fid AND deleted_at IS NULL) as followers_count
       FROM fids f WHERE f.fid = $1`,
      [request.params.fid]
    );

    if (result.rows.length === 0) return reply.status(404).send({ error: "User not found" });
    return result.rows[0];
  });

  server.get<{ Params: { name: string } }>("/user/by-username/:name", async (request, reply) => {
    const result = await db.query(
      `SELECT fid, custody_address, recovery_address, registered_at, username
       FROM fids WHERE username = $1`,
      [request.params.name]
    );

    if (result.rows.length === 0) return reply.status(404).send({ error: "User not found" });
    return result.rows[0];
  });
}
