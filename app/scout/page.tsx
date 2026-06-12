"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, EmptyState, Label, Spinner, Chip, KeyMissing, FallbackNote } from "@/components/ui";
import { AgentErrorView } from "@/components/agents/agent-error";
import { useStore } from "@/lib/store";
import { useHydrated, useApiStatus, agentPost, AgentError } from "@/lib/client";
import { SERVICE_LINES, SERVICE_LINE_LABELS, type ServiceLine } from "@/lib/constants";
import type { ScoutCandidate } from "@/lib/types";
import { Compass, Telescope, Plus, Search, Check } from "lucide-react";

export default function ScoutPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const api = useApiStatus();
  const codes = useStore((s) => s.codes);
  const isExcluded = useStore((s) => s.isExcluded);
  const quickAdd = useStore((s) => s.quickAdd);

  const [serviceLine, setServiceLine] = useState<ServiceLine>("ED");
  const [focus, setFocus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AgentError | null>(null);
  const [candidates, setCandidates] = useState<ScoutCandidate[] | null>(null);
  const [usedWeb, setUsedWeb] = useState(true);
  const [savedCodes, setSavedCodes] = useState<Set<string>>(new Set());

  async function run() {
    setLoading(true);
    setError(null);
    setCandidates(null);
    setSavedCodes(new Set());
    try {
      const data = await agentPost<{ candidates: ScoutCandidate[]; usedWebSearch: boolean }>("/api/scout", {
        serviceLine,
        focus,
      });
      setUsedWeb(data.usedWebSearch);
      // dedupe against library + exclusion list
      const known = new Set(codes.map((c) => c.code));
      setCandidates(
        data.candidates.filter((c) => !known.has(c.code) && !isExcluded(c.code))
      );
    } catch (e) {
      setError(e instanceof AgentError ? e : new AgentError("agent_error", "Scout failed."));
    } finally {
      setLoading(false);
    }
  }

  function saveCandidate(c: ScoutCandidate) {
    quickAdd(c.code, serviceLine, null, null);
    setSavedCodes((prev) => new Set(prev).add(c.code));
  }

  function researchNow(c: ScoutCandidate) {
    router.push(`/?code=${c.code}&sl=${encodeURIComponent(serviceLine)}&run=1`);
  }

  return (
    <div>
      <PageHeader
        field="5 · SCOUT"
        title="Scout net-new"
        subtitle="Surface emerging or under-captured outpatient procedures by service line, deduped against your Library."
      />

      <div className="card-plain p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Service line</Label>
            <select className="field mt-1.5" value={serviceLine} onChange={(e) => setServiceLine(e.target.value as ServiceLine)}>
              {SERVICE_LINES.map((s) => <option key={s} value={s}>{SERVICE_LINE_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <Label>Focus note — optional</Label>
            <input
              className="field mt-1.5"
              placeholder="e.g. infusion under-capture, new LARC devices"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
            />
          </div>
        </div>
        <button className="btn btn-primary w-full sm:w-auto" disabled={loading} onClick={run}>
          {loading ? <Spinner /> : <Telescope size={14} />}
          {loading ? "Scouting…" : "Scout opportunities"}
        </button>
      </div>

      {!api.loading && !api.keyConfigured && !candidates && <div className="mt-5"><KeyMissing /></div>}
      {error && <div className="mt-5"><AgentErrorView error={error} /></div>}

      {candidates && (
        <div className="mt-5 space-y-3">
          {!usedWeb && <FallbackNote message="Candidates based on model knowledge — verify each before relying on it." />}
          {candidates.length === 0 ? (
            <EmptyState
              icon={<Compass size={26} strokeWidth={1.6} />}
              title="Nothing new surfaced"
              body="Every candidate was already in your Library or on your exclusion list. Try a different focus note or service line."
            />
          ) : (
            candidates.map((c) => {
              const saved = savedCodes.has(c.code);
              return (
                <div key={c.code} className="card-claim p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="mono text-lg font-semibold">{c.code}</span>
                        <Chip tone="ink">{c.name}</Chip>
                      </div>
                      <p className="text-sm mt-1.5 text-slate">{c.whyNow}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 no-print">
                    <button className="btn btn-sm" disabled={saved} onClick={() => saveCandidate(c)}>
                      {saved ? <Check size={13} /> : <Plus size={13} />} {saved ? "Saved as candidate" : "Save as candidate"}
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={() => researchNow(c)}>
                      <Search size={13} /> Research now
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {!candidates && !error && !loading && (api.loading || api.keyConfigured) && (
        <div className="mt-5">
          <EmptyState
            icon={<Compass size={26} strokeWidth={1.6} />}
            title="Find what you're not looking at"
            body="Pick a service line and let the companion surface under-adopted procedures. Save promising ones as candidates to research later."
          />
        </div>
      )}
      {hydrated && codes.length > 0 && (
        <p className="text-[10px] text-slate mt-4 mono">Deduped against {codes.length} saved code(s) + your exclusion list.</p>
      )}
    </div>
  );
}
