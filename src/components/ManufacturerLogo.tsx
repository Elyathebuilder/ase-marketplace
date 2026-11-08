import type { Manufacturer } from "@/lib/types";

/** Generated monogram until manufacturers upload their logo (Phase 3). */
export function ManufacturerLogo({ m, size = "md" }: { m: Manufacturer; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "h-20 w-20 text-2xl" : size === "sm" ? "h-9 w-9 text-xs" : "h-12 w-12 text-sm";
  return (
    <div
      className={`${cls} shrink-0 rounded-xl bg-ink text-white font-[family-name:var(--font-display)] font-extrabold flex items-center justify-center ring-1 ring-black/5`}
      aria-hidden="true"
    >
      {m.monogram}
    </div>
  );
}
