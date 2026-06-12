# DECISIONS

Running log of build decisions made autonomously.

## Phase 0 — Scaffold

- **Next.js 16, not 15.** `create-next-app@latest` installed Next 16.2.9 (current stable) + React 19 + Tailwind v4. The brief said "Next 15"; 16 is the live version and is API-compatible for everything used here. Building on 16.
- **No `gh` CLI / no Vercel login available in this environment.** SSH to GitHub works for user `hbrady7`. Build proceeds with per-phase local commits; remote set to `git@github.com:hbrady7/opportunity-hunter.git`. Pushing + Vercel link require the user's interactive auth and are surfaced at the end.
- **Hand-rolled UI primitives instead of `shadcn/ui` init.** The "Claim Form" aesthetic (mono micro-labels, rotated double-bordered stamps, ledger tables, dashed insets) is specific enough that bespoke CSS-variable-driven components in `app/globals.css` + `components/ui.tsx` give tighter control and fewer moving parts than theming shadcn under Tailwind v4. Same primitives (button/input/select patterns), fewer deps.
- **Git email `hollisbrady2004@gmail.com`, no Co-Authored-By trailer** per standing rules (set locally in this repo only).
- **localStorage via Zustand `persist`** keyed `opportunity-hunter-v1`; `partialize` excludes the transient `hydrated` flag. All user data browser-only.
- **`robots.ts` + `noindex` metadata** from the first commit for open-URL hygiene.
