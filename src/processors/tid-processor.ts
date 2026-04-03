import { createHash } from "crypto";
import { PublicKey } from "@solana/web3.js";
import { db } from "../storage/db";

// Anchor event discriminator: first 8 bytes of sha256("event:<EventName>")
function eventDiscriminator(name: string): Buffer {
  return createHash("sha256").update(`event:${name}`).digest().subarray(0, 8);
}

const DISCRIMINATORS = {
  tidRegistered: eventDiscriminator("TidRegistered"),
  tidTransferred: eventDiscriminator("TidTransferred"),
  tidRecovered: eventDiscriminator("TidRecovered"),
  recoveryChanged: eventDiscriminator("RecoveryChanged"),
};

function readU64(buf: Buffer, offset: number): bigint {
  return buf.readBigUInt64LE(offset);
}

function readPubkey(buf: Buffer, offset: number): string {
  return new PublicKey(buf.subarray(offset, offset + 32)).toBase58();
}

/**
 * Process TID registry events (TidRegistered, TidTransferred, TidRecovered, RecoveryChanged).
 */
export async function processTidEvent(eventData: string, txSignature: string): Promise<void> {
  const decoded = Buffer.from(eventData, "base64");
  const discriminator = decoded.subarray(0, 8);
  const data = decoded.subarray(8);

  if (discriminator.equals(DISCRIMINATORS.tidRegistered)) {
    // Layout: tid(u64) + custody_address(Pubkey) + recovery_address(Pubkey)
    const tid = readU64(data, 0);
    const custodyAddress = readPubkey(data, 8);
    const recoveryAddress = readPubkey(data, 40);

    await db.query(
      `INSERT INTO tids (tid, custody_address, recovery_address, registered_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (tid) DO UPDATE SET
         custody_address = EXCLUDED.custody_address,
         recovery_address = EXCLUDED.recovery_address,
         updated_at = NOW()`,
      [tid.toString(), custodyAddress, recoveryAddress]
    );
    console.log(`TidRegistered: tid=${tid} custody=${custodyAddress} tx=${txSignature}`);

  } else if (discriminator.equals(DISCRIMINATORS.tidTransferred)) {
    // Layout: tid(u64) + old_custody(Pubkey) + new_custody(Pubkey)
    const tid = readU64(data, 0);
    const newCustody = readPubkey(data, 40);

    await db.query(
      `UPDATE tids SET custody_address = $2, updated_at = NOW() WHERE tid = $1`,
      [tid.toString(), newCustody]
    );
    console.log(`TidTransferred: tid=${tid} new_custody=${newCustody} tx=${txSignature}`);

  } else if (discriminator.equals(DISCRIMINATORS.tidRecovered)) {
    // Layout: tid(u64) + old_custody(Pubkey) + new_custody(Pubkey)
    const tid = readU64(data, 0);
    const newCustody = readPubkey(data, 40);

    await db.query(
      `UPDATE tids SET custody_address = $2, updated_at = NOW() WHERE tid = $1`,
      [tid.toString(), newCustody]
    );
    console.log(`TidRecovered: tid=${tid} new_custody=${newCustody} tx=${txSignature}`);

  } else if (discriminator.equals(DISCRIMINATORS.recoveryChanged)) {
    // Layout: tid(u64) + old_recovery(Pubkey) + new_recovery(Pubkey)
    const tid = readU64(data, 0);
    const newRecovery = readPubkey(data, 40);

    await db.query(
      `UPDATE tids SET recovery_address = $2, updated_at = NOW() WHERE tid = $1`,
      [tid.toString(), newRecovery]
    );
    console.log(`RecoveryChanged: tid=${tid} new_recovery=${newRecovery} tx=${txSignature}`);

  } else {
    console.warn(`Unknown TID event discriminator: ${discriminator.toString("hex")} tx=${txSignature}`);
  }
}
