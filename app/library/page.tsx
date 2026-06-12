"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader, EmptyState, Label, Chip } from "@/components/ui";
import { CodeDetail } from "@/components/code-detail";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/client";
import {
  SERVICE_LINES,
  SERVICE_LINE_LABELS,
  type ServiceLine,
  type Verdict,
} from "@/lib/constants";
import { toCSV, toMarkdownTable } from "@/lib/export";
import { formatUSD, formatNumber, isValidCode, normalizeCode, downloadFile, copyText } from "@/lib/utils";
import type { CodeEntry } from "@/lib/types";
import { Library as LibraryIcon, Plus, Download, ClipboardCopy, ArrowUpDown, Check } from "lucide-react";

type SortKey = "code" | "serviceLine" | "verdict" | "reimbursable" | "rate" | "qty" | "charges" | "verify" | "opp";

const VERDICT_RANK: Record<Verdict, number> = { STRONG: 3, MODERATE: 2, WEAK: 1 };

function bestBase(e: CodeEntry): number | null {
  return e.scenarios.length ? e.scenarios[0].base : null;
}

function VerdictChip({ v }: { v?: Verdict }) {
  if (!v) return <span className="text-slate text-xs">—</span>;
  const tone = v === "STRONG" ? "green" : v === "MODERATE" ? "amber" : "red";
  return <Chip tone={tone}>{v}</Chip>;
}

function LibraryInner() {
  const params = useSearchParams();
  const hydrated = useHydrated();
  const codes = useStore((s) => s.codes);
  const quickAdd = useStore((s) => s.quickAdd);
  const isExcluded = useStore((s) => s.isExcluded);

  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const o = params.get("open");
    if (o && codes.some((c) => c.id === o)) setOpenId(o);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, hydrated]);
  const [sortKey, setSortKey] = useState<SortKey>("charges");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [flService, setFlService] = useState<ServiceLine | "all">("all");
  const [flVerdict, setFlVerdict] = useState<Verdict | "all">("all");
  const [flVerify, setFlVerify] = useState<string>("all");
  const [copied, setCopied] = useState(false);

  // quick add
  const [qaCode, setQaCode] = useState("");
  const [qaSl, setQaSl] = useState<ServiceLine>("ED");
  const [qaQty, setQaQty] = useState("");
  const [qaCharges, setQaCharges] = useState("");

  const filtered = useMemo(() => {
    let list = [...codes];
    if (flService !== "all") list = list.filter((c) => c.serviceLine === flService);
    if (flVerdict !== "all") list = list.filter((c) => c.research?.verdict === flVerdict);
    if (flVerify !== "all") {
      if (flVerify === "unverified") list = list.filter((c) => !c.verification);
      else list = list.filter((c) => c.verification?.result === flVerify);
    }
    const val = (e: CodeEntry): number | string => {
      switch (sortKey) {
        case "code": return e.code;
        case "serviceLine": return e.serviceLine;
        case "verdict": return e.research ? VERDICT_RANK[e.research.verdict] : 0;
        case "reimbursable": return e.research?.reimbursable === "Yes" ? 2 : e.research?.reimbursable === "Conditional" ? 1 : 0;
        case "rate": return e.research?.medicareRate ?? -1;
        case "qty": return e.userQty ?? -1;
        case "charges": return e.userCharges ?? -1;
        case "verify": return e.verification ? (e.verification.result === "VERIFIED" ? 3 : e.verification.result === "CONDITIONAL" ? 2 : 1) : 0;
        case "opp": return bestBase(e) ?? -1;
      }
    };
    list.sort((a, b) => {
      const va = val(a), vb = val(b);
      if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb) * sortDir;
      return ((va as number) - (vb as number)) * sortDir;
    });
    return list;
  }, [codes, flService, flVerdict, flVerify, sortKey, sortDir]);

  function setSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(k);
      setSortDir(-1);
    }
  }

  function doQuickAdd() {
    if (!isValidCode(qaCode)) return;
    quickAdd(normalizeCode(qaCode), qaSl, qaQty ? Number(qaQty) : null, qaCharges ? Number(qaCharges) : null);
    setQaCode("");
    setQaQty("");
    setQaCharges("");
  }

  async function copyMd() {
    const ok = await copyText(toMarkdownTable(filtered));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  if (!hydrated) {
    return (
      <div>
        <PageHeader field="2 · LIBRARY" title="Code ledger" />
        <div className="card-plain h-40 animate-pulse" />
      </div>
    );
  }

  const th = (k: SortKey, children: React.ReactNode, className?: string) => (
    <th className={className}>
      <button className="inline-flex items-center gap-1 hover:text-ink" onClick={() => setSort(k)}>
        {children}
        <ArrowUpDown size={10} className={sortKey === k ? "text-claim" : "opacity-30"} />
      </button>
    </th>
  );

  return (
    <div>
      <PageHeader
        field="2 · LIBRARY"
        title="Code ledger"
        subtitle="Every saved code, ranked. Sort any column, filter, annotate, and export to your workpapers."
        right={
          codes.length > 0 ? (
            <div className="flex gap-2">
              <button className="btn btn-sm btn-ghost" onClick={() => downloadFile("opportunity-hunter-library.csv", toCSV(filtered), "text/csv")}>
                <Download size={13} /> CSV
              </button>
              <button className="btn btn-sm btn-ghost" onClick={copyMd}>
                {copied ? <Check size={13} /> : <ClipboardCopy size={13} />} {copied ? "Copied" : "MD"}
              </button>
            </div>
          ) : undefined
        }
      />

      {/* quick add */}
      <div className="card-plain p-3 sm:p-4 mb-4">
        <Label>Quick-add a code (logs it “to research”)</Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
          <input className="field field-mono" placeholder="CODE" maxLength={5} value={qaCode} onChange={(e) => setQaCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && doQuickAdd()} />
          <select className="field" value={qaSl} onChange={(e) => setQaSl(e.target.value as ServiceLine)}>
            {SERVICE_LINES.map((s) => <option key={s} value={s}>{SERVICE_LINE_LABELS[s]}</option>)}
          </select>
          <input className="field field-mono" placeholder="QTY" inputMode="numeric" value={qaQty} onChange={(e) => setQaQty(e.target.value.replace(/[^0-9]/g, ""))} />
          <input className="field field-mono" placeholder="CHARGES $" inputMode="numeric" value={qaCharges} onChange={(e) => setQaCharges(e.target.value.replace(/[^0-9.]/g, ""))} />
          <button className="btn btn-sm" disabled={!isValidCode(qaCode)} onClick={doQuickAdd}>
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      {codes.length === 0 ? (
        <EmptyState
          icon={<LibraryIcon size={26} strokeWidth={1.6} />}
          title="No codes saved yet"
          body="Research a code on the Hunt screen, or quick-add one above to log it for later."
        />
      ) : (
        <>
          {/* filters */}
          <div className="flex flex-wrap gap-2 mb-3 items-center">
            <select className="field !w-auto !py-1.5 text-xs" value={flService} onChange={(e) => setFlService(e.target.value as ServiceLine | "all")}>
              <option value="all">All service lines</option>
              {SERVICE_LINES.map((s) => <option key={s} value={s}>{SERVICE_LINE_LABELS[s]}</option>)}
            </select>
            <select className="field !w-auto !py-1.5 text-xs" value={flVerdict} onChange={(e) => setFlVerdict(e.target.value as Verdict | "all")}>
              <option value="all">All verdicts</option>
              <option value="STRONG">Strong</option>
              <option value="MODERATE">Moderate</option>
              <option value="WEAK">Weak</option>
            </select>
            <select className="field !w-auto !py-1.5 text-xs" value={flVerify} onChange={(e) => setFlVerify(e.target.value)}>
              <option value="all">All verification</option>
              <option value="VERIFIED">Verified</option>
              <option value="CONDITIONAL">Conditional</option>
              <option value="FAILED">Failed</option>
              <option value="unverified">Unverified</option>
            </select>
            <span className="label-mono ml-auto">{filtered.length} of {codes.length}</span>
          </div>

          <div className="card-plain overflow-x-auto">
            <table className="ledger min-w-[760px]">
              <thead>
                <tr>
                  {th("code", "Code")}
                  {th("serviceLine", "Line")}
                  <th>Description</th>
                  {th("verdict", "Verdict")}
                  {th("reimbursable", "Sep. Reimb.")}
                  {th("rate", "Medicare", "text-right")}
                  {th("qty", "Qty", "text-right")}
                  {th("charges", "Charges", "text-right")}
                  {th("verify", "Verify")}
                  {th("opp", "Est. Opp", "text-right")}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const excluded = isExcluded(e.code);
                  return (
                    <tr key={e.id} className="cursor-pointer hover:bg-paper" onClick={() => setOpenId(e.id)}>
                      <td className="mono font-semibold whitespace-nowrap">
                        {e.code}
                        {excluded && <span className="ml-1 text-claim text-[9px] align-top">EXCL</span>}
                        {!e.research && <span className="ml-1 text-amber text-[9px] align-top">TO-DO</span>}
                      </td>
                      <td className="whitespace-nowrap text-xs">{e.serviceLine}</td>
                      <td className="max-w-[200px] truncate text-xs">{e.research?.description ?? <span className="text-slate italic">to research</span>}</td>
                      <td><VerdictChip v={e.research?.verdict} /></td>
                      <td className="text-xs">
                        {e.research ? (
                          <span className={e.research.reimbursable === "Yes" ? "text-approval" : e.research.reimbursable === "No" ? "text-claim" : "text-amber"}>
                            {e.research.reimbursable}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="mono text-right whitespace-nowrap">{e.research?.medicareRate != null ? formatUSD(e.research.medicareRate, { cents: true }) : "—"}</td>
                      <td className="mono text-right">{formatNumber(e.userQty)}</td>
                      <td className="mono text-right whitespace-nowrap">{e.userCharges != null ? formatUSD(e.userCharges) : "—"}</td>
                      <td>
                        {e.verification ? (
                          <Chip tone={e.verification.result === "VERIFIED" ? "green" : e.verification.result === "CONDITIONAL" ? "amber" : "red"}>
                            {e.verification.result.slice(0, 4)}
                          </Chip>
                        ) : <span className="text-slate text-xs">—</span>}
                      </td>
                      <td className="mono text-right whitespace-nowrap font-semibold">{bestBase(e) != null ? formatUSD(bestBase(e)!) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {openId && <CodeDetail id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className="card-plain h-40 animate-pulse" />}>
      <LibraryInner />
    </Suspense>
  );
}
