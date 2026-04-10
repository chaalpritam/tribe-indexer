import { FastifyInstance } from "fastify";
import { db } from "../../storage/db";

export async function dmRoutes(server: FastifyInstance) {
  // Register DM encryption key (x25519 public key)
  server.post<{
    Body: { tid: string; x25519Pubkey: string };
  }>("/dm/register-key", async (request, reply) => {
    const { tid, x25519Pubkey } = request.body ?? {};
    if (!tid || !x25519Pubkey) return reply.status(400).send({ error: "tid and x25519Pubkey required" });

    await db.query(
      `INSERT INTO dm_keys (tid, x25519_pubkey) VALUES ($1, $2)
       ON CONFLICT (tid) DO UPDATE SET x25519_pubkey = $2, created_at = NOW()`,
      [tid, x25519Pubkey]
    );
    return { ok: true };
  });

  // Get a user's DM public key
  server.get<{ Params: { tid: string } }>("/dm/key/:tid", async (request, reply) => {
    const result = await db.query(
      `SELECT x25519_pubkey FROM dm_keys WHERE tid = $1`,
      [request.params.tid]
    );
    if (result.rows.length === 0) return reply.status(404).send({ error: "No DM key registered" });
    return { x25519Pubkey: result.rows[0].x25519_pubkey };
  });

  // Send an encrypted DM
  server.post<{
    Body: {
      senderTid: string;
      recipientTid: string;
      encryptedText: string;
      nonce: string;
    };
  }>("/dm/send", async (request, reply) => {
    const { senderTid, recipientTid, encryptedText, nonce } = request.body ?? {};
    if (!senderTid || !recipientTid || !encryptedText || !nonce) {
      return reply.status(400).send({ error: "senderTid, recipientTid, encryptedText, nonce required" });
    }

    // Verify sender TID exists in the system
    const senderCheck = await db.query(`SELECT tid FROM tids WHERE tid = $1`, [senderTid]);
    if (senderCheck.rows.length === 0) {
      return reply.status(403).send({ error: "Sender TID not found" });
    }

    // Limit encrypted text size to prevent abuse (NaCl box overhead + reasonable message)
    if (encryptedText.length > 10_000 || nonce.length > 100) {
      return reply.status(400).send({ error: "Message too large" });
    }

    // Normalize conversation (smaller TID first)
    const tidA = Math.min(parseInt(senderTid), parseInt(recipientTid)).toString();
    const tidB = Math.max(parseInt(senderTid), parseInt(recipientTid)).toString();

    // Get or create conversation
    let convResult = await db.query(
      `SELECT id FROM dm_conversations WHERE tid_a = $1 AND tid_b = $2`,
      [tidA, tidB]
    );

    if (convResult.rows.length === 0) {
      convResult = await db.query(
        `INSERT INTO dm_conversations (tid_a, tid_b) VALUES ($1, $2) RETURNING id`,
        [tidA, tidB]
      );
    }

    const conversationId = convResult.rows[0].id;

    await db.query(
      `INSERT INTO dm_messages (conversation_id, sender_tid, encrypted_text, nonce)
       VALUES ($1, $2, $3, $4)`,
      [conversationId, senderTid, encryptedText, nonce]
    );

    return { conversationId, ok: true };
  });

  // Get conversations for a user
  server.get<{ Params: { tid: string } }>("/dm/conversations/:tid", async (request) => {
    const tid = request.params.tid;
    const result = await db.query(
      `SELECT c.id, c.tid_a, c.tid_b, c.created_at,
              CASE WHEN c.tid_a = $1 THEN c.tid_b ELSE c.tid_a END as other_tid,
              (SELECT COUNT(*)::int FROM dm_messages WHERE conversation_id = c.id) as message_count,
              (SELECT created_at FROM dm_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
              t.username as other_username
       FROM dm_conversations c
       LEFT JOIN tids t ON t.tid = CASE WHEN c.tid_a = $1 THEN c.tid_b ELSE c.tid_a END
       WHERE c.tid_a = $1 OR c.tid_b = $1
       ORDER BY last_message_at DESC NULLS LAST`,
      [tid]
    );
    return { conversations: result.rows };
  });

  // Get messages in a conversation
  server.get<{
    Params: { id: string };
    Querystring: { limit?: string };
  }>("/dm/messages/:id", async (request) => {
    const limit = Math.min(parseInt(request.query.limit || "50", 10), 100);
    const result = await db.query(
      `SELECT m.id, m.sender_tid, m.encrypted_text, m.nonce, m.created_at,
              t.username as sender_username
       FROM dm_messages m
       LEFT JOIN tids t ON t.tid = m.sender_tid
       WHERE m.conversation_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2`,
      [request.params.id, limit]
    );
    return { messages: result.rows.reverse() };
  });
}
