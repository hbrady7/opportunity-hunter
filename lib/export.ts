import type { CodeEntry } from "./types";
import { SERVICE_LINE_LABELS } from "./constants";

function bestBase(e: CodeEntry): number | null {
  if (!e.scenarios.length) return null;
  return e.scenarios[0].base;
}

const HEADERS = [
  "Code",
  "Service Line",
  "Description",
  "Verdict",
  "Separately Reimbursable",
  "Status Indicator",
  "Medicare Rate",
  "User Qty",
  "User Charges",
  "Verification",
  "Est. Opportunity (base)",
];

function row(e: CodeEntry): (string | number)[] {
  return [
    e.code,
    SERVICE_LINE_LABELS[e.serviceLine],
    e.research?.description ?? "(to research)",
    e.research?.verdict ?? "",
    e.research?.reimbursable ?? "",
    e.research?.statusIndicator ?? "",
    e.research?.medicareRate ?? "",
    e.userQty ?? "",
    e.userCharges ?? "",
    e.verification?.result ?? "",
    bestBase(e) != null ? Math.round(bestBase(e)!) : "",
  ];
}

export function toCSV(entries: CodeEntry[]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [HEADERS.join(",")];
  for (const e of entries) lines.push(row(e).map(esc).join(","));
  return lines.join("\n");
}

export function toMarkdownTable(entries: CodeEntry[]): string {
  const fmt = (v: string | number) => String(v).replace(/\|/g, "\\|");
  const lines = [
    `| ${HEADERS.join(" | ")} |`,
    `| ${HEADERS.map(() => "---").join(" | ")} |`,
  ];
  for (const e of entries) lines.push(`| ${row(e).map(fmt).join(" | ")} |`);
  return lines.join("\n");
}
