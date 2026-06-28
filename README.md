# tribe-indexer

> **DEPRECATED** — This functionality has been merged into [tribe-hub](https://github.com/chaalpritam/tribe-hub). The hub now handles Solana event indexing, tweet storage, and gossip peer sync in a single service. This repo is kept for reference only.

Event indexer and read API for the Tribe protocol. Listens to Solana program events via WebSocket, polls the tweet server for off-chain messages, and serves aggregated data through a REST API.

## Architecture

```
Solana Programs ──(WebSocket logs)──> Solana Listener ──> Processors ──> PostgreSQL
Tweet Server ────(HTTP polling)────> Tweet Listener ──> Processors ──>     |
                                                                           |
                                                             REST API  <───┘
```

## Data Sources

### Solana Listener

Subscribes to program logs over WebSocket and parses events using discriminator-based decoding.

**TID events:**

- `TidRegistered` — new TID minted
- `TidTransferred` — custody address changed
- `TidRecovered` — TID recovered via recovery address
- `RecoveryChanged` — recovery address updated

**Social events:**

- `Followed` — follow relationship created
- `Unfollowed` — follow relationship removed
- `ProfileInitialized` — new social profile set up

### Tweet Listener

Polls the tweet-server over HTTP at a configurable interval (default 5 seconds) to ingest off-chain tweet and reaction data.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/user/:tid` | User profile (TID, custody, recovery, username, follower/following counts) |
| GET | `/v1/user/by-username/:name` | Lookup user by username |
| GET | `/v1/followers/:tid?cursor=&limit=` | Paginated followers |
| GET | `/v1/following/:tid?cursor=&limit=` | Paginated following |
| GET | `/v1/feed/:tid?cursor=&limit=` | User's tweet feed |
| GET | `/v1/feed/channel/:channelId?cursor=&limit=` | Channel feed |
| GET | `/health` | Health check with sync status per source |

## Getting Started

### Docker (recommended)

```bash
docker-compose up
```

> Uses port **5433** for PostgreSQL and port **3001** for the API by default.

### Manual

Requires PostgreSQL 16+ and a running instance of [tweet-server](../tribe-tweet-server) for tweet polling.

```bash
cp .env.example .env   # edit as needed
pnpm install
pnpm run migrate
pnpm run dev
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | API server port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `SOLANA_CLUSTER` | — | Solana cluster name (e.g. `devnet`, `mainnet-beta`) |
| `SOLANA_RPC_URL` | — | Solana JSON-RPC endpoint |
| `SOLANA_WS_URL` | — | Solana WebSocket endpoint |
| `TWEET_SERVER_URL` | `http://localhost:3000` | Base URL of the tweet server |
| `TWEET_POLL_INTERVAL_MS` | `5000` | Tweet polling interval in milliseconds |
| `TID_REGISTRY` | — | Program ID for the TID registry |
| `APP_KEY_REGISTRY` | — | Program ID for the app-key registry |
| `USERNAME_REGISTRY` | — | Program ID for the username registry |
| `SOCIAL_GRAPH` | — | Program ID for the social graph program |

## Database Schema

### tids

| Column | Type | Notes |
|--------|------|-------|
| `tid` | integer | Primary key |
| `custody_address` | text | Current custody wallet |
| `recovery_address` | text | Recovery wallet |
| `registered_at` | timestamp | When the TID was minted |
| `username` | text | Linked username |
| `updated_at` | timestamp | Last update |

### app_keys

| Column | Type | Notes |
|--------|------|-------|
| `tid` | integer | Composite PK with `app_pubkey` |
| `app_pubkey` | text | Composite PK with `tid` |
| `scope` | text | Permission scope |
| `created_at` | timestamp | |
| `expires_at` | timestamp | |
| `revoked` | boolean | |

### social_graph

| Column | Type | Notes |
|--------|------|-------|
| `follower_tid` | integer | Composite PK with `following_tid` |
| `following_tid` | integer | Composite PK with `follower_tid` |
| `created_at` | timestamp | |
| `deleted_at` | timestamp | Soft delete marker |

### tweets

| Column | Type | Notes |
|--------|------|-------|
| `hash` | text | Primary key |
| `tid` | integer | Author TID |
| `text` | text | Tweet body |
| `parent_hash` | text | Reply parent (nullable) |
| `channel_id` | text | Channel (nullable) |
| `mentions` | text[] | Mentioned TIDs |
| `embeds` | text[] | Embedded URLs |
| `timestamp` | timestamp | Original post time |
| `deleted` | boolean | |
| `indexed_at` | timestamp | When the indexer stored it |

### reactions

| Column | Type | Notes |
|--------|------|-------|
| `hash` | text | Primary key |
| `tid` | integer | Reactor TID |
| `type` | text | Reaction type |
| `target_hash` | text | Target tweet hash |
| `timestamp` | timestamp | |
| `deleted` | boolean | |
| `indexed_at` | timestamp | |

### sync_status

| Column | Type | Notes |
|--------|------|-------|
| `source` | text | Primary key (e.g. `solana`, `tweets`) |
| `last_slot` | bigint | Last processed Solana slot |
| `last_timestamp` | timestamp | Last processed timestamp |
| `updated_at` | timestamp | |

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm run dev` | Start in development mode with hot reload |
| `pnpm run build` | Compile TypeScript |
| `pnpm run start` | Run compiled output |
| `pnpm run test` | Run test suite |
| `pnpm run migrate` | Apply database migrations |

## Tech Stack

- **Fastify** — HTTP framework
- **PostgreSQL 16** — Primary data store
- **Solana web3.js** — WebSocket log subscription
- **dotenv** — Environment configuration

## Related Repos

| Repo | Description |
|------|-------------|
| [tribe-protocol](../tribe-protocol) | Solana programs (Anchor) — 12 programs: tid-registry, app-key-registry, username-registry, social-graph w/ ER delegation, hub-registry, tip-registry, crowdfund-registry, task-registry, channel-registry, karma-registry, poll-registry, event-registry |
| [tribe-sdk](../tribe-sdk) | TypeScript SDK — DirectSolana and EphemeralRollup providers; clients for identity, tweets, DMs, profiles, channels, bookmarks, polls, events, tasks, crowdfunds, tips, search |
| [tribe-hub](../tribe-hub) | Decentralized hub — signed-message storage + Solana indexer + gossip peer sync; REST + WebSocket APIs |
| [tribe-er-server](../tribe-er-server) | Ephemeral Rollup sequencer — instant follows, batched L1 settlement every 10s |
| [tribe-app](../tribe-app) | Next.js frontend — protocol-first reference client with multi-node failover |
| [tribeapp.wtf](../tribeapp.wtf) | Consumer-facing web app + landing page at tribeapp.wtf — hyperlocal social built entirely on the protocol |
| [tribe-ios](../tribe-ios) | Native SwiftUI iOS client (Twitter-shaped) — full read/write against hub + ER, NaCl-box DMs, BLAKE3 + ed25519 signing via Apple CryptoKit |
| [tribe-insta](../tribe-insta) | Native SwiftUI iOS client (Instagram-shaped) — photo grid, stories, reels; same hub + envelope format as tribe-ios. Scaffolding stage — see `tribe-insta/PLAN.md` |
| [tribe-core-swift](../tribe-core-swift) | Shared Swift package consumed by tribe-ios + tribe-insta — crypto (BLAKE3, NaCl box, ed25519 signing, BIP39, SolanaHD), backup file format, envelope signer. See `tribe-core-swift/MIGRATION.md` |
| [homebrew-tap](../homebrew-tap) | Homebrew formulas: `brew install tribe` (hub + ER) and `brew install tribe-app` (demo UI) |
## License

MIT
