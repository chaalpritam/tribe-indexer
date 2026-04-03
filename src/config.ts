import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  solanaCluster: process.env.SOLANA_CLUSTER || "devnet",
  solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  solanaWsUrl: process.env.SOLANA_WS_URL || "wss://api.devnet.solana.com",
  databaseUrl: process.env.DATABASE_URL || "postgresql://tribe:tribe@localhost:5432/tribe_indexer",
  tweetServerUrl: process.env.TWEET_SERVER_URL || "http://localhost:3000",
  tweetPollIntervalMs: parseInt(process.env.TWEET_POLL_INTERVAL_MS || "5000", 10),
  programIds: {
    tidRegistry: process.env.TID_REGISTRY_PROGRAM_ID || "4BSmJmRGQWKgioP9DG2bUuRS9U3V6soRauU7Nv6yGvHD",
    appKeyRegistry: process.env.APP_KEY_REGISTRY_PROGRAM_ID || "5LtbFUeAoXWRovGpyWnRJhiCS62XsTYKVErT9kPpv4hN",
    usernameRegistry: process.env.USERNAME_REGISTRY_PROGRAM_ID || "65oKjSjcGYR61ASzDYczbodz6H8TARtJyQGvb5V9y9W1",
    socialGraph: process.env.SOCIAL_GRAPH_PROGRAM_ID || "8kKnWvbmTjWq5uPePk79RRbQMAXCszNFzHdRwUS4N74w",
  },
};
