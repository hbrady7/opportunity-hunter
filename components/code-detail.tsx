"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { agentPost, AgentError } from "@/lib/client";
import { ClaimCard } from "./claim-card";
import { Label, Chip, Stamp, Spinner } from "./ui";
import { AgentErrorView } from "./agents/agent-error";
import { VERIFY_STAMP, SERVICE_LINE_LABELS } from "@/lib/constants";
import { formatUSD, formatNumber, relativeTime } from "@/lib/utils";
import type { Research } from "@/lib/types";
import { X, RefreshCw, BadgeCheck, Calculator, Trash2, Search } from "lucide-react";

export function CodeDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const entry = useStore((s) => s.codes.find((c) => c.id === id));
  const isExcluded = useStore((s) => s.isExcluded);
  const upsertResearch = useStore((s) => s.upsertResearch);
  const setNotes = useStore((s) => s.setNotes);
  const setUserFigures = useStore((s) => s.setUserFigures);
  const removeCode = useStore((s) => s.removeCode);
  const removeScenario = useStore((s) => s.removeScenario);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AgentError | null>(null);
  const [qty, setQty] = useState("");
  const [charges, setCharges] = useState("");

  useEffect(() => {
    if (entry) {
      setQty(entry.userQty != null ? String(entry.userQty) : "");
      setCharges(entry.userCharges != null ? String(entry.userCharges) : "");
    }
  }, [entry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  if (!entry) return null;

  async function research(force: boolean) {
    if (!entry) return;
    setLoading(true);
    setError(null);
    try {
      const data = await agentPost<{ research: Research; usedWebSearch: boolean }>("/api/research", {
        code: entry.code,
        serviceLine: entry.serviceLine,
      });
      upsertResearch(entry.code, entry.serviceLine, {
        ...data.research,
        usedWebSearch: data.usedWebSearch,
        researchedAt: Date.now(),
      });
    } catch (e) {
      setError(e instanceof AgentError ? e : new AgentError("agent_error", "Research failed."));
    } finally {
      setLoading(false);
    }
  }

  function saveFigures() {
    setUserFigures(entry!.id, qty ? Number(qty) : null, charges ? Number(charges) : null);
  }

  const excluded = isExcluded(entry.code);

  return (
    <div className="fixed inset-0 z-50 no-print">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full sm:max-w-xl bg-paper border-l border-rule overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-paper/95 backdrop-blur border-b border-rule px-4 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="mono text-lg font-semibold">{entry.code}</span>
            <Chip tone="ink">{SERVICE_LINE_LABELS[entry.serviceLine]}</Chip>
            {excluded && <Chip tone="red">EXCLUDED</Chip>}
          </div>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {error && <AgentErrorView error={error} />}

          {entry.research ? (
            <ClaimCard
              code={entry.code}
              serviceLine={entry.serviceLine}
              research={entry.research}
              excluded={excluded}
            />
          ) : (
            <div className="card-plain border-dashed inset-dashed px-5 py-8 text-center space-y-3">
              <div className="label-mono label-mono-ink">Not researched yet</div>
              <p className="text-sm text-slate">This code is logged as “to research”.</p>
              <button className="btn btn-primary btn-sm mx-auto" disabled={loading} onClick={() => research(false)}>
                {loading ? <Spinner /> : <Search size={13} />} Research now
              </button>
            </div>
          )}

          {/* actions */}
          <div className="flex flex-wrap gap-2">
            {entry.research && (
              <button className="btn btn-sm btn-ghost" disabled={loading} onClick={() => research(true)}>
                {loading ? <Spinner /> : <RefreshCw size={13} />} Re-research
              </button>
            )}
            <Link className="btn btn-sm btn-ghost" href={`/verify?code=${entry.code}`}>
              <BadgeCheck size={13} /> Verify
            </Link>
            <Link className="btn btn-sm btn-ghost" href={`/estimate?code=${entry.code}`}>
              <Calculator size={13} /> Estimate
            </Link>
            <button
              className="btn btn-sm btn-ghost ml-auto text-claim border-claim/40"
              onClick={() => {
                removeCode(entry.id);
                onClose();
              }}
            >
              <Trash2 size={13} /> Remove
            </button>
          </div>

          {/* user figures */}
          <div className="inset-dashed p-3">
            <Label>Your pivot figures</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <Label>Charge quantity</Label>
                <input
                  className="field field-mono mt-1"
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ""))}
                  onBlur={saveFigures}
                />
              </div>
              <div>
                <Label>Total charges ($)</Label>
                <input
                  className="field field-mono mt-1"
                  inputMode="numeric"
                  value={charges}
                  onChange={(e) => setCharges(e.target.value.replace(/[^0-9.]/g, ""))}
                  onBlur={saveFigures}
                />
              </div>
            </div>
          </div>

          {/* verification */}
          {entry.verification && (
            <div className="card-plain p-4">
              <div className="flex items-center justify-between">
                <Label>Verification</Label>
                <Stamp
                  label={VERIFY_STAMP[entry.verification.result].label}
                  variant={VERIFY_STAMP[entry.verification.result].cls.replace("stamp-", "") as "green" | "amber" | "red"}
                />
              </div>
              <ul className="mt-3 space-y-1.5">
                {entry.verification.criteria.map((c) => (
                  <li key={c.criterionId} className="text-xs flex items-start gap-2">
                    <span
                      className={`mono font-bold ${
                        c.result === "PASS" ? "text-approval" : c.result === "FAIL" ? "text-claim" : "text-amber"
                      }`}
                    >
                      {c.result === "PASS" ? "✓" : c.result === "FAIL" ? "✕" : "?"}
                    </span>
                    <span>
                      <span className={c.hardGate ? "font-semibold" : ""}>{c.label}</span>
                      {c.evidence && <span className="text-slate"> — {c.evidence}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* scenarios */}
          {entry.scenarios.length > 0 && (
            <div className="card-plain p-4">
              <Label>Saved estimates</Label>
              <div className="mt-2 space-y-2">
                {entry.scenarios.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm border-b border-rule pb-2 last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="mono text-xs text-slate">
                        {formatUSD(s.low)} · <span className="text-ink font-semibold">{formatUSD(s.base)}</span> · {formatUSD(s.high)}
                      </div>
                    </div>
                    <button className="text-slate hover:text-claim" onClick={() => removeScenario(entry.id, s.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* notes */}
          <div>
            <Label>Notes</Label>
            <textarea
              className="field mt-1.5 min-h-24 resize-y"
              placeholder="Anything to remember about this code…"
              defaultValue={entry.notes}
              onBlur={(e) => setNotes(entry.id, e.target.value)}
            />
          </div>

          {/* timeline */}
          {entry.timeline.length > 0 && (
            <div>
              <Label>Timeline</Label>
              <ul className="mt-2 space-y-1.5">
                {entry.timeline.map((t) => (
                  <li key={t.id} className="text-xs flex items-baseline gap-2">
                    <span className="mono text-slate w-16 shrink-0">{relativeTime(t.at)}</span>
                    <span>{t.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-[10px] text-slate mono pt-2">
            QTY {formatNumber(entry.userQty)} · CHARGES {entry.userCharges != null ? formatUSD(entry.userCharges) : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
