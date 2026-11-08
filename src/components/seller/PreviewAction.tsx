"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";

/** A button that only shows what would happen. Nothing is saved in the preview. */
export function PreviewAction({ label, done, variant = "primary", className = "" }: { label: string; done: string; variant?: "primary" | "dark" | "outline"; className?: string }) {
  const { t } = useI18n();
  const [clicked, setClicked] = useState(false);
  return (
    <span className={`inline-flex flex-col gap-1 ${className}`}>
      <button type="button" className={`btn btn-${variant}`} onClick={() => setClicked(true)}>{label}</button>
      {clicked && <span role="status" className="text-xs text-muted">{t.seller.previewSaved(done)}</span>}
    </span>
  );
}
