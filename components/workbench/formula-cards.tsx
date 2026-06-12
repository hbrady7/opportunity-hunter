"use client";

import { FORMULA_CARDS } from "@/lib/workbench-content";
import { CopyButton } from "./copy-button";
import { FunctionSquare } from "lucide-react";

export function FormulaCards() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <FunctionSquare size={16} className="text-claim" />
        <h2 className="label-mono label-mono-ink text-[11px]">Formula cards</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FORMULA_CARDS.map((f) => (
          <div key={f.name} className="card-plain p-3 flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <span className="label-mono label-mono-ink">{f.name}</span>
              <CopyButton text={f.formula} />
            </div>
            <pre className="mono text-xs bg-paper border border-rule rounded-[2px] p-2 mt-2 overflow-x-auto whitespace-pre-wrap break-all">
              {f.formula}
            </pre>
            <p className="text-xs text-slate mt-2">{f.why}</p>
            {f.note && (
              <p className="text-[11px] text-amber mt-1.5">
                <span className="mono">▸</span> {f.note}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
