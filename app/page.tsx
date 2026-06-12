"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, EmptyState, Label, Spinner } from "@/components/ui";
import { ClaimCard } from "@/components/claim-card";
import { AgentErrorView } from "@/components/agents/agent-error";
import { useStore } from "@/lib/store";
import { useHydrated, useApiStatus, agentPost, AgentError } from "@/lib/client";
import { isValidCode, normalizeCode } from "@/lib/utils";
import { SERVICE_LINES, SERVICE_LINE_LABELS, type ServiceLine } from "@/lib/constants";
import type { Research } from "@/lib/types";
import { KeyMissing } from "@/components/ui";
import { Crosshair, Search, Save, BadgeCheck, Calculator, Check } from "lucide-react";

export default function HuntPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const api = useApiStatus();
  const upsertResearch = useStore((s) => s.upsertResearch);
  const isExcluded = useStore((s) => s.isExcluded);

  const [code, setCode] = useState("");
  const [serviceLine, setServiceLine] = useState<ServiceLine>("ED");
  const [qty, setQty] = useState("");
  const [charges, setCharges] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AgentError | null>(null);
  const [result, setResult] = useState<{ code: string; serviceLine: ServiceLine; research: Research } | null>(null);
  const [saved, setSaved] = useState(false);

  const valid = isValidCode(code);

  async function run() {
    if (!valid) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);
    const c = normalizeCode(code);
    try {
      const data = await agentPost<{ research: Research; usedWebSearch: boolean }>("/api/research", {
        code: c,
        serviceLine,
      });
      setResult({
        code: c,
        serviceLine,
        research: { ...data.research, usedWebSearch: data.usedWebSearch, researchedAt: Date.now() },
      });
    } catch (e) {
      setError(e instanceof AgentError ? e : new AgentError("agent_error", "Research failed."));
    } finally {
      setLoading(false);
    }
  }

  function save() {
    if (!result) return;
    upsertResearch(result.code, result.serviceLine, result.research, {
      userQty: qty ? Number(qty) : null,
      userCharges: charges ? Number(charges) : null,
    });
    setSaved(true);
  }

  function goVerify() {
    if (result) save();
    router.push(`/verify?code=${result?.code}`);
  }
  function goEstimate() {
    if (result) save();
    router.push(`/estimate?code=${result?.code}`);
  }

  return (
    <div>
      <PageHeader
        field="1 · HUNT"
        title="Hunt a code"
        subtitle="Enter a CPT/HCPCS code; the companion researches it against CMS sources and returns a claim-style card."
      />

      {/* input form */}
      <div className="card-plain p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>CPT / HCPCS code</Label>
            <input
              className="field field-mono mt-1.5 text-lg"
              placeholder="e.g. 99284"
              value={code}
              maxLength={5}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && run()}
            />
            {code && !valid && (
              <p className="text-xs text-claim mt-1">5-digit CPT or letter+4-digit HCPCS.</p>
            )}
          </div>
          <div>
            <Label>Service line</Label>
            <select
              className="field mt-1.5"
              value={serviceLine}
              onChange={(e) => setServiceLine(e.target.value as ServiceLine)}
            >
              {SERVICE_LINES.map((s) => (
                <option key={s} value={s}>
                  {SERVICE_LINE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="inset-dashed p-3">
          <Label>Your pivot figures — optional</Label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <Label>Charge quantity</Label>
              <input
                className="field field-mono mt-1"
                inputMode="numeric"
                placeholder="e.g. 1240"
                value={qty}
                onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
            <div>
              <Label>Total charges ($)</Label>
              <input
                className="field field-mono mt-1"
                inputMode="numeric"
                placeholder="e.g. 980000"
                value={charges}
                onChange={(e) => setCharges(e.target.value.replace(/[^0-9.]/g, ""))}
              />
            </div>
          </div>
        </div>

        <button className="btn btn-primary w-full sm:w-auto" disabled={!valid || loading} onClick={run}>
          {loading ? <Spinner /> : <Search size={14} />}
          {loading ? "Researching…" : "Research code"}
        </button>
      </div>

      {/* key-missing notice (only if checked and missing, and no result) */}
      {!api.loading && !api.keyConfigured && !result && (
        <div className="mt-5">
          <KeyMissing />
        </div>
      )}

      {/* error */}
      {error && (
        <div className="mt-5">
          <AgentErrorView error={error} />
        </div>
      )}

      {/* result */}
      {result && (
        <div className="mt-5">
          <ClaimCard
            code={result.code}
            serviceLine={result.serviceLine}
            research={result.research}
            excluded={hydrated && isExcluded(result.code)}
            actions={
              <>
                <button className="btn btn-sm" onClick={save}>
                  {saved ? <Check size={13} /> : <Save size={13} />}
                  {saved ? "Saved" : "Save to Library"}
                </button>
                <button className="btn btn-sm btn-ghost" onClick={goVerify}>
                  <BadgeCheck size={13} /> Verify
                </button>
                <button className="btn btn-sm btn-ghost" onClick={goEstimate}>
                  <Calculator size={13} /> Estimate
                </button>
              </>
            }
          />
        </div>
      )}

      {/* empty state */}
      {!result && !error && !loading && (api.loading || api.keyConfigured) && (
        <div className="mt-5">
          <EmptyState
            icon={<Crosshair size={26} strokeWidth={1.6} />}
            title="Start the loop"
            body="Enter a high-volume code from your pivot table. Save it, verify it against your criteria, then estimate the opportunity."
          />
        </div>
      )}
    </div>
  );
}
