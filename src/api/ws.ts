import { FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import { WebSocket } from "ws";

/**
 * Connected clients, keyed by TID for targeted notifications.
 * Clients without a TID subscription receive only broadcast events.
 */
const MAX_CLIENT_CONNECTIONS = 10_000;

interface Client {
  ws: WebSocket;
  tid: string | null;
}

const clients = new Set<Client>();

/**
 * Broadcast an event to ALL connected clients.
 */
export function broadcast(event: string, data: unknown): void {
  const message = JSON.stringify({ event, data });
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}

/**
 * Send an event to a specific TID's connected clients.
 * Used for notifications, DMs, and other user-targeted updates.
 */
export function sendToTid(tid: string, event: string, data: unknown): void {
  const message = JSON.stringify({ event, data });
  for (const client of clients) {
    if (client.tid === tid && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}

/**
 * Register the /v1/ws WebSocket endpoint.
 *
 * Clients can subscribe to a TID by sending: { "subscribe": "<tid>" }
 * Events:
 *   - "new_tweet"        (broadcast to all)
 *   - "new_follow"       (broadcast to all)
 *   - "notification"     (targeted to specific TID)
 *   - "feed_update"      (broadcast to all)
 */
export async function registerWebSocket(server: FastifyInstance): Promise<void> {
  await server.register(websocket);

  server.get("/v1/ws", { websocket: true }, (socket) => {
    if (clients.size >= MAX_CLIENT_CONNECTIONS) {
      socket.close(1013, "Too many connections");
      return;
    }
    const client: Client = { ws: socket, tid: null };
    clients.add(client);

    // Allow clients to subscribe to a TID for targeted notifications
    socket.on("message", (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.subscribe && typeof msg.subscribe === "string") {
          client.tid = msg.subscribe;
          socket.send(JSON.stringify({ event: "subscribed", data: { tid: client.tid } }));
        }
      } catch {
        // Ignore malformed messages
      }
    });

    socket.on("close", () => {
      clients.delete(client);
    });

    socket.on("error", () => {
      clients.delete(client);
    });

    socket.send(JSON.stringify({ event: "connected", data: { clients: clients.size } }));
  });
}
