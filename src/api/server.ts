import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerRoutes } from "./routes";
import { registerWebSocket } from "./ws";

export async function buildApiServer() {
  const server = Fastify({ logger: true });
  await server.register(cors, { origin: true });
  await registerWebSocket(server);
  registerRoutes(server);
  return server;
}
