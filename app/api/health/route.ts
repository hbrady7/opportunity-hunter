import { hasApiKey, activeModel, activeProvider } from "@/lib/agents/llm";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    keyConfigured: hasApiKey(),
    provider: activeProvider(),
    model: activeModel(),
  });
}
