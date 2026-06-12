"use client";

import { useEffect, useState } from "react";
import { useStore } from "./store";

/** True once Zustand has rehydrated from localStorage (avoids SSR/CSR mismatch). */
export function useHydrated(): boolean {
  const hydrated = useStore((s) => s.hydrated);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted && hydrated;
}

export interface ApiStatus {
  loading: boolean;
  keyConfigured: boolean;
  model: string | null;
}

export function useApiStatus(): ApiStatus {
  const [status, setStatus] = useState<ApiStatus>({
    loading: true,
    keyConfigured: false,
    model: null,
  });
  useEffect(() => {
    let alive = true;
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => {
        if (alive) setStatus({ loading: false, keyConfigured: !!d.keyConfigured, model: d.model ?? null });
      })
      .catch(() => {
        if (alive) setStatus({ loading: false, keyConfigured: false, model: null });
      });
    return () => {
      alive = false;
    };
  }, []);
  return status;
}

export class AgentError extends Error {
  kind: "key_missing" | "rate_limited" | "agent_error" | "network";
  constructor(kind: AgentError["kind"], message: string) {
    super(message);
    this.kind = kind;
  }
}

/** POST to an agent route; throws AgentError with a friendly message on failure. */
export async function agentPost<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AgentError("network", "Network error — check your connection and try again.");
  }
  if (!res.ok) {
    let data: { error?: string; message?: string } = {};
    try {
      data = await res.json();
    } catch {
      /* ignore */
    }
    const kind =
      data.error === "key_missing"
        ? "key_missing"
        : data.error === "rate_limited"
        ? "rate_limited"
        : "agent_error";
    throw new AgentError(
      kind as AgentError["kind"],
      data.message || `Request failed (${res.status}).`
    );
  }
  return (await res.json()) as T;
}
