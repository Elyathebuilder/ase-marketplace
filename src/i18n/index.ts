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

/*
 * Catalog text in the chosen language. Sellers can enter Georgian text (the `ka` fields from the
 * database); the demo catalog's Georgian text is in data-ka.ts and fills any gaps.
 */
const filled = <T extends object>(o: T | null | undefined) =>
  Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0))) as {
    [K in keyof T]?: NonNullable<T[K]>;
  };

export function locCategory(c: Category, lang: Lang): Category {
  return lang === "ka" && CATEGORIES_KA[c.slug] ? { ...c, ...CATEGORIES_KA[c.slug] } : c;
}

export function locMaker(m: Manufacturer, lang: Lang): Manufacturer {
  if (lang !== "ka") return m;
  const k = { ...(MANUFACTURERS_KA[m.slug] ?? {}), ...filled(m.ka) };
  return {
    ...m,
    ...k,
    city: place(m.city, lang),
    region: place(m.region, lang),
  };
}

export function locProduct(p: Product, lang: Lang): Product {
  if (lang !== "ka") return { ...p, unit: p.unit };
  const demo = PRODUCTS_KA[p.slug];
  const own = filled(p.ka);
  return {
    ...p,
    name: own.name ?? demo?.name ?? p.name,
    description: own.description ?? demo?.description ?? p.description,
    highlights: own.highlights ?? demo?.highlights ?? p.highlights,
    materials: demo?.materials ?? p.materials,
    specs: demo?.specs ?? p.specs,
    customizationOptions: demo?.customizationOptions ?? p.customizationOptions,
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
  return [p.name, p.description, ...p.materials, ...p.tags, p.ka?.name ?? "", p.ka?.description ?? "", k?.name ?? "", k?.description ?? "", ...(k?.materials ?? []), ...p.tags.map((t) => TAGS_KA[t] ?? "")].join(" ");
}

export function makerSearchText(m: Manufacturer): string {
  const k = MANUFACTURERS_KA[m.slug];
  return [m.name, m.tagline, m.city, ...m.capabilities, m.ka?.name ?? "", m.ka?.tagline ?? "", k?.name ?? "", k?.tagline ?? "", PLACES_KA[m.city] ?? "", ...(k?.capabilities ?? [])].join(" ");
}

export const categoryName = (slug: string, fallback: string, lang: Lang) => (lang === "ka" ? CATEGORIES_KA[slug]?.name ?? fallback : fallback);
