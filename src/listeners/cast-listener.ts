import { config } from "../config";
import { processCast } from "../processors/cast-processor";

let lastTimestamp = 0;

/**
 * Poll the cast server for new messages.
 * TODO: Replace with WebSocket/SSE push when cast server supports it.
 */
export function startCastListener() {
  const poll = async () => {
    try {
      const res = await fetch(`${config.castServerUrl}/v1/castsByFid/0?limit=50`);
      if (!res.ok) return;

      const data = await res.json();
      for (const cast of data.casts || []) {
        const ts = new Date(cast.timestamp).getTime();
        if (ts > lastTimestamp) {
          await processCast(cast);
          lastTimestamp = ts;
        }
      }
    } catch (err) {
      console.error("Cast listener poll error:", err);
    }
  };

  setInterval(poll, config.castPollIntervalMs);
  console.log(`Cast listener polling every ${config.castPollIntervalMs}ms`);
}
