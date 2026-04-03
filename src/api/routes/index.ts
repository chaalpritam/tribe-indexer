import { FastifyInstance } from "fastify";
import { userRoutes } from "./users";
import { socialRoutes } from "./social";
import { feedRoutes } from "./feed";
import { notificationRoutes } from "./notifications";
import { bookmarkRoutes } from "./bookmarks";
import { retweetRoutes } from "./retweets";
import { healthRoutes } from "./health";

export function registerRoutes(server: FastifyInstance) {
  server.register(healthRoutes);
  server.register(userRoutes, { prefix: "/v1" });
  server.register(socialRoutes, { prefix: "/v1" });
  server.register(feedRoutes, { prefix: "/v1" });
  server.register(notificationRoutes, { prefix: "/v1" });
  server.register(bookmarkRoutes, { prefix: "/v1" });
  server.register(retweetRoutes, { prefix: "/v1" });
}
