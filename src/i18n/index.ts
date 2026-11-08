import type { Category, Manufacturer, Product } from "@/lib/types";
import { LOCALE, type Lang } from "./config";
import { CATEGORIES_KA, MANUFACTURERS_KA, PLACES_KA, PRODUCTS_KA, TAGS_KA } from "./data-ka";
import { en, type Dict } from "./en";
import { ka } from "./ka";

export * from "./config";
export type { Dict };

export function getDict(lang: Lang): Dict {
  return lang === "ka" ? ka : en;
}

/* Catalog text in the chosen language. English is stored on the demo data itself. */

export function locCategory(c: Category, lang: Lang): Category {
  return lang === "ka" && CATEGORIES_KA[c.slug] ? { ...c, ...CATEGORIES_KA[c.slug] } : c;
}

export function locMaker(m: Manufacturer, lang: Lang): Manufacturer {
  if (lang !== "ka") return m;
  const k = MANUFACTURERS_KA[m.slug];
  return {
    ...m,
    ...(k ?? {}),
    city: place(m.city, lang),
    region: place(m.region, lang),
  };
}

export function locProduct(p: Product, lang: Lang): Product {
  if (lang !== "ka") return p;
  const k = PRODUCTS_KA[p.slug];
  if (!k) return p;
  return {
    ...p,
    name: k.name,
    description: k.description,
    highlights: k.highlights ?? p.highlights,
    materials: k.materials,
    specs: k.specs,
    customizationOptions: k.customizationOptions ?? p.customizationOptions,
    unit: unit(p.unit, lang),
    tags: p.tags.map((t) => tag(t, lang)),
  };
}

export const place = (name: string, lang: Lang) => (lang === "ka" ? PLACES_KA[name] ?? name : name);
export const tag = (t: string, lang: Lang) => (lang === "ka" ? TAGS_KA[t] ?? t : t);
export const unit = (u: string, lang: Lang) => (lang === "ka" ? ka.units[u] ?? u : u);

/** Plural unit for English counts ("pieces"); Georgian nouns don't change after numbers. */
export const units = (u: string, lang: Lang, n = 2) => (lang === "ka" ? unit(u, lang) : n === 1 || u.endsWith("s") || u === "m²" || u === "kg" ? u : `${u}s`);

export function formatDate(d: string | Date, lang: Lang, opts: Intl.DateTimeFormatOptions) {
  return new Date(d).toLocaleString(LOCALE[lang], opts);
}

/** Search text for a product in both languages, so either language finds it. */
export function searchText(p: Product): string {
  const k = PRODUCTS_KA[p.slug];
  return [p.name, p.description, ...p.materials, ...p.tags, k?.name ?? "", k?.description ?? "", ...(k?.materials ?? []), ...p.tags.map((t) => TAGS_KA[t] ?? "")].join(" ");
}

export function makerSearchText(m: Manufacturer): string {
  const k = MANUFACTURERS_KA[m.slug];
  return [m.name, m.tagline, m.city, ...m.capabilities, k?.name ?? "", k?.tagline ?? "", PLACES_KA[m.city] ?? "", ...(k?.capabilities ?? [])].join(" ");
}

export const categoryName = (slug: string, fallback: string, lang: Lang) => (lang === "ka" ? CATEGORIES_KA[slug]?.name ?? fallback : fallback);
