"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { copyText } from "@/lib/utils";
import { BUILD_STEPS, EXPECTED_COLUMNS } from "@/lib/workbench-content";
import { Rich } from "./rich-text";
import { CopyButton } from "./copy-button";
import { Label } from "@/components/ui";
import { ChevronDown, Check, ClipboardList, ArrowDownToLine } from "lucide-react";

export function BuildGuide() {
  const buildSteps = useStore((s) => s.buildSteps);
  const toggleBuildStep = useStore((s) => s.toggleBuildStep);
  const exclusionList = useStore((s) => s.exclusionList);
  const [open, setOpen] = useState<string | null>(BUILD_STEPS[0].id);
  const [exclCopied, setExclCopied] = useState(false);

  const done = BUILD_STEPS.filter((s) => buildSteps[s.id]).length;

  async function copyExclusions() {
    const ok = await copyText(exclusionList.join("\n"));
    if (ok) {
      setExclCopied(true);
      setTimeout(() => setExclCopied(false), 1500);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardList size={16} className="text-claim" />
          <h2 className="label-mono label-mono-ink text-[11px]">Build guide</h2>
        </div>
        <span className="label-mono">{done}/{BUILD_STEPS.length} done</span>
      </div>

      <div className="space-y-2">
        {BUILD_STEPS.map((step, i) => {
          const isOpen = open === step.id;
          const isDone = !!buildSteps[step.id];
          return (
            <div key={step.id} className="card-plain overflow-hidden">
              <div className="flex items-center gap-3 px-3 py-2.5">
                <button
                  onClick={() => toggleBuildStep(step.id)}
                  className={`shrink-0 w-5 h-5 rounded-[3px] border flex items-center justify-center ${
                    isDone ? "bg-approval border-approval text-white" : "border-rule text-transparent"
                  }`}
                  aria-label="Toggle done"
                >
                  <Check size={13} />
                </button>
                <button
                  className="flex-1 flex items-center gap-2 text-left"
                  onClick={() => setOpen(isOpen ? null : step.id)}
                >
                  <span className="mono text-claim font-bold text-sm w-4">{i + 1}</span>
                  <span className={`text-sm font-medium ${isDone ? "line-through text-slate" : ""}`}>{step.title}</span>
                  <ChevronDown size={14} className={`text-slate ml-auto transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
              </div>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-rule space-y-2">
                  {step.body.map((b, j) => (
                    <p key={j} className="text-sm text-slate leading-relaxed">
                      <Rich text={b} />
                    </p>
                  ))}

                  {step.id === "stage" && (
                    <div className="inset-dashed p-2.5 mt-1">
                      <Label>Expected 12 columns</Label>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {EXPECTED_COLUMNS.map((c) => (
                          <span key={c} className="chip text-slate">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {step.copies?.map((c) => (
                      <CopyButton key={c.label} text={c.text} label={c.label} />
                    ))}
                    {step.hook === "copyExclusions" && (
                      <button className="btn btn-sm" onClick={copyExclusions}>
                        {exclCopied ? <Check size={13} /> : <ClipboardList size={13} />}
                        {exclCopied ? "Copied" : `Copy my exclusion list (${exclusionList.length})`}
                      </button>
                    )}
                    {step.hook === "gotoIntake" && (
                      <a className="btn btn-sm" href="#intake">
                        <ArrowDownToLine size={13} /> Go to Bulk Paste
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
