// Simple in-memory per-IP limiter. Good enough for a demo: it resets when the
// serverless instance recycles, and over-limit callers quietly get demo mode.
const WINDOW_MS = 60 * 60 * 1000;
export const LIMIT_PER_HOUR = 10;

const hits = new Map<string, number[]>();

export function allowLive(ip: string, now = Date.now()): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT_PER_HOUR) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  // Keep the map from growing without bound.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return true;
}
