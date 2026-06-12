"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/client";
import { Label } from "@/components/ui";
import { FileSpreadsheet, Download, Check } from "lucide-react";

export function WorkbookButton({ compact }: { compact?: boolean }) {
  const hydrated = useHydrated();
  const exclusionList = useStore((s) => s.exclusionList);
  const assumptions = useStore((s) => s.assumptions);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function download() {
    setBusy(true);
    try {
      // dynamic import keeps the ~400KB xlsx lib out of the initial bundle
      const { downloadStarterWorkbook } = await import("@/lib/workbench-xlsx");
      downloadStarterWorkbook(exclusionList, assumptions);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    return (
      <button className="btn btn-sm" disabled={busy} onClick={download}>
        {done ? <Check size={13} /> : <Download size={13} />} {done ? "Downloaded" : "Starter workbook"}
      </button>
    );
  }

  return (
    <div className="card-claim p-4">
      <div className="flex items-center gap-2 mb-1">
        <FileSpreadsheet size={16} className="text-claim" />
        <h2 className="label-mono label-mono-ink text-[11px]">Starter workbook</h2>
      </div>
      <p className="text-sm text-slate mb-3">
        A ready-to-fill <code className="mono">.xlsx</code> with six tabs — READ-ME, 1-Raw, a SUMIFS-wired 2-Summary,
        3-Exclusions (pre-filled with your list), 4-Shortlist (matches the Library CSV), and Methodology. Generated in your
        browser; no data leaves the app.
      </p>
      <button className="btn btn-primary" disabled={busy} onClick={download}>
        {done ? <Check size={14} /> : <Download size={14} />}
        {busy ? "Building…" : done ? "Downloaded" : "Download starter workbook"}
      </button>
      {hydrated && (
        <div className="mt-2">
          <Label>{exclusionList.length} exclusion(s) baked in at generation time</Label>
        </div>
      )}
    </div>
  );
}
