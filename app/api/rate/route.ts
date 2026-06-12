import { guard, ok, fail } from "@/lib/agents/respond";
import { twoStageJSON } from "@/lib/agents/llm";
import { SERVICE_LINE_LABELS, type ServiceLine } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;

  let body: { code?: string; serviceLine?: ServiceLine };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request body.", 400);
  }
  const code = (body.code || "").trim().toUpperCase();
  const serviceLine = (body.serviceLine || "Other") as ServiceLine;
  if (!/^([0-9]{5}|[A-Z][0-9]{4})$/.test(code)) return fail("Invalid code.", 400);
  const slLabel = SERVICE_LINE_LABELS[serviceLine] ?? "outpatient";

  try {
    const { data, usedWebSearch } = await twoStageJSON<{ rate: number | null; note: string }>({
      researchSystem:
        "You are a hospital outpatient RCM analyst. You look up approximate national Medicare payment amounts from OPPS (APC) and the Physician Fee Schedule.",
      researchPrompt: `In <=80 words, give the approximate NATIONAL Medicare payment for code ${code} in a hospital outpatient (${slLabel}) setting. Prefer the OPPS APC national unadjusted rate; if it's a professional/PFS code, give the national non-facility/facility amount. State a single best-estimate USD number. Notes only.`,
      jsonSystem: "You output one strict JSON object only. Use null if no rate is known.",
      jsonInstruction: `Output: {"rate": number or null (approx national Medicare USD for ${code}, no $ sign), "note": "<=15 words on what the rate represents"}`,
      researchTokens: 600,
      jsonTokens: 300,
    });

    const rate =
      typeof data.rate === "number" && isFinite(data.rate) && data.rate >= 0 ? data.rate : null;
    return ok({ rate, note: String(data.note || "").slice(0, 120), usedWebSearch });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Rate lookup failed.");
  }
}
