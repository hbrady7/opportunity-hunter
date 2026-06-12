import { PageHeader, EmptyState } from "@/components/ui";
import { Calculator } from "lucide-react";

export default function EstimatePage() {
  return (
    <div>
      <PageHeader
        field="4 · ESTIMATE"
        title="Opportunity estimate"
        subtitle="Transparent reimbursement math from national Medicare rates and your assumptions."
      />
      <EmptyState
        icon={<Calculator size={28} strokeWidth={1.6} />}
        title="Estimator — Phase 4"
        body="Low / base / high annual opportunity with live assumption sliders. Coming in Phase 4."
      />
    </div>
  );
}
