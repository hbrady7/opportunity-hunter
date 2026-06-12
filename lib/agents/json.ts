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

export interface TwoStageOpts {
  researchSystem: string;
  researchPrompt: string;
  jsonSystem: string;
  jsonInstruction: string;
  researchTokens?: number;
  jsonTokens?: number;
}

export interface AskOpts {
  system: string;
  prompt: string;
  maxTokens?: number;
  webSearch?: boolean;
}

export const JSON_STAGE2_SUFFIX =
  "\n\nReturn ONLY the JSON object. No prose, no code fences.";
