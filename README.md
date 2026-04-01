# Tribe Indexer

Event indexer + read API for [Tribe Protocol](../tribe-protocol). Listens to on-chain events and cast server messages, aggregates into Postgres for fast queries.

## Architecture

```
Solana Programs ──(WebSocket logs)──► Solana Listener ──► Processors ──► Postgres
Cast Server ────(HTTP poll)─────────► Cast Listener ───► Processors ──► Postgres
                                                                            │
                                                              REST API ◄────┘
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/user/:fid` | User profile + follower counts |
| GET | `/v1/user/by-username/:name` | Lookup by username |
| GET | `/v1/followers/:fid` | Paginated followers |
| GET | `/v1/following/:fid` | Paginated following |
| GET | `/v1/feed/:fid` | User's cast feed |
| GET | `/v1/feed/channel/:channelId` | Channel feed |
| GET | `/health` | Health + sync status per source |

## Setup

### Docker (recommended)

```bash
docker-compose up
```

### Manual

```bash
# Start Postgres, create database: tribe_indexer
psql $DATABASE_URL -f src/storage/migrations/001_initial.sql

pnpm install
cp .env.example .env  # edit as needed
pnpm dev
```

## Configuration

See `.env.example` for all environment variables.

## Related Repos

- [tribe-protocol](../tribe-protocol) — Solana programs (Anchor)
- [tribe-sdk](../tribe-sdk) — TypeScript SDK
- [tribe-cast-server](../tribe-cast-server) — Cast message server

## License

MIT
