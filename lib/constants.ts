export const SERVICE_LINES = [
  "ED",
  "Observation",
  "Women's Health",
  "Oncology",
  "Other",
] as const;
export type ServiceLine = (typeof SERVICE_LINES)[number];

export const SERVICE_LINE_LABELS: Record<ServiceLine, string> = {
  ED: "Emergency Department",
  Observation: "Observation",
  "Women's Health": "Women's Health",
  Oncology: "Oncology",
  Other: "Other",
};

export type Verdict = "STRONG" | "MODERATE" | "WEAK";
export type Reimbursable = "Yes" | "No" | "Conditional";
export type VerificationResult = "VERIFIED" | "CONDITIONAL" | "FAILED";
export type CriterionResult = "PASS" | "FAIL" | "UNCLEAR";

export const VERDICT_STAMP: Record<Verdict, { label: string; cls: string }> = {
  STRONG: { label: "STRONG OPPORTUNITY", cls: "stamp-green" },
  MODERATE: { label: "MODERATE OPPORTUNITY", cls: "stamp-amber" },
  WEAK: { label: "WEAK OPPORTUNITY", cls: "stamp-red" },
};

export const VERIFY_STAMP: Record<VerificationResult, { label: string; cls: string }> = {
  VERIFIED: { label: "VERIFIED", cls: "stamp-green" },
  CONDITIONAL: { label: "CONDITIONAL", cls: "stamp-amber" },
  FAILED: { label: "FAILED", cls: "stamp-red" },
};

// Estimator assumption defaults
export const DEFAULT_ASSUMPTIONS = {
  medicareMixPct: 45, // % of volume reimbursed at Medicare; rest at commercial
  commercialMultiplier: 1.6, // commercial rate as multiple of Medicare
  captureRate: 85, // % of opportunity actually captured
};

export const SCENARIO_BOUNDS = {
  low: { commercialMultiplier: 1.3, captureRate: 70 },
  high: { commercialMultiplier: 2.0, captureRate: 95 },
};

export const RATE_LIMIT = { maxPerHour: 20 };

export const DISCLAIMER =
  "Directional estimate from national Medicare rates and stated assumptions — not a quote, verify before client use.";

export const FALLBACK_NOTE =
  "Based on model knowledge — verify rates before client use.";
