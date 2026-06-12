import { PageHeader, EmptyState } from "@/components/ui";
import { GraduationCap } from "lucide-react";

export default function LearnPage() {
  return (
    <div>
      <PageHeader
        field="6 · LEARN"
        title="Learning hub"
        subtitle="OPPS status indicators, the methodology playbook, service-line one-pagers, and a glossary."
      />
      <EmptyState
        icon={<GraduationCap size={28} strokeWidth={1.6} />}
        title="Reference content — Phase 5"
        body="Hand-written, accurate RCM reference that works with no API key. Coming in Phase 5."
      />
    </div>
  );
}
