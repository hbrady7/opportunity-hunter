import { hasApiKey, MODEL } from "@/lib/agents/claude";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    keyConfigured: hasApiKey(),
    model: hasApiKey() ? MODEL : null,
  });
}
