"use client";

import { useState } from "react";
import { copyText } from "@/lib/utils";
import { Copy, Check } from "lucide-react";

export function CopyButton({
  text,
  label,
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function go() {
    if (await copyText(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  }
  return (
    <button className={`btn btn-sm btn-ghost ${className ?? ""}`} onClick={go}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {label ? (copied ? "Copied" : label) : null}
    </button>
  );
}
