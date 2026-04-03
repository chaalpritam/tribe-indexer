import { createHash } from "crypto";
import { db } from "../storage/db";

function eventDiscriminator(name: string): Buffer {
  return createHash("sha256").update(`event:${name}`).digest().subarray(0, 8);
}

const DISCRIMINATORS = {
  profileInitialized: eventDiscriminator("ProfileInitialized"),
  followed: eventDiscriminator("Followed"),
  unfollowed: eventDiscriminator("Unfollowed"),
};

function readU64(buf: Buffer, offset: number): bigint {
  return buf.readBigUInt64LE(offset);
}

/**
 * Process social graph events (ProfileInitialized, Followed, Unfollowed).
 */
export async function processSocialEvent(eventData: string, txSignature: string): Promise<void> {
  const decoded = Buffer.from(eventData, "base64");
  const discriminator = decoded.subarray(0, 8);
  const data = decoded.subarray(8);

  if (discriminator.equals(DISCRIMINATORS.profileInitialized)) {
    // Layout: tid(u64)
    const tid = readU64(data, 0);
    console.log(`ProfileInitialized: tid=${tid} tx=${txSignature}`);

  } else if (discriminator.equals(DISCRIMINATORS.followed)) {
    // Layout: follower_tid(u64) + following_tid(u64)
    const followerTid = readU64(data, 0);
    const followingTid = readU64(data, 8);

    await db.query(
      `INSERT INTO social_graph (follower_tid, following_tid, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (follower_tid, following_tid) DO UPDATE SET
         deleted_at = NULL,
         created_at = NOW()`,
      [followerTid.toString(), followingTid.toString()]
    );
    console.log(`Followed: ${followerTid} -> ${followingTid} tx=${txSignature}`);

  } else if (discriminator.equals(DISCRIMINATORS.unfollowed)) {
    // Layout: follower_tid(u64) + following_tid(u64)
    const followerTid = readU64(data, 0);
    const followingTid = readU64(data, 8);

    await db.query(
      `UPDATE social_graph SET deleted_at = NOW()
       WHERE follower_tid = $1 AND following_tid = $2`,
      [followerTid.toString(), followingTid.toString()]
    );
    console.log(`Unfollowed: ${followerTid} -> ${followingTid} tx=${txSignature}`);

  } else {
    console.warn(`Unknown social event discriminator: ${discriminator.toString("hex")} tx=${txSignature}`);
  }
}
