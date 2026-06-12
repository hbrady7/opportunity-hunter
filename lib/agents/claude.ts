import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const WEB_SEARCH_TOOL = {
  type: "web_search_20250305" as const,
  name: "web_search" as const,
  max_uses: 4,
};

export function hasApiKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }
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
      // server tool use + result blocks indicate the search ran
      (b as { type: string }).type === "server_tool_use" ||
      (b as { type: string }).type === "web_search_tool_result"
  );
}

/**
 * STAGE 1 — research with web search, returning short plain-text notes.
 * Falls back to a knowledge-only call if web search errors or is unavailable.
 */
async function researchNotes(opts: {
  system: string;
  prompt: string;
  maxTokens: number;
}): Promise<{ notes: string; usedWebSearch: boolean }> {
  const client = getClient();

  // Attempt with web search.
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: opts.maxTokens,
      system: opts.system,
      tools: [WEB_SEARCH_TOOL],
      messages: [{ role: "user", content: opts.prompt }],
    });
    const notes = collectText(msg);
    if (notes) {
      return { notes, usedWebSearch: detectWebSearchUse(msg) };
    }
  } catch {
    // fall through to knowledge-only
  }

  // Knowledge-only fallback.
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
  });
  return { notes: collectText(msg), usedWebSearch: false };
}

/**
 * STAGE 2 — convert plain-text notes into strict JSON (no tools).
 */
async function notesToJSON(opts: {
  system: string;
  instruction: string;
  notes: string;
  maxTokens: number;
}): Promise<string> {
  const client = getClient();
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: [
      {
        role: "user",
        content: `${opts.instruction}\n\n--- RESEARCH NOTES ---\n${opts.notes}\n--- END NOTES ---\n\nReturn ONLY the JSON object. No prose, no code fences.`,
      },
    ],
  });
  return collectText(msg);
}

/** Tolerant JSON extraction: strip fences, fix trailing commas, balance braces. */
export function extractJSON<T = unknown>(raw: string): T {
  let s = raw.trim();
  // strip code fences
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  // grab from first { or [ to the end
  const firstObj = s.indexOf("{");
  const firstArr = s.indexOf("[");
  let start = -1;
  if (firstObj === -1) start = firstArr;
  else if (firstArr === -1) start = firstObj;
  else start = Math.min(firstObj, firstArr);
  if (start > 0) s = s.slice(start);

  const tryParse = (str: string): T | null => {
    try {
      return JSON.parse(str) as T;
    } catch {
      return null;
    }
  };

  let parsed = tryParse(s);
  if (parsed !== null) return parsed;

  // remove trailing commas
  let cleaned = s.replace(/,\s*([}\]])/g, "$1");
  parsed = tryParse(cleaned);
  if (parsed !== null) return parsed;

  // balance braces/brackets for truncation
  const opensCurly = (cleaned.match(/{/g) || []).length;
  const closesCurly = (cleaned.match(/}/g) || []).length;
  const opensSq = (cleaned.match(/\[/g) || []).length;
  const closesSq = (cleaned.match(/\]/g) || []).length;
  // close any dangling string first (odd number of unescaped quotes)
  const quoteCount = (cleaned.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 === 1) cleaned += '"';
  cleaned += "]".repeat(Math.max(0, opensSq - closesSq));
  cleaned += "}".repeat(Math.max(0, opensCurly - closesCurly));
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");
  parsed = tryParse(cleaned);
  if (parsed !== null) return parsed;

  throw new Error("Could not parse JSON from model output");
}

export interface TwoStageResult<T> {
  data: T;
  usedWebSearch: boolean;
}

/**
 * The two-stage pattern: research (web search → notes) then structure (notes → JSON).
 */
export async function twoStageJSON<T>(opts: {
  researchSystem: string;
  researchPrompt: string;
  jsonSystem: string;
  jsonInstruction: string;
  researchTokens?: number;
  jsonTokens?: number;
}): Promise<TwoStageResult<T>> {
  const { notes, usedWebSearch } = await researchNotes({
    system: opts.researchSystem,
    prompt: opts.researchPrompt,
    maxTokens: opts.researchTokens ?? 1200,
  });

  const json = await notesToJSON({
    system: opts.jsonSystem,
    instruction: opts.jsonInstruction,
    notes,
    maxTokens: opts.jsonTokens ?? 1400,
  });

  const data = extractJSON<T>(json);
  return { data, usedWebSearch };
}

/** Single-shot plain text answer (used by Learn's Ask box). Optional web search. */
export async function askText(opts: {
  system: string;
  prompt: string;
  maxTokens?: number;
  webSearch?: boolean;
}): Promise<{ text: string; usedWebSearch: boolean }> {
  const client = getClient();
  if (opts.webSearch) {
    try {
      const msg = await client.messages.create({
        model: MODEL,
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
    model: MODEL,
    max_tokens: opts.maxTokens ?? 900,
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
  });
  return { text: collectText(msg), usedWebSearch: false };
}

export { MODEL };
