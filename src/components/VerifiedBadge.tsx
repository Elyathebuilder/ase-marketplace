import { BadgeCheck, Clock } from "lucide-react";
import { getDict, type Lang } from "@/i18n";
import type { VerificationStatus } from "@/lib/types";

export function VerifiedBadge({ status, compact = false, lang }: { status: VerificationStatus; compact?: boolean; lang: Lang }) {
  const v = getDict(lang).verification;
  if (status === "verified")
    return (
      <span className="chip bg-ok-50 text-ok" title={v.verifiedTitle}>
        <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
        {compact ? v.verifiedShort : v.verified}
      </span>
    );
  if (status === "pending")
    return (
      <span className="chip bg-warn-50 text-warn">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {compact ? v.pendingShort : v.pending}
      </span>
    );
  return <span className="chip bg-paper-2 text-muted">{v.unverified}</span>;
}
