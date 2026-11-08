import { BadgeCheck, Clock } from "lucide-react";
import type { VerificationStatus } from "@/lib/types";

export function VerifiedBadge({ status, compact = false }: { status: VerificationStatus; compact?: boolean }) {
  if (status === "verified")
    return (
      <span className="chip bg-ok-50 text-ok" title="Verified manufacturer: ASE checked that this company produces its own goods in Georgia">
        <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
        {compact ? "Verified" : "Verified manufacturer"}
      </span>
    );
  if (status === "pending")
    return (
      <span className="chip bg-warn-50 text-warn">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {compact ? "Pending" : "Verification pending"}
      </span>
    );
  return <span className="chip bg-paper-2 text-muted">Unverified</span>;
}
