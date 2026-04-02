import { createHash } from "crypto";
import { PublicKey } from "@solana/web3.js";
import { db } from "../storage/db";

// Anchor event discriminator: first 8 bytes of sha256("event:<EventName>")
function eventDiscriminator(name: string): Buffer {
  return createHash("sha256").update(`event:${name}`).digest().subarray(0, 8);
}

const DISCRIMINATORS = {
  fidRegistered: eventDiscriminator("FidRegistered"),
  fidTransferred: eventDiscriminator("FidTransferred"),
  fidRecovered: eventDiscriminator("FidRecovered"),
  recoveryChanged: eventDiscriminator("RecoveryChanged"),
};

function readU64(buf: Buffer, offset: number): bigint {
  return buf.readBigUInt64LE(offset);
}

function readPubkey(buf: Buffer, offset: number): string {
  return new PublicKey(buf.subarray(offset, offset + 32)).toBase58();
}

/**
 * Process FID registry events (FidRegistered, FidTransferred, FidRecovered, RecoveryChanged).
 */
export async function processFidEvent(eventData: string, txSignature: string): Promise<void> {
  const decoded = Buffer.from(eventData, "base64");
  const discriminator = decoded.subarray(0, 8);
  const data = decoded.subarray(8);

  if (discriminator.equals(DISCRIMINATORS.fidRegistered)) {
    // Layout: fid(u64) + custody_address(Pubkey) + recovery_address(Pubkey)
    const fid = readU64(data, 0);
    const custodyAddress = readPubkey(data, 8);
    const recoveryAddress = readPubkey(data, 40);

    await db.query(
      `INSERT INTO fids (fid, custody_address, recovery_address, registered_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (fid) DO UPDATE SET
         custody_address = EXCLUDED.custody_address,
         recovery_address = EXCLUDED.recovery_address,
         updated_at = NOW()`,
      [fid.toString(), custodyAddress, recoveryAddress]
    );
    console.log(`FidRegistered: fid=${fid} custody=${custodyAddress} tx=${txSignature}`);

  } else if (discriminator.equals(DISCRIMINATORS.fidTransferred)) {
    // Layout: fid(u64) + old_custody(Pubkey) + new_custody(Pubkey)
    const fid = readU64(data, 0);
    const newCustody = readPubkey(data, 40);

    await db.query(
      `UPDATE fids SET custody_address = $2, updated_at = NOW() WHERE fid = $1`,
      [fid.toString(), newCustody]
    );
    console.log(`FidTransferred: fid=${fid} new_custody=${newCustody} tx=${txSignature}`);

  } else if (discriminator.equals(DISCRIMINATORS.fidRecovered)) {
    // Layout: fid(u64) + old_custody(Pubkey) + new_custody(Pubkey)
    const fid = readU64(data, 0);
    const newCustody = readPubkey(data, 40);

    await db.query(
      `UPDATE fids SET custody_address = $2, updated_at = NOW() WHERE fid = $1`,
      [fid.toString(), newCustody]
    );
    console.log(`FidRecovered: fid=${fid} new_custody=${newCustody} tx=${txSignature}`);

  } else if (discriminator.equals(DISCRIMINATORS.recoveryChanged)) {
    // Layout: fid(u64) + old_recovery(Pubkey) + new_recovery(Pubkey)
    const fid = readU64(data, 0);
    const newRecovery = readPubkey(data, 40);

    await db.query(
      `UPDATE fids SET recovery_address = $2, updated_at = NOW() WHERE fid = $1`,
      [fid.toString(), newRecovery]
    );
    console.log(`RecoveryChanged: fid=${fid} new_recovery=${newRecovery} tx=${txSignature}`);

  } else {
    console.warn(`Unknown FID event discriminator: ${discriminator.toString("hex")} tx=${txSignature}`);
  }
}
