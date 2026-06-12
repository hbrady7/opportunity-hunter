import type { CodeEntry, DraftTemplate } from "./types";
import { SERVICE_LINE_LABELS } from "./constants";
import { formatUSD } from "./utils";
import { DISCLAIMER } from "./constants";

function bestScenario(e: CodeEntry) {
  return e.scenarios.length ? e.scenarios[0] : null;
}

function rateStr(e: CodeEntry): string {
  const r = e.research?.medicareRate;
  return r != null ? formatUSD(r, { cents: true }) : "rate TBD";
}

/** Workpaper section — formal consulting prose per code. */
function workpaper(entries: CodeEntry[]): string {
  const out: string[] = ["# Service Line Research Workpaper", ""];
  for (const e of entries) {
    const r = e.research;
    out.push(`## ${e.code} — ${r?.description ?? "(not yet researched)"}`);
    out.push(`**Service line:** ${SERVICE_LINE_LABELS[e.serviceLine]}  `);
    if (r) {
      out.push(`**Category:** ${r.category}`, "");
      out.push(
        `**Reimbursability finding.** Code ${e.code} carries OPPS status indicator **${r.statusIndicator}** — ${r.statusDetail} ` +
          `It is assessed as **${r.reimbursable === "Yes" ? "separately reimbursable" : r.reimbursable === "No" ? "not separately payable (packaged)" : "conditionally reimbursable"}** under OPPS. ` +
          `Approximate national Medicare reimbursement is **${rateStr(e)}**.`,
        ""
      );
      if (r.documentation.length) {
        out.push(`**Documentation requirements.**`);
        for (const d of r.documentation) out.push(`- ${d}`);
        out.push("");
      }
      if (r.riskFlags.length) {
        out.push(`**Risks & considerations.** ${r.riskFlags.join("; ")}.`, "");
      }
      if (e.verification) {
        const passed = e.verification.criteria.filter((c) => c.result === "PASS").length;
        out.push(
          `**Verification.** Overall result: **${e.verification.result}** (${passed}/${e.verification.criteria.length} criteria passed against the firm's viability framework).`,
          ""
        );
      }
      const sc = bestScenario(e);
      if (sc) {
        out.push(
          `**Estimated annual opportunity.** ${formatUSD(sc.low)} (low) / **${formatUSD(sc.base)}** (base) / ${formatUSD(sc.high)} (high), ` +
            `based on ${sc.annualVolume.toLocaleString()} annual units at a ${rateStr(e)} Medicare baseline. _${DISCLAIMER}_`,
          ""
        );
      }
      out.push(
        `**Recommendation.** ${
          r.reimbursable === "Yes"
            ? `Advance ${e.code} as an implementation candidate for ${SERVICE_LINE_LABELS[e.serviceLine]}. ${r.opportunityAngle}`
            : r.reimbursable === "Conditional"
            ? `Treat ${e.code} as conditional — confirm the billing scenario unlocks separate payment before recommending. ${r.opportunityAngle}`
            : `Do not advance ${e.code} as standalone new revenue; it is packaged. Note for context only.`
        }`,
        ""
      );
    } else {
      out.push(`_This code is logged for research; complete the Hunt step before drafting a finding._`, "");
    }
    if (e.notes.trim()) out.push(`> Analyst note: ${e.notes.trim()}`, "");
    out.push("---", "");
  }
  return out.join("\n").trim();
}

/** Slide content — grouped by service line: bullets + table sized for one slide. */
function slide(entries: CodeEntry[]): string {
  const byLine = new Map<string, CodeEntry[]>();
  for (const e of entries) {
    const k = SERVICE_LINE_LABELS[e.serviceLine];
    if (!byLine.has(k)) byLine.set(k, []);
    byLine.get(k)!.push(e);
  }
  const out: string[] = [];
  for (const [line, list] of byLine) {
    out.push(`# ${line} — Outpatient Revenue Opportunities`, "");
    const strong = list.filter((e) => e.research?.verdict === "STRONG").length;
    out.push(`- ${list.length} code(s) evaluated; ${strong} rated STRONG opportunity`);
    const reimb = list.filter((e) => e.research?.reimbursable === "Yes").length;
    out.push(`- ${reimb} confirmed separately reimbursable under OPPS`);
    const totalBase = list.reduce((s, e) => s + (bestScenario(e)?.base ?? 0), 0);
    if (totalBase > 0) out.push(`- Combined directional opportunity: ${formatUSD(totalBase)} (base scenario)`);
    out.push("");
    out.push(`| Code | Description | Medicare | Verdict | Rationale |`);
    out.push(`| --- | --- | --- | --- | --- |`);
    for (const e of list) {
      const r = e.research;
      const rationale = (r?.verdictBasis || r?.opportunityAngle || "").slice(0, 80).replace(/\|/g, "/");
      out.push(
        `| ${e.code} | ${(r?.description ?? "to research").slice(0, 40).replace(/\|/g, "/")} | ${rateStr(e)} | ${r?.verdict ?? "—"} | ${rationale} |`
      );
    }
    out.push("", `_${DISCLAIMER}_`, "", "---", "");
  }
  return out.join("\n").trim();
}

/** Mentor update — short touch-base blurb. */
function mentor(entries: CodeEntry[]): string {
  const researched = entries.filter((e) => e.research);
  const verified = entries.filter((e) => e.verification?.result === "VERIFIED");
  const withEst = entries
    .filter((e) => bestScenario(e))
    .sort((a, b) => (bestScenario(b)?.base ?? 0) - (bestScenario(a)?.base ?? 0));
  const lines = Array.from(new Set(entries.map((e) => SERVICE_LINE_LABELS[e.serviceLine])));

  const top = withEst
    .slice(0, 3)
    .map((e) => `${e.code} (${formatUSD(bestScenario(e)!.base)})`)
    .join(", ");

  const parts: string[] = [];
  parts.push(
    `This period I analyzed ${entries.length} code(s) across ${lines.join(", ")}, completing CMS reimbursement research on ${researched.length} of them.`
  );
  if (verified.length)
    parts.push(`${verified.length} code(s) passed verification against our viability framework: ${verified.map((e) => e.code).join(", ")}.`);
  if (top) parts.push(`The largest directional opportunities by base estimate are ${top}.`);
  const conditional = researched.filter((e) => e.research?.reimbursable === "Conditional");
  if (conditional.length)
    parts.push(`${conditional.map((e) => e.code).join(", ")} are conditionally reimbursable and need a billing-scenario confirmation before I advance them.`);
  parts.push(
    `Open questions: confirming national Medicare rates against current Addendum B, and validating which packaged services change value under comprehensive-APC bundling. ${DISCLAIMER}`
  );

  return `**Mentor touch-base update**\n\n${parts.join(" ")}`;
}

export function generateDraft(template: DraftTemplate, entries: CodeEntry[]): string {
  if (!entries.length) return "_Select at least one code from your Library to draft._";
  switch (template) {
    case "workpaper":
      return workpaper(entries);
    case "slide":
      return slide(entries);
    case "mentor":
      return mentor(entries);
  }
}

export const TEMPLATE_META: Record<DraftTemplate, { title: string; desc: string }> = {
  workpaper: { title: "Workpaper section", desc: "Per-code formal finding: reimbursability, rate, docs, risks, recommendation." },
  mentor: { title: "Mentor update", desc: "A short touch-base blurb: what you analyzed, what passed, top opportunities, open questions." },
  slide: { title: "Slide content", desc: "Per service line: terse bullets + a one-slide table of codes." },
};
