"use client";

import { useState } from "react";
import { Label } from "./ui";
import { ExternalLink, ShieldCheck, ChevronDown } from "lucide-react";

/**
 * "Verify it yourself" — deep links to primary CMS sources, prefilled with the
 * active code wherever the destination supports it, plus a confirm-the-claim checklist.
 */
export function CmsLauncher({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  const c = encodeURIComponent(code);

  const links = [
    {
      name: "OPPS Addendum B",
      url: "https://www.cms.gov/medicare/payment/prospective-payment-systems/hospital-outpatient/addendum-a-and-addendum-b-updates",
      hint: `Open the latest quarter, then find ${code} — read its Status Indicator, APC, and payment rate.`,
    },
    {
      name: "PFS Lookup Tool",
      url: "https://www.cms.gov/medicare/physician-fee-schedule/search",
      hint: `Search HCPCS ${code} for the national professional (PFS) amount.`,
    },
    {
      name: "NCCI edits",
      url: "https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits",
      hint: `Check PTP pairs and the MUE for ${code}.`,
    },
    {
      name: `Search CMS.gov for ${code}`,
      url: `https://www.google.com/search?q=${c}+site%3Acms.gov`,
      hint: "Fastest way to land on the relevant CMS page or transmittal.",
    },
  ];

  return (
    <div className="border-t border-rule pt-3 no-print">
      <button className="flex items-center gap-2 w-full text-left" onClick={() => setOpen((v) => !v)}>
        <ShieldCheck size={14} className="text-approval" />
        <Label>Verify it yourself</Label>
        <ChevronDown size={14} className={`text-slate ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <ol className="text-xs text-slate space-y-1 mb-2">
            <li><span className="mono text-claim">1.</span> Open Addendum B → find <span className="mono">{code}</span> → read the Status Indicator.</li>
            <li><span className="mono text-claim">2.</span> Separately paid SI (S, T, V, J1, K, G…)? Note the APC &amp; rate.</li>
            <li><span className="mono text-claim">3.</span> Cross-check NCCI for bundling/MUE before you size it.</li>
          </ol>
          {links.map((l) => (
            <a
              key={l.name}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 px-3 py-2 border border-rule rounded-[2px] hover:border-ink transition-colors"
            >
              <ExternalLink size={13} className="text-claim shrink-0 mt-0.5" />
              <span className="text-sm">
                <span className="font-medium">{l.name}</span>
                <span className="block text-xs text-slate">{l.hint}</span>
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
