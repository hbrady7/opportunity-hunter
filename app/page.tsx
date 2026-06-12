import { PageHeader, EmptyState } from "@/components/ui";
import { Crosshair } from "lucide-react";

export default function HuntPage() {
  return (
    <div>
      <PageHeader
        field="1 · HUNT"
        title="Hunt a code"
        subtitle="Enter a CPT/HCPCS code and let the companion research it against CMS sources."
      />
      <EmptyState
        icon={<Crosshair size={28} strokeWidth={1.6} />}
        title="The core loop starts here"
        body="Phase 2 wires up code research. For now this is a designed stub — navigation, design system, and persistence are live."
      />
    </div>
  );
}
