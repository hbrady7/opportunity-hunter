import type {
  ServiceLine,
  Verdict,
  Reimbursable,
  VerificationResult,
  CriterionResult,
} from "./constants";

/** Result of researching a code (Hunt module / agent output). */
export interface Research {
  description: string;
  category: string;
  reimbursable: Reimbursable;
  statusIndicator: string; // OPPS SI, e.g. "S", "J1", "N"
  statusDetail: string; // plain-english explanation of the SI
  medicareRate: number | null; // approx national Medicare rate, USD
  documentation: string[]; // documentation requirements
  opportunityAngle: string; // why this is an opportunity
  riskFlags: string[]; // short risk tags
  verdict: Verdict;
  verdictBasis: string; // one-line basis
  usedWebSearch: boolean;
  researchedAt: number;
}

export interface CriterionEvalResult {
  criterionId: string;
  label: string;
  result: CriterionResult;
  evidence: string; // <= 15 words
  hardGate: boolean;
}

export interface Verification {
  result: VerificationResult;
  criteria: CriterionEvalResult[];
  usedWebSearch: boolean;
  verifiedAt: number;
}

export interface EstimateScenario {
  id: string;
  name: string;
  // inputs
  medicareRate: number;
  annualVolume: number;
  medicareMixPct: number;
  commercialMultiplier: number;
  captureRate: number;
  // outputs
  low: number;
  base: number;
  high: number;
  createdAt: number;
}

export type TimelineKind =
  | "researched"
  | "verified"
  | "estimated"
  | "drafted"
  | "added"
  | "note";

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  detail: string;
  at: number;
}

/** A code entry in the Library — the central record. */
export interface CodeEntry {
  id: string;
  code: string;
  serviceLine: ServiceLine;
  // user-entered pivot figures (optional)
  userQty: number | null;
  userCharges: number | null;
  // agent / derived data
  research: Research | null;
  verification: Verification | null;
  scenarios: EstimateScenario[];
  notes: string;
  timeline: TimelineEvent[];
  // "to research" if research === null
  createdAt: number;
  updatedAt: number;
}

/** A verification criterion (user-controlled). */
export interface Criterion {
  id: string;
  label: string;
  hardGate: boolean;
  agentEvaluable: boolean; // false = checked locally (e.g. exclusion list)
  // optional numeric threshold for inline editing (e.g. rate >= $25)
  threshold?: number;
  thresholdKind?: "minMedicareRate";
  builtin?: boolean; // exclusion-list gate is special
  enabled: boolean;
}

export type DraftTemplate = "workpaper" | "slide" | "mentor";

export interface Draft {
  id: string;
  template: DraftTemplate;
  title: string;
  codeIds: string[];
  content: string;
  createdAt: number;
}

export interface ScoutCandidate {
  code: string;
  name: string;
  whyNow: string;
}

/** A captured question (mentor question bank). */
export interface Question {
  id: string;
  text: string;
  source: string; // where it was captured from
  code?: string;
  answered: boolean;
  createdAt: number;
}
