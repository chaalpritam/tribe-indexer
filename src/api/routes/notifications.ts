import { FastifyInstance } from "fastify";
import { db } from "../../storage/db";
import { sendToTid } from "../ws";

export async function notificationRoutes(server: FastifyInstance) {
  // Get notifications for a TID
  server.get<{
    Params: { tid: string };
    Querystring: { limit?: string; unread_only?: string };
  }>("/notifications/:tid", async (request) => {
    const limit = Math.min(parseInt(request.query.limit || "20", 10), 100);
    const unreadOnly = request.query.unread_only === "true";

    let query = `
      SELECT n.id, n.tid, n.type, n.from_tid, n.tweet_hash, n.read, n.created_at,
             t.username as from_username
      FROM notifications n
      LEFT JOIN tids t ON t.tid = n.from_tid
      WHERE n.tid = $1
    `;
    if (unreadOnly) query += ` AND n.read = false`;
    query += ` ORDER BY n.created_at DESC LIMIT $2`;

    const result = await db.query(query, [request.params.tid, limit]);
    return { notifications: result.rows };
  });

  // Get unread count
  server.get<{ Params: { tid: string } }>(
    "/notifications/:tid/count",
    async (request) => {
      const result = await db.query(
        `SELECT COUNT(*)::int as count FROM notifications WHERE tid = $1 AND read = false`,
        [request.params.tid]
      );
      return { count: result.rows[0]?.count ?? 0 };
    }
  );

  // Mark notifications as read
  server.post<{
    Params: { tid: string };
    Body: { ids?: number[] };
  }>("/notifications/:tid/read", async (request) => {
    const ids = request.body?.ids;
    if (ids && ids.length > 0) {
      await db.query(
        `UPDATE notifications SET read = true WHERE tid = $1 AND id = ANY($2::bigint[])`,
        [request.params.tid, ids]
      );
    } else {
      // Mark all as read
      await db.query(
        `UPDATE notifications SET read = true WHERE tid = $1 AND read = false`,
        [request.params.tid]
      );
    }
    return { ok: true };
  });
}

/**
 * Create a notification. Called by processors when events happen.
 */
export async function createNotification(
  tid: number,
  type: "follow" | "like" | "reply" | "mention",
  fromTid?: number,
  tweetHash?: string
): Promise<void> {
  // Don't notify yourself
  if (fromTid && fromTid === tid) return;

  await db.query(
    `INSERT INTO notifications (tid, type, from_tid, tweet_hash) VALUES ($1, $2, $3, $4)`,
    [tid, type, fromTid ?? null, tweetHash ?? null]
  );

  // Push real-time notification to connected client
  sendToTid(String(tid), "notification", { type, fromTid, tweetHash });
}
