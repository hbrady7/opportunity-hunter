// Hand-written, Excel-verified content for the Workbench module.
// Formulas use structured table references (resilient to column moves).

export const EXPECTED_COLUMNS = [
  "Health System",
  "Source Facility",
  "In/Out Type",
  "Department Code",
  "Department Description",
  "Charge Code",
  "Charge Code Description",
  "CPT Code",
  "Revenue Code",
  "Month of Post Date",
  "Charge Quantity",
  "Charge Amount",
] as const;

export interface BuildStep {
  id: string;
  title: string;
  body: string[];
  // optional copy-to-clipboard payloads shown as buttons
  copies?: { label: string; text: string }[];
  // special hooks the UI wires up (e.g. copy exclusion list from Settings)
  hook?: "copyExclusions" | "downloadWorkbook" | "gotoIntake";
}

export const BUILD_STEPS: BuildStep[] = [
  {
    id: "stage",
    title: "Stage the raw data",
    body: [
      "Paste the full charge-detail extract into a new tab named **1-Raw** (cell A1).",
      "Select any cell in the data → **Insert → Table** (Ctrl+T). Tick \"My table has headers.\"",
      "With the table selected, set its name in **Table Design → Table Name** to `tblCharges`.",
      "Confirm the 12 headers match the expected names below. If the extract uses different labels, rename the header cells so the formulas resolve.",
    ],
    copies: [{ label: "Copy expected headers", text: EXPECTED_COLUMNS.join("\t") }],
  },
  {
    id: "hygiene",
    title: "Add hygiene helper columns",
    body: [
      "Add these as new columns INSIDE the table (type the header in the first empty column to the right — Excel autofills the formula down the table).",
      "`CPT Clean`, `Post Month`, `Avg Charge/Unit`, `Excluded?`, `Reversal?` — formulas are in the Formula Cards tab.",
      "Keep negative-amount rows: they are credits / reversals and must stay so volumes net correctly. The `Reversal?` flag lets you count them as a data-quality stat without deleting them.",
    ],
  },
  {
    id: "filter",
    title: "Confirm the outpatient filter",
    body: [
      "Don't assume the In/Out Type values — they vary by extract (\"O\", \"OP\", \"Outpatient\").",
      "Click the filter arrow on **In/Out Type** and read the distinct values first.",
      "Filter every analysis view to outpatient only. Note which literal value(s) mean outpatient in this extract so your methodology section is reproducible.",
    ],
  },
  {
    id: "exclusions",
    title: "Build the exclusions tab",
    body: [
      "Create a tab named **3-Exclusions**. Put one CPT/HCPCS code per row in **column A** (A1 can be a header like `Excluded CPT`).",
      "These are the codes already in the firm's implementation scope — the `Excluded?` helper checks against this list.",
      "Use the button below to copy your exclusion list (from Settings) and paste it into column A.",
    ],
    hook: "copyExclusions",
  },
  {
    id: "pivots",
    title: "Build the six pivots",
    body: [
      "Work through the Pivot Recipes tab in order — **start with the Whitespace Grid**; cross-system gaps are the heart of opportunity identification.",
      "For each: select `tblCharges` → **Insert → PivotTable** → place fields exactly as the recipe specifies.",
      "Apply the outpatient + not-excluded filters to every pivot.",
    ],
  },
  {
    id: "read",
    title: "Read the results",
    body: [
      "Walk the Analysis Questions tab and answer each one against your pivots.",
      "Jot a note per question — those notes carry into the Draft module as context for your workpaper and mentor update.",
    ],
  },
  {
    id: "shortlist",
    title: "Export the shortlist",
    body: [
      "From the **Top Codes** pivot, copy the top rows — CPT, Sum Qty, Sum Charge Amount.",
      "Paste them into the Bulk Paste intake (below) → batch-research the shortlist → the codes land in your Library, ready to verify and estimate.",
    ],
    hook: "gotoIntake",
  },
];

export interface FormulaCard {
  name: string;
  formula: string;
  why: string;
  note?: string;
}

export const FORMULA_CARDS: FormulaCard[] = [
  {
    name: "CPT Clean",
    formula: "=UPPER(TRIM([@[CPT Code]]))",
    why: "Normalizes the CPT so stray spaces / lowercase letters don't split the same code into separate pivot rows.",
  },
  {
    name: "Post Month",
    formula: '=TEXT([@[Month of Post Date]],"YYYY-MM")',
    why: "Collapses dates to a sortable month key for the trend pivot.",
    note: "If the dates arrived as text and this errors, wrap with DATEVALUE: =TEXT(DATEVALUE([@[Month of Post Date]]),\"YYYY-MM\").",
  },
  {
    name: "Avg Charge/Unit",
    formula: "=IFERROR([@[Charge Amount]]/[@[Charge Quantity]],0)",
    why: "Per-unit charge. Big swings for the same CPT across systems flag charge-master variance.",
  },
  {
    name: "Excluded?",
    formula: "=IF(COUNTIF('3-Exclusions'!$A:$A,[@[CPT Clean]])>0,\"EXCLUDED\",\"\")",
    why: "Auto-flags codes already in implementation scope so you can exclude them from every view.",
  },
  {
    name: "Reversal?",
    formula: '=IF([@[Charge Amount]]<0,"REVERSAL","")',
    why: "Marks credits / reversals. Keep them (they net volumes correctly) but count them as a data-quality stat.",
  },
  {
    name: "Code total (summary tab)",
    formula: "=SUMIFS(tblCharges[Charge Amount],tblCharges[CPT Clean],$A2)",
    why: "Totals one CPT's charges on a summary tab without a pivot. Qty twin below.",
    note: "Quantity twin: =SUMIFS(tblCharges[Charge Quantity],tblCharges[CPT Clean],$A2)",
  },
  {
    name: "% of service line",
    formula: "=[@Total]/SUM([Total])",
    why: "Each code's share of the total. Shows concentration vs long-tail.",
    note: "Outside a table, lock the denominator: =B2/SUM($B$2:$B$26).",
  },
  {
    name: "Pareto cumulative %",
    formula: "=SUM($C$2:C2)/SUM($C:$C)",
    why: "Sort totals descending first; the row where this crosses 80% is your Pareto set — the codes worth the analysis.",
    note: "The mixed reference $C$2:C2 expands as you fill down.",
  },
  {
    name: "MoM change",
    formula: '=IFERROR(C2/B2-1,"")',
    why: "Month-over-month growth against a month-columned summary. Surfaces trends and seasonality.",
  },
];

export interface PivotRecipe {
  id: string;
  name: string;
  purpose: string;
  rows: string;
  columns?: string;
  values: string;
  filters: string;
  sort: string;
  lookFor: string;
  lead?: boolean;
}

export const PIVOT_RECIPES: PivotRecipe[] = [
  {
    id: "whitespace",
    name: "Whitespace Grid",
    purpose: "Map cross-system adoption gaps — the core of new-opportunity identification.",
    rows: "CPT Clean",
    columns: "Health System",
    values: "Sum of Charge Amount",
    filters: "In/Out Type = outpatient · Excluded? = (blank)",
    sort: "By grand total descending",
    lookFor:
      "Blank cells are the map: codes some systems bill heavily and others never touch. Those gaps = adoption whitespace = candidate opportunities.",
    lead: true,
  },
  {
    id: "topcodes",
    name: "Top Codes",
    purpose: "The master ranking that feeds everything downstream.",
    rows: "CPT Clean",
    values: "Sum of Charge Quantity · Sum of Charge Amount · Average of Avg Charge/Unit",
    filters: "In/Out Type = outpatient · Excluded? = (blank)",
    sort: "By Sum of Charge Amount descending",
    lookFor: "The top of this list is your shortlist. Copy CPT / qty / charges straight into the Bulk Paste intake.",
  },
  {
    id: "concentration",
    name: "System Concentration",
    purpose: "Which systems drive which codes.",
    rows: "Health System → CPT Clean",
    values: "Sum of Charge Quantity · Sum of Charge Amount",
    filters: "In/Out Type = outpatient · Excluded? = (blank)",
    sort: "Charge Amount descending within each system",
    lookFor: "Outliers in either direction are stories: a code one system leans on heavily, or conspicuously ignores.",
  },
  {
    id: "trend",
    name: "Monthly Trend",
    purpose: "Direction and seasonality of the top codes.",
    rows: "CPT Clean (top ~20 only — filter to them)",
    columns: "Post Month",
    values: "Sum of Charge Amount",
    filters: "In/Out Type = outpatient · top-20 CPTs",
    sort: "Chronological columns",
    lookFor: "Rising codes are momentum; a sharp seasonal spike changes how you size the annual opportunity.",
  },
  {
    id: "department",
    name: "Department Origin",
    purpose: "Where the charges actually originate.",
    rows: "Department Description → CPT Clean",
    values: "Sum of Charge Amount",
    filters: "In/Out Type = outpatient",
    sort: "Charge Amount descending",
    lookFor: "A code originating from an unexpected department hints at charge-routing leakage worth investigating.",
  },
  {
    id: "revcode",
    name: "Revenue Code Crosscheck",
    purpose: "Find inconsistent charge-master mapping.",
    rows: "CPT Clean → Revenue Code",
    values: "Count of rows (use Charge Code or any column, set to Count)",
    filters: "In/Out Type = outpatient",
    sort: "By CPT, then revenue code",
    lookFor: "One CPT mapping to several revenue codes across systems = inconsistent charge-master mapping — a findable issue on its own.",
  },
];

export interface AnalysisQuestion {
  id: string;
  text: string;
}

export const ANALYSIS_QUESTIONS: AnalysisQuestion[] = [
  { id: "q1", text: "Which codes form the 80% Pareto set of outpatient charges per service line?" },
  { id: "q2", text: "What share do the top 10 codes hold — concentrated or long-tail?" },
  { id: "q3", text: "Which codes show cross-system whitespace (billed by some systems, absent in others)?" },
  { id: "q4", text: "Which top codes are trending up / down over the period, and is anything seasonal?" },
  { id: "q5", text: "What's the reversal/credit rate, and does any system look anomalous?" },
  { id: "q6", text: "Do any CPTs map to multiple revenue codes across systems?" },
  { id: "q7", text: "Are avg charge/unit values for the same CPT wildly different across systems (charge-master variance)?" },
  { id: "q8", text: "Which departments originate the top codes, and does anything look misrouted?" },
  { id: "q9", text: "After exclusions, what's the single largest unaddressed code per service line?" },
  { id: "q10", text: "What would I show the mentor first, and what question do I need answered to proceed?" },
];
