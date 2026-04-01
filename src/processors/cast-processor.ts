import { db } from "../storage/db";

interface CastData {
  hash: string;
  fid: string;
  text: string;
  parent_hash?: string;
  channel_id?: string;
  mentions?: string[];
  embeds?: string[];
  timestamp: string;
}

/**
 * Process cast messages from the cast server.
 */
export async function processCast(cast: CastData): Promise<void> {
  await db.query(
    `INSERT INTO casts (hash, fid, text, parent_hash, channel_id, mentions, embeds, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (hash) DO NOTHING`,
    [
      cast.hash,
      cast.fid,
      cast.text,
      cast.parent_hash || null,
      cast.channel_id || null,
      cast.mentions || [],
      cast.embeds || [],
      cast.timestamp,
    ]
  );
}
