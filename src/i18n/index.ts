import type { Category, Manufacturer, Product } from "@/lib/types";
import { CATALOG_TEXT } from "./catalog-text";
import { DEFAULT_LANG, LANGS, LOCALE, type Lang } from "./config";
import { DICTS } from "./dictionaries";
import type { Dict } from "./en";
import { plural } from "./plural";

export * from "./config";
export type { Dict };

/** UI text for a language. Components use keys (t.cart.title), never hard-coded text. */
export function getDict(lang: Lang): Dict {
  return DICTS[lang] ?? DICTS[DEFAULT_LANG];
}

/*
 * Catalog text in the chosen language.
 * - Platform text (categories, places, filter tags) comes from catalog-text.ts.
 * - Seller text (product and store names, descriptions) is shown as the seller wrote it: in the
 *   visitor's language when the seller gave one (`translations`), otherwise the base text.
 *   It is never machine-translated.
 */
const filled = <T extends object>(o: T | null | undefined) =>
  Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0))) as {
    [K in keyof T]?: NonNullable<T[K]>;
  };

export function locCategory(c: Category, lang: Lang): Category {
  const k = CATALOG_TEXT[lang]?.categories[c.slug];
  return k ? { ...c, ...k } : c;
}

export function locMaker(m: Manufacturer, lang: Lang): Manufacturer {
  const demo = CATALOG_TEXT[lang]?.manufacturers?.[m.slug];
  const own = filled(m.translations?.[lang]);
  return {
    ...m,
    ...(demo ?? {}),
    ...own,
    city: place(m.city, lang),
    region: place(m.region, lang),
  };
}

export function locProduct(p: Product, lang: Lang): Product {
  const demo = CATALOG_TEXT[lang]?.products?.[p.slug];
  const own = filled(p.translations?.[lang]);
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

export const place = (name: string, lang: Lang) => CATALOG_TEXT[lang]?.places[name] ?? name;
export const tag = (t: string, lang: Lang) => CATALOG_TEXT[lang]?.tags[t] ?? t;
export const unit = (u: string, lang: Lang) => getDict(lang).units[u] ?? u;

/** Unit after a count: "5 pieces", "5 штук", "5 ცალი". */
export function units(u: string, lang: Lang, n = 2): string {
  if (lang === "en") return n === 1 || u.endsWith("s") || u === "m²" || u === "kg" ? u : `${u}s`;
  const forms = getDict(lang).unitForms[u];
  return forms ? plural(lang, n, forms) : unit(u, lang);
}

export function formatDate(d: string | Date, lang: Lang, opts: Intl.DateTimeFormatOptions) {
  return new Date(d).toLocaleString(LOCALE[lang], opts);
}

/** Search text for a product in every language, so any language finds it. */
export function searchText(p: Product): string {
  const parts = [p.name, p.description, ...p.materials, ...p.tags];
  for (const l of LANGS) {
    const own = p.translations?.[l];
    const demo = CATALOG_TEXT[l]?.products?.[p.slug];
    parts.push(own?.name ?? "", own?.description ?? "", demo?.name ?? "", demo?.description ?? "", ...(demo?.materials ?? []));
    parts.push(...p.tags.map((t) => CATALOG_TEXT[l]?.tags[t] ?? ""));
  }
  return parts.join(" ");
}

export function makerSearchText(m: Manufacturer): string {
  const parts = [m.name, m.tagline, m.city, ...m.capabilities];
  for (const l of LANGS) {
    const own = m.translations?.[l];
    const demo = CATALOG_TEXT[l]?.manufacturers?.[m.slug];
    parts.push(own?.name ?? "", own?.tagline ?? "", demo?.name ?? "", demo?.tagline ?? "", CATALOG_TEXT[l]?.places[m.city] ?? "", ...(demo?.capabilities ?? []));
  }
  return parts.join(" ");
}

export const categoryName = (slug: string, fallback: string, lang: Lang) => CATALOG_TEXT[lang]?.categories[slug]?.name ?? fallback;

/** Category names in every language, for search. */
export const categoryNames = (slug: string) => LANGS.map((l) => CATALOG_TEXT[l]?.categories[slug]?.name ?? "").join(" ");
