import { PageHeader, EmptyState } from "@/components/ui";
import { Compass } from "lucide-react";

export default function ScoutPage() {
  return (
    <div>
      <PageHeader
        field="5 · SCOUT"
        title="Scout net-new"
        subtitle="Discover emerging, under-adopted outpatient procedures by service line."
      />
      <EmptyState
        icon={<Compass size={28} strokeWidth={1.6} />}
        title="Discovery — Phase 5"
        body="Surface candidate procedures, deduped against your Library and exclusion list. Coming in Phase 5."
      />
    </div>
  );
}
