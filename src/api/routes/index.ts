import { FastifyInstance } from "fastify";
import { userRoutes } from "./users";
import { socialRoutes } from "./social";
import { feedRoutes } from "./feed";
import { healthRoutes } from "./health";

export function registerRoutes(server: FastifyInstance) {
  server.register(healthRoutes);
  server.register(userRoutes, { prefix: "/v1" });
  server.register(socialRoutes, { prefix: "/v1" });
  server.register(feedRoutes, { prefix: "/v1" });
}
