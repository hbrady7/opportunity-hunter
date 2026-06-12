"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** All-caps mono micro label. */
export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("label-mono", className)}>{children}</span>;
}

/** Section header with the claim-form field-number aesthetic. */
export function FieldHeader({
  num,
  title,
  hint,
}: {
  num?: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline gap-2 mb-3">
      {num && (
        <span className="mono text-[10px] text-claim border border-claim rounded-[2px] px-1 leading-tight pt-[1px]">
          {num}
        </span>
      )}
      <h2 className="label-mono label-mono-ink text-[11px]">{title}</h2>
      {hint && <span className="text-xs text-slate ml-auto">{hint}</span>}
    </div>
  );
}

export function Stamp({
  label,
  variant,
  className,
}: {
  label: string;
  variant: "green" | "amber" | "red" | "slate";
  className?: string;
}) {
  return <span className={cn("stamp", `stamp-${variant}`, className)}>{label}</span>;
}

export function Chip({
  children,
  tone = "slate",
  className,
}: {
  children: ReactNode;
  tone?: "slate" | "green" | "amber" | "red" | "ink";
  className?: string;
}) {
  const tones: Record<string, string> = {
    slate: "text-slate",
    green: "text-approval",
    amber: "text-amber",
    red: "text-claim",
    ink: "text-ink",
  };
  return <span className={cn("chip", tones[tone], className)}>{children}</span>;
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-plain inset-dashed border-dashed flex flex-col items-center text-center gap-3 px-6 py-12">
      {icon && <div className="text-slate">{icon}</div>}
      <h3 className="label-mono label-mono-ink text-[12px]">{title}</h3>
      <p className="text-sm text-slate max-w-sm">{body}</p>
      {action}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "spin inline-block w-4 h-4 border-2 border-rule border-t-claim rounded-full",
        className
      )}
    />
  );
}

export function FallbackNote({ message }: { message?: string }) {
  return (
    <div className="flex items-start gap-2 text-xs text-amber bg-amber/5 border border-amber/30 rounded-[2px] px-3 py-2">
      <span className="mono">⚠</span>
      <span>{message ?? "Based on model knowledge — verify rates before client use."}</span>
    </div>
  );
}

export function KeyMissing() {
  return (
    <div className="card-plain border-dashed inset-dashed px-5 py-6 text-center space-y-2">
      <div className="label-mono label-mono-ink text-[12px]">API key not configured</div>
      <p className="text-sm text-slate max-w-md mx-auto">
        Agent features need an <code className="mono">ANTHROPIC_API_KEY</code>. Set it in{" "}
        <code className="mono">.env.local</code> (locally) or your Vercel project env, then reload.
        Everything static — Library, Learn, Settings, the estimator with a manual rate — still works without it.
      </p>
    </div>
  );
}

export function PageHeader({
  title,
  field,
  subtitle,
  right,
}: {
  title: string;
  field: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5 border-b border-rule pb-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="label-mono">FORM {field}</span>
        </div>
        <h1 className="text-xl font-semibold mt-1 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate mt-1 max-w-xl">{subtitle}</p>}
      </div>
      {right && <div className="no-print shrink-0">{right}</div>}
    </div>
  );
}
