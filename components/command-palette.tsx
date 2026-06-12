"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { SI_TABLE, GLOSSARY } from "@/lib/learn-content";
import {
  Crosshair, Library, BadgeCheck, Calculator, Compass, GraduationCap,
  FileText, Settings, Search, CornerDownLeft, MessagesSquare,
} from "lucide-react";

interface Item {
  id: string;
  label: string;
  sub?: string;
  group: string;
  icon?: React.ReactNode;
  run: () => void;
}

const NAV: { label: string; href: string; icon: React.ReactNode }[] = [
  { label: "Hunt a code", href: "/", icon: <Crosshair size={14} /> },
  { label: "Library", href: "/library", icon: <Library size={14} /> },
  { label: "Verify", href: "/verify", icon: <BadgeCheck size={14} /> },
  { label: "Estimate", href: "/estimate", icon: <Calculator size={14} /> },
  { label: "Scout", href: "/scout", icon: <Compass size={14} /> },
  { label: "Learn", href: "/learn", icon: <GraduationCap size={14} /> },
  { label: "Draft", href: "/draft", icon: <FileText size={14} /> },
  { label: "Mentor prep", href: "/mentor", icon: <MessagesSquare size={14} /> },
  { label: "Settings", href: "/settings", icon: <Settings size={14} /> },
];

const LEARN_SECTIONS: [string, string][] = [
  ["si", "OPPS Status Indicators"],
  ["reimb", "Separately Reimbursable 101"],
  ["oppspfs", "OPPS vs PFS"],
  ["anatomy", "Code Anatomy"],
  ["ncci", "NCCI & Packaging"],
  ["mods", "Modifier Mini-Reference"],
  ["lines", "Service-Line One-Pagers"],
  ["playbook", "The Playbook"],
  ["glossary", "Glossary"],
  ["sources", "Official Sources"],
  ["ask", "Ask the analyst"],
];

export function CommandPalette() {
  const router = useRouter();
  const codes = useStore((s) => s.codes);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("oh:cmdk", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("oh:cmdk", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const go = (href: string) => () => {
      router.push(href);
      setOpen(false);
    };
    const list: Item[] = NAV.map((n) => ({
      id: `nav-${n.href}`,
      label: n.label,
      group: "Go to",
      icon: n.icon,
      run: go(n.href),
    }));
    for (const c of codes) {
      list.push({
        id: `code-${c.id}`,
        label: c.code,
        sub: c.research?.description ?? "to research",
        group: "Saved codes",
        icon: <Library size={14} />,
        run: go(`/library?open=${c.id}`),
      });
    }
    for (const [anchor, label] of LEARN_SECTIONS) {
      list.push({
        id: `learn-${anchor}`,
        label,
        sub: "Learn",
        group: "Reference",
        icon: <GraduationCap size={14} />,
        run: go(`/learn#${anchor}`),
      });
    }
    // glossary + SI quick jumps
    for (const g of GLOSSARY) {
      list.push({ id: `gl-${g.term}`, label: g.term, sub: "Glossary term", group: "Reference", icon: <GraduationCap size={14} />, run: go("/learn#glossary") });
    }
    for (const r of SI_TABLE) {
      list.push({ id: `si-${r.si}`, label: `Status indicator ${r.si}`, sub: r.paid === "Yes" ? "separately paid" : r.paid === "No" ? "not separately paid" : r.paid.toLowerCase(), group: "Reference", icon: <GraduationCap size={14} />, run: go("/learn#si") });
    }
    return list;
  }, [codes, router]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items.filter((i) => i.group === "Go to" || i.group === "Saved codes").slice(0, 14);
    return items
      .filter((i) => (i.label + " " + (i.sub ?? "")).toLowerCase().includes(s))
      .slice(0, 24);
  }, [q, items]);

  useEffect(() => setActive(0), [q]);

  if (!open) return null;

  // group for display
  const groups: Record<string, Item[]> = {};
  filtered.forEach((i) => {
    (groups[i.group] ??= []).push(i);
  });
  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[60] no-print" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-ink/30" />
      <div
        className="absolute left-1/2 top-[12%] -translate-x-1/2 w-[92%] max-w-lg bg-panel border border-ink rounded-[3px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 border-b border-rule">
          <Search size={15} className="text-slate" />
          <input
            ref={inputRef}
            className="flex-1 py-3 bg-transparent outline-none text-sm"
            placeholder="Jump to a page, code, or reference…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                filtered[active]?.run();
              }
            }}
          />
          <span className="label-mono">ESC</span>
        </div>
        <div className="max-h-[55vh] overflow-y-auto py-1">
          {filtered.length === 0 && <div className="px-4 py-6 text-center text-sm text-slate">No matches.</div>}
          {Object.entries(groups).map(([group, gItems]) => (
            <div key={group}>
              <div className="label-mono px-3 pt-2 pb-1">{group}</div>
              {gItems.map((i) => {
                flatIndex++;
                const idx = flatIndex;
                return (
                  <button
                    key={i.id}
                    onMouseEnter={() => setActive(idx)}
                    onClick={i.run}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm ${
                      active === idx ? "bg-paper" : ""
                    }`}
                  >
                    <span className="text-slate shrink-0">{i.icon}</span>
                    <span className="mono font-medium">{i.label}</span>
                    {i.sub && <span className="text-xs text-slate truncate">{i.sub}</span>}
                    {active === idx && <CornerDownLeft size={12} className="text-slate ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
