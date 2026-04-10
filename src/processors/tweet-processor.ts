import { db } from "../storage/db";
import { createNotification } from "../api/routes/notifications";
import { broadcast } from "../api/ws";

interface TweetData {
  hash: string;
  tid: string;
  text: string;
  parent_hash?: string;
  channel_id?: string;
  mentions?: string[];
  embeds?: string[];
  timestamp: string;
}

/**
 * Process tweet messages from the tweet server.
 */
export async function processTweet(tweet: TweetData): Promise<void> {
  await db.query(
    `INSERT INTO tweets (hash, tid, text, parent_hash, channel_id, mentions, embeds, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (hash) DO NOTHING`,
    [
      tweet.hash,
      tweet.tid,
      tweet.text,
      tweet.parent_hash || null,
      tweet.channel_id || null,
      tweet.mentions || [],
      tweet.embeds || [],
      tweet.timestamp,
    ]
  );

  // Broadcast new tweet to all connected clients
  broadcast("new_tweet", { hash: tweet.hash, tid: tweet.tid, channel_id: tweet.channel_id });

  // Create notifications for replies
  if (tweet.parent_hash) {
    const parent = await db.query(
      `SELECT tid FROM tweets WHERE hash = $1`,
      [tweet.parent_hash]
    );
    if (parent.rows.length > 0) {
      await createNotification(
        parseInt(parent.rows[0].tid, 10),
        "reply",
        parseInt(tweet.tid, 10),
        tweet.hash
      );
    }
  }

  // Create notifications for mentions
  if (tweet.mentions && tweet.mentions.length > 0) {
    for (const mentionTid of tweet.mentions) {
      await createNotification(
        parseInt(mentionTid, 10),
        "mention",
        parseInt(tweet.tid, 10),
        tweet.hash
      );
    }
  }
}
