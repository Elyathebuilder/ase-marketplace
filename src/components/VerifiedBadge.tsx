import { BadgeCheck, Store } from "lucide-react";
import { getDict, type Lang } from "@/i18n";
import type { VerificationStatus } from "@/lib/types";

/**
 * Two different things, never mixed up:
 * - "verified": the Verified Manufacturer badge, awarded by an Amartani admin after a manual verification and inspection.
 * - "approved": an ordinary approved seller (no inspection implied). Shown only where `showApproved` is set.
 */
export function VerifiedBadge({ status, compact = false, lang, showApproved = true }: { status: VerificationStatus; compact?: boolean; lang: Lang; showApproved?: boolean }) {
  const v = getDict(lang).verification;
  if (status === "verified")
    return (
      <span className="chip bg-ok-50 text-ok" title={v.verifiedTitle} data-badge="verified">
        <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
        {compact ? v.verifiedShort : v.verified}
      </span>
    );
  if (!showApproved) return null;
  return (
    <span className="chip bg-paper-2 text-ink-2" title={v.approvedTitle} data-badge="approved">
      <Store className="h-3.5 w-3.5" aria-hidden="true" />
      {v.approved}
    </span>
  );
}
