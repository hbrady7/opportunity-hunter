import { SCENARIO_BOUNDS } from "./constants";

export interface EstimateInputs {
  medicareRate: number;
  annualVolume: number;
  medicareMixPct: number; // 0-100
  commercialMultiplier: number;
  captureRate: number; // 0-100
}

export interface EstimateOutputs {
  blendedRate: number;
  low: number;
  base: number;
  high: number;
}

/** blendedRate = rate × (mixFrac + (1 − mixFrac) × multiplier) */
export function blendedRate(rate: number, mixPct: number, multiplier: number): number {
  const mix = Math.min(1, Math.max(0, mixPct / 100));
  return rate * (mix + (1 - mix) * multiplier);
}

function opportunity(rate: number, mixPct: number, multiplier: number, volume: number, capturePct: number): number {
  const capture = Math.min(1, Math.max(0, capturePct / 100));
  return volume * blendedRate(rate, mixPct, multiplier) * capture;
}

export function computeEstimate(i: EstimateInputs): EstimateOutputs {
  const rate = i.medicareRate || 0;
  const vol = i.annualVolume || 0;
  return {
    blendedRate: blendedRate(rate, i.medicareMixPct, i.commercialMultiplier),
    base: opportunity(rate, i.medicareMixPct, i.commercialMultiplier, vol, i.captureRate),
    low: opportunity(rate, i.medicareMixPct, SCENARIO_BOUNDS.low.commercialMultiplier, vol, SCENARIO_BOUNDS.low.captureRate),
    high: opportunity(rate, i.medicareMixPct, SCENARIO_BOUNDS.high.commercialMultiplier, vol, SCENARIO_BOUNDS.high.captureRate),
  };
}
