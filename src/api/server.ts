import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerRoutes } from "./routes";

export async function buildApiServer() {
  const server = Fastify({ logger: true });
  await server.register(cors, { origin: true });
  registerRoutes(server);
  return server;
}
