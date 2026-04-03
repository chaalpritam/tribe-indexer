import { config } from "../config";
import { processTweet } from "../processors/tweet-processor";

let lastTimestamp = 0;

/**
 * Poll the tweet server for new messages.
 * TODO: Replace with WebSocket/SSE push when tweet server supports it.
 */
export function startTweetListener() {
  const poll = async () => {
    try {
      const res = await fetch(`${config.tweetServerUrl}/v1/tweetsByTid/0?limit=50`);
      if (!res.ok) return;

      const data = (await res.json()) as { tweets?: { hash: string; tid: string; text: string; parent_hash?: string; channel_id?: string; mentions?: string[]; embeds?: string[]; timestamp: string }[] };
      for (const tweet of data.tweets || []) {
        const ts = new Date(tweet.timestamp).getTime();
        if (ts > lastTimestamp) {
          await processTweet(tweet);
          lastTimestamp = ts;
        }
      }
    } catch (err) {
      console.error("Tweet listener poll error:", err);
    }
  };

  setInterval(poll, config.tweetPollIntervalMs);
  console.log(`Tweet listener polling every ${config.tweetPollIntervalMs}ms`);
}
