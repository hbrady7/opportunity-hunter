"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader, Label, Spinner } from "@/components/ui";
import { AgentErrorView } from "@/components/agents/agent-error";
import { useStore } from "@/lib/store";
import { useApiStatus, agentPost, AgentError } from "@/lib/client";
import { computeEstimate, blendedRate } from "@/lib/estimate";
import { isValidCode, normalizeCode, formatUSD, makeId } from "@/lib/utils";
import {
  SERVICE_LINES,
  SERVICE_LINE_LABELS,
  DEFAULT_ASSUMPTIONS,
  DISCLAIMER,
  type ServiceLine,
} from "@/lib/constants";
import type { EstimateScenario } from "@/lib/types";
import { Calculator, Save, Check } from "lucide-react";

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline">
        <Label>{label}</Label>
        <span className="mono text-sm font-semibold">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-2 accent-[var(--claim-red)]"
      />
    </div>
  );
}

function EstimateInner() {
  const params = useSearchParams();
  const api = useApiStatus();
  const codes = useStore((s) => s.codes);
  const assumptions = useStore((s) => s.assumptions);
  const quickAdd = useStore((s) => s.quickAdd);
  const addScenario = useStore((s) => s.addScenario);

  const [code, setCode] = useState("");
  const [serviceLine, setServiceLine] = useState<ServiceLine>("ED");
  const [rate, setRate] = useState("");
  const [volume, setVolume] = useState("");
  const [mix, setMix] = useState(assumptions.medicareMixPct);
  const [mult, setMult] = useState(assumptions.commercialMultiplier);
  const [capture, setCapture] = useState(assumptions.captureRate);

  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<AgentError | null>(null);
  const [rateNote, setRateNote] = useState<string | null>(null);
  const [scenarioName, setScenarioName] = useState("");
  const [savedMsg, setSavedMsg] = useState(false);

  // prefill
  useEffect(() => {
    const q = params.get("code");
    if (q && isValidCode(q)) {
      const c = normalizeCode(q);
      setCode(c);
      const entry = codes.find((e) => e.code === c);
      if (entry) {
        setServiceLine(entry.serviceLine);
        if (entry.research?.medicareRate != null) setRate(String(entry.research.medicareRate));
        if (entry.userQty != null) setVolume(String(entry.userQty));
      }
    }
  }, [params, codes]);

  const numRate = Number(rate) || 0;
  const numVol = Number(volume) || 0;
  const out = useMemo(
    () =>
      computeEstimate({
        medicareRate: numRate,
        annualVolume: numVol,
        medicareMixPct: mix,
        commercialMultiplier: mult,
        captureRate: capture,
      }),
    [numRate, numVol, mix, mult, capture]
  );

  const valid = isValidCode(code);

  async function fetchRate() {
    if (!valid) return;
    setFetching(true);
    setError(null);
    setRateNote(null);
    try {
      const data = await agentPost<{ rate: number | null; note: string; usedWebSearch: boolean }>("/api/rate", {
        code: normalizeCode(code),
        serviceLine,
      });
      if (data.rate != null) setRate(String(data.rate));
      setRateNote(
        (data.rate != null ? `≈ ${formatUSD(data.rate, { cents: true })} — ${data.note}` : "No rate found — enter manually.") +
          (data.usedWebSearch ? "" : " (model knowledge — verify)")
      );
    } catch (e) {
      setError(e instanceof AgentError ? e : new AgentError("agent_error", "Rate lookup failed."));
    } finally {
      setFetching(false);
    }
  }

  function save() {
    if (!valid || numRate <= 0 || numVol <= 0) return;
    const c = normalizeCode(code);
    const entry = codes.find((e) => e.code === c);
    const id = entry?.id ?? quickAdd(c, serviceLine, numVol, null);
    const scenario: EstimateScenario = {
      id: makeId("sc"),
      name: scenarioName.trim() || `Scenario ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      medicareRate: numRate,
      annualVolume: numVol,
      medicareMixPct: mix,
      commercialMultiplier: mult,
      captureRate: capture,
      low: out.low,
      base: out.base,
      high: out.high,
      createdAt: Date.now(),
    };
    addScenario(id, scenario);
    setScenarioName("");
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 1800);
  }

  const canSave = valid && numRate > 0 && numVol > 0;

  return (
    <div>
      <PageHeader
        field="4 · ESTIMATE"
        title="Opportunity estimate"
        subtitle="Transparent reimbursement math from national Medicare rates and your assumptions. Every line is shown."
      />

      <div className="card-plain p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>CPT / HCPCS code</Label>
            <input className="field field-mono mt-1.5 text-lg" placeholder="e.g. 99284" maxLength={5} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          </div>
          <div>
            <Label>Service line</Label>
            <select className="field mt-1.5" value={serviceLine} onChange={(e) => setServiceLine(e.target.value as ServiceLine)}>
              {SERVICE_LINES.map((s) => <option key={s} value={s}>{SERVICE_LINE_LABELS[s]}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>National Medicare rate ($)</Label>
            <div className="flex gap-2 mt-1.5">
              <input className="field field-mono" inputMode="decimal" placeholder="e.g. 248.50" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, ""))} />
              <button className="btn btn-sm btn-ghost shrink-0" disabled={!valid || fetching} onClick={fetchRate} title="Fetch rate with the agent">
                {fetching ? <Spinner /> : <Calculator size={13} />}
              </button>
            </div>
            {rateNote && <p className="text-xs text-slate mt-1">{rateNote}</p>}
          </div>
          <div>
            <Label>Annual volume (charge qty)</Label>
            <input className="field field-mono mt-1.5" inputMode="numeric" placeholder="e.g. 1240" value={volume} onChange={(e) => setVolume(e.target.value.replace(/[^0-9]/g, ""))} />
          </div>
        </div>

        {/* sliders */}
        <div className="inset-dashed p-4 space-y-5">
          <div className="flex items-center justify-between">
            <Label>Assumptions</Label>
            <button
              className="label-mono hover:text-ink underline"
              onClick={() => {
                setMix(DEFAULT_ASSUMPTIONS.medicareMixPct);
                setMult(DEFAULT_ASSUMPTIONS.commercialMultiplier);
                setCapture(DEFAULT_ASSUMPTIONS.captureRate);
              }}
            >
              reset
            </button>
          </div>
          <Slider label="Medicare payer mix" value={mix} min={0} max={100} step={5} suffix="%" onChange={setMix} />
          <Slider label="Commercial rate multiplier" value={mult} min={1} max={2.5} step={0.1} suffix="×" onChange={setMult} />
          <Slider label="Capture rate" value={capture} min={0} max={100} step={5} suffix="%" onChange={setCapture} />
        </div>
      </div>

      {!api.loading && !api.keyConfigured && (
        <div className="mt-4">
          <div className="text-xs text-slate mb-2">
            No API key? You can still estimate — just enter the Medicare rate manually above.
          </div>
        </div>
      )}
      {error && <div className="mt-4"><AgentErrorView error={error} /></div>}

      {/* math display */}
      <div className="card-claim p-5 mt-5">
        <Label>Estimated annual opportunity (Kodiak potential)</Label>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { k: "LOW", v: out.low, tone: "text-slate", sub: "1.3× · 70%" },
            { k: "BASE", v: out.base, tone: "text-ink", sub: `${mult}× · ${capture}%` },
            { k: "HIGH", v: out.high, tone: "text-approval", sub: "2.0× · 95%" },
          ].map((s) => (
            <div key={s.k} className={`text-center ${s.k === "BASE" ? "card-plain py-3" : "py-3"}`}>
              <div className="label-mono">{s.k}</div>
              <div className={`mono text-xl sm:text-2xl font-semibold mt-1 ${s.tone}`}>{formatUSD(s.v)}</div>
              <div className="mono text-[10px] text-slate mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* transparent math */}
        <div className="mt-4 border-t border-rule pt-3 space-y-1.5 text-xs mono text-slate">
          <div className="flex justify-between"><span>Medicare rate</span><span className="text-ink">{formatUSD(numRate, { cents: true })}</span></div>
          <div className="flex justify-between"><span>Blended rate = rate × (mix + (1−mix) × mult)</span><span className="text-ink">{formatUSD(blendedRate(numRate, mix, mult), { cents: true })}</span></div>
          <div className="flex justify-between"><span>Annual volume</span><span className="text-ink">{numVol.toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Capture rate</span><span className="text-ink">{capture}%</span></div>
          <div className="flex justify-between border-t border-rule pt-1.5 mt-1.5"><span>Base = volume × blended × capture</span><span className="text-ink font-semibold">{formatUSD(out.base)}</span></div>
        </div>

        <p className="text-[10px] text-slate mt-3 italic">{DISCLAIMER}</p>

        {/* save */}
        <div className="mt-4 border-t border-rule pt-3 flex flex-wrap gap-2 items-center no-print">
          <input className="field !py-1.5 text-sm flex-1 min-w-[140px]" placeholder="Name this scenario (optional)" value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} />
          <button className="btn btn-sm" disabled={!canSave} onClick={save}>
            {savedMsg ? <Check size={13} /> : <Save size={13} />} {savedMsg ? "Saved" : "Save scenario"}
          </button>
        </div>
        {!canSave && (valid) && <p className="text-[10px] text-slate mt-2">Enter a rate and volume to save.</p>}
      </div>
    </div>
  );
}

export default function EstimatePage() {
  return (
    <Suspense fallback={<div className="card-plain h-40 animate-pulse" />}>
      <EstimateInner />
    </Suspense>
  );
}
