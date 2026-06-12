# Opportunity Hunter

A lightweight, always-available web companion for an **outpatient revenue opportunity (ORO)** capstone at a healthcare RCM consulting firm.

This is **not** a data platform. There are no file uploads, no datasets, no database. You type in one CPT/HCPCS code at a time (optionally with your own charge quantity and charge amount from a pivot table at work) and the app does the thinking: researches the code against CMS sources, verifies it against **your own** viability criteria, estimates the revenue opportunity, discovers net-new procedures, teaches the underlying RCM concepts, and drafts deliverable-ready content.

## Modules

| # | Module | What it does |
|---|--------|--------------|
| 1 | **Hunt** (`/`) | Research one code → claim-style card with reimbursability, rate, docs, verdict. |
| 2 | **Library** (`/library`) | Ranked ledger of saved codes; notes, timeline, CSV/markdown export. |
| 3 | **Verify** (`/verify`) | Criteria engine you fully control; hard gates + soft scoring → VERIFIED/CONDITIONAL/FAILED. |
| 4 | **Estimate** (`/estimate`) | Transparent reimbursement math; low/base/high annual opportunity. |
| 5 | **Scout** (`/scout`) | Net-new procedure discovery by service line. |
| 6 | **Learn** (`/learn`) | Static, hand-written RCM reference: OPPS status indicators, playbook, glossary. |
| 7 | **Draft** (`/draft`) | Workpaper / slide / mentor-update drafting, copy-first. |
| — | **Settings** (`/settings`) | Exclusion list, criteria, estimator defaults, backup/restore. |

## Quickstart

```bash
npm install
cp .env.example .env.local       # then add your ANTHROPIC_API_KEY
npm run dev                       # http://localhost:3000
```

The app runs **without** an API key — Learn, Library, Settings, and the estimator (with a manually entered rate) all work. Agent-powered screens (Hunt, Verify rate fetch, Scout, Learn's Ask box) show a "key not configured" prompt instead of erroring.

## Data persistence

All of your data lives **only in this browser** (localStorage, via Zustand). There is no account and no server-side storage — visitors to a deployed URL each get their own empty app. Because the browser is the only copy, **use Settings → Backup** to export a JSON file regularly, and **Restore** to bring it back (e.g. on a new device or after clearing data).

## Deploy

Push to GitHub and import into Vercel. Set `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`) in the Vercel project's environment variables. The URL is intentionally public; agent routes are rate-limited (20 calls/hour/IP) and the site is `noindex`.

## The estimate disclaimer

Every estimate is a **directional** figure built from national Medicare rates and your stated assumptions — not a quote. Verify rates against primary CMS sources before any client use.
