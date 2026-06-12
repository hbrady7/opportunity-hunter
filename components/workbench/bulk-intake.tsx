"use client";

import { useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { useApiStatus, agentPost, AgentError } from "@/lib/client";
import { AgentErrorView } from "@/components/agents/agent-error";
import { Label, Chip, Spinner, KeyMissing } from "@/components/ui";
import { parseRows, inferOrder, applyOrder, MAX_BULK_ROWS, type ColumnOrder } from "@/lib/bulk-parse";
import { SERVICE_LINES, SERVICE_LINE_LABELS, type ServiceLine } from "@/lib/constants";
import { formatUSD, formatNumber, nowMs } from "@/lib/utils";
import type { Research } from "@/lib/types";
import { ClipboardPaste, Check, Search, Square } from "lucide-react";

const PLACEHOLDER = `Paste rows from your Top Codes pivot — CPT, qty, charges:

99284	1,240	$980,000
96413	320	$210,500
G0378	890	$445,000`;

export function BulkIntake({ onClose }: { onClose?: () => void }) {
  const api = useApiStatus();
  const quickAdd = useStore((s) => s.quickAdd);
  const isExcluded = useStore((s) => s.isExcluded);
  const upsertResearch = useStore((s) => s.upsertResearch);
  const getByCode = useStore((s) => s.getByCode);

  const [serviceLine, setServiceLine] = useState<ServiceLine>("ED");
  const [text, setText] = useState("");
  const [orderOverride, setOrderOverride] = useState<ColumnOrder | null>(null);
  const [committed, setCommitted] = useState<string[] | null>(null);

  // research queue
  const [queue, setQueue] = useState<{ running: boolean; done: number; total: number; error: AgentError | null; finished: boolean }>(
    { running: false, done: 0, total: 0, error: null, finished: false }
  );
  const stopRef = useRef(false);

  const parsed = useMemo(() => parseRows(text), [text]);
  const inferred = useMemo(() => inferOrder(parsed.rows), [parsed.rows]);
  const order = orderOverride ?? inferred.order;
  const preview = useMemo(() => applyOrder(parsed.rows, order), [parsed.rows, order]);
  const twoCol = parsed.rows.some((r) => r.b !== null);
  const showPicker = inferred.ambiguous && !orderOverride && parsed.rows.length > 0;

  function statusOf(code: string): { label: string; tone: "red" | "amber" | "green" } {
    if (isExcluded(code)) return { label: "EXCLUDED", tone: "red" };
    if (getByCode(code)) return { label: "updates", tone: "amber" };
    return { label: "new", tone: "green" };
  }

  function commit() {
    for (const r of preview) {
      quickAdd(r.code, serviceLine, r.qty, r.charges);
    }
    // codes that still need research (skip ones with existing research)
    const toResearch = preview.map((r) => r.code).filter((c) => !getByCode(c)?.research);
    setCommitted(Array.from(new Set(toResearch)));
    setQueue({ running: false, done: 0, total: 0, error: null, finished: false });
  }

  async function runQueue(limit: number) {
    if (!committed) return;
    const targets = committed.slice(0, limit);
    stopRef.current = false;
    setQueue({ running: true, done: 0, total: targets.length, error: null, finished: false });
    let done = 0;
    for (const code of targets) {
      if (stopRef.current) break;
      try {
        const data = await agentPost<{ research: Research; usedWebSearch: boolean }>("/api/research", {
          code,
          serviceLine,
        });
        upsertResearch(code, serviceLine, { ...data.research, usedWebSearch: data.usedWebSearch, researchedAt: nowMs() });
        done++;
        setQueue((q) => ({ ...q, done }));
      } catch (e) {
        const err = e instanceof AgentError ? e : new AgentError("agent_error", "Research failed.");
        setQueue((q) => ({ ...q, running: false, error: err, finished: true }));
        return;
      }
    }
    setQueue((q) => ({ ...q, running: false, finished: true }));
  }

  const validCount = preview.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardPaste size={16} className="text-claim" />
        <h2 className="label-mono label-mono-ink text-[11px]">Bulk paste — shortlist intake</h2>
      </div>
      <p className="text-sm text-slate">
        Paste up to {MAX_BULK_ROWS} rows of <span className="mono">CPT · qty · charges</span> straight from your Top Codes pivot
        (tab-separated is most reliable). They land in your Library in a “to research” state.
      </p>

      <div>
        <Label>Service line for this batch</Label>
        <select className="field mt-1.5 sm:!w-64" value={serviceLine} onChange={(e) => setServiceLine(e.target.value as ServiceLine)}>
          {SERVICE_LINES.map((s) => (
            <option key={s} value={s}>{SERVICE_LINE_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <textarea
        className="field field-mono min-h-40 resize-y text-sm"
        placeholder={PLACEHOLDER}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOrderOverride(null);
          setCommitted(null);
        }}
      />

      {parsed.truncated && (
        <p className="text-xs text-amber">⚠ More than {MAX_BULK_ROWS} rows — only the first {MAX_BULK_ROWS} are used (this is a shortlist tool, not ingestion).</p>
      )}
      {parsed.invalid.length > 0 && (
        <p className="text-xs text-slate">{parsed.invalid.length} line(s) skipped — no valid CPT/HCPCS code found.</p>
      )}

      {showPicker && (
        <div className="inset-dashed p-3">
          <Label>Which column is which?</Label>
          <p className="text-xs text-slate mt-1 mb-2">Couldn&rsquo;t tell automatically. Pick the role of the {twoCol ? "first number column" : "number"}:</p>
          <div className="flex gap-2">
            <button className="btn btn-sm" onClick={() => setOrderOverride("a-qty")}>{twoCol ? "Col 1 = Qty" : "Number = Qty"}</button>
            <button className="btn btn-sm" onClick={() => setOrderOverride("a-charges")}>{twoCol ? "Col 1 = Charges" : "Number = Charges"}</button>
          </div>
        </div>
      )}

      {validCount > 0 && committed === null && (
        <div className="card-plain overflow-x-auto">
          <table className="ledger min-w-[360px]">
            <thead>
              <tr>
                <th>Code</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Charges</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => {
                const st = statusOf(r.code);
                return (
                  <tr key={`${r.code}-${i}`}>
                    <td className="mono font-semibold">{r.code}</td>
                    <td className="mono text-right">{formatNumber(r.qty)}</td>
                    <td className="mono text-right">{r.charges != null ? formatUSD(r.charges) : "—"}</td>
                    <td><Chip tone={st.tone}>{st.label}</Chip></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {validCount > 0 && committed === null && (
        <button className="btn btn-primary" onClick={commit}>
          <Check size={14} /> Add {validCount} code(s) to Library
        </button>
      )}

      {/* post-commit: research queue */}
      {committed !== null && (
        <div className="card-claim p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-sm text-approval">
            <Check size={14} /> Added to Library ({serviceLine}). {committed.length} need research.
          </div>

          {!api.loading && !api.keyConfigured && committed.length > 0 && <KeyMissing />}
          {queue.error && <AgentErrorView error={queue.error} />}

          {committed.length > 0 && api.keyConfigured && !queue.finished && (
            <div>
              <Label>Research the shortlist now</Label>
              <p className="text-xs text-slate mt-1 mb-2">Runs sequentially and respects the 20/hour limit. You can stop any time.</p>
              {queue.running ? (
                <div className="flex items-center gap-3">
                  <Spinner />
                  <span className="text-sm mono">Researching {queue.done + 1}/{queue.total}…</span>
                  <button className="btn btn-sm btn-ghost ml-auto" onClick={() => (stopRef.current = true)}>
                    <Square size={12} /> Stop
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {[5, 10].filter((n) => n < committed.length).map((n) => (
                    <button key={n} className="btn btn-sm" onClick={() => runQueue(n)}>
                      <Search size={13} /> Research top {n}
                    </button>
                  ))}
                  <button className="btn btn-sm" onClick={() => runQueue(committed.length)}>
                    <Search size={13} /> Research all {committed.length}
                  </button>
                </div>
              )}
            </div>
          )}

          {queue.finished && !queue.error && (
            <div className="text-sm text-approval flex items-center gap-1.5">
              <Check size={14} /> Researched {queue.done} code(s). Open Library to verify and estimate.
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setText("");
                setCommitted(null);
                setQueue({ running: false, done: 0, total: 0, error: null, finished: false });
              }}
            >
              Paste another batch
            </button>
            {onClose && (
              <button className="btn btn-sm btn-ghost" onClick={onClose}>
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
