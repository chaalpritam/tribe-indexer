import { config } from "./config";
import { startSolanaListener } from "./listeners/solana-listener";
import { startCastListener } from "./listeners/cast-listener";
import { buildApiServer } from "./api/server";

async function main() {
  console.log("Starting Tribe Indexer...");
  console.log(`Solana cluster: ${config.solanaCluster}`);

  // Start background listeners.
  startSolanaListener();
  startCastListener();

  // Start API server.
  const server = await buildApiServer();
  await server.listen({ port: config.port, host: "0.0.0.0" });
  console.log(`Indexer API running on port ${config.port}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
