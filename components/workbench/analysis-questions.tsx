"use client";

import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/client";
import { ANALYSIS_QUESTIONS } from "@/lib/workbench-content";
import { ListChecks, Check } from "lucide-react";

export function AnalysisQuestions() {
  const hydrated = useHydrated();
  const answers = useStore((s) => s.analysisAnswers);
  const setAnswer = useStore((s) => s.setAnalysisAnswer);
  const answered = ANALYSIS_QUESTIONS.filter((q) => answers[q.id]?.checked).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListChecks size={16} className="text-claim" />
          <h2 className="label-mono label-mono-ink text-[11px]">Analysis questions</h2>
        </div>
        {hydrated && <span className="label-mono">{answered}/{ANALYSIS_QUESTIONS.length} answered</span>}
      </div>
      <p className="text-sm text-slate mb-3">
        The questions your Excel workpaper should be able to answer. Notes here carry into the Draft module as context.
      </p>
      <div className="space-y-2">
        {ANALYSIS_QUESTIONS.map((q, i) => {
          const a = answers[q.id];
          const checked = !!a?.checked;
          return (
            <div key={q.id} className="card-plain p-3">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => setAnswer(q.id, { checked: !checked })}
                  className={`shrink-0 mt-0.5 w-5 h-5 rounded-[3px] border flex items-center justify-center ${
                    checked ? "bg-approval border-approval text-white" : "border-rule text-transparent"
                  }`}
                  aria-label="Toggle answered"
                >
                  <Check size={13} />
                </button>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="mono text-claim font-bold mr-1.5">{i + 1}.</span>
                    {q.text}
                  </p>
                  <textarea
                    className="field mt-2 min-h-16 resize-y text-sm"
                    placeholder="Your finding…"
                    defaultValue={a?.notes ?? ""}
                    onBlur={(e) => setAnswer(q.id, { notes: e.target.value })}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
