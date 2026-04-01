import { Connection, PublicKey, Logs } from "@solana/web3.js";
import { config } from "../config";
import { processFidEvent } from "../processors/fid-processor";
import { processSocialEvent } from "../processors/social-processor";

const ANCHOR_EVENT_PREFIX = "Program data: ";

/**
 * Subscribe to Solana program logs via WebSocket.
 * Parses Anchor events and dispatches to processors.
 */
export function startSolanaListener() {
  const connection = new Connection(config.solanaRpcUrl, {
    wsEndpoint: config.solanaWsUrl,
  });

  const programIds = [
    { id: new PublicKey(config.programIds.fidRegistry), handler: processFidEvent },
    { id: new PublicKey(config.programIds.socialGraph), handler: processSocialEvent },
  ];

  for (const { id, handler } of programIds) {
    connection.onLogs(
      id,
      (logs: Logs) => {
        if (logs.err) return;

        for (const log of logs.logs) {
          if (log.startsWith(ANCHOR_EVENT_PREFIX)) {
            const eventData = log.slice(ANCHOR_EVENT_PREFIX.length);
            try {
              handler(eventData, logs.signature);
            } catch (err) {
              console.error(`Error processing event from ${id.toBase58()}:`, err);
            }
          }
        }
      },
      "confirmed"
    );

    console.log(`Subscribed to logs for ${id.toBase58()}`);
  }
}
