import type { Manufacturer } from "@/lib/types";

/** The seller's uploaded logo, or a generated monogram when there is none. */
export function ManufacturerLogo({ m, size = "md" }: { m: Pick<Manufacturer, "monogram"> & { logoUrl?: string | null }; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "h-20 w-20 text-2xl" : size === "sm" ? "h-9 w-9 text-xs" : "h-12 w-12 text-sm";
  if (m.logoUrl)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- uploads are served by our own permission-checked route
      <img src={m.logoUrl} alt="" aria-hidden="true" className={`${cls} shrink-0 rounded-xl bg-surface object-contain ring-1 ring-black/5`} />
    );
  return (
    <div
      className={`${cls} shrink-0 rounded-xl bg-ink text-white font-[family-name:var(--font-display)] font-extrabold flex items-center justify-center ring-1 ring-black/5`}
      aria-hidden="true"
    >
      {m.monogram}
    </div>
  );
}
