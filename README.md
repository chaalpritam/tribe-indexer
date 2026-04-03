# Tribe Indexer

Event indexer + read API for [Tribe Protocol](../tribe-protocol). Listens to on-chain events and tweet server messages, aggregates into Postgres for fast queries.

## Architecture

```
Solana Programs ──(WebSocket logs)──► Solana Listener ──► Processors ──► Postgres
Tweet Server ───(HTTP poll)─────────► Tweet Listener ──► Processors ──► Postgres
                                                                            │
                                                              REST API ◄────┘
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/user/:tid` | User profile + follower counts |
| GET | `/v1/user/by-username/:name` | Lookup by username |
| GET | `/v1/followers/:tid` | Paginated followers |
| GET | `/v1/following/:tid` | Paginated following |
| GET | `/v1/feed/:tid` | User's tweet feed |
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
- [tribe-tweet-server](../tribe-tweet-server) — Tweet message server

## License

MIT
