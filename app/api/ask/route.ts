import { guard, ok, fail } from "@/lib/agents/respond";
import { askText } from "@/lib/agents/claude";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;

  let body: { question?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request body.", 400);
  }
  const question = String(body.question || "").trim().slice(0, 500);
  if (!question) return fail("Ask a question.", 400);

  try {
    const { text, usedWebSearch } = await askText({
      system:
        "You are a healthcare revenue cycle analyst. Answer concisely for a consulting intern new to CMS reimbursement. Be accurate and practical. Always name which CMS source to verify against (e.g. OPPS Addendum B, the PFS Lookup Tool, NCCI edit files, an MLN booklet). Keep answers under ~180 words. Use short paragraphs or bullet points.",
      prompt: question,
      maxTokens: 700,
      webSearch: true,
    });
    return ok({ answer: text, usedWebSearch });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not answer.");
  }
}
