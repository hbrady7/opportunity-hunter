"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Label, Chip } from "./ui";
import { GripVertical, ChevronUp, ChevronDown, Trash2, Plus, Lock } from "lucide-react";

export function CriteriaEditor() {
  const criteria = useStore((s) => s.criteria);
  const addCriterion = useStore((s) => s.addCriterion);
  const updateCriterion = useStore((s) => s.updateCriterion);
  const removeCriterion = useStore((s) => s.removeCriterion);
  const moveCriterion = useStore((s) => s.moveCriterion);

  const [newLabel, setNewLabel] = useState("");
  const [newHard, setNewHard] = useState(false);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {criteria.map((c, i) => (
          <div key={c.id} className="card-plain p-3 flex items-start gap-2">
            <div className="flex flex-col text-slate pt-0.5">
              <button className="hover:text-ink disabled:opacity-20" disabled={i === 0} onClick={() => moveCriterion(c.id, -1)}>
                <ChevronUp size={14} />
              </button>
              <button className="hover:text-ink disabled:opacity-20" disabled={i === criteria.length - 1} onClick={() => moveCriterion(c.id, 1)}>
                <ChevronDown size={14} />
              </button>
            </div>
            <GripVertical size={14} className="text-rule mt-1 shrink-0" />
            <div className="flex-1 min-w-0">
              <input
                className="field !py-1.5 text-sm"
                value={c.label}
                onChange={(e) => updateCriterion(c.id, { label: e.target.value })}
              />
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <button
                  className={`chip ${c.hardGate ? "text-claim" : "text-slate"}`}
                  onClick={() => updateCriterion(c.id, { hardGate: !c.hardGate })}
                  title="Toggle hard gate"
                >
                  {c.hardGate ? "HARD GATE" : "SOFT"}
                </button>
                {!c.agentEvaluable && (
                  <Chip tone="slate">
                    <Lock size={9} /> LOCAL CHECK
                  </Chip>
                )}
                {c.thresholdKind === "minMedicareRate" && (
                  <span className="flex items-center gap-1 text-xs">
                    <Label>≥ $</Label>
                    <input
                      className="field field-mono !w-20 !py-1 text-xs"
                      inputMode="numeric"
                      value={c.threshold ?? 0}
                      onChange={(e) => updateCriterion(c.id, { threshold: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })}
                    />
                  </span>
                )}
                <label className="flex items-center gap-1 text-xs text-slate ml-auto">
                  <input type="checkbox" checked={c.enabled} onChange={(e) => updateCriterion(c.id, { enabled: e.target.checked })} />
                  enabled
                </label>
              </div>
            </div>
            {!c.builtin && (
              <button className="text-slate hover:text-claim shrink-0 pt-1" onClick={() => removeCriterion(c.id)}>
                <Trash2 size={14} />
              </button>
            )}
            {c.builtin && <Lock size={12} className="text-rule shrink-0 mt-1.5" />}
          </div>
        ))}
      </div>

      <div className="card-plain border-dashed p-3">
        <Label>Add a criterion</Label>
        <div className="flex gap-2 mt-2">
          <input
            className="field !py-1.5 text-sm"
            placeholder="e.g. Not a low-MUE code that triggers edits"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newLabel.trim()) {
                addCriterion(newLabel.trim(), newHard);
                setNewLabel("");
              }
            }}
          />
          <button
            className={`chip shrink-0 ${newHard ? "text-claim" : "text-slate"}`}
            onClick={() => setNewHard((h) => !h)}
          >
            {newHard ? "HARD" : "SOFT"}
          </button>
          <button
            className="btn btn-sm shrink-0"
            disabled={!newLabel.trim()}
            onClick={() => {
              addCriterion(newLabel.trim(), newHard);
              setNewLabel("");
            }}
          >
            <Plus size={13} /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
