"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader, EmptyState, Label, Spinner, KeyMissing } from "@/components/ui";
import { ClaimCard } from "@/components/claim-card";
import { AgentErrorView } from "@/components/agents/agent-error";
import { useStore } from "@/lib/store";
import { useHydrated, useApiStatus, agentPost, AgentError } from "@/lib/client";
import { isValidCode, normalizeCode } from "@/lib/utils";
import { SERVICE_LINES, SERVICE_LINE_LABELS, type ServiceLine } from "@/lib/constants";
import type { Research } from "@/lib/types";
import Link from "next/link";
import { Crosshair, Search, Save, BadgeCheck, Calculator, Check, Table2, ArrowRight } from "lucide-react";

function TomorrowPlan() {
  return (
    <Link
      href="/workbench"
      className="no-print card-plain border-dashed p-3 mb-5 flex items-center gap-3 hover:border-ink transition-colors"
    >
      <Table2 size={18} className="text-claim shrink-0" />
      <div className="min-w-0">
        <div className="label-mono label-mono-ink">Tomorrow&rsquo;s plan</div>
        <p className="text-xs text-slate mt-0.5">
          Download the starter workbook → build the analysis → paste your shortlist back here. Workbench has the whole path.
        </p>
      </div>
      <ArrowRight size={15} className="text-slate ml-auto shrink-0" />
    </Link>
  );
}

function HuntInner() {
  const router = useRouter();
  const params = useSearchParams();
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
  const autoRan = useRef(false);

  // prefill + optional auto-run from query (?code=&sl=&run=1) — e.g. from Scout
  useEffect(() => {
    if (autoRan.current) return;
    const qc = params.get("code");
    const qsl = params.get("sl") as ServiceLine | null;
    if (qc && isValidCode(qc)) {
      autoRan.current = true;
      const c = normalizeCode(qc);
      const sl = qsl && SERVICE_LINES.includes(qsl) ? qsl : serviceLine;
      setCode(c);
      setServiceLine(sl);
      if (params.get("run") === "1") run(c, sl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function run(oc?: string, osl?: ServiceLine) {
    const c = normalizeCode(oc ?? code);
    const sl = osl ?? serviceLine;
    if (!isValidCode(c)) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);
    try {
      const data = await agentPost<{ research: Research; usedWebSearch: boolean }>("/api/research", {
        code: c,
        serviceLine: sl,
      });
      setResult({
        code: c,
        serviceLine: sl,
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

      <TomorrowPlan />

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

        <button className="btn btn-primary w-full sm:w-auto" disabled={!valid || loading} onClick={() => run()}>
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

export default function HuntPage() {
  return (
    <Suspense fallback={<div className="card-plain h-40 animate-pulse" />}>
      <HuntInner />
    </Suspense>
  );
}
