# DECISIONS

Running log of build decisions made autonomously.

## Phase 0 — Scaffold

- **Next.js 16, not 15.** `create-next-app@latest` installed Next 16.2.9 (current stable) + React 19 + Tailwind v4. The brief said "Next 15"; 16 is the live version and is API-compatible for everything used here. Building on 16.
- **No `gh` CLI / no Vercel login available in this environment.** SSH to GitHub works for user `hbrady7`. Build proceeds with per-phase local commits; remote set to `git@github.com:hbrady7/opportunity-hunter.git`. Pushing + Vercel link require the user's interactive auth and are surfaced at the end.
- **Hand-rolled UI primitives instead of `shadcn/ui` init.** The "Claim Form" aesthetic (mono micro-labels, rotated double-bordered stamps, ledger tables, dashed insets) is specific enough that bespoke CSS-variable-driven components in `app/globals.css` + `components/ui.tsx` give tighter control and fewer moving parts than theming shadcn under Tailwind v4. Same primitives (button/input/select patterns), fewer deps.
- **Git email `hollisbrady2004@gmail.com`, no Co-Authored-By trailer** per standing rules (set locally in this repo only).
- **localStorage via Zustand `persist`** keyed `opportunity-hunter-v1`; `partialize` excludes the transient `hydrated` flag. All user data browser-only.
- **`robots.ts` + `noindex` metadata** from the first commit for open-URL hygiene.

## Phases 1–6

- **Two-stage agent pattern with graceful web-search fallback.** Stage 1 web-searches and writes ≤130-word notes; stage 2 (no tools) converts to strict JSON. If the web-search call throws or is unavailable, it retries knowledge-only and flags `usedWebSearch:false`, surfaced as an amber "verify before client use" note. Tolerant JSON extraction strips fences, fixes trailing commas, and balances braces/brackets for truncation.
- **Server-side sanitization on every agent route.** Each route clamps/whitelists fields (enum coercion, rate must be a finite non-negative number or null, array length caps) so a malformed model response can't corrupt the store.
- **Draft module is fully local (no agent).** The spec says "synthesize only from saved Library data," so drafts are generated deterministically from stored research/verification/estimates/notes. Bonus: drafting works with no API key and is instant/reliable.
- **min-Medicare-rate criterion is computed locally when a rate is already known** (from prior research), and only sent to the agent otherwise — deterministic and cheaper. The exclusion-list hard gate is always local.
- **Verify scoring is deterministic in app code**, never left to the model: any hard-gate FAIL → FAILED; all hard gates PASS and ≥75% soft PASS → VERIFIED; else CONDITIONAL.
- **`react-hooks/set-state-in-effect` disabled in eslint config.** The localStorage hydration guard and one-shot `?code=` query-prefill are the standard SSR-safe patterns, not cascading-render bugs. Build itself does not lint, so this is purely for a clean `npm run lint`.
- **Pages using `useSearchParams` (Hunt, Verify, Estimate) are wrapped in `<Suspense>`** per Next 16's requirement.

## Phase 7 — Builder's Choice

Each addition earns its place by removing friction from the daily loop (look up → verify → estimate → note → draft) or teaching the domain faster.

- **⌘K command palette (`components/command-palette.tsx`).** Global fuzzy jump to any page, any saved code (deep-links into the Library drawer via `?open=`), any Learn section, glossary term, or status indicator. Opened with ⌘K / Ctrl-K or the rail/top-bar search button (custom `oh:cmdk` event). This is the connective tissue that makes a multi-module tool feel like one surface — highest-leverage single addition.
- **Mentor prep page (`/mentor`).** The internship runs on recurring mentor touch-bases. This page bundles: a persistent **question bank** (captured here or from Learn → Ask), an **auto agenda** synthesized from Library state (conditional codes to confirm, research backlog, failed verifications, top verified opportunities, open questions), and a **"since last touch-base" activity feed** driven by code timelines with a one-tap "I just had a touch-base" marker. "Copy prep" exports the whole thing as markdown. Reached via ⌘K and a rail link rather than a 9th tab (the 8-slot bottom bar is already dense on mobile).
- **Library deep-linking (`/library?open=<id>`).** Lets the palette (and future links) open a specific code's detail drawer directly.
- **CMS quick-launcher (`components/cms-launcher.tsx`).** A collapsible "Verify it yourself" block on every claim card with a 3-step confirm-the-claim checklist and deep links to OPPS Addendum B, the PFS Lookup Tool, NCCI edits, and a prefilled `site:cms.gov` search for the active code. Directly answers the brief's requirement to confirm any agent claim against the primary source — keeps the intern honest and audit-ready.
- **Modifier mini-reference (Learn → Modifiers).** A dedicated table for 25, 59, the X{EPSU} family, and JW/JZ — explicitly in the brief's seed list and load-bearing for the ED (modifier 25 on E/M) and Oncology (JW/JZ drug-waste) service lines. Wired into the section nav and ⌘K.
- **Library pipeline summary strip.** A five-tile orientation row (codes, separately reimbursable, verified, strong, total estimated pipeline) at the top of the ledger so the analyst always sees how the saved set maps to the deliverable, not just a flat table.

## Provider flexibility — Gemini or Anthropic

- **Pluggable LLM provider (`lib/agents/llm.ts`).** The agent layer was refactored behind a dispatcher that auto-selects the provider from whichever key is present: `GEMINI_API_KEY` → Google Gemini (`@google/genai`, default `gemini-2.5-flash`), else `ANTHROPIC_API_KEY` → Anthropic (`claude-sonnet-4-6`). Gemini wins if both are set. Motivation: the user wanted a free option — Gemini has a free tier in Google AI Studio, which removes the cost barrier for the capstone.
- **Same two-stage pattern across providers.** Stage 1 grounds with the provider's web tool (Anthropic `web_search_20250305` / Gemini `googleSearch` grounding) and writes plain notes; stage 2 (no tools) converts to strict JSON. The route shapes, sanitization, and tolerant JSON repair (`lib/agents/json.ts`) are shared, so the UI and acceptance behavior are identical regardless of provider.
- **Gemini thinking disabled** (`thinkingConfig.thinkingBudget: 0`) for these structured tasks — keeps the token budget on the answer, avoids empty responses, and keeps it fast/cheap on the free tier. Grounding detected via `candidates[0].groundingMetadata`.
- **`/api/health` now reports `provider` + `model`**, surfaced as a chip in Settings so you can see which backend is live.
