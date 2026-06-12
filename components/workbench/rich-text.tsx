"use client";

import type { ReactNode } from "react";

/** Minimal inline renderer for **bold** and `code` spans used in Workbench copy. */
export function Rich({ text }: { text: string }) {
  const out: ReactNode[] = [];
  // split on **bold** and `code`
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  const parts = text.split(re);
  parts.forEach((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      out.push(<strong key={i}>{p.slice(2, -2)}</strong>);
    } else if (p.startsWith("`") && p.endsWith("`")) {
      out.push(
        <code key={i} className="mono text-[0.85em] bg-paper border border-rule rounded-[2px] px-1">
          {p.slice(1, -1)}
        </code>
      );
    } else if (p) {
      out.push(<span key={i}>{p}</span>);
    }
  });
  return <>{out}</>;
}
