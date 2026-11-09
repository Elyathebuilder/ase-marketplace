/**
 * Catalog rules that work the same in the browser and on the server: categories, prices,
 * availability and catalog URLs. No data access here; product data comes from lib/catalog.ts
 * (server) or from the cart API (browser).
 */
import { CATEGORIES } from "./categories";
import type { Availability, Category, Product } from "./types";

export const getCategories = (): Category[] => CATEGORIES;
export const getCategory = (slug: string) => CATEGORIES.find((c) => c.slug === slug);

export function availabilityOf(p: Product): Availability {
  if (p.stock <= 0) return "made_to_order";
  if (p.stock < 20) return "low_stock";
  return "in_stock";
}

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  made_to_order: "Made to order",
};

/** Lowest unit price a business can get (best wholesale tier), or null. */
export function lowestWholesalePrice(p: Product): number | null {
  const tiers = p.wholesale?.tiers ?? [];
  return tiers.length ? Math.min(...tiers.map((t) => t.unitPrice)) : null;
}

/** The price shown on cards and used for price filters. */
export function displayPrice(p: Product): number | null {
  return p.retailPrice ?? lowestWholesalePrice(p);
}

/**
 * The unit price for buying `qty` units now. Quantity prices apply automatically only when the
 * seller allows it (wholesale.quoteOnly false); otherwise larger orders go through a quotation.
 * Returns null when the product can't be bought at a fixed price.
 */
export function unitPriceFor(p: Product, qty: number): { unit: number; pricing: "retail" | "wholesale" } | null {
  if (!p.buyNow || p.retailPrice == null) return null;
  const w = p.wholesale;
  if (w && !w.quoteOnly) {
    const tier = [...w.tiers].filter((t) => qty >= t.minQty).sort((a, b) => b.minQty - a.minQty)[0];
    if (tier && tier.unitPrice < p.retailPrice) return { unit: tier.unitPrice, pricing: "wholesale" };
  }
  return { unit: p.retailPrice, pricing: "retail" };
}

/* ------------------------------------------------------------------ */
/* Catalog filtering — driven by the URL so every view is shareable.   */
/* ------------------------------------------------------------------ */

export type SortKey = "popular" | "newest" | "price_asc" | "price_desc";

export interface CatalogFilters {
  q?: string;
  category?: string;
  manufacturer?: string;
  min?: number;
  max?: number;
  availability?: Availability | "in_stock_any";
  city?: string;
  tag?: string;
  verified?: boolean;
  /** retail = can buy now; wholesale = has wholesale pricing or quote. */
  mode?: "retail" | "wholesale";
  sort?: SortKey;
}

export type RawParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const num = (v: string | undefined) => {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export function parseFilters(params: RawParams): CatalogFilters {
  const availability = one(params.availability);
  const mode = one(params.mode);
  const sort = one(params.sort);
  return {
    q: one(params.q),
    category: one(params.category),
    manufacturer: one(params.manufacturer),
    min: num(one(params.min)),
    max: num(one(params.max)),
    availability: ["in_stock", "low_stock", "made_to_order", "in_stock_any"].includes(availability ?? "")
      ? (availability as CatalogFilters["availability"])
      : undefined,
    city: one(params.city),
    tag: one(params.tag),
    verified: one(params.verified) === "1",
    mode: mode === "retail" || mode === "wholesale" ? mode : undefined,
    sort: ["popular", "newest", "price_asc", "price_desc"].includes(sort ?? "") ? (sort as SortKey) : "popular",
  };
}

/** Build a catalog URL, keeping current filters and overriding some. */
export function catalogHref(
  current: CatalogFilters,
  patch: Partial<Record<keyof CatalogFilters, string | number | boolean | undefined>>,
  base = "/products",
) {
  const merged: Record<string, string | number | boolean | undefined> = { ...current, ...patch };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === "" || v === false) continue;
    if (k === "sort" && v === "popular") continue;
    params.set(k, v === true ? "1" : String(v));
  }
  const qs = params.toString();
  return `${base}${qs ? `?${qs}` : ""}`;
}
