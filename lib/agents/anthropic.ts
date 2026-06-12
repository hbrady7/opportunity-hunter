import Anthropic from "@anthropic-ai/sdk";
import { extractJSON, type TwoStageResult, type TwoStageOpts, type AskOpts, JSON_STAGE2_SUFFIX } from "./json";

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const WEB_SEARCH_TOOL = {
  type: "web_search_20250305" as const,
  name: "web_search" as const,
  max_uses: 4,
};

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function collectText(msg: Anthropic.Messages.Message): string {
  return msg.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

function detectWebSearchUse(msg: Anthropic.Messages.Message): boolean {
  return msg.content.some(
    (b) =>
      (b as { type: string }).type === "server_tool_use" ||
      (b as { type: string }).type === "web_search_tool_result"
  );
}

async function researchNotes(system: string, prompt: string, maxTokens: number) {
  const client = getClient();
  try {
    const msg = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      tools: [WEB_SEARCH_TOOL],
      messages: [{ role: "user", content: prompt }],
    });
    const notes = collectText(msg);
    if (notes) return { notes, usedWebSearch: detectWebSearchUse(msg) };
  } catch {
    /* fall through */
  }
  const msg = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  return { notes: collectText(msg), usedWebSearch: false };
}

export async function anthropicTwoStageJSON<T>(opts: TwoStageOpts): Promise<TwoStageResult<T>> {
  const { notes, usedWebSearch } = await researchNotes(
    opts.researchSystem,
    opts.researchPrompt,
    opts.researchTokens ?? 1200
  );
  const client = getClient();
  const msg = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: opts.jsonTokens ?? 1400,
    system: opts.jsonSystem,
    messages: [
      {
        role: "user",
        content: `${opts.jsonInstruction}\n\n--- RESEARCH NOTES ---\n${notes}\n--- END NOTES ---${JSON_STAGE2_SUFFIX}`,
      },
    ],
  });
  return { data: extractJSON<T>(collectText(msg)), usedWebSearch };
}

export async function anthropicAskText(opts: AskOpts): Promise<{ text: string; usedWebSearch: boolean }> {
  const client = getClient();
  if (opts.webSearch) {
    try {
      const msg = await client.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: opts.maxTokens ?? 900,
        system: opts.system,
        tools: [WEB_SEARCH_TOOL],
        messages: [{ role: "user", content: opts.prompt }],
      });
      const text = collectText(msg);
      if (text) return { text, usedWebSearch: detectWebSearchUse(msg) };
    } catch {
      /* fall through */
    }
  }
  const msg = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: opts.maxTokens ?? 900,
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
  });
  return { text: collectText(msg), usedWebSearch: false };
}
