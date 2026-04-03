import { config } from "../config";
import { processTweet } from "../processors/tweet-processor";

let lastTimestamp: string | null = null;

/**
 * Poll the tweet server for new messages.
 */
export function startTweetListener() {
  const poll = async () => {
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (lastTimestamp) params.set("after", lastTimestamp);

      const res = await fetch(
        `${config.tweetServerUrl}/v1/tweets/recent?${params}`
      );
      if (!res.ok) return;

      const data = (await res.json()) as {
        tweets?: {
          hash: string;
          tid: string;
          text: string;
          parent_hash?: string;
          channel_id?: string;
          mentions?: string[];
          embeds?: string[];
          timestamp: string;
        }[];
      };

      for (const tweet of data.tweets || []) {
        await processTweet(tweet);
        lastTimestamp = tweet.timestamp;
      }
    } catch (err) {
      console.error("Tweet listener poll error:", err);
    }
  };

  setInterval(poll, config.tweetPollIntervalMs);
  console.log(`Tweet listener polling every ${config.tweetPollIntervalMs}ms`);
}
