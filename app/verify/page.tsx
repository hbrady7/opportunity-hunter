import { PageHeader, EmptyState } from "@/components/ui";
import { BadgeCheck } from "lucide-react";

export default function VerifyPage() {
  return (
    <div>
      <PageHeader
        field="3 · VERIFY"
        title="Verify to spec"
        subtitle="Run a code against your own viability criteria. You control every gate."
      />
      <EmptyState
        icon={<BadgeCheck size={28} strokeWidth={1.6} />}
        title="Criteria engine — Phase 3"
        body="A user-controlled checklist with hard gates and soft scoring. Coming in Phase 3."
      />
    </div>
  );
}
