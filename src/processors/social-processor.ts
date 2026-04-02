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
    // Layout: fid(u64)
    const fid = readU64(data, 0);
    console.log(`ProfileInitialized: fid=${fid} tx=${txSignature}`);

  } else if (discriminator.equals(DISCRIMINATORS.followed)) {
    // Layout: follower_fid(u64) + following_fid(u64)
    const followerFid = readU64(data, 0);
    const followingFid = readU64(data, 8);

    await db.query(
      `INSERT INTO social_graph (follower_fid, following_fid, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (follower_fid, following_fid) DO UPDATE SET
         deleted_at = NULL,
         created_at = NOW()`,
      [followerFid.toString(), followingFid.toString()]
    );
    console.log(`Followed: ${followerFid} -> ${followingFid} tx=${txSignature}`);

  } else if (discriminator.equals(DISCRIMINATORS.unfollowed)) {
    // Layout: follower_fid(u64) + following_fid(u64)
    const followerFid = readU64(data, 0);
    const followingFid = readU64(data, 8);

    await db.query(
      `UPDATE social_graph SET deleted_at = NOW()
       WHERE follower_fid = $1 AND following_fid = $2`,
      [followerFid.toString(), followingFid.toString()]
    );
    console.log(`Unfollowed: ${followerFid} -> ${followingFid} tx=${txSignature}`);

  } else {
    console.warn(`Unknown social event discriminator: ${discriminator.toString("hex")} tx=${txSignature}`);
  }
}
