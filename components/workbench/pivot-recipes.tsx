"use client";

import { PIVOT_RECIPES } from "@/lib/workbench-content";
import { Label } from "@/components/ui";
import { Table2, Star } from "lucide-react";

function Field({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="label-mono w-16 shrink-0 pt-0.5">{k}</span>
      <span className="text-ink">{v}</span>
    </div>
  );
}

export function PivotRecipes() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Table2 size={16} className="text-claim" />
        <h2 className="label-mono label-mono-ink text-[11px]">Pivot recipes</h2>
      </div>
      <p className="text-sm text-slate mb-3">
        Six PivotTables, in build order. Each says exactly where to drop each field, how to sort, and what to look for.
      </p>
      <div className="space-y-3">
        {PIVOT_RECIPES.map((p, i) => (
          <div key={p.id} className={p.lead ? "card-claim p-4" : "card-plain p-4"}>
            <div className="flex items-center gap-2 mb-1">
              <span className="mono text-claim font-bold text-sm">{i + 1}</span>
              <h3 className="font-semibold text-sm">{p.name}</h3>
              {p.lead && (
                <span className="chip text-claim ml-1">
                  <Star size={9} /> START HERE
                </span>
              )}
            </div>
            <p className="text-sm text-slate mb-3">{p.purpose}</p>
            <div className="inset-dashed p-3 space-y-1.5">
              <Field k="Rows" v={p.rows} />
              <Field k="Columns" v={p.columns} />
              <Field k="Values" v={p.values} />
              <Field k="Filters" v={p.filters} />
              <Field k="Sort" v={p.sort} />
            </div>
            <div className="mt-3 flex gap-2">
              <Label>Look for</Label>
              <p className="text-sm flex-1">{p.lookFor}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
