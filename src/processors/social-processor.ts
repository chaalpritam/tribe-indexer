import { db } from "../storage/db";

/**
 * Process social graph events (Followed, Unfollowed).
 */
export async function processSocialEvent(eventData: string, txSignature: string): Promise<void> {
  const decoded = Buffer.from(eventData, "base64");
  const discriminator = decoded.subarray(0, 8);

  // TODO: Match discriminator and deserialize
  // Followed: INSERT into social_graph
  // Unfollowed: SET deleted_at

  console.log(`Social event in tx ${txSignature}: ${discriminator.toString("hex")}`);
}
