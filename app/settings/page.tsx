"use client";

import { useRef, useState } from "react";
import { PageHeader, Label, Spinner } from "@/components/ui";
import { CriteriaEditor } from "@/components/criteria-editor";
import { useStore } from "@/lib/store";
import { useHydrated, useApiStatus } from "@/lib/client";
import { DEFAULT_ASSUMPTIONS } from "@/lib/constants";
import { downloadFile, isValidCode } from "@/lib/utils";
import { Plus, Trash2, Download, Upload, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

function Section({ num, title, desc, children }: { num: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-baseline gap-2 mb-3 border-b border-rule pb-2">
        <span className="mono text-[10px] text-claim border border-claim rounded-[2px] px-1 pt-[1px]">{num}</span>
        <h2 className="label-mono label-mono-ink text-[11px]">{title}</h2>
      </div>
      {desc && <p className="text-sm text-slate mb-3">{desc}</p>}
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const hydrated = useHydrated();
  const api = useApiStatus();
  const exclusionList = useStore((s) => s.exclusionList);
  const setExclusionList = useStore((s) => s.setExclusionList);
  const assumptions = useStore((s) => s.assumptions);
  const setAssumptions = useStore((s) => s.setAssumptions);
  const exportAll = useStore((s) => s.exportAll);
  const importAll = useStore((s) => s.importAll);
  const clearAll = useStore((s) => s.clearAll);
  const codes = useStore((s) => s.codes);

  const [exclInput, setExclInput] = useState("");
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function addExclusions() {
    const tokens = exclInput
      .split(/[\s,;\n]+/)
      .map((t) => t.trim().toUpperCase())
      .filter((t) => isValidCode(t));
    if (tokens.length) {
      setExclusionList([...exclusionList, ...tokens]);
      setExclInput("");
    }
  }
  function removeExclusion(code: string) {
    setExclusionList(exclusionList.filter((c) => c !== code));
  }

  function doExport() {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`opportunity-hunter-backup-${stamp}.json`, exportAll(), "application/json");
  }

  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importAll(String(reader.result));
      setImportMsg(ok ? { ok: true, text: "Backup restored." } : { ok: false, text: "Could not read that file." });
      setTimeout(() => setImportMsg(null), 3000);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div>
      <PageHeader
        field="8 · SETTINGS"
        title="Settings & data"
        subtitle="Your exclusion list, criteria, and estimator defaults. All data lives in this browser — back it up."
      />

      {/* API status */}
      <Section num="A" title="API status">
        <div className="card-plain p-4 flex items-center gap-3">
          {api.loading ? (
            <Spinner />
          ) : api.keyConfigured ? (
            <CheckCircle2 size={18} className="text-approval" />
          ) : (
            <XCircle size={18} className="text-claim" />
          )}
          <div className="text-sm">
            {api.loading ? "Checking…" : api.keyConfigured ? "API key configured" : "No API key configured"}
            {api.provider && <span className="chip text-approval ml-2">{api.provider.toUpperCase()}</span>}
            {api.model && <span className="mono text-xs text-slate ml-2">{api.model}</span>}
          </div>
        </div>
        {!api.loading && !api.keyConfigured && (
          <p className="text-xs text-slate mt-2">
            Set a <code className="mono">GEMINI_API_KEY</code> (free tier) or <code className="mono">ANTHROPIC_API_KEY</code> in{" "}
            <code className="mono">.env.local</code> (or Vercel env) to enable Hunt, Verify, Scout, rate-fetch, and Ask. Everything else works without it.
          </p>
        )}
      </Section>

      {/* Exclusion list */}
      <Section
        num="B"
        title="Exclusion list"
        desc="Codes the firm already implements on. Hard-fails Verify gate #2 and badges the code in Hunt, Library, and Scout."
      >
        <div className="card-plain p-3">
          <div className="flex gap-2">
            <input
              className="field field-mono"
              placeholder="Paste codes (space/comma/newline separated)"
              value={exclInput}
              onChange={(e) => setExclInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && addExclusions()}
            />
            <button className="btn btn-sm shrink-0" onClick={addExclusions}>
              <Plus size={13} /> Add
            </button>
          </div>
          {hydrated && exclusionList.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {exclusionList.map((c) => (
                <span key={c} className="chip text-claim">
                  {c}
                  <button onClick={() => removeExclusion(c)} className="ml-1 hover:text-ink">
                    <Trash2 size={10} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate mt-3">No codes excluded yet.</p>
          )}
        </div>
      </Section>

      {/* Criteria */}
      <Section num="C" title="Verification criteria" desc="The viability gates used by the Verify module. Same editor as the Verify screen.">
        <CriteriaEditor />
      </Section>

      {/* Estimator defaults */}
      <Section num="D" title="Estimator defaults" desc="Starting assumptions for new estimates.">
        <div className="card-plain p-4 space-y-5">
          {[
            { key: "medicareMixPct" as const, label: "Medicare payer mix", min: 0, max: 100, step: 5, suffix: "%" },
            { key: "commercialMultiplier" as const, label: "Commercial rate multiplier", min: 1, max: 2.5, step: 0.1, suffix: "×" },
            { key: "captureRate" as const, label: "Capture rate", min: 0, max: 100, step: 5, suffix: "%" },
          ].map((s) => (
            <div key={s.key}>
              <div className="flex justify-between items-baseline">
                <Label>{s.label}</Label>
                <span className="mono text-sm font-semibold">
                  {assumptions[s.key]}
                  {s.suffix}
                </span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={assumptions[s.key]}
                onChange={(e) => setAssumptions({ [s.key]: Number(e.target.value) })}
                className="w-full mt-2 accent-[var(--claim-red)]"
              />
            </div>
          ))}
          <button className="label-mono hover:text-ink underline" onClick={() => setAssumptions({ ...DEFAULT_ASSUMPTIONS })}>
            reset to defaults
          </button>
        </div>
      </Section>

      {/* Backup / restore */}
      <Section num="E" title="Backup & restore" desc="This browser is the only copy of your data. Export regularly.">
        <div className="card-plain p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-sm" onClick={doExport}>
              <Download size={13} /> Backup (export JSON)
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => fileRef.current?.click()}>
              <Upload size={13} /> Restore (import JSON)
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFile} />
          </div>
          {importMsg && (
            <div className={`text-xs flex items-center gap-1.5 ${importMsg.ok ? "text-approval" : "text-claim"}`}>
              {importMsg.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />} {importMsg.text}
            </div>
          )}
          <p className="text-[10px] text-slate mono">
            {hydrated ? `${codes.length} code(s), ${exclusionList.length} exclusion(s) in this browser.` : "…"}
          </p>
        </div>
      </Section>

      {/* Danger zone */}
      <Section num="F" title="Clear all data">
        <div className="card-plain p-4 border-claim/30">
          {!confirmClear ? (
            <button className="btn btn-sm text-claim border-claim/50" onClick={() => setConfirmClear(true)}>
              <AlertTriangle size={13} /> Clear all data
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-sm text-claim flex items-center gap-1.5">
                <AlertTriangle size={15} /> This erases everything in this browser. Export a backup first.
              </p>
              <div className="flex gap-2 sm:ml-auto">
                <button className="btn btn-sm btn-ghost" onClick={() => setConfirmClear(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    clearAll();
                    setConfirmClear(false);
                  }}
                >
                  Yes, clear everything
                </button>
              </div>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
