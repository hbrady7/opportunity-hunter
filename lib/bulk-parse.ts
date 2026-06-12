import { isValidCode, normalizeCode } from "./utils";

export const MAX_BULK_ROWS = 50;

export interface RawRow {
  code: string;
  a: number | null;
  b: number | null;
  aDollar: boolean;
  bDollar: boolean;
}

export interface ParseResult {
  rows: RawRow[];
  invalid: string[]; // raw lines that didn't yield a valid code
  truncated: boolean; // more than MAX_BULK_ROWS input rows
}

export type ColumnOrder = "a-qty" | "a-charges";

export interface PreviewRow {
  code: string;
  qty: number | null;
  charges: number | null;
}

function parseNum(tok: string): { value: number | null; dollar: boolean } {
  const dollar = tok.includes("$");
  const cleaned = tok.replace(/[$,\s]/g, "");
  if (cleaned === "" || cleaned === "-") return { value: null, dollar };
  const n = Number(cleaned);
  return { value: Number.isFinite(n) ? n : null, dollar };
}

function looksLikeHeader(line: string): boolean {
  const first = line.split(/[\t,]/)[0]?.trim() ?? "";
  return !isValidCode(first) && /[a-z]/i.test(first) && /cpt|code|qty|quantity|charge/i.test(line);
}

/** Parse pasted CPT / qty / charges rows. Tab-separated preferred; falls back to comma. */
export function parseRows(text: string): ParseResult {
  const allLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const lines = allLines.filter((l, i) => !(i === 0 && looksLikeHeader(l)));
  const truncated = lines.length > MAX_BULK_ROWS;
  const capped = lines.slice(0, MAX_BULK_ROWS);

  const rows: RawRow[] = [];
  const invalid: string[] = [];

  for (const line of capped) {
    const parts = (line.includes("\t") ? line.split("\t") : line.split(","))
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (parts.length === 0) continue;
    const code = normalizeCode(parts[0]);
    if (!isValidCode(code)) {
      invalid.push(line);
      continue;
    }
    const nums = parts.slice(1).map(parseNum).filter((n) => n.value !== null);
    rows.push({
      code,
      a: nums[0]?.value ?? null,
      b: nums[1]?.value ?? null,
      aDollar: nums[0]?.dollar ?? false,
      bDollar: nums[1]?.dollar ?? false,
    });
  }
  return { rows, invalid, truncated };
}

/** Infer which column is quantity vs charges. */
export function inferOrder(rows: RawRow[]): { order: ColumnOrder; ambiguous: boolean } {
  const withB = rows.filter((r) => r.b !== null);
  // single-column input — can't tell qty from charges
  if (withB.length === 0) {
    return { order: "a-charges", ambiguous: rows.length > 0 };
  }
  const anyADollar = rows.some((r) => r.aDollar);
  const anyBDollar = rows.some((r) => r.bDollar);
  if (anyADollar && !anyBDollar) return { order: "a-charges", ambiguous: false };
  if (anyBDollar && !anyADollar) return { order: "a-qty", ambiguous: false };

  const sumA = withB.reduce((s, r) => s + (r.a ?? 0), 0);
  const sumB = withB.reduce((s, r) => s + (r.b ?? 0), 0);
  if (sumB >= 10 * sumA && sumA > 0) return { order: "a-qty", ambiguous: false };
  if (sumA >= 10 * sumB && sumB > 0) return { order: "a-charges", ambiguous: false };
  return { order: "a-qty", ambiguous: true };
}

export function applyOrder(rows: RawRow[], order: ColumnOrder): PreviewRow[] {
  return rows.map((r) =>
    order === "a-qty"
      ? { code: r.code, qty: r.a, charges: r.b }
      : { code: r.code, qty: r.b, charges: r.a }
  );
}
