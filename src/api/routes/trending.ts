import { FastifyInstance } from "fastify";
import { db } from "../../storage/db";

// Common stop words to exclude from trending
const STOP_WORDS = new Set([
  "the", "a", "an", "is", "it", "to", "in", "on", "of", "for", "and", "or",
  "but", "not", "with", "this", "that", "was", "are", "be", "have", "has",
  "had", "do", "does", "did", "will", "would", "can", "could", "should",
  "may", "might", "i", "you", "he", "she", "we", "they", "my", "your",
  "his", "her", "its", "our", "their", "me", "him", "us", "them", "what",
  "which", "who", "when", "where", "how", "all", "each", "every", "both",
  "few", "more", "most", "other", "some", "such", "no", "nor", "too",
  "very", "just", "about", "up", "out", "so", "if", "than", "then",
  "from", "by", "at", "as", "into", "been", "being", "am", "were",
]);

export async function trendingRoutes(server: FastifyInstance) {
  // Get trending topics (top words from recent tweets)
  server.get<{
    Querystring: { hours?: string; limit?: string };
  }>("/trending", async (request) => {
    const hours = Math.min(parseInt(request.query.hours || "24", 10), 168); // max 7 days
    const limit = Math.min(parseInt(request.query.limit || "10", 10), 30);

    // Get recent tweet texts
    const result = await db.query(
      `SELECT text FROM tweets
       WHERE deleted = false AND timestamp > NOW() - INTERVAL '1 hour' * $1
       ORDER BY timestamp DESC
       LIMIT 500`,
      [hours]
    );

    // Count word frequencies
    const wordCounts = new Map<string, number>();
    for (const row of result.rows) {
      const words = (row.text as string)
        .toLowerCase()
        .replace(/[^a-z0-9#@\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
      }
    }

    // Sort by frequency, return top N
    const trending = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word, count]) => ({ word, count }));

    return { trending, period: `${hours}h`, tweetCount: result.rows.length };
  });

  // Get trending hashtags specifically
  server.get<{
    Querystring: { hours?: string; limit?: string };
  }>("/trending/hashtags", async (request) => {
    const hours = Math.min(parseInt(request.query.hours || "24", 10), 168);
    const limit = Math.min(parseInt(request.query.limit || "10", 10), 30);

    const result = await db.query(
      `SELECT text FROM tweets
       WHERE deleted = false AND text LIKE '%#%'
         AND timestamp > NOW() - INTERVAL '1 hour' * $1
       ORDER BY timestamp DESC
       LIMIT 500`,
      [hours]
    );

    const tagCounts = new Map<string, number>();
    for (const row of result.rows) {
      const tags = (row.text as string).match(/#[a-zA-Z0-9_]+/g) ?? [];
      for (const tag of tags) {
        const lower = tag.toLowerCase();
        tagCounts.set(lower, (tagCounts.get(lower) ?? 0) + 1);
      }
    }

    const hashtags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));

    return { hashtags, period: `${hours}h` };
  });
}
