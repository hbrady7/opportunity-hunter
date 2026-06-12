import { guard, ok, fail } from "@/lib/agents/respond";
import { twoStageJSON } from "@/lib/agents/llm";
import { SERVICE_LINE_LABELS, type ServiceLine } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ResearchJSON {
  description: string;
  category: string;
  reimbursable: "Yes" | "No" | "Conditional";
  statusIndicator: string;
  statusDetail: string;
  medicareRate: number | null;
  documentation: string[];
  opportunityAngle: string;
  riskFlags: string[];
  verdict: "STRONG" | "MODERATE" | "WEAK";
  verdictBasis: string;
}

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
  if (!/^([0-9]{5}|[A-Z][0-9]{4})$/.test(code)) {
    return fail("Provide a valid 5-digit CPT or letter+4-digit HCPCS code.", 400);
  }
  const slLabel = SERVICE_LINE_LABELS[serviceLine] ?? "outpatient";

  try {
    const { data, usedWebSearch } = await twoStageJSON<ResearchJSON>({
      researchSystem:
        "You are a hospital outpatient revenue cycle (RCM) analyst supporting a consulting engagement. You research CPT/HCPCS codes against CMS sources: the OPPS Addendum B status indicators, the Medicare Physician Fee Schedule, and NCCI/packaging rules. Be precise and current; prefer primary CMS data.",
      researchPrompt: `Research code ${code} for the ${slLabel} service line in a HOSPITAL OUTPATIENT setting. In <=130 words of plain-text notes, capture: (1) what the code is; (2) its OPPS status indicator and whether it is SEPARATELY reimbursable vs packaged/bundled; (3) an approximate NATIONAL Medicare payment amount in USD (OPPS APC rate or PFS national, whichever applies) — give a number if you can; (4) the key documentation requirements; (5) why it could be a revenue opportunity in this service line; (6) notable risks (NCCI bundling, packaging, audit, MUE). Notes only — no JSON.`,
      jsonSystem:
        "You convert RCM research notes into one strict JSON object. Output ONLY JSON. Never invent precision you don't have — use null for an unknown rate.",
      jsonInstruction: `Convert the notes into this exact JSON shape for code ${code} (${slLabel}):
{
  "description": "plain-English description, <=20 words",
  "category": "short category, e.g. 'E/M visit', 'Drug administration', 'Imaging', 'Surgical procedure'",
  "reimbursable": "Yes" | "No" | "Conditional",
  "statusIndicator": "OPPS status indicator like 'S','T','J1','N','Q1' (or 'N/A' if PFS-only)",
  "statusDetail": "<=18 words explaining what that status indicator means for separate payment",
  "medicareRate": number or null (approx national Medicare USD, no $ sign),
  "documentation": ["3-5 concise documentation requirements"],
  "opportunityAngle": "<=25 words on the revenue opportunity in this service line",
  "riskFlags": ["2-4 short risk tags, e.g. 'NCCI bundling','Packaged when on same claim','High MUE scrutiny'"],
  "verdict": "STRONG" | "MODERATE" | "WEAK",
  "verdictBasis": "<=15 words: the single biggest reason for the verdict"
}
Rules: "reimbursable" = "Yes" only if the status indicator pays separately under OPPS; "No" if packaged (N) or not separately payable; "Conditional" if it depends on modifiers/circumstances. verdict STRONG only when separately reimbursable AND a meaningful rate AND addressable; WEAK when packaged or trivial rate.`,
      researchTokens: 1100,
      jsonTokens: 1100,
    });

    // sanitize
    const clean: ResearchJSON = {
      description: String(data.description || "").slice(0, 200),
      category: String(data.category || "—").slice(0, 60),
      reimbursable: ["Yes", "No", "Conditional"].includes(data.reimbursable) ? data.reimbursable : "Conditional",
      statusIndicator: String(data.statusIndicator || "N/A").slice(0, 8),
      statusDetail: String(data.statusDetail || "").slice(0, 160),
      medicareRate:
        typeof data.medicareRate === "number" && isFinite(data.medicareRate) && data.medicareRate >= 0
          ? data.medicareRate
          : null,
      documentation: Array.isArray(data.documentation) ? data.documentation.slice(0, 6).map(String) : [],
      opportunityAngle: String(data.opportunityAngle || "").slice(0, 220),
      riskFlags: Array.isArray(data.riskFlags) ? data.riskFlags.slice(0, 5).map((r) => String(r).slice(0, 40)) : [],
      verdict: ["STRONG", "MODERATE", "WEAK"].includes(data.verdict) ? data.verdict : "MODERATE",
      verdictBasis: String(data.verdictBasis || "").slice(0, 120),
    };

    return ok({ research: clean, usedWebSearch });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Research failed. Try again.");
  }
}
