import { FastifyInstance } from "fastify";
import { Connection, PublicKey } from "@solana/web3.js";
import { db } from "../../storage/db";
import { config } from "../../config";

/**
 * Read a u64 from a buffer at the given offset (little-endian).
 */
function readU64LE(data: Buffer, offset: number): number {
  let val = 0;
  for (let i = 0; i < 8; i++) {
    val += data[offset + i] * 2 ** (i * 8);
  }
  return val;
}

function tidToBuffer(tid: number): Buffer {
  const buf = Buffer.alloc(8);
  let val = tid;
  for (let i = 0; i < 8; i++) {
    buf[i] = val & 0xff;
    val = Math.floor(val / 256);
  }
  return buf;
}

/**
 * Try to fetch a TID from on-chain and insert into the DB.
 * This backfills TIDs that were registered before the indexer started.
 */
async function backfillTid(tid: string): Promise<boolean> {
  try {
    const connection = new Connection(config.solanaRpcUrl, "confirmed");
    const programId = new PublicKey(config.programIds.tidRegistry);
    const tidNum = parseInt(tid, 10);

    const [tidPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("tid"), tidToBuffer(tidNum)],
      programId
    );

    const info = await connection.getAccountInfo(tidPda);
    if (!info) return false;

    // TidRecord layout: 8 disc + 8 tid + 32 custody + 32 recovery + 8 registered_at + 1 bump
    const data = info.data;
    if (data.length < 89) return false;

    const custodyAddress = new PublicKey(data.slice(16, 48)).toBase58();
    const recoveryAddress = new PublicKey(data.slice(48, 80)).toBase58();
    const registeredAt = readU64LE(data, 80);
    const registeredDate = new Date(registeredAt * 1000);

    await db.query(
      `INSERT INTO tids (tid, custody_address, recovery_address, registered_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (tid) DO NOTHING`,
      [tid, custodyAddress, recoveryAddress, registeredDate]
    );

    return true;
  } catch {
    return false;
  }
}

export async function userRoutes(server: FastifyInstance) {
  // List all users
  server.get<{
    Querystring: { limit?: string; offset?: string };
  }>("/users", async (request) => {
    const limit = Math.min(parseInt(request.query.limit || "50", 10), 100);
    const offset = parseInt(request.query.offset || "0", 10);
    const result = await db.query(
      `SELECT f.tid, f.custody_address, f.recovery_address, f.registered_at, f.username,
              (SELECT COUNT(*) FROM social_graph WHERE follower_tid = f.tid AND deleted_at IS NULL) as following_count,
              (SELECT COUNT(*) FROM social_graph WHERE following_tid = f.tid AND deleted_at IS NULL) as followers_count
       FROM tids f
       ORDER BY f.tid DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const countResult = await db.query(`SELECT COUNT(*)::int as total FROM tids`);
    return { users: result.rows, total: countResult.rows[0]?.total ?? 0 };
  });

  server.get<{ Params: { tid: string } }>(
    "/user/:tid",
    async (request, reply) => {
      let result = await db.query(
        `SELECT f.tid, f.custody_address, f.recovery_address, f.registered_at, f.username,
                (SELECT COUNT(*) FROM social_graph WHERE follower_tid = f.tid AND deleted_at IS NULL) as following_count,
                (SELECT COUNT(*) FROM social_graph WHERE following_tid = f.tid AND deleted_at IS NULL) as followers_count
         FROM tids f WHERE f.tid = $1`,
        [request.params.tid]
      );

      // If not found, try to backfill from on-chain
      if (result.rows.length === 0) {
        const backfilled = await backfillTid(request.params.tid);
        if (backfilled) {
          result = await db.query(
            `SELECT f.tid, f.custody_address, f.recovery_address, f.registered_at, f.username,
                    (SELECT COUNT(*) FROM social_graph WHERE follower_tid = f.tid AND deleted_at IS NULL) as following_count,
                    (SELECT COUNT(*) FROM social_graph WHERE following_tid = f.tid AND deleted_at IS NULL) as followers_count
             FROM tids f WHERE f.tid = $1`,
            [request.params.tid]
          );
        }
      }

      if (result.rows.length === 0)
        return reply.status(404).send({ error: "User not found" });
      return result.rows[0];
    }
  );

  server.get<{ Params: { name: string } }>(
    "/user/by-username/:name",
    async (request, reply) => {
      const result = await db.query(
        `SELECT tid, custody_address, recovery_address, registered_at, username
         FROM tids WHERE username = $1`,
        [request.params.name]
      );

      if (result.rows.length === 0)
        return reply.status(404).send({ error: "User not found" });
      return result.rows[0];
    }
  );
}
