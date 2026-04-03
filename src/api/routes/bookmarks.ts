import { FastifyInstance } from "fastify";
import { db } from "../../storage/db";

export async function bookmarkRoutes(server: FastifyInstance) {
  // Get bookmarks for a TID
  server.get<{
    Params: { tid: string };
    Querystring: { limit?: string };
  }>("/bookmarks/:tid", async (request) => {
    const limit = Math.min(parseInt(request.query.limit || "20", 10), 100);
    const result = await db.query(
      `SELECT b.tweet_hash, b.created_at,
              t.tid as tweet_tid, t.text, t.timestamp, t.embeds,
              f.username
       FROM bookmarks b
       JOIN tweets t ON t.hash = b.tweet_hash
       LEFT JOIN tids f ON f.tid = t.tid
       WHERE b.tid = $1
       ORDER BY b.created_at DESC
       LIMIT $2`,
      [request.params.tid, limit]
    );
    return { bookmarks: result.rows };
  });

  // Add bookmark
  server.post<{
    Params: { tid: string };
    Body: { tweetHash: string };
  }>("/bookmarks/:tid", async (request, reply) => {
    const { tweetHash } = request.body ?? {};
    if (!tweetHash) return reply.status(400).send({ error: "tweetHash required" });

    await db.query(
      `INSERT INTO bookmarks (tid, tweet_hash) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [request.params.tid, tweetHash]
    );
    return { ok: true };
  });

  // Remove bookmark
  server.delete<{
    Params: { tid: string };
    Body: { tweetHash: string };
  }>("/bookmarks/:tid", async (request, reply) => {
    const { tweetHash } = request.body ?? {};
    if (!tweetHash) return reply.status(400).send({ error: "tweetHash required" });

    await db.query(
      `DELETE FROM bookmarks WHERE tid = $1 AND tweet_hash = $2`,
      [request.params.tid, tweetHash]
    );
    return { ok: true };
  });

  // Check if a tweet is bookmarked
  server.get<{
    Params: { tid: string };
    Querystring: { hash: string };
  }>("/bookmarks/:tid/check", async (request) => {
    const result = await db.query(
      `SELECT 1 FROM bookmarks WHERE tid = $1 AND tweet_hash = $2`,
      [request.params.tid, request.query.hash]
    );
    return { bookmarked: (result.rowCount ?? 0) > 0 };
  });
}
