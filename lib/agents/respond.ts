import { hasApiKey } from "./llm";
import { checkRateLimit, getClientIp, maybePrune } from "./rate-limit";

export type GuardFail = { response: Response };

/**
 * Shared front-gate for every agent route: key check + rate limit.
 * Returns a Response to short-circuit, or null to proceed.
 */
export function guard(req: Request): Response | null {
  if (!hasApiKey()) {
    return Response.json(
      { error: "key_missing", message: "API key not configured on the server." },
      { status: 503 }
    );
  }
  maybePrune();
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return Response.json(
      {
        error: "rate_limited",
        message: `You've hit the hourly limit (20 requests). Try again in about ${rl.retryAfterMin} minute${
          rl.retryAfterMin === 1 ? "" : "s"
        }.`,
      },
      { status: 429 }
    );
  }
  return null;
}

export function ok(data: unknown): Response {
  return Response.json(data, { status: 200 });
}

export function fail(message: string, status = 500): Response {
  return Response.json({ error: "agent_error", message }, { status });
}
