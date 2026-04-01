import { db } from "../storage/db";

/**
 * Process FID registry events (FidRegistered, FidTransferred, FidRecovered).
 */
export async function processFidEvent(eventData: string, txSignature: string): Promise<void> {
  // TODO: Decode Anchor event from base64 eventData
  // For now, log raw events
  const decoded = Buffer.from(eventData, "base64");

  // Event discriminator is first 8 bytes (sha256("event:EventName")[..8])
  const discriminator = decoded.subarray(0, 8);

  // TODO: Match discriminator to event type and deserialize
  // FidRegistered: upsert into fids table
  // FidTransferred: update custody_address
  // FidRecovered: update custody_address

  console.log(`FID event in tx ${txSignature}: ${discriminator.toString("hex")}`);
}
