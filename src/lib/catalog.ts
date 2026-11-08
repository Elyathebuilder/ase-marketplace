/**
 * Read access to the catalog. Today it reads the demo data; in Phase 2 the same
 * functions will query Supabase, so pages don't need to change.
 */
import { CATEGORIES, MANUFACTURERS, PRODUCTS } from "./demo-data";
import { categoryName, makerSearchText, searchText } from "@/i18n";
import type { Availability, Category, Manufacturer, Product } from "./types";

export const getCategories = (): Category[] => CATEGORIES;
export const getCategory = (slug: string) => CATEGORIES.find((c) => c.slug === slug);
export const getManufacturers = (): Manufacturer[] => MANUFACTURERS;
export const getManufacturer = (slug: string) => MANUFACTURERS.find((m) => m.slug === slug);
export const getProduct = (slug: string) => PRODUCTS.find((p) => p.slug === slug);
export const getAllProducts = (): Product[] => PRODUCTS;

export function manufacturerOf(product: Product): Manufacturer {
  const m = getManufacturer(product.manufacturer);
  if (!m) throw new Error(`Unknown manufacturer ${product.manufacturer}`);
  return m;
}

export function productsBy(manufacturerSlug: string) {
  return PRODUCTS.filter((p) => p.manufacturer === manufacturerSlug);
}

export function countInCategory(slug: string) {
  return PRODUCTS.filter((p) => p.category === slug).length;
}

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

export function relatedProducts(p: Product, limit = 4): Product[] {
  return PRODUCTS.filter((x) => x.slug !== p.slug && (x.category === p.category || x.manufacturer === p.manufacturer))
    .sort((a, b) => Number(b.category === p.category) - Number(a.category === p.category) || b.popularity - a.popularity)
    .slice(0, limit);
}

export const featuredProducts = () => PRODUCTS.filter((p) => p.featured).slice(0, 8);
export const popularProducts = (n = 8) => [...PRODUCTS].sort((a, b) => b.popularity - a.popularity).slice(0, n);
export const recentProducts = (n = 8) => [...PRODUCTS].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, n);
export const featuredManufacturers = () => MANUFACTURERS.filter((m) => m.featured);
export const verifiedManufacturers = () => MANUFACTURERS.filter((m) => m.verification === "verified");

export function cities(): string[] {
  return [...new Set(MANUFACTURERS.map((m) => m.city))].sort();
}

export function allTags(): string[] {
  return [...new Set(PRODUCTS.flatMap((p) => p.tags))].sort();
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

type RawParams = Record<string, string | string[] | undefined>;

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

export function filterProducts(f: CatalogFilters): Product[] {
  const q = f.q?.toLowerCase();
  const list = PRODUCTS.filter((p) => {
    const m = manufacturerOf(p);
    if (q) {
      // Both languages are searched, so "მუხა" and "oak" find the same table.
      const hay = [searchText(p), makerSearchText(m), getCategory(p.category)?.name ?? "", categoryName(p.category, "", "ka")]
        .join(" ")
        .toLowerCase();
      if (!q.split(/\s+/).every((word) => hay.includes(word))) return false;
    }
    if (f.category && p.category !== f.category) return false;
    if (f.manufacturer && p.manufacturer !== f.manufacturer) return false;
    const price = displayPrice(p);
    if (f.min != null && (price == null || price < f.min)) return false;
    if (f.max != null && (price == null || price > f.max)) return false;
    const a = availabilityOf(p);
    if (f.availability === "in_stock_any" && a === "made_to_order") return false;
    if (f.availability && f.availability !== "in_stock_any" && a !== f.availability) return false;
    if (f.city && m.city !== f.city) return false;
    if (f.tag && !p.tags.includes(f.tag)) return false;
    if (f.verified && m.verification !== "verified") return false;
    if (f.mode === "retail" && !(p.buyNow && p.retailPrice != null)) return false;
    if (f.mode === "wholesale" && !(p.wholesale || p.requestQuote)) return false;
    return true;
  });

  const priceOr = (p: Product, fallback: number) => displayPrice(p) ?? fallback;
  switch (f.sort) {
    case "newest":
      return list.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    case "price_asc":
      return list.sort((a, b) => priceOr(a, Infinity) - priceOr(b, Infinity));
    case "price_desc":
      return list.sort((a, b) => priceOr(b, -Infinity) - priceOr(a, -Infinity));
    default:
      return list.sort((a, b) => b.popularity - a.popularity);
  }
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
