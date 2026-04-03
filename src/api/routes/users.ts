import { FastifyInstance } from "fastify";
import { db } from "../../storage/db";

export async function userRoutes(server: FastifyInstance) {
  server.get<{ Params: { tid: string } }>("/user/:tid", async (request, reply) => {
    const result = await db.query(
      `SELECT f.tid, f.custody_address, f.recovery_address, f.registered_at, f.username,
              (SELECT COUNT(*) FROM social_graph WHERE follower_tid = f.tid AND deleted_at IS NULL) as following_count,
              (SELECT COUNT(*) FROM social_graph WHERE following_tid = f.tid AND deleted_at IS NULL) as followers_count
       FROM tids f WHERE f.tid = $1`,
      [request.params.tid]
    );

    if (result.rows.length === 0) return reply.status(404).send({ error: "User not found" });
    return result.rows[0];
  });

  server.get<{ Params: { name: string } }>("/user/by-username/:name", async (request, reply) => {
    const result = await db.query(
      `SELECT tid, custody_address, recovery_address, registered_at, username
       FROM tids WHERE username = $1`,
      [request.params.name]
    );

    if (result.rows.length === 0) return reply.status(404).send({ error: "User not found" });
    return result.rows[0];
  });
}
