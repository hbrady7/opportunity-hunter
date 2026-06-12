import { PageHeader, EmptyState } from "@/components/ui";
import { FileText } from "lucide-react";

export default function DraftPage() {
  return (
    <div>
      <PageHeader
        field="7 · DRAFT"
        title="Deliverable studio"
        subtitle="Turn saved codes into workpaper sections, slide content, and mentor updates — copy-first."
      />
      <EmptyState
        icon={<FileText size={28} strokeWidth={1.6} />}
        title="Drafting studio — Phase 6"
        body="Synthesizes your Library research into deliverable-ready markdown. Coming in Phase 6."
      />
    </div>
  );
}
