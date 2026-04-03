import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the database before any imports that use it
vi.mock("../src/storage/db", () => ({
  db: { query: vi.fn(), on: vi.fn() },
  runMigrations: vi.fn(),
}));

// Mock @solana/web3.js Connection to avoid real network calls
vi.mock("@solana/web3.js", async () => {
  const actual = await vi.importActual<typeof import("@solana/web3.js")>("@solana/web3.js");
  return {
    ...actual,
    Connection: vi.fn().mockImplementation(() => ({
      getAccountInfo: vi.fn().mockResolvedValue(null),
    })),
  };
});

import { db } from "../src/storage/db";
import { buildApiServer } from "../src/api/server";
import type { FastifyInstance } from "fastify";

const mockQuery = db.query as ReturnType<typeof vi.fn>;

let server: FastifyInstance;

beforeEach(async () => {
  vi.clearAllMocks();
  server = await buildApiServer();
  await server.ready();
});

afterEach(async () => {
  await server.close();
});

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
describe("GET /health", () => {
  it("returns ok status", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ source: "solana", last_slot: 100, last_timestamp: "2025-01-01", updated_at: "2025-01-01" }],
    });

    const res = await server.inject({ method: "GET", url: "/health" });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.status).toBe("ok");
    expect(body).toHaveProperty("timestamp");
    expect(body).toHaveProperty("sync");
  });
});

// ---------------------------------------------------------------------------
// Feed routes
// ---------------------------------------------------------------------------
describe("GET /v1/feed", () => {
  it("returns tweets array", async () => {
    const mockTweets = [
      { hash: "abc123", tid: "1", text: "Hello world", timestamp: "2025-01-01T00:00:00Z", username: "alice" },
      { hash: "def456", tid: "2", text: "Goodbye", timestamp: "2025-01-01T01:00:00Z", username: "bob" },
    ];
    mockQuery.mockResolvedValueOnce({ rows: mockTweets });

    const res = await server.inject({ method: "GET", url: "/v1/feed" });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body).toHaveProperty("tweets");
    expect(Array.isArray(body.tweets)).toBe(true);
    expect(body.tweets).toHaveLength(2);
    expect(body.tweets[0].hash).toBe("abc123");
  });

  it("returns empty array when no tweets", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await server.inject({ method: "GET", url: "/v1/feed" });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.tweets).toEqual([]);
  });

  it("respects limit query param", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await server.inject({ method: "GET", url: "/v1/feed?limit=5" });

    // The first argument to db.query should contain LIMIT $1, and the params should include 5
    const callArgs = mockQuery.mock.calls[0];
    expect(callArgs[1]).toContain(5);
  });
});

describe("GET /v1/feed/:tid", () => {
  it("returns user feed for a given tid", async () => {
    const mockTweets = [
      { hash: "aaa", tid: "42", text: "User tweet", timestamp: "2025-06-01T00:00:00Z", username: "charlie" },
    ];
    mockQuery.mockResolvedValueOnce({ rows: mockTweets });

    const res = await server.inject({ method: "GET", url: "/v1/feed/42" });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.tweets).toHaveLength(1);
    expect(body.tweets[0].tid).toBe("42");
  });

  it("returns empty tweets for unknown tid", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await server.inject({ method: "GET", url: "/v1/feed/99999" });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.tweets).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// User routes
// ---------------------------------------------------------------------------
describe("GET /v1/users", () => {
  it("returns users list with total count", async () => {
    const mockUsers = [
      { tid: "1", custody_address: "Addr1", recovery_address: "Rec1", username: "alice", following_count: 5, followers_count: 10 },
      { tid: "2", custody_address: "Addr2", recovery_address: "Rec2", username: "bob", following_count: 3, followers_count: 7 },
    ];
    // First call: user list query; second call: count query
    mockQuery.mockResolvedValueOnce({ rows: mockUsers });
    mockQuery.mockResolvedValueOnce({ rows: [{ total: 2 }] });

    const res = await server.inject({ method: "GET", url: "/v1/users" });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body).toHaveProperty("users");
    expect(body).toHaveProperty("total");
    expect(body.users).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it("returns empty list when no users", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{ total: 0 }] });

    const res = await server.inject({ method: "GET", url: "/v1/users" });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.users).toEqual([]);
    expect(body.total).toBe(0);
  });
});

describe("GET /v1/user/:tid", () => {
  it("returns user when found", async () => {
    const mockUser = {
      tid: "1",
      custody_address: "CustAddr",
      recovery_address: "RecAddr",
      username: "alice",
      following_count: 5,
      followers_count: 10,
    };
    mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

    const res = await server.inject({ method: "GET", url: "/v1/user/1" });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.tid).toBe("1");
    expect(body.username).toBe("alice");
  });

  it("returns 404 when user not found and backfill fails", async () => {
    // First query returns empty (user not found)
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // backfillTid will call Connection.getAccountInfo which returns null (mocked above)
    // so backfill returns false, then handler sends 404

    const res = await server.inject({ method: "GET", url: "/v1/user/99999" });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(404);
    expect(body.error).toBe("User not found");
  });
});

// ---------------------------------------------------------------------------
// Social routes
// ---------------------------------------------------------------------------
describe("GET /v1/followers/:tid", () => {
  it("returns followers array", async () => {
    const mockFollowers = [
      { follower_tid: "2", created_at: "2025-01-01", username: "bob", custody_address: "Addr2" },
      { follower_tid: "3", created_at: "2025-01-02", username: "charlie", custody_address: "Addr3" },
    ];
    mockQuery.mockResolvedValueOnce({ rows: mockFollowers });

    const res = await server.inject({ method: "GET", url: "/v1/followers/1" });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body).toHaveProperty("followers");
    expect(Array.isArray(body.followers)).toBe(true);
    expect(body.followers).toHaveLength(2);
    expect(body.followers[0].follower_tid).toBe("2");
  });

  it("returns empty array when no followers", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await server.inject({ method: "GET", url: "/v1/followers/1" });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.followers).toEqual([]);
  });
});

describe("GET /v1/following/:tid", () => {
  it("returns following array", async () => {
    const mockFollowing = [
      { following_tid: "5", created_at: "2025-02-01", username: "dave", custody_address: "Addr5" },
    ];
    mockQuery.mockResolvedValueOnce({ rows: mockFollowing });

    const res = await server.inject({ method: "GET", url: "/v1/following/1" });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body).toHaveProperty("following");
    expect(Array.isArray(body.following)).toBe(true);
    expect(body.following).toHaveLength(1);
    expect(body.following[0].following_tid).toBe("5");
  });

  it("returns empty array when not following anyone", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await server.inject({ method: "GET", url: "/v1/following/1" });
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.following).toEqual([]);
  });
});
