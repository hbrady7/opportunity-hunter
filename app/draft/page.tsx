"use client";

import { useMemo, useState } from "react";
import { PageHeader, EmptyState, Label } from "@/components/ui";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/client";
import { generateDraft, TEMPLATE_META } from "@/lib/draft";
import { ANALYSIS_QUESTIONS } from "@/lib/workbench-content";
import { copyText, downloadFile, makeId } from "@/lib/utils";
import type { DraftTemplate } from "@/lib/types";
import { FileText, ClipboardCopy, Download, Check, Save, Trash2 } from "lucide-react";

export default function DraftPage() {
  const hydrated = useHydrated();
  const codes = useStore((s) => s.codes);
  const drafts = useStore((s) => s.drafts);
  const addDraft = useStore((s) => s.addDraft);
  const removeDraft = useStore((s) => s.removeDraft);
  const pushTimeline = useStore((s) => s.pushTimeline);
  const analysisAnswers = useStore((s) => s.analysisAnswers);

  const [template, setTemplate] = useState<DraftTemplate>("workpaper");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [includeAnalysis, setIncludeAnalysis] = useState(true);

  const analysisNotes = useMemo(
    () =>
      ANALYSIS_QUESTIONS.map((q) => ({ question: q.text, notes: analysisAnswers[q.id]?.notes ?? "" })).filter(
        (n) => n.notes.trim()
      ),
    [analysisAnswers]
  );

  const selectedEntries = useMemo(
    () => codes.filter((c) => selected.has(c.id)),
    [codes, selected]
  );
  const content = useMemo(
    () => generateDraft(template, selectedEntries, includeAnalysis ? analysisNotes : []),
    [template, selectedEntries, includeAnalysis, analysisNotes]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function copy() {
    if (await copyText(content)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  function save() {
    if (!selectedEntries.length) return;
    const title = `${TEMPLATE_META[template].title} — ${selectedEntries.length} code(s)`;
    addDraft({
      id: makeId("draft"),
      template,
      title,
      codeIds: [...selected],
      content,
      createdAt: Date.now(),
    });
    selectedEntries.forEach((e) => pushTimeline(e.id, "drafted", `Included in ${TEMPLATE_META[template].title}`));
  }

  if (!hydrated) {
    return (
      <div>
        <PageHeader field="7 · DRAFT" title="Deliverable studio" />
        <div className="card-plain h-40 animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        field="7 · DRAFT"
        title="Deliverable studio"
        subtitle="Turn saved codes into deliverable-ready markdown. Synthesized only from your Library — no web calls, works offline."
      />

      {codes.length === 0 ? (
        <EmptyState
          icon={<FileText size={26} strokeWidth={1.6} />}
          title="Nothing to draft yet"
          body="Research and save codes first. Then pick them here and choose a template to generate workpaper, slide, or mentor-update content."
        />
      ) : (
        <>
          {/* template picker */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
            {(Object.keys(TEMPLATE_META) as DraftTemplate[]).map((t) => (
              <button
                key={t}
                onClick={() => setTemplate(t)}
                className={`card-plain p-3 text-left transition-colors ${
                  template === t ? "border-claim border-t-[3px]" : "hover:border-ink"
                }`}
              >
                <div className="label-mono label-mono-ink">{TEMPLATE_META[t].title}</div>
                <p className="text-xs text-slate mt-1">{TEMPLATE_META[t].desc}</p>
              </button>
            ))}
          </div>

          {/* analysis findings toggle */}
          {analysisNotes.length > 0 && template !== "slide" && (
            <label className="card-plain border-dashed p-3 mb-4 flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={includeAnalysis} onChange={(e) => setIncludeAnalysis(e.target.checked)} />
              <span className="text-sm">
                Append <strong>{analysisNotes.length}</strong> data-analysis finding(s) from Workbench
              </span>
            </label>
          )}

          {/* code multi-select */}
          <div className="card-plain p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <Label>Select codes ({selected.size})</Label>
              <div className="flex gap-2">
                <button className="label-mono hover:text-ink underline" onClick={() => setSelected(new Set(codes.map((c) => c.id)))}>all</button>
                <button className="label-mono hover:text-ink underline" onClick={() => setSelected(new Set())}>none</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {codes.map((c) => {
                const on = selected.has(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    className={`chip ${on ? "text-ink border-ink bg-paper" : "text-slate"}`}
                    title={c.research?.description}
                  >
                    {on && <Check size={10} />}
                    {c.code}
                    <span className="opacity-50">· {c.serviceLine}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* output */}
          <div className="card-claim p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-rule no-print">
              <span className="label-mono">{TEMPLATE_META[template].title} · Markdown</span>
              <div className="flex gap-2">
                <button className="btn btn-sm btn-ghost" disabled={!selected.size} onClick={save}>
                  <Save size={13} /> Save
                </button>
                <button className="btn btn-sm btn-ghost" disabled={!selected.size} onClick={() => downloadFile(`draft-${template}.md`, content, "text/markdown")}>
                  <Download size={13} /> .md
                </button>
                <button className="btn btn-sm" disabled={!selected.size} onClick={copy}>
                  {copied ? <Check size={13} /> : <ClipboardCopy size={13} />} {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <pre className="mono text-xs whitespace-pre-wrap p-4 bg-paper overflow-x-auto leading-relaxed max-h-[480px] overflow-y-auto">
              {content}
            </pre>
          </div>

          {/* drafts history */}
          {drafts.length > 0 && (
            <div className="mt-6">
              <Label>Saved drafts</Label>
              <div className="space-y-2 mt-2">
                {drafts.map((d) => (
                  <div key={d.id} className="card-plain p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{d.title}</div>
                      <div className="label-mono mt-0.5">{TEMPLATE_META[d.template].title}</div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button className="btn btn-sm btn-ghost" onClick={() => copyText(d.content)} title="Copy">
                        <ClipboardCopy size={13} />
                      </button>
                      <button className="btn btn-sm btn-ghost" onClick={() => downloadFile(`${d.template}-draft.md`, d.content, "text/markdown")}>
                        <Download size={13} />
                      </button>
                      <button className="text-slate hover:text-claim px-1" onClick={() => removeDraft(d.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
