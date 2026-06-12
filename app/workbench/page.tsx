"use client";

import { PageHeader } from "@/components/ui";
import { BuildGuide } from "@/components/workbench/build-guide";
import { FormulaCards } from "@/components/workbench/formula-cards";
import { AnalysisQuestions } from "@/components/workbench/analysis-questions";
import { PivotRecipes } from "@/components/workbench/pivot-recipes";
import { WorkbookButton } from "@/components/workbench/workbook-button";
import { BulkIntake } from "@/components/workbench/bulk-intake";

const SECTIONS: [string, string][] = [
  ["workbook", "Starter Workbook"],
  ["build", "Build Guide"],
  ["formulas", "Formula Cards"],
  ["pivots", "Pivot Recipes"],
  ["intake", "Bulk Paste"],
  ["questions", "Analysis Questions"],
];

export default function WorkbenchPage() {
  return (
    <div>
      <PageHeader
        field="W · WORKBENCH"
        title="Workbench"
        subtitle="Build the analysis. The app rides shotgun. A guided path from raw charge extract to a research-ready shortlist."
      />

      <div className="flex flex-wrap gap-1.5 mb-6 no-print">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="chip text-slate hover:text-ink">
            {label}
          </a>
        ))}
      </div>

      <section id="workbook" className="scroll-mt-20 mb-10">
        <WorkbookButton />
      </section>

      <section id="build" className="scroll-mt-20 mb-10">
        <BuildGuide />
      </section>

      <section id="formulas" className="scroll-mt-20 mb-10">
        <FormulaCards />
      </section>

      <section id="pivots" className="scroll-mt-20 mb-10">
        <PivotRecipes />
      </section>

      <section id="intake" className="scroll-mt-20 mb-10">
        <div className="card-plain p-4 sm:p-5">
          <BulkIntake />
        </div>
      </section>

      <section id="questions" className="scroll-mt-20 mb-10">
        <AnalysisQuestions />
      </section>
    </div>
  );
}
