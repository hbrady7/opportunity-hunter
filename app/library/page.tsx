import { PageHeader, EmptyState } from "@/components/ui";
import { Library } from "lucide-react";

export default function LibraryPage() {
  return (
    <div>
      <PageHeader
        field="2 · LIBRARY"
        title="Code ledger"
        subtitle="Every saved code, ranked. Sort, filter, annotate, and export to your workpapers."
      />
      <EmptyState
        icon={<Library size={28} strokeWidth={1.6} />}
        title="No codes saved yet"
        body="Research a code on the Hunt screen, or quick-add one here once Phase 2 lands."
      />
    </div>
  );
}
