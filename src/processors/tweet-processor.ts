import { db } from "../storage/db";

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
}
