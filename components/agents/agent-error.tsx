"use client";

import { AgentError } from "@/lib/client";
import { KeyMissing } from "@/components/ui";
import { AlertTriangle, Clock } from "lucide-react";

export function AgentErrorView({ error }: { error: AgentError }) {
  if (error.kind === "key_missing") return <KeyMissing />;
  const Icon = error.kind === "rate_limited" ? Clock : AlertTriangle;
  const tone = error.kind === "rate_limited" ? "text-amber border-amber/40 bg-amber/5" : "text-claim border-claim/40 bg-claim/5";
  return (
    <div className={`card-plain border rounded-[2px] px-4 py-3 flex items-start gap-3 text-sm ${tone}`}>
      <Icon size={18} className="shrink-0 mt-0.5" />
      <div>
        <div className="label-mono mb-0.5" style={{ color: "inherit" }}>
          {error.kind === "rate_limited" ? "Rate limit reached" : "Something went wrong"}
        </div>
        <p>{error.message}</p>
      </div>
    </div>
  );
}
