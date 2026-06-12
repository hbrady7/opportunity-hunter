import { guard, ok, fail } from "@/lib/agents/respond";
import { twoStageJSON } from "@/lib/agents/llm";
import { SERVICE_LINE_LABELS, type ServiceLine } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface CriterionIn {
  id: string;
  label: string;
  hardGate: boolean;
}
interface EvalOut {
  id: string;
  result: "PASS" | "FAIL" | "UNCLEAR";
  evidence: string;
}

export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;

  let body: { code?: string; serviceLine?: ServiceLine; criteria?: CriterionIn[] };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request body.", 400);
  }
  const code = (body.code || "").trim().toUpperCase();
  const serviceLine = (body.serviceLine || "Other") as ServiceLine;
  const criteria = Array.isArray(body.criteria) ? body.criteria.slice(0, 12) : [];
  if (!/^([0-9]{5}|[A-Z][0-9]{4})$/.test(code)) return fail("Invalid code.", 400);
  if (!criteria.length) return fail("No criteria to evaluate.", 400);

  const slLabel = SERVICE_LINE_LABELS[serviceLine] ?? "outpatient";
  const list = criteria.map((c, i) => `${i + 1}. [${c.id}]${c.hardGate ? " (HARD GATE)" : ""} ${c.label}`).join("\n");

  try {
    const { data, usedWebSearch } = await twoStageJSON<EvalOut[]>({
      researchSystem:
        "You are a hospital outpatient RCM analyst. You evaluate CPT/HCPCS codes against viability criteria for a consulting opportunity assessment, grounded in CMS OPPS status indicators, the Medicare fee schedules, and NCCI/packaging rules.",
      researchPrompt: `For code ${code} in the ${slLabel} service line (hospital outpatient), write <=130 words of plain notes covering exactly what's needed to judge these criteria:\n${list}\nCover: OPPS status indicator & separate payability, approximate national Medicare rate, NCCI/packaging/audit risk, documentation/coding/charge-capture leverage, and service-line relevance. Notes only.`,
      jsonSystem:
        "You convert RCM notes into a strict JSON array verdict per criterion. Output ONLY a JSON array. Be conservative: use UNCLEAR when the notes don't clearly support PASS or FAIL.",
      jsonInstruction: `Evaluate each criterion below for code ${code} and output a JSON array, one object per criterion, in the SAME ORDER:
[{"id":"<criterion id>","result":"PASS"|"FAIL"|"UNCLEAR","evidence":"<=15 words citing the reason"}]
Criteria:
${list}`,
      researchTokens: 1100,
      jsonTokens: 900,
    });

    const byId = new Map<string, EvalOut>();
    if (Array.isArray(data)) {
      for (const d of data) {
        if (d && typeof d.id === "string") {
          byId.set(d.id, {
            id: d.id,
            result: ["PASS", "FAIL", "UNCLEAR"].includes(d.result) ? d.result : "UNCLEAR",
            evidence: String(d.evidence || "").slice(0, 120),
          });
        }
      }
    }
    const results: EvalOut[] = criteria.map(
      (c) => byId.get(c.id) ?? { id: c.id, result: "UNCLEAR", evidence: "No clear evidence returned." }
    );

    return ok({ results, usedWebSearch });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Verification failed.");
  }
}
