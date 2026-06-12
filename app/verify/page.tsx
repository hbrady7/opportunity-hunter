"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader, Label, Spinner, Stamp, KeyMissing, EmptyState } from "@/components/ui";
import { CriteriaEditor } from "@/components/criteria-editor";
import { AgentErrorView } from "@/components/agents/agent-error";
import { useStore } from "@/lib/store";
import { useHydrated, useApiStatus, agentPost, AgentError } from "@/lib/client";
import { scoreVerification } from "@/lib/verify";
import { isValidCode, normalizeCode } from "@/lib/utils";
import { SERVICE_LINES, SERVICE_LINE_LABELS, VERIFY_STAMP, type ServiceLine } from "@/lib/constants";
import type { CriterionEvalResult, Verification } from "@/lib/types";
import { BadgeCheck, Play, SlidersHorizontal, Check } from "lucide-react";

function VerifyInner() {
  const params = useSearchParams();
  const hydrated = useHydrated();
  const api = useApiStatus();

  const criteria = useStore((s) => s.criteria);
  const codes = useStore((s) => s.codes);
  const isExcluded = useStore((s) => s.isExcluded);
  const quickAdd = useStore((s) => s.quickAdd);
  const setVerification = useStore((s) => s.setVerification);

  const [code, setCode] = useState("");
  const [serviceLine, setServiceLine] = useState<ServiceLine>("ED");
  const [showCriteria, setShowCriteria] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AgentError | null>(null);
  const [result, setResult] = useState<Verification | null>(null);
  const [saved, setSaved] = useState(false);

  // prefill from query
  useEffect(() => {
    const q = params.get("code");
    if (q && isValidCode(q)) {
      const c = normalizeCode(q);
      setCode(c);
      const entry = codes.find((e) => e.code === c);
      if (entry) setServiceLine(entry.serviceLine);
    }
  }, [params, codes]);

  const valid = isValidCode(code);

  async function run() {
    if (!valid) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);
    const c = normalizeCode(code);
    const entry = codes.find((e) => e.code === c);
    const knownRate = entry?.research?.medicareRate ?? null;
    const enabled = criteria.filter((cr) => cr.enabled);

    // criteria we send to the agent
    const agentCriteria = enabled.filter((cr) => {
      if (!cr.agentEvaluable) return false;
      if (cr.thresholdKind === "minMedicareRate" && knownRate != null) return false; // computed locally
      return true;
    });

    try {
      let agentResults: { id: string; result: "PASS" | "FAIL" | "UNCLEAR"; evidence: string }[] = [];
      let usedWebSearch = false;
      if (agentCriteria.length) {
        const data = await agentPost<{
          results: { id: string; result: "PASS" | "FAIL" | "UNCLEAR"; evidence: string }[];
          usedWebSearch: boolean;
        }>("/api/verify", {
          code: c,
          serviceLine,
          criteria: agentCriteria.map((cr) => ({ id: cr.id, label: cr.label, hardGate: cr.hardGate })),
        });
        agentResults = data.results;
        usedWebSearch = data.usedWebSearch;
      }
      const agentMap = new Map(agentResults.map((r) => [r.id, r]));

      const evaluated: CriterionEvalResult[] = enabled.map((cr) => {
        // local: exclusion gate
        if (!cr.agentEvaluable && cr.builtin) {
          const excl = isExcluded(c);
          return {
            criterionId: cr.id,
            label: cr.label,
            hardGate: cr.hardGate,
            result: excl ? "FAIL" : "PASS",
            evidence: excl ? "On your exclusion list." : "Not on your exclusion list.",
          };
        }
        // local: min rate when known
        if (cr.thresholdKind === "minMedicareRate" && knownRate != null) {
          const pass = knownRate >= (cr.threshold ?? 0);
          return {
            criterionId: cr.id,
            label: cr.label,
            hardGate: cr.hardGate,
            result: pass ? "PASS" : "FAIL",
            evidence: `Known rate $${knownRate.toFixed(2)} vs $${cr.threshold ?? 0} threshold.`,
          };
        }
        // agent
        const a = agentMap.get(cr.id);
        return {
          criterionId: cr.id,
          label: cr.label,
          hardGate: cr.hardGate,
          result: a?.result ?? "UNCLEAR",
          evidence: a?.evidence ?? "No evidence returned.",
        };
      });

      const overall = scoreVerification(evaluated);
      const verification: Verification = {
        result: overall,
        criteria: evaluated,
        usedWebSearch,
        verifiedAt: Date.now(),
      };
      setResult(verification);

      // persist to library
      let id = entry?.id;
      if (!id) id = quickAdd(c, serviceLine, null, null);
      setVerification(id, verification);
      setSaved(true);
    } catch (e) {
      setError(e instanceof AgentError ? e : new AgentError("agent_error", "Verification failed."));
    } finally {
      setLoading(false);
    }
  }

  const excluded = hydrated && valid && isExcluded(normalizeCode(code));

  return (
    <div>
      <PageHeader
        field="3 · VERIFY"
        title="Verify to spec"
        subtitle="Run a code against your own viability criteria. You control every gate; the result is computed deterministically."
      />

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
            {excluded && <p className="text-xs text-claim mt-1">⚠ On your exclusion list — hard gate will fail.</p>}
          </div>
          <div>
            <Label>Service line</Label>
            <select className="field mt-1.5" value={serviceLine} onChange={(e) => setServiceLine(e.target.value as ServiceLine)}>
              {SERVICE_LINES.map((s) => (
                <option key={s} value={s}>{SERVICE_LINE_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" disabled={!valid || loading} onClick={run}>
            {loading ? <Spinner /> : <Play size={14} />}
            {loading ? "Verifying…" : "Run verification"}
          </button>
          <button className="btn btn-ghost" onClick={() => setShowCriteria((v) => !v)}>
            <SlidersHorizontal size={13} /> {showCriteria ? "Hide criteria" : "Edit criteria"}
          </button>
        </div>

        <div className="inset-dashed px-3 py-2 text-xs text-slate">
          {criteria.filter((c) => c.enabled).length} active criteria ·{" "}
          {criteria.filter((c) => c.enabled && c.hardGate).length} hard gate(s). Edit them here or in Settings — they persist.
        </div>
      </div>

      {showCriteria && (
        <div className="mt-4">
          <CriteriaEditor />
        </div>
      )}

      {!api.loading && !api.keyConfigured && !result && (
        <div className="mt-5"><KeyMissing /></div>
      )}
      {error && <div className="mt-5"><AgentErrorView error={error} /></div>}

      {result && (
        <div className="mt-5 card-claim p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="mono text-xl font-semibold">{normalizeCode(code)}</span>
              <div className="label-mono mt-1">{SERVICE_LINE_LABELS[serviceLine]}</div>
            </div>
            <Stamp
              label={VERIFY_STAMP[result.result].label}
              variant={VERIFY_STAMP[result.result].cls.replace("stamp-", "") as "green" | "amber" | "red"}
            />
          </div>
          {!result.usedWebSearch && result.criteria.some((c) => c.criterionId !== "c_exclusion") && (
            <div className="mb-3 text-xs text-amber">⚠ Some checks based on model knowledge — verify before client use.</div>
          )}
          <ul className="space-y-2">
            {result.criteria.map((c) => (
              <li key={c.criterionId} className="flex items-start gap-3 border-b border-rule pb-2 last:border-0">
                <span
                  className={`mono font-bold text-lg leading-none mt-0.5 ${
                    c.result === "PASS" ? "text-approval" : c.result === "FAIL" ? "text-claim" : "text-amber"
                  }`}
                >
                  {c.result === "PASS" ? "✓" : c.result === "FAIL" ? "✕" : "?"}
                </span>
                <div className="flex-1">
                  <div className="text-sm flex items-center gap-2">
                    <span className={c.hardGate ? "font-semibold" : ""}>{c.label}</span>
                    {c.hardGate && <span className="chip text-claim">HARD</span>}
                  </div>
                  <div className="text-xs text-slate mt-0.5">{c.evidence}</div>
                </div>
              </li>
            ))}
          </ul>
          {saved && (
            <div className="mt-4 flex items-center gap-1.5 text-xs text-approval">
              <Check size={13} /> Saved to Library entry for {normalizeCode(code)}.
            </div>
          )}
        </div>
      )}

      {!result && !error && !loading && (api.loading || api.keyConfigured) && !showCriteria && (
        <div className="mt-5">
          <EmptyState
            icon={<BadgeCheck size={26} strokeWidth={1.6} />}
            title="Verify against your gates"
            body="Hard gates auto-fail a code; soft criteria need a 75% pass rate to reach VERIFIED. Your exclusion list is checked locally."
          />
        </div>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="card-plain h-40 animate-pulse" />}>
      <VerifyInner />
    </Suspense>
  );
}
