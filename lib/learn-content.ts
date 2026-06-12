// Hand-written reference content. Accurate as of the CY2024/2025 OPPS framework.
// Status-indicator meanings follow CMS OPPS Addendum D1.

export type PaidFlag = "Yes" | "No" | "Conditional" | "Other";

export interface SIRow {
  si: string;
  meaning: string;
  paid: PaidFlag;
}

export const SI_TABLE: SIRow[] = [
  { si: "A", meaning: "Paid under a separate fee schedule, not OPPS (e.g., clinical lab on CLFS, DME, ambulance).", paid: "Other" },
  { si: "B", meaning: "Not recognized by OPPS when billed on an outpatient hospital Part B claim. May be payable on another bill type.", paid: "No" },
  { si: "E1", meaning: "Not covered by Medicare (statutorily excluded or not a Medicare benefit).", paid: "No" },
  { si: "E2", meaning: "Not paid by Medicare when submitted on an outpatient claim; no OPPS payment amount is established (contractor-priced).", paid: "No" },
  { si: "G", meaning: "Pass-through drug or biological. Paid separately under OPPS pass-through provisions.", paid: "Yes" },
  { si: "H", meaning: "Pass-through device category. Separate cost-based pass-through payment.", paid: "Yes" },
  { si: "J1", meaning: "Hospital Part B service paid through a Comprehensive APC (C-APC) — the primary service is paid and almost everything else on the claim is packaged into it.", paid: "Yes" },
  { si: "J2", meaning: "Hospital Part B service that may be paid through a C-APC for specific combinations (e.g., certain observation scenarios). Comprehensive packaging.", paid: "Yes" },
  { si: "K", meaning: "Non-pass-through drug/biological, therapeutic radiopharmaceutical, or certain blood product. Paid separately (typically ASP-based).", paid: "Yes" },
  { si: "M", meaning: "Items and services not billable to the MAC.", paid: "No" },
  { si: "N", meaning: "Items and services packaged into APC rates. No separate payment — the cost is bundled into the primary service.", paid: "No" },
  { si: "P", meaning: "Partial hospitalization program service. Paid per diem under a PHP APC.", paid: "Yes" },
  { si: "Q1", meaning: "STVX-packaged code. Packaged (no separate payment) if billed with a status S, T, V, or X service on the same date; otherwise paid separately under its own APC.", paid: "Conditional" },
  { si: "Q2", meaning: "T-packaged code. Packaged if billed with a status T service on the same date; otherwise paid separately under its own APC.", paid: "Conditional" },
  { si: "Q3", meaning: "Code that may be paid through a composite APC. Paid via a composite APC when criteria are met, or individually otherwise.", paid: "Conditional" },
  { si: "Q4", meaning: "Conditionally packaged laboratory test. Packaged unless it's the only service on the claim (or other limited conditions), in which case it's paid under the CLFS.", paid: "Conditional" },
  { si: "R", meaning: "Blood and blood products. Paid separately under their own APCs.", paid: "Yes" },
  { si: "S", meaning: "Significant procedure, NOT subject to the multiple-procedure discount. Paid separately under its own APC.", paid: "Yes" },
  { si: "T", meaning: "Significant procedure, subject to the multiple-procedure reduction. Paid separately, but discounted when billed with other T procedures.", paid: "Yes" },
  { si: "U", meaning: "Brachytherapy source. Paid separately under its own APC.", paid: "Yes" },
  { si: "V", meaning: "Clinic or emergency department visit (E/M). Paid separately under a visit APC.", paid: "Yes" },
];

export interface GlossaryTerm {
  term: string;
  def: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  { term: "ARR", def: "Annual Recurring Revenue — the recurring revenue an implementation generates for the firm's pipeline. The capstone's north-star metric." },
  { term: "APC", def: "Ambulatory Payment Classification — the OPPS payment grouping. CMS assigns a code to an APC, and the APC carries the national payment rate." },
  { term: "OPPS", def: "Outpatient Prospective Payment System — how Medicare pays HOSPITALS for outpatient services (the facility side)." },
  { term: "PFS", def: "Physician Fee Schedule — how Medicare pays the PROFESSIONAL (physician) component, RVU-based." },
  { term: "Status Indicator (SI)", def: "A one/two-character flag in OPPS Addendum B that tells you how a code is paid — separately, packaged, pass-through, or not at all." },
  { term: "Separately reimbursable", def: "A code that generates its own OPPS payment rather than being bundled into another service. The mentor's hard gate." },
  { term: "Packaging / Bundling", def: "When a service's cost is folded into the payment for a primary service (status N, or conditionally Q1–Q4) so it earns no separate dollars." },
  { term: "Comprehensive APC (C-APC)", def: "A J1/J2 packaging model where one primary service's payment absorbs nearly all other services on the same claim." },
  { term: "Pass-through payment", def: "Temporary separate OPPS payment for new drugs (G) or devices (H) before their cost is folded into APC rates." },
  { term: "Charge capture", def: "The process of recording every billable service delivered. 'Under-capture' = services performed but never charged — pure leakage." },
  { term: "Charge master (CDM)", def: "The hospital's master list of charge codes, descriptions, prices, and the CPT/revenue codes they map to." },
  { term: "Charge code", def: "An internal hospital identifier on the CDM. It maps to a CPT/HCPCS code and a revenue code for billing." },
  { term: "CPT code", def: "Current Procedural Terminology — a 5-digit AMA code describing a procedure or service." },
  { term: "HCPCS", def: "Healthcare Common Procedure Coding System — Level II codes (letter + 4 digits) for drugs, supplies, and services not in CPT (e.g., J-codes, G-codes)." },
  { term: "Revenue code", def: "A 4-digit UB-04 code identifying the hospital department/cost center (e.g., 0450 = ED, 0636 = drugs requiring detailed coding)." },
  { term: "Clean claim", def: "A claim with no errors or missing data that can be adjudicated without additional information — pays fastest." },
  { term: "NCCI", def: "National Correct Coding Initiative — CMS edits that prevent improper code pairings (PTP edits) and unlikely unit counts (MUEs)." },
  { term: "PTP edit", def: "Procedure-to-Procedure edit — a pair of codes that shouldn't be billed together unless a modifier justifies it." },
  { term: "MUE", def: "Medically Unlikely Edit — the maximum units of a code expected for one patient on one day. Exceeding it triggers denials/review." },
  { term: "Modifier", def: "A 2-character suffix that refines a code — e.g., 25, 59, X{EPSU}, JW/JZ — often the key to unlocking separate payment." },
  { term: "E/M", def: "Evaluation and Management — visit codes (e.g., ED 99281–99285) that capture the cognitive work of a patient encounter." },
  { term: "Critical care", def: "99291 (first 30–74 min) and 99292 (each additional 30 min) — high-intensity physician attention to a critically ill patient." },
  { term: "Observation", def: "A status (not an admission) for monitoring. Billed with G0378 (per hour) and G0379 (direct admit); 8-hour and C-APC thresholds matter." },
  { term: "Drug administration", def: "Infusion/injection codes (96360–96417) with a strict hierarchy: one initial service per encounter, then sequential/concurrent/additional-hour add-ons." },
  { term: "J-code", def: "A HCPCS drug code (e.g., J7307). Its OPPS status indicator (G, K, or N) tells you whether the drug is paid separately." },
  { term: "LARC", def: "Long-Acting Reversible Contraception — devices (J7296–J7307) plus an insertion procedure (e.g., 58300). Device + procedure are often separately payable." },
  { term: "Addendum B", def: "The OPPS file (released with each rule) listing every code, its status indicator, APC, and national payment rate. Your primary source." },
  { term: "ASP", def: "Average Sales Price — the basis for most separately payable Part B drug payments (commonly ASP + 6%)." },
  { term: "Implementation lift", def: "How much effort a consulting engagement needs to realize an opportunity via documentation, coding, or charge-capture fixes." },
  { term: "Kodiak", def: "The opportunity-sizing framing used here — a directional 'potential' figure built from national rates and stated assumptions, not a quote." },
];

export interface SourceLink {
  name: string;
  url: string;
  desc: string;
}

export const SOURCES: SourceLink[] = [
  { name: "OPPS Addendum B", url: "https://www.cms.gov/medicare/payment/prospective-payment-systems/hospital-outpatient/addendum-a-and-addendum-b-updates", desc: "Every code's status indicator, APC, and national OPPS rate. The single most important file." },
  { name: "PFS Lookup Tool", url: "https://www.cms.gov/medicare/physician-fee-schedule/search", desc: "National Physician Fee Schedule amounts for the professional component." },
  { name: "NCCI Edit Files", url: "https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits", desc: "PTP edits and MUEs — check before assuming two codes can be billed together." },
  { name: "MLN Booklets", url: "https://www.cms.gov/training-education/medicare-learning-network/publications", desc: "Plain-language CMS guides on OPPS, E/M, drug administration, and more." },
  { name: "HCPCS Quarterly Updates", url: "https://www.cms.gov/medicare/coding-billing/healthcare-common-procedure-system", desc: "New and revised HCPCS Level II codes (J-codes, G-codes) each quarter." },
];

export interface PlaybookStep {
  n: number;
  title: string;
  body: string;
  href?: string;
  hrefLabel?: string;
}

export const PLAYBOOK: PlaybookStep[] = [
  { n: 1, title: "Rank codes by total charges × volume", body: "Within each service line, sort your pivot (rows: health system → CPT; values: sum of charge qty and charge amount) to find the biggest concentrations. Log the top codes.", href: "/library", hrefLabel: "Log codes in Library" },
  { n: 2, title: "Remove already-implemented scope", body: "Drop any code the firm already implements on. Keep that list in Settings so it auto-flags everywhere.", href: "/settings", hrefLabel: "Edit exclusion list" },
  { n: 3, title: "Confirm it's separately reimbursable", body: "The mentor's hard gate. Check the OPPS status indicator — packaged (N) or conditionally packaged codes can't be lifted. Research the code, then verify.", href: "/", hrefLabel: "Hunt a code" },
  { n: 4, title: "Check documentation requirements", body: "A code only pays if the documentation supports it. Capture what's required so the recommendation is actionable.", href: "/", hrefLabel: "See requirements on the card" },
  { n: 5, title: "Estimate the opportunity", body: "Approximate reimbursement from national Medicare rates; model commercial as a multiplier. Produce low/base/high.", href: "/estimate", hrefLabel: "Open the estimator" },
  { n: 6, title: "Recommend", body: "For each service line, assemble the codes that pass every gate with rationale and an order-of-magnitude estimate. Draft it.", href: "/draft", hrefLabel: "Draft deliverables" },
];
