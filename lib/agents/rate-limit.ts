import { RATE_LIMIT } from "@/lib/constants";

// In-memory per-IP sliding window. Resets on server restart — fine for an
// open-URL hobby deployment; not meant to be bulletproof.
const HOUR = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfterMin: number;
}

export function checkRateLimit(ip: string): RateResult {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < HOUR);
  if (arr.length >= RATE_LIMIT.maxPerHour) {
    const oldest = arr[0];
    const retryAfterMin = Math.max(1, Math.ceil((HOUR - (now - oldest)) / 60000));
    hits.set(ip, arr);
    return { ok: false, remaining: 0, retryAfterMin };
  }
  arr.push(now);
  hits.set(ip, arr);
  return { ok: true, remaining: RATE_LIMIT.maxPerHour - arr.length, retryAfterMin: 0 };
}

// Occasionally prune to avoid unbounded growth.
let lastPrune = 0;
export function maybePrune() {
  const now = Date.now();
  if (now - lastPrune < HOUR) return;
  lastPrune = now;
  for (const [ip, arr] of hits) {
    const fresh = arr.filter((t) => now - t < HOUR);
    if (fresh.length === 0) hits.delete(ip);
    else hits.set(ip, fresh);
  }
}
