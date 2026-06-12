"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Crosshair,
  Library,
  Table2,
  BadgeCheck,
  Calculator,
  Compass,
  GraduationCap,
  FileText,
  Settings,
  Search,
} from "lucide-react";
import type { ReactNode } from "react";
import { CommandPalette } from "./command-palette";
import { useState, useEffect } from "react";

const NAV = [
  { href: "/", label: "Hunt", icon: Crosshair, field: "1" },
  { href: "/library", label: "Library", icon: Library, field: "2" },
  { href: "/workbench", label: "Workbench", icon: Table2, field: "W" },
  { href: "/verify", label: "Verify", icon: BadgeCheck, field: "3" },
  { href: "/estimate", label: "Estimate", icon: Calculator, field: "4" },
  { href: "/scout", label: "Scout", icon: Compass, field: "5" },
  { href: "/learn", label: "Learn", icon: GraduationCap, field: "6" },
  { href: "/draft", label: "Draft", icon: FileText, field: "7" },
  { href: "/settings", label: "Settings", icon: Settings, field: "8" },
];

function cmdk() {
  window.dispatchEvent(new Event("oh:cmdk"));
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="min-h-screen md:flex">
      <CommandPalette />
      {/* Desktop left rail */}
      <aside className="no-print hidden md:flex md:flex-col md:w-56 md:shrink-0 border-r border-rule bg-panel sticky top-0 h-screen">
        <Link href="/" className="px-5 pt-6 pb-4 block">
          <div className="label-mono text-[9px]">CMS-1500 · ORO</div>
          <div className="font-semibold text-[15px] leading-tight mt-1">
            Opportunity<span className="text-claim">.</span>Hunter
          </div>
        </Link>
        <div className="px-3 pb-3 border-b border-rule">
          <button
            onClick={cmdk}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate border border-rule rounded-[2px] hover:border-ink hover:text-ink transition-colors"
          >
            <Search size={13} />
            <span>Quick search</span>
            <span className="mono text-[9px] ml-auto">{isMac ? "⌘K" : "^K"}</span>
          </button>
        </div>
        <nav className="flex-1 py-3">
          {NAV.map((n) => {
            const active = isActive(n.href);
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-3 px-5 py-2.5 text-sm border-l-2 transition-colors",
                  active
                    ? "border-claim bg-paper font-semibold text-ink"
                    : "border-transparent text-slate hover:text-ink hover:bg-paper"
                )}
              >
                <Icon size={16} strokeWidth={active ? 2.4 : 1.8} />
                <span>{n.label}</span>
                <span className="mono text-[9px] text-slate ml-auto">{n.field}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-3 border-t border-rule space-y-2">
          <Link
            href="/mentor"
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-xs rounded-[2px] border transition-colors",
              isActive("/mentor") ? "border-claim text-ink font-semibold" : "border-rule text-slate hover:text-ink hover:border-ink"
            )}
          >
            Mentor prep
          </Link>
          <div className="label-mono text-[9px] leading-relaxed px-1">
            Browser-only data · back up in Settings
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 pb-24 md:pb-8">
        {/* Mobile top bar */}
        <header className="no-print md:hidden sticky top-0 z-20 bg-panel/95 backdrop-blur border-b border-rule px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold text-[15px]">
            Opportunity<span className="text-claim">.</span>Hunter
          </Link>
          <button onClick={cmdk} className="flex items-center gap-1.5 text-slate" aria-label="Quick search">
            <Search size={18} />
          </button>
        </header>
        <div className="max-w-3xl mx-auto px-4 py-5 md:px-8 md:py-8">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="no-print md:hidden fixed bottom-0 inset-x-0 z-30 bg-panel/97 backdrop-blur border-t border-rule grid grid-cols-9">
        {NAV.map((n) => {
          const active = isActive(n.href);
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[9px]",
                active ? "text-claim" : "text-slate"
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
              <span className="leading-none tracking-tight w-full text-center truncate px-0.5">
                {n.href === "/workbench" ? "Work" : n.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
