import type { TwoStageResult, TwoStageOpts, AskOpts } from "./json";
import { anthropicTwoStageJSON, anthropicAskText, ANTHROPIC_MODEL } from "./anthropic";
import { geminiTwoStageJSON, geminiAskText, GEMINI_MODEL } from "./gemini";

export type Provider = "gemini" | "anthropic" | null;

/** Gemini is preferred when both keys are set (it has a free tier). */
export function activeProvider(): Provider {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export function hasApiKey(): boolean {
  return activeProvider() !== null;
}

export function activeModel(): string | null {
  const p = activeProvider();
  if (p === "gemini") return GEMINI_MODEL;
  if (p === "anthropic") return ANTHROPIC_MODEL;
  return null;
}

export function twoStageJSON<T>(opts: TwoStageOpts): Promise<TwoStageResult<T>> {
  return activeProvider() === "gemini" ? geminiTwoStageJSON<T>(opts) : anthropicTwoStageJSON<T>(opts);
}

export function askText(opts: AskOpts): Promise<{ text: string; usedWebSearch: boolean }> {
  return activeProvider() === "gemini" ? geminiAskText(opts) : anthropicAskText(opts);
}
