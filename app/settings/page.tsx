import { PageHeader, EmptyState } from "@/components/ui";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        field="8 · SETTINGS"
        title="Settings & data"
        subtitle="Exclusion list, verification criteria, estimator defaults, and backup / restore."
      />
      <EmptyState
        icon={<Settings size={28} strokeWidth={1.6} />}
        title="Configuration — Phase 6"
        body="All your local data lives in this browser. Backup / restore arrives in Phase 6."
      />
    </div>
  );
}
