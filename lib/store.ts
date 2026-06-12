"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { makeId } from "./utils";
import { DEFAULT_ASSUMPTIONS } from "./constants";
import type {
  CodeEntry,
  Criterion,
  Draft,
  Question,
  Research,
  Verification,
  EstimateScenario,
  TimelineEvent,
  TimelineKind,
} from "./types";
import type { ServiceLine } from "./constants";

export const DEFAULT_CRITERIA: Criterion[] = [
  {
    id: "c_separately_reimbursable",
    label: "Separately reimbursable under OPPS (status indicator pays separately)",
    hardGate: true,
    agentEvaluable: true,
    enabled: true,
  },
  {
    id: "c_exclusion",
    label: "Not on my exclusion list (already in firm implementation scope)",
    hardGate: true,
    agentEvaluable: false,
    builtin: true,
    enabled: true,
  },
  {
    id: "c_min_rate",
    label: "National Medicare rate at or above threshold",
    hardGate: false,
    agentEvaluable: true,
    threshold: 25,
    thresholdKind: "minMedicareRate",
    enabled: true,
  },
  {
    id: "c_addressable",
    label: "Addressable via documentation / coding / charge-capture improvement",
    hardGate: false,
    agentEvaluable: true,
    enabled: true,
  },
  {
    id: "c_service_line",
    label: "Relevant to the selected service line in a hospital outpatient setting",
    hardGate: false,
    agentEvaluable: true,
    enabled: true,
  },
  {
    id: "c_ncci",
    label: "No prohibitive NCCI bundling, packaging, or audit-risk pattern",
    hardGate: false,
    agentEvaluable: true,
    enabled: true,
  },
];

export interface Assumptions {
  medicareMixPct: number;
  commercialMultiplier: number;
  captureRate: number;
}

interface OHState {
  codes: CodeEntry[];
  criteria: Criterion[];
  exclusionList: string[];
  assumptions: Assumptions;
  drafts: Draft[];
  questions: Question[];
  lastTouchBase: number | null;
  setTouchBase: () => void;
  hydrated: boolean;
  setHydrated: () => void;

  // code actions
  upsertResearch: (
    code: string,
    serviceLine: ServiceLine,
    research: Research,
    extra?: { userQty?: number | null; userCharges?: number | null }
  ) => string; // returns entry id
  quickAdd: (
    code: string,
    serviceLine: ServiceLine,
    userQty: number | null,
    userCharges: number | null
  ) => string;
  getByCode: (code: string) => CodeEntry | undefined;
  getById: (id: string) => CodeEntry | undefined;
  setVerification: (id: string, v: Verification) => void;
  addScenario: (id: string, s: EstimateScenario) => void;
  removeScenario: (id: string, scenarioId: string) => void;
  setNotes: (id: string, notes: string) => void;
  setUserFigures: (id: string, qty: number | null, charges: number | null) => void;
  removeCode: (id: string) => void;
  pushTimeline: (id: string, kind: TimelineKind, detail: string) => void;

  // criteria
  setCriteria: (c: Criterion[]) => void;
  addCriterion: (label: string, hardGate: boolean) => void;
  updateCriterion: (id: string, patch: Partial<Criterion>) => void;
  removeCriterion: (id: string) => void;
  moveCriterion: (id: string, dir: -1 | 1) => void;

  // exclusion list
  setExclusionList: (codes: string[]) => void;
  isExcluded: (code: string) => boolean;

  // assumptions
  setAssumptions: (a: Partial<Assumptions>) => void;

  // drafts
  addDraft: (d: Draft) => void;
  removeDraft: (id: string) => void;

  // questions
  addQuestion: (text: string, source: string, code?: string) => void;
  toggleQuestion: (id: string) => void;
  removeQuestion: (id: string) => void;

  // backup
  exportAll: () => string;
  importAll: (json: string) => boolean;
  clearAll: () => void;
}

function event(kind: TimelineKind, detail: string): TimelineEvent {
  return { id: makeId("ev"), kind, detail, at: Date.now() };
}

export const useStore = create<OHState>()(
  persist(
    (set, get) => ({
      codes: [],
      criteria: DEFAULT_CRITERIA,
      exclusionList: [],
      assumptions: { ...DEFAULT_ASSUMPTIONS },
      drafts: [],
      questions: [],
      lastTouchBase: null,
      setTouchBase: () => set({ lastTouchBase: Date.now() }),
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),

      upsertResearch: (code, serviceLine, research, extra) => {
        const existing = get().codes.find((c) => c.code === code);
        const now = Date.now();
        if (existing) {
          set({
            codes: get().codes.map((c) =>
              c.id === existing.id
                ? {
                    ...c,
                    serviceLine,
                    research,
                    userQty: extra?.userQty ?? c.userQty,
                    userCharges: extra?.userCharges ?? c.userCharges,
                    updatedAt: now,
                    timeline: [
                      event("researched", `Researched ${code} (${research.verdict})`),
                      ...c.timeline,
                    ],
                  }
                : c
            ),
          });
          return existing.id;
        }
        const id = makeId("code");
        const entry: CodeEntry = {
          id,
          code,
          serviceLine,
          userQty: extra?.userQty ?? null,
          userCharges: extra?.userCharges ?? null,
          research,
          verification: null,
          scenarios: [],
          notes: "",
          timeline: [event("researched", `Researched ${code} (${research.verdict})`)],
          createdAt: now,
          updatedAt: now,
        };
        set({ codes: [entry, ...get().codes] });
        return id;
      },

      quickAdd: (code, serviceLine, userQty, userCharges) => {
        const existing = get().codes.find((c) => c.code === code);
        if (existing) {
          set({
            codes: get().codes.map((c) =>
              c.id === existing.id
                ? { ...c, userQty, userCharges, updatedAt: Date.now() }
                : c
            ),
          });
          return existing.id;
        }
        const id = makeId("code");
        const now = Date.now();
        const entry: CodeEntry = {
          id,
          code,
          serviceLine,
          userQty,
          userCharges,
          research: null,
          verification: null,
          scenarios: [],
          notes: "",
          timeline: [event("added", `Added ${code} (to research)`)],
          createdAt: now,
          updatedAt: now,
        };
        set({ codes: [entry, ...get().codes] });
        return id;
      },

      getByCode: (code) => get().codes.find((c) => c.code === code),
      getById: (id) => get().codes.find((c) => c.id === id),

      setVerification: (id, v) =>
        set({
          codes: get().codes.map((c) =>
            c.id === id
              ? {
                  ...c,
                  verification: v,
                  updatedAt: Date.now(),
                  timeline: [
                    event("verified", `Verification: ${v.result}`),
                    ...c.timeline,
                  ],
                }
              : c
          ),
        }),

      addScenario: (id, s) =>
        set({
          codes: get().codes.map((c) =>
            c.id === id
              ? {
                  ...c,
                  scenarios: [s, ...c.scenarios],
                  updatedAt: Date.now(),
                  timeline: [
                    event("estimated", `Scenario "${s.name}" — base ${Math.round(s.base).toLocaleString()}`),
                    ...c.timeline,
                  ],
                }
              : c
          ),
        }),

      removeScenario: (id, scenarioId) =>
        set({
          codes: get().codes.map((c) =>
            c.id === id
              ? { ...c, scenarios: c.scenarios.filter((s) => s.id !== scenarioId) }
              : c
          ),
        }),

      setNotes: (id, notes) =>
        set({
          codes: get().codes.map((c) =>
            c.id === id ? { ...c, notes, updatedAt: Date.now() } : c
          ),
        }),

      setUserFigures: (id, qty, charges) =>
        set({
          codes: get().codes.map((c) =>
            c.id === id ? { ...c, userQty: qty, userCharges: charges, updatedAt: Date.now() } : c
          ),
        }),

      removeCode: (id) => set({ codes: get().codes.filter((c) => c.id !== id) }),

      pushTimeline: (id, kind, detail) =>
        set({
          codes: get().codes.map((c) =>
            c.id === id ? { ...c, timeline: [event(kind, detail), ...c.timeline] } : c
          ),
        }),

      setCriteria: (criteria) => set({ criteria }),
      addCriterion: (label, hardGate) =>
        set({
          criteria: [
            ...get().criteria,
            {
              id: makeId("c"),
              label,
              hardGate,
              agentEvaluable: true,
              enabled: true,
            },
          ],
        }),
      updateCriterion: (id, patch) =>
        set({
          criteria: get().criteria.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }),
      removeCriterion: (id) =>
        set({ criteria: get().criteria.filter((c) => c.id !== id || c.builtin) }),
      moveCriterion: (id, dir) => {
        const arr = [...get().criteria];
        const i = arr.findIndex((c) => c.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= arr.length) return;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        set({ criteria: arr });
      },

      setExclusionList: (codes) =>
        set({ exclusionList: Array.from(new Set(codes.map((c) => c.trim().toUpperCase()).filter(Boolean))) }),
      isExcluded: (code) => get().exclusionList.includes(code.trim().toUpperCase()),

      setAssumptions: (a) => set({ assumptions: { ...get().assumptions, ...a } }),

      addDraft: (d) => set({ drafts: [d, ...get().drafts] }),
      removeDraft: (id) => set({ drafts: get().drafts.filter((d) => d.id !== id) }),

      addQuestion: (text, source, code) =>
        set({
          questions: [
            { id: makeId("q"), text, source, code, answered: false, createdAt: Date.now() },
            ...get().questions,
          ],
        }),
      toggleQuestion: (id) =>
        set({
          questions: get().questions.map((q) =>
            q.id === id ? { ...q, answered: !q.answered } : q
          ),
        }),
      removeQuestion: (id) => set({ questions: get().questions.filter((q) => q.id !== id) }),

      exportAll: () => {
        const { codes, criteria, exclusionList, assumptions, drafts, questions, lastTouchBase } = get();
        return JSON.stringify(
          { version: 1, exportedAt: Date.now(), codes, criteria, exclusionList, assumptions, drafts, questions, lastTouchBase },
          null,
          2
        );
      },

      importAll: (json) => {
        try {
          const data = JSON.parse(json);
          if (!data || typeof data !== "object") return false;
          set({
            codes: Array.isArray(data.codes) ? data.codes : get().codes,
            criteria: Array.isArray(data.criteria) && data.criteria.length ? data.criteria : get().criteria,
            exclusionList: Array.isArray(data.exclusionList) ? data.exclusionList : get().exclusionList,
            assumptions: data.assumptions ? { ...get().assumptions, ...data.assumptions } : get().assumptions,
            drafts: Array.isArray(data.drafts) ? data.drafts : get().drafts,
            questions: Array.isArray(data.questions) ? data.questions : get().questions,
            lastTouchBase: typeof data.lastTouchBase === "number" ? data.lastTouchBase : get().lastTouchBase,
          });
          return true;
        } catch {
          return false;
        }
      },

      clearAll: () =>
        set({
          codes: [],
          drafts: [],
          questions: [],
          exclusionList: [],
          criteria: DEFAULT_CRITERIA,
          assumptions: { ...DEFAULT_ASSUMPTIONS },
          lastTouchBase: null,
        }),
    }),
    {
      name: "opportunity-hunter-v1",
      partialize: (s) => ({
        codes: s.codes,
        criteria: s.criteria,
        exclusionList: s.exclusionList,
        assumptions: s.assumptions,
        drafts: s.drafts,
        questions: s.questions,
        lastTouchBase: s.lastTouchBase,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
