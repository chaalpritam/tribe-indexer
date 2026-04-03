import { FastifyInstance } from "fastify";
import { db } from "../../storage/db";

export async function listRoutes(server: FastifyInstance) {
  // Create a list
  server.post<{
    Body: { ownerTid: string; name: string; description?: string };
  }>("/lists", async (request, reply) => {
    const { ownerTid, name, description } = request.body ?? {};
    if (!ownerTid || !name) return reply.status(400).send({ error: "ownerTid and name required" });
    if (name.length > 50) return reply.status(400).send({ error: "Name must be under 50 characters" });

    const result = await db.query(
      `INSERT INTO lists (owner_tid, name, description) VALUES ($1, $2, $3) RETURNING id`,
      [ownerTid, name, description ?? null]
    );
    return { id: result.rows[0].id, ok: true };
  });

  // Get lists owned by a user
  server.get<{ Params: { tid: string } }>("/lists/by/:tid", async (request) => {
    const result = await db.query(
      `SELECT l.id, l.name, l.description, l.created_at,
              (SELECT COUNT(*)::int FROM list_members WHERE list_id = l.id) as member_count
       FROM lists l WHERE l.owner_tid = $1
       ORDER BY l.created_at DESC`,
      [request.params.tid]
    );
    return { lists: result.rows };
  });

  // Get a single list with members
  server.get<{ Params: { id: string } }>("/lists/:id", async (request, reply) => {
    const listResult = await db.query(
      `SELECT l.id, l.owner_tid, l.name, l.description, l.created_at FROM lists l WHERE l.id = $1`,
      [request.params.id]
    );
    if (listResult.rows.length === 0) return reply.status(404).send({ error: "List not found" });

    const membersResult = await db.query(
      `SELECT lm.member_tid, lm.added_at, t.username, t.custody_address
       FROM list_members lm
       LEFT JOIN tids t ON t.tid = lm.member_tid
       WHERE lm.list_id = $1
       ORDER BY lm.added_at DESC`,
      [request.params.id]
    );

    return {
      ...listResult.rows[0],
      members: membersResult.rows,
    };
  });

  // Get feed from a list (tweets from list members)
  server.get<{
    Params: { id: string };
    Querystring: { limit?: string };
  }>("/lists/:id/feed", async (request, reply) => {
    const limit = Math.min(parseInt(request.query.limit || "20", 10), 100);

    // Check list exists
    const listResult = await db.query(`SELECT id FROM lists WHERE id = $1`, [request.params.id]);
    if (listResult.rows.length === 0) return reply.status(404).send({ error: "List not found" });

    const result = await db.query(
      `SELECT t.hash, t.tid, t.text, t.parent_hash, t.channel_id, t.mentions, t.embeds, t.timestamp,
              f.username
       FROM tweets t
       JOIN list_members lm ON lm.member_tid = t.tid AND lm.list_id = $1
       LEFT JOIN tids f ON f.tid = t.tid
       WHERE t.deleted = false
       ORDER BY t.timestamp DESC
       LIMIT $2`,
      [request.params.id, limit]
    );
    return { tweets: result.rows };
  });

  // Add member to list
  server.post<{
    Params: { id: string };
    Body: { memberTid: string };
  }>("/lists/:id/members", async (request, reply) => {
    const { memberTid } = request.body ?? {};
    if (!memberTid) return reply.status(400).send({ error: "memberTid required" });

    await db.query(
      `INSERT INTO list_members (list_id, member_tid) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [request.params.id, memberTid]
    );
    return { ok: true };
  });

  // Remove member from list
  server.delete<{
    Params: { id: string };
    Body: { memberTid: string };
  }>("/lists/:id/members", async (request, reply) => {
    const { memberTid } = request.body ?? {};
    if (!memberTid) return reply.status(400).send({ error: "memberTid required" });

    await db.query(
      `DELETE FROM list_members WHERE list_id = $1 AND member_tid = $2`,
      [request.params.id, memberTid]
    );
    return { ok: true };
  });

  // Delete a list
  server.delete<{ Params: { id: string } }>("/lists/:id", async (request) => {
    await db.query(`DELETE FROM lists WHERE id = $1`, [request.params.id]);
    return { ok: true };
  });
}
