import { GoogleGenAI } from "@google/genai";
import { extractJSON, type TwoStageResult, type TwoStageOpts, type AskOpts, JSON_STAGE2_SUFFIX } from "./json";

// Gemini 2.5 Flash is free-tier eligible in Google AI Studio.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function getClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

interface GenResult {
  text: string;
  grounded: boolean;
}

async function generate(
  ai: GoogleGenAI,
  system: string,
  prompt: string,
  maxTokens: number,
  useSearch: boolean,
  jsonMode = false
): Promise<GenResult> {
  const res = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction: system,
      maxOutputTokens: maxTokens,
      // Disable "thinking" so the token budget goes to the actual answer —
      // keeps responses fast, cheap, and within maxOutputTokens.
      thinkingConfig: { thinkingBudget: 0 },
      ...(useSearch ? { tools: [{ googleSearch: {} }] } : {}),
      ...(jsonMode && !useSearch ? { responseMimeType: "application/json" } : {}),
    },
  });
  const text = (res.text ?? "").trim();
  const grounded = !!res.candidates?.[0]?.groundingMetadata;
  return { text, grounded };
}

/** Stage 1: ground with Google Search → plain notes. Falls back to no-search. */
async function researchNotes(ai: GoogleGenAI, system: string, prompt: string, maxTokens: number) {
  try {
    const r = await generate(ai, system, prompt, maxTokens, true);
    if (r.text) return { notes: r.text, usedWebSearch: r.grounded };
  } catch {
    /* fall through */
  }
  const r = await generate(ai, system, prompt, maxTokens, false);
  return { notes: r.text, usedWebSearch: false };
}

export async function geminiTwoStageJSON<T>(opts: TwoStageOpts): Promise<TwoStageResult<T>> {
  const ai = getClient();
  const { notes, usedWebSearch } = await researchNotes(
    ai,
    opts.researchSystem,
    opts.researchPrompt,
    opts.researchTokens ?? 1200
  );
  const r = await generate(
    ai,
    opts.jsonSystem,
    `${opts.jsonInstruction}\n\n--- RESEARCH NOTES ---\n${notes}\n--- END NOTES ---${JSON_STAGE2_SUFFIX}`,
    opts.jsonTokens ?? 1400,
    false,
    true
  );
  return { data: extractJSON<T>(r.text), usedWebSearch };
}

export async function geminiAskText(opts: AskOpts): Promise<{ text: string; usedWebSearch: boolean }> {
  const ai = getClient();
  if (opts.webSearch) {
    try {
      const r = await generate(ai, opts.system, opts.prompt, opts.maxTokens ?? 900, true);
      if (r.text) return { text: r.text, usedWebSearch: r.grounded };
    } catch {
      /* fall through */
    }
  }
  const r = await generate(ai, opts.system, opts.prompt, opts.maxTokens ?? 900, false);
  return { text: r.text, usedWebSearch: false };
}
