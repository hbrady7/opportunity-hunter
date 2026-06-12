"use client";

import type { Research } from "@/lib/types";
import { VERDICT_STAMP, SERVICE_LINE_LABELS, type ServiceLine } from "@/lib/constants";
import { Stamp, Chip, Label, FallbackNote } from "./ui";
import { formatUSD } from "@/lib/utils";
import type { ReactNode } from "react";

function ReimbursableBadge({ value }: { value: Research["reimbursable"] }) {
  const map = {
    Yes: { tone: "green" as const, label: "SEPARATELY REIMBURSABLE" },
    No: { tone: "red" as const, label: "NOT SEPARATELY PAYABLE" },
    Conditional: { tone: "amber" as const, label: "CONDITIONAL" },
  };
  const m = map[value];
  return <Chip tone={m.tone}>{m.label}</Chip>;
}

export function ClaimCard({
  code,
  serviceLine,
  research,
  excluded,
  actions,
}: {
  code: string;
  serviceLine: ServiceLine;
  research: Research;
  excluded?: boolean;
  actions?: ReactNode;
}) {
  const stamp = VERDICT_STAMP[research.verdict];
  return (
    <div className="card-claim p-5 space-y-4">
      {/* header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="mono text-2xl font-semibold tracking-wide">{code}</span>
            <Chip tone="ink">{SERVICE_LINE_LABELS[serviceLine]}</Chip>
            {excluded && <Chip tone="red">ON EXCLUSION LIST</Chip>}
          </div>
          <p className="text-sm mt-1.5 text-ink">{research.description}</p>
          <div className="mt-1">
            <Label>{research.category}</Label>
          </div>
        </div>
        <div className="shrink-0">
          <Stamp label={stamp.label} variant={stamp.cls.replace("stamp-", "") as "green" | "amber" | "red"} />
        </div>
      </div>

      {!research.usedWebSearch && <FallbackNote />}

      {/* reimbursable + rate + SI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="inset-dashed px-3 py-2">
          <Label>Reimbursable</Label>
          <div className="mt-1">
            <ReimbursableBadge value={research.reimbursable} />
          </div>
        </div>
        <div className="inset-dashed px-3 py-2">
          <Label>Status Indicator</Label>
          <div className="mono text-lg font-semibold mt-0.5">{research.statusIndicator}</div>
        </div>
        <div className="inset-dashed px-3 py-2">
          <Label>Approx Medicare</Label>
          <div className="mono text-lg font-semibold mt-0.5">
            {research.medicareRate != null ? formatUSD(research.medicareRate, { cents: true }) : "—"}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate">
        <span className="label-mono mr-1">SI:</span>
        {research.statusDetail}
      </p>

      {/* documentation */}
      {research.documentation.length > 0 && (
        <div>
          <Label>Documentation requirements</Label>
          <ul className="mt-1.5 space-y-1">
            {research.documentation.map((d, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-claim mono">▸</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* opportunity angle */}
      <div className="inset-dashed px-3 py-2.5">
        <Label>Opportunity angle</Label>
        <p className="text-sm mt-1">{research.opportunityAngle}</p>
      </div>

      {/* risk flags */}
      {research.riskFlags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {research.riskFlags.map((r, i) => (
            <Chip key={i} tone="amber">
              {r}
            </Chip>
          ))}
        </div>
      )}

      {/* verdict basis */}
      <div className="border-t border-rule pt-3 flex items-baseline gap-2">
        <Label>Basis</Label>
        <span className="text-sm italic text-slate">{research.verdictBasis}</span>
      </div>

      {actions && <div className="border-t border-rule pt-3 flex flex-wrap gap-2 no-print">{actions}</div>}
    </div>
  );
}
