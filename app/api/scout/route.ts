import { guard, ok, fail } from "@/lib/agents/respond";
import { twoStageJSON } from "@/lib/agents/llm";
import { SERVICE_LINE_LABELS, type ServiceLine } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Candidate {
  code: string;
  name: string;
  whyNow: string;
}

export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;

  let body: { serviceLine?: ServiceLine; focus?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request body.", 400);
  }
  const serviceLine = (body.serviceLine || "ED") as ServiceLine;
  const focus = String(body.focus || "").slice(0, 200);
  const slLabel = SERVICE_LINE_LABELS[serviceLine] ?? "outpatient";

  try {
    const { data, usedWebSearch } = await twoStageJSON<Candidate[]>({
      researchSystem:
        "You are a hospital outpatient RCM analyst hunting for net-new revenue opportunities. You look for emerging, under-adopted, or recently added/expanded outpatient procedures and services that hospitals often fail to capture or code.",
      researchPrompt: `For the ${slLabel} service line in a HOSPITAL OUTPATIENT setting, identify up to 8 specific CPT/HCPCS codes that represent under-adopted or commonly under-captured revenue opportunities${
        focus ? `, with this focus: ${focus}` : ""
      }. Favor separately payable services. In <=130 words of notes, list each as CODE — short name — why it's an opportunity now. Notes only.`,
      jsonSystem: "You output a strict JSON array only. Use real CPT/HCPCS codes. No more than 8 items.",
      jsonInstruction: `Output a JSON array (max 8) of candidate procedures for ${slLabel}:
[{"code":"CPT/HCPCS","name":"short name <=8 words","whyNow":"<=25 words on why it's an under-captured opportunity"}]`,
      researchTokens: 1100,
      jsonTokens: 900,
    });

    const seen = new Set<string>();
    const candidates: Candidate[] = (Array.isArray(data) ? data : [])
      .filter((c) => c && typeof c.code === "string" && /^([0-9]{5}|[A-Za-z][0-9]{4})$/.test(c.code.trim()))
      .map((c) => ({
        code: c.code.trim().toUpperCase(),
        name: String(c.name || "").slice(0, 80),
        whyNow: String(c.whyNow || "").slice(0, 180),
      }))
      .filter((c) => (seen.has(c.code) ? false : (seen.add(c.code), true)))
      .slice(0, 8);

    return ok({ candidates, usedWebSearch });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Scout failed.");
  }
}
