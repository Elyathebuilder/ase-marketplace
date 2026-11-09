/**
 * Read access to the public catalog (server only): published products of approved sellers,
 * from the marketplace database. Pure rules (prices, categories, URLs) live in catalog-core.ts.
 */
import { categoryName, makerSearchText, searchText } from "@/i18n";
import { availabilityOf, displayPrice, getCategory, type CatalogFilters } from "./catalog-core";
import { publicCatalog } from "./market/catalog-store";
import { market } from "./market/server";
import type { Manufacturer, Product } from "./types";

export * from "./catalog-core";

const snap = () => publicCatalog(market().db);

export const getManufacturers = (): Manufacturer[] => snap().makers;
export const getManufacturer = (slug: string) => snap().makerBySlug.get(slug);
export const getProduct = (slug: string) => snap().bySlug.get(slug);
export const getAllProducts = (): Product[] => snap().products;

export function manufacturerOf(product: Product): Manufacturer {
  const m = getManufacturer(product.manufacturer);
  if (!m) throw new Error(`Unknown manufacturer ${product.manufacturer}`);
  return m;
}

export const productsBy = (manufacturerSlug: string) => getAllProducts().filter((p) => p.manufacturer === manufacturerSlug);
export const countInCategory = (slug: string) => getAllProducts().filter((p) => p.category === slug).length;

export function relatedProducts(p: Product, limit = 4): Product[] {
  return getAllProducts()
    .filter((x) => x.slug !== p.slug && (x.category === p.category || x.manufacturer === p.manufacturer))
    .sort((a, b) => Number(b.category === p.category) - Number(a.category === p.category) || b.popularity - a.popularity)
    .slice(0, limit);
}

export const featuredProducts = () => getAllProducts().filter((p) => p.featured).slice(0, 8);
export const popularProducts = (n = 8) => [...getAllProducts()].sort((a, b) => b.popularity - a.popularity).slice(0, n);
export const recentProducts = (n = 8) => [...getAllProducts()].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, n);
export const featuredManufacturers = () => getManufacturers().filter((m) => m.featured);
export const verifiedManufacturers = () => getManufacturers().filter((m) => m.verification === "verified");

export function cities(): string[] {
  return [...new Set(getManufacturers().map((m) => m.city).filter(Boolean))].sort();
}

export function allTags(): string[] {
  return [...new Set(getAllProducts().flatMap((p) => p.tags))].sort();
}

export function filterProducts(f: CatalogFilters): Product[] {
  const q = f.q?.toLowerCase();
  const list = getAllProducts().filter((p) => {
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

