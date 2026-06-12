import type { CriterionEvalResult } from "./types";
import type { VerificationResult } from "./constants";

/**
 * Deterministic overall result:
 * - any HARD GATE that FAILs → FAILED
 * - all hard gates PASS and >=75% of soft criteria PASS → VERIFIED
 * - otherwise CONDITIONAL
 */
export function scoreVerification(criteria: CriterionEvalResult[]): VerificationResult {
  const hard = criteria.filter((c) => c.hardGate);
  const soft = criteria.filter((c) => !c.hardGate);

  if (hard.some((c) => c.result === "FAIL")) return "FAILED";

  const allHardPass = hard.every((c) => c.result === "PASS");
  const softPass = soft.filter((c) => c.result === "PASS").length;
  const softRatio = soft.length === 0 ? 1 : softPass / soft.length;

  if (allHardPass && softRatio >= 0.75) return "VERIFIED";
  return "CONDITIONAL";
}
