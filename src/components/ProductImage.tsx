import { getCategory } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import { CategoryIcon } from "./CategoryIcon";

/**
 * Placeholder artwork for demo products (no real photos yet).
 * Real product photos replace this once manufacturers upload images in Phase 3.
 */
const TONES = [
  ["#f6ece6", "#e9d3c7"], ["#efe9df", "#dccfbd"], ["#f4e4e4", "#e2c2c4"], ["#ece7e0", "#d5ccbf"],
  ["#ebe9e4", "#d2cec6"], ["#f2ebe3", "#ddd0c1"], ["#efe6dd", "#d9c6b3"], ["#f3e6df", "#e0c7ba"],
  ["#eee8e6", "#d8cdc9"], ["#f1e8de", "#dccab5"], ["#e9e9e9", "#cfcfcf"], ["#ecebea", "#d3d0cc"],
  ["#eeeae5", "#d7cfc5"], ["#f2ebe6", "#dccfc6"],
];

export function ProductImage({ product, size = "md", className = "" }: { product: Product; size?: "sm" | "md" | "lg"; className?: string }) {
  const [a, b] = TONES[product.tone % TONES.length];
  const icon = getCategory(product.category)?.icon ?? "boxes";
  const iconSize = size === "lg" ? "h-24 w-24" : size === "sm" ? "h-8 w-8" : "h-14 w-14";
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: `radial-gradient(120% 90% at 30% 20%, ${a} 0%, ${b} 100%)` }}
      role="img"
      aria-label={`${product.name} (sample image)`}
    >
      <svg className="absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden="true">
        <defs>
          <pattern id={`p-${product.slug}`} width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M14 8v12M8 14h12" stroke="#17171a" strokeWidth="1.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#p-${product.slug})`} />
      </svg>
      <CategoryIcon name={icon} className={`${iconSize} text-ink/55 relative`} />
    </div>
  );
}
