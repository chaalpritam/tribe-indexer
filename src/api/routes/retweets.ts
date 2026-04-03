import { FastifyInstance } from "fastify";
import { db } from "../../storage/db";

export async function retweetRoutes(server: FastifyInstance) {
  // Retweet a tweet
  server.post<{
    Body: { tid: string; tweetHash: string };
  }>("/retweet", async (request, reply) => {
    const { tid, tweetHash } = request.body ?? {};
    if (!tid || !tweetHash) return reply.status(400).send({ error: "tid and tweetHash required" });

    await db.query(
      `INSERT INTO retweets (tid, tweet_hash) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [tid, tweetHash]
    );
    return { ok: true };
  });

  // Undo retweet
  server.delete<{
    Body: { tid: string; tweetHash: string };
  }>("/retweet", async (request, reply) => {
    const { tid, tweetHash } = request.body ?? {};
    if (!tid || !tweetHash) return reply.status(400).send({ error: "tid and tweetHash required" });

    await db.query(
      `DELETE FROM retweets WHERE tid = $1 AND tweet_hash = $2`,
      [tid, tweetHash]
    );
    return { ok: true };
  });

  // Get retweet count for a tweet
  server.get<{ Querystring: { hash: string } }>("/retweet/count", async (request) => {
    const result = await db.query(
      `SELECT COUNT(*)::int as count FROM retweets WHERE tweet_hash = $1`,
      [request.query.hash]
    );
    return { count: result.rows[0]?.count ?? 0 };
  });

  // Get retweets by a user (their timeline includes retweets)
  server.get<{
    Params: { tid: string };
    Querystring: { limit?: string };
  }>("/retweets/:tid", async (request) => {
    const limit = Math.min(parseInt(request.query.limit || "20", 10), 100);
    const result = await db.query(
      `SELECT r.tweet_hash, r.created_at as retweeted_at,
              t.tid as tweet_tid, t.text, t.timestamp, t.embeds,
              f.username
       FROM retweets r
       JOIN tweets t ON t.hash = r.tweet_hash
       LEFT JOIN tids f ON f.tid = t.tid
       WHERE r.tid = $1
       ORDER BY r.created_at DESC
       LIMIT $2`,
      [request.params.tid, limit]
    );
    return { retweets: result.rows };
  });
}
