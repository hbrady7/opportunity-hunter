# Opportunity Hunter

A lightweight, always-available web companion for an **outpatient revenue opportunity (ORO)** capstone at a healthcare RCM consulting firm.

This is **not** a data platform. There are no file uploads, no datasets, no database. You type in one CPT/HCPCS code at a time (optionally with your own charge quantity and charge amount from a pivot table at work) and the app does the thinking: researches the code against CMS sources, verifies it against **your own** viability criteria, estimates the revenue opportunity, discovers net-new procedures, teaches the underlying RCM concepts, and drafts deliverable-ready content.

## Modules

| # | Module | What it does |
|---|--------|--------------|
| 1 | **Hunt** (`/`) | Research one code → claim-style card with reimbursability, rate, docs, verdict. |
| 2 | **Library** (`/library`) | Ranked ledger of saved codes; notes, timeline, CSV/markdown export. |
| W | **Workbench** (`/workbench`) | Excel analysis companion: build guide, formula cards, pivot recipes, a downloadable starter `.xlsx`, and bulk-paste shortlist intake. |
| 3 | **Verify** (`/verify`) | Criteria engine you fully control; hard gates + soft scoring → VERIFIED/CONDITIONAL/FAILED. |
| 4 | **Estimate** (`/estimate`) | Transparent reimbursement math; low/base/high annual opportunity. |
| 5 | **Scout** (`/scout`) | Net-new procedure discovery by service line. |
| 6 | **Learn** (`/learn`) | Static, hand-written RCM reference: OPPS status indicators, playbook, glossary. |
| 7 | **Draft** (`/draft`) | Workpaper / slide / mentor-update drafting, copy-first. |
| — | **Settings** (`/settings`) | Exclusion list, criteria, estimator defaults, backup/restore. |

## Quickstart

```bash
npm install
cp .env.example .env.local       # then add a GEMINI_API_KEY (free) or ANTHROPIC_API_KEY
npm run dev                       # http://localhost:3000
```

**Provider:** the app supports either **Google Gemini** (`GEMINI_API_KEY` — has a free tier, `gemini-2.5-flash` by default) or **Anthropic Claude** (`ANTHROPIC_API_KEY` — pay-as-you-go, `claude-sonnet-4-6`). It auto-detects which key is present; if both are set, Gemini is used. Both use the same two-stage, web-search-grounded research pattern, so behavior is identical across the UI.

The app runs **without** any key — Learn, Library, Settings, and the estimator (with a manually entered rate) all work. Agent-powered screens (Hunt, Verify rate fetch, Scout, Learn's Ask box) show a "key not configured" prompt instead of erroring.

## Data persistence

All of your data lives **only in this browser** (localStorage, via Zustand). There is no account and no server-side storage — visitors to a deployed URL each get their own empty app. Because the browser is the only copy, **use Settings → Backup** to export a JSON file regularly, and **Restore** to bring it back (e.g. on a new device or after clearing data).

## Deploy

Push to GitHub and import into Vercel. Set `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`) in the Vercel project's environment variables. The URL is intentionally public; agent routes are rate-limited (20 calls/hour/IP) and the site is `noindex`.

## Workbench — the Excel analysis companion

The app never touches your raw charge data. Instead, **Workbench** rides shotgun while you build the Excel data-analysis workpaper:

- **Build Guide** — a 7-step, persisted checklist for staging the extract (`tblCharges`), adding hygiene columns, filtering to outpatient, and building the pivots.
- **Formula Cards** — copy-ready, structured-reference Excel formulas (CPT Clean, Post Month, Avg Charge/Unit, Excluded?, Pareto cumulative %, …).
- **Pivot Recipes** — six PivotTables with exact field placements, led by the **Whitespace Grid** (cross-system adoption gaps = opportunities).
- **Starter Workbook** — one click generates a clean `.xlsx` (SheetJS, fully client-side) with six tabs: READ-ME, 1-Raw, a SUMIFS-wired 2-Summary, 3-Exclusions (pre-filled from your Settings list), 4-Shortlist (matches the Library CSV), and Methodology. The summary formulas recalculate once you paste data and name the table `tblCharges`.
- **Bulk Paste intake** — paste up to 50 `CPT · qty · charges` rows straight from the Top Codes pivot (tolerant of headers, `$`, thousands commas, and either column order). Preview shows new / updates / EXCLUDED, then commits to the Library in a "to research" state and offers a rate-limited **research queue**. Also available as a button on the Library screen.
- **Analysis Questions** — a 10-question checklist with notes that flow into the Draft module as workpaper context.

The starter workbook uses SUMIFS rather than native PivotTables (SheetJS can't author pivot caches) — the six native-pivot recipes live in the app. Freeze the header row yourself with View → Freeze Top Row.

## The estimate disclaimer

Every estimate is a **directional** figure built from national Medicare rates and your stated assumptions — not a quote. Verify rates against primary CMS sources before any client use.
