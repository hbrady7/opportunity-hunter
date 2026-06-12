import * as XLSX from "xlsx-js-style";
import { EXPECTED_COLUMNS, BUILD_STEPS } from "./workbench-content";
import { PLAYBOOK } from "./learn-content";
import { DEFAULT_ASSUMPTIONS, SCENARIO_BOUNDS, DISCLAIMER } from "./constants";
import { HEADERS as SHORTLIST_HEADERS } from "./export";
import type { Assumptions } from "./store";

type CellDesc = { v?: string | number; t?: string; f?: string; s?: Record<string, unknown> } | string | number | null;

const INK = "1B1E23";
const CLAIM = "C8102E";
const RULE = "E8E5DD";
const SLATE = "6B7280";

const titleStyle = { font: { bold: true, sz: 14, color: { rgb: CLAIM } } };
const h1Style = { font: { bold: true, sz: 11, color: { rgb: INK } } };
const headerStyle = {
  font: { bold: true, color: { rgb: INK } },
  fill: { patternType: "solid", fgColor: { rgb: RULE } },
  alignment: { vertical: "center" },
  border: { bottom: { style: "thin", color: { rgb: SLATE } } },
};
const noteStyle = { font: { italic: true, color: { rgb: SLATE } }, alignment: { wrapText: true, vertical: "top" } };
const labelStyle = { font: { color: { rgb: SLATE } } };

function sheetFromCells(rows: CellDesc[][]): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  let maxC = 0;
  rows.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell === null || cell === undefined) return;
      const addr = XLSX.utils.encode_cell({ r, c });
      if (typeof cell === "object") {
        const t = cell.t ?? (cell.f ? "n" : typeof cell.v === "number" ? "n" : "s");
        const cc: XLSX.CellObject = { t } as XLSX.CellObject;
        if (cell.f) cc.f = cell.f;
        if (cell.v !== undefined) cc.v = cell.v as string | number;
        else if (cell.f) cc.v = t === "s" ? "" : 0;
        if (cell.s) (cc as { s?: unknown }).s = cell.s;
        ws[addr] = cc;
      } else {
        ws[addr] = { t: typeof cell === "number" ? "n" : "s", v: cell } as XLSX.CellObject;
      }
      if (c > maxC) maxC = c;
    });
  });
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length - 1, 0), c: maxC } });
  return ws;
}

export function buildWorkbook(exclusionList: string[], assumptions: Assumptions): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // --- READ-ME ---
  const readme: CellDesc[][] = [
    [{ v: "Opportunity Hunter — Starter Analysis Workbook", s: titleStyle }],
    [{ v: "Build the outpatient revenue analysis here, then export a shortlist into the app.", s: noteStyle }],
    [],
    [{ v: "BUILD STEPS", s: h1Style }],
  ];
  BUILD_STEPS.forEach((step, i) => {
    readme.push([{ v: `${i + 1}. ${step.title}`, s: { font: { bold: true, color: { rgb: INK } } } }]);
    readme.push([{ v: step.body[0].replace(/\*\*/g, "").replace(/`/g, ""), s: noteStyle }]);
  });
  readme.push([]);
  readme.push([{ v: "Tip: on each data tab, View → Freeze Top Row to keep headers visible while scrolling.", s: noteStyle }]);
  readme.push([{ v: "The six native PivotTable recipes live in the app (Workbench → Pivot Recipes) — this workbook uses SUMIFS for the top-codes summary instead.", s: noteStyle }]);
  readme.push([]);
  readme.push([{ v: DISCLAIMER, s: noteStyle }]);
  const wsReadme = sheetFromCells(readme);
  wsReadme["!cols"] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(wb, wsReadme, "READ-ME");

  // --- 1-Raw ---
  const rawHeaders: CellDesc[] = EXPECTED_COLUMNS.map((h) => ({ v: h, s: headerStyle }));
  const example: CellDesc[] = [
    "North Health System", "Memorial Hospital", "Outpatient", "0450", "Emergency Dept",
    "CHG10042", "ED Level 4 Visit", "99284", "0450", "2025-01", 1240, 980000,
  ];
  const raw: CellDesc[][] = [
    rawHeaders,
    example,
    [],
    [{ v: "↑ Delete the example row, then paste your full extract starting at A2. Select all data → Insert → Table (Ctrl+T) → name it tblCharges (Table Design → Table Name).", s: noteStyle }],
  ];
  const wsRaw = sheetFromCells(raw);
  wsRaw["!cols"] = EXPECTED_COLUMNS.map((h) => ({ wch: Math.max(12, h.length + 2) }));
  XLSX.utils.book_append_sheet(wb, wsRaw, "1-Raw");

  // --- 2-Summary (SUMIFS-driven) ---
  const sumHeaders = ["CPT", "Total Qty", "Total Charges", "Avg/Unit", "Excluded?", "% of Total", "Cumulative %"];
  const sumRows: CellDesc[][] = [sumHeaders.map((h) => ({ v: h, s: headerStyle }))];
  const FIRST = 2;
  const LAST = 26; // 25 rows
  for (let r = FIRST; r <= LAST; r++) {
    sumRows.push([
      "", // A: user types CPT
      { f: `SUMIFS(tblCharges[Charge Quantity],tblCharges[CPT Clean],$A${r})`, t: "n" },
      { f: `SUMIFS(tblCharges[Charge Amount],tblCharges[CPT Clean],$A${r})`, t: "n" },
      { f: `IFERROR(C${r}/B${r},0)`, t: "n" },
      { f: `IF(COUNTIF('3-Exclusions'!$A:$A,$A${r})>0,"EXCLUDED","")`, t: "s" },
      { f: `IFERROR(C${r}/SUM($C$${FIRST}:$C$${LAST}),0)`, t: "n" },
      { f: `IFERROR(SUM($C$${FIRST}:C${r})/SUM($C$${FIRST}:$C$${LAST}),0)`, t: "n" },
    ]);
  }
  sumRows.push([]);
  sumRows.push([{ v: "Type your top CPT codes in column A (paste from the Top Codes pivot). Formulas reference tblCharges and recalc once that table exists. Sort A–C by Total Charges descending to read the Pareto / Cumulative %.", s: noteStyle }]);
  const wsSum = sheetFromCells(sumRows);
  wsSum["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsSum, "2-Summary");

  // --- 3-Exclusions ---
  const excl: CellDesc[][] = [[{ v: "Excluded CPT", s: headerStyle }]];
  exclusionList.forEach((c) => excl.push([c]));
  if (exclusionList.length === 0) excl.push([{ v: "(paste excluded codes here, one per row)", s: noteStyle }]);
  const wsExcl = sheetFromCells(excl);
  wsExcl["!cols"] = [{ wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsExcl, "3-Exclusions");

  // --- 4-Shortlist (matches Library CSV export headers) ---
  const wsShort = sheetFromCells([SHORTLIST_HEADERS.map((h) => ({ v: h, s: headerStyle }))]);
  wsShort["!cols"] = SHORTLIST_HEADERS.map((h) => ({ wch: Math.max(12, h.length + 2) }));
  XLSX.utils.book_append_sheet(wb, wsShort, "4-Shortlist");

  // --- Methodology ---
  const method: CellDesc[][] = [
    [{ v: "Methodology", s: titleStyle }],
    [{ v: "The capstone playbook, end to end:", s: noteStyle }],
    [],
  ];
  PLAYBOOK.forEach((s) => {
    method.push([{ v: `${s.n}. ${s.title}`, s: { font: { bold: true, color: { rgb: INK } } } }]);
    method.push([{ v: s.body, s: noteStyle }]);
  });
  method.push([]);
  method.push([{ v: "ESTIMATE ASSUMPTIONS (defaults)", s: h1Style }]);
  method.push([{ v: "Medicare payer mix", s: labelStyle }, `${assumptions.medicareMixPct ?? DEFAULT_ASSUMPTIONS.medicareMixPct}%`]);
  method.push([{ v: "Commercial multiplier", s: labelStyle }, `${assumptions.commercialMultiplier ?? DEFAULT_ASSUMPTIONS.commercialMultiplier}x`]);
  method.push([{ v: "Capture rate", s: labelStyle }, `${assumptions.captureRate ?? DEFAULT_ASSUMPTIONS.captureRate}%`]);
  method.push([{ v: "Low scenario", s: labelStyle }, `${SCENARIO_BOUNDS.low.commercialMultiplier}x · ${SCENARIO_BOUNDS.low.captureRate}% capture`]);
  method.push([{ v: "High scenario", s: labelStyle }, `${SCENARIO_BOUNDS.high.commercialMultiplier}x · ${SCENARIO_BOUNDS.high.captureRate}% capture`]);
  method.push([]);
  method.push([{ v: DISCLAIMER, s: noteStyle }]);
  const wsMethod = sheetFromCells(method);
  wsMethod["!cols"] = [{ wch: 26 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsMethod, "Methodology");

  return wb;
}

export function downloadStarterWorkbook(exclusionList: string[], assumptions: Assumptions) {
  const wb = buildWorkbook(exclusionList, assumptions);
  XLSX.writeFile(wb, "opportunity-hunter-starter-workbook.xlsx", { bookType: "xlsx" });
}
