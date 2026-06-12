"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader, Chip, EmptyState } from "@/components/ui";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/client";
import { generateDraft } from "@/lib/draft";
import { copyText, relativeTime, formatDate, formatUSD } from "@/lib/utils";
import { MessagesSquare, Plus, Check, Trash2, ClipboardCopy, CalendarCheck, ListChecks } from "lucide-react";

export default function MentorPage() {
  const hydrated = useHydrated();
  const codes = useStore((s) => s.codes);
  const questions = useStore((s) => s.questions);
  const addQuestion = useStore((s) => s.addQuestion);
  const toggleQuestion = useStore((s) => s.toggleQuestion);
  const removeQuestion = useStore((s) => s.removeQuestion);
  const lastTouchBase = useStore((s) => s.lastTouchBase);
  const setTouchBase = useStore((s) => s.setTouchBase);

  const [newQ, setNewQ] = useState("");
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
  }, []);

  const since = lastTouchBase ?? (now ? now - 7 * 24 * 60 * 60 * 1000 : 0);

  // activity since last touch-base
  const activity = useMemo(() => {
    const events: { code: string; detail: string; at: number }[] = [];
    for (const c of codes) {
      for (const t of c.timeline) {
        if (t.at >= since) events.push({ code: c.code, detail: t.detail, at: t.at });
      }
    }
    return events.sort((a, b) => b.at - a.at);
  }, [codes, since]);

  // auto agenda
  const agenda = useMemo(() => {
    const items: string[] = [];
    const conditional = codes.filter((c) => c.research?.reimbursable === "Conditional");
    if (conditional.length)
      items.push(`Confirm billing scenarios for conditional codes: ${conditional.map((c) => c.code).join(", ")}.`);
    const toResearch = codes.filter((c) => !c.research);
    if (toResearch.length)
      items.push(`Prioritize research backlog (${toResearch.length}): ${toResearch.slice(0, 6).map((c) => c.code).join(", ")}.`);
    const failed = codes.filter((c) => c.verification?.result === "FAILED");
    if (failed.length) items.push(`Review codes that failed verification: ${failed.map((c) => c.code).join(", ")}.`);
    const strong = codes.filter((c) => c.research?.verdict === "STRONG" && c.verification?.result === "VERIFIED");
    if (strong.length) items.push(`Walk through top verified opportunities: ${strong.map((c) => c.code).join(", ")}.`);
    const open = questions.filter((q) => !q.answered);
    open.forEach((q) => items.push(`Question: ${q.text}`));
    if (!items.length) items.push("Share progress on the four service lines and confirm next-week priorities.");
    return items;
  }, [codes, questions]);

  const openCount = questions.filter((q) => !q.answered).length;

  function buildPrep(): string {
    const lines: string[] = ["# Mentor touch-base prep", ""];
    lines.push(`_Activity since ${formatDate(since)}${lastTouchBase ? " (last touch-base)" : " (last 7 days)"}_`, "");
    lines.push("## Summary", "", generateDraft("mentor", codes), "");
    lines.push("## Agenda", "");
    agenda.forEach((a) => lines.push(`- ${a}`));
    lines.push("", "## Open questions", "");
    const open = questions.filter((q) => !q.answered);
    if (open.length) open.forEach((q) => lines.push(`- ${q.text}`));
    else lines.push("- (none)");
    return lines.join("\n");
  }

  async function copyPrep() {
    if (await copyText(buildPrep())) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <div>
      <PageHeader
        field="+ · MENTOR"
        title="Mentor call prep"
        subtitle="A running question bank, an auto-summary of what changed since your last touch-base, and a ready-to-read agenda."
        right={
          <button className="btn btn-sm" onClick={copyPrep}>
            {copied ? <Check size={13} /> : <ClipboardCopy size={13} />} {copied ? "Copied" : "Copy prep"}
          </button>
        }
      />

      {/* touch-base marker */}
      <div className="card-plain p-3 mb-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm flex items-center gap-2">
          <CalendarCheck size={15} className="text-claim" />
          <span>
            Last touch-base:{" "}
            <span className="mono font-semibold">{lastTouchBase ? formatDate(lastTouchBase) : "not set"}</span>
          </span>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={setTouchBase}>
          <Check size={13} /> I just had a touch-base
        </button>
      </div>

      {/* agenda */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <ListChecks size={16} className="text-claim" />
          <h2 className="label-mono label-mono-ink text-[11px]">Auto agenda</h2>
        </div>
        <div className="card-claim p-4">
          <ul className="space-y-2">
            {agenda.map((a, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="mono text-claim">▸</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* question bank */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MessagesSquare size={16} className="text-claim" />
            <h2 className="label-mono label-mono-ink text-[11px]">Question bank</h2>
          </div>
          {openCount > 0 && <Chip tone="amber">{openCount} OPEN</Chip>}
        </div>
        <div className="card-plain p-3">
          <div className="flex gap-2">
            <input
              className="field"
              placeholder="Capture a question for your mentor…"
              value={newQ}
              onChange={(e) => setNewQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newQ.trim()) {
                  addQuestion(newQ.trim(), "Mentor prep");
                  setNewQ("");
                }
              }}
            />
            <button
              className="btn btn-sm shrink-0"
              disabled={!newQ.trim()}
              onClick={() => {
                addQuestion(newQ.trim(), "Mentor prep");
                setNewQ("");
              }}
            >
              <Plus size={13} /> Add
            </button>
          </div>
          {hydrated && questions.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {questions.map((q) => (
                <li key={q.id} className="flex items-start gap-2 text-sm border-b border-rule pb-2 last:border-0">
                  <button onClick={() => toggleQuestion(q.id)} className={`mono mt-0.5 ${q.answered ? "text-approval" : "text-slate"}`}>
                    {q.answered ? "☑" : "☐"}
                  </button>
                  <div className="flex-1">
                    <span className={q.answered ? "line-through text-slate" : ""}>{q.text}</span>
                    <span className="label-mono ml-2">{q.source}</span>
                  </div>
                  <button onClick={() => removeQuestion(q.id)} className="text-slate hover:text-claim shrink-0">
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate mt-3">No questions yet. Capture them here or from the Learn → Ask box.</p>
          )}
        </div>
      </section>

      {/* since-last-touch-base activity */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <CalendarCheck size={16} className="text-claim" />
          <h2 className="label-mono label-mono-ink text-[11px]">Since last touch-base</h2>
          <span className="label-mono ml-auto">{formatDate(since)} →</span>
        </div>
        {activity.length === 0 ? (
          <EmptyState
            icon={<MessagesSquare size={24} strokeWidth={1.6} />}
            title="No activity in this window"
            body="Research, verify, and estimate codes — your progress shows up here, ready to summarize for your mentor."
          />
        ) : (
          <div className="card-plain divide-y divide-rule">
            {activity.slice(0, 30).map((e, i) => (
              <div key={i} className="px-3 py-2 flex items-baseline gap-3 text-sm">
                <span className="mono text-xs text-slate w-16 shrink-0">{relativeTime(e.at)}</span>
                <span className="mono font-semibold w-14 shrink-0">{e.code}</span>
                <span className="text-slate">{e.detail}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* quick stats footer */}
      {hydrated && codes.length > 0 && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { k: "Codes", v: String(codes.length) },
            { k: "Verified", v: String(codes.filter((c) => c.verification?.result === "VERIFIED").length) },
            { k: "Strong", v: String(codes.filter((c) => c.research?.verdict === "STRONG").length) },
            {
              k: "Est. pipeline",
              v: formatUSD(codes.reduce((s, c) => s + (c.scenarios[0]?.base ?? 0), 0)),
            },
          ].map((s) => (
            <div key={s.k} className="card-plain p-3 text-center">
              <div className="label-mono">{s.k}</div>
              <div className="mono text-lg font-semibold mt-1">{s.v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
