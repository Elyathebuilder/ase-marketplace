/**
 * The site's languages. To add one: add its code here, its name and locale below, its dictionary in
 * dictionaries.ts (typed as Dict, so TypeScript lists every missing text), and its place names in data-places.ts.
 */
export const LANGS = ["ka", "en", "ru", "tr", "hy"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "ka";

/** Each language's name in its own language, for the switcher. */
export const LANG_NAMES: Record<Lang, string> = { ka: "ქართული", en: "English", ru: "Русский", tr: "Türkçe", hy: "Հայերեն" };

/** Locale for dates and numbers. */
export const LOCALE: Record<Lang, string> = { ka: "ka-GE", en: "en-GB", ru: "ru-RU", tr: "tr-TR", hy: "hy-AM" };

/** Cookie that remembers the visitor's language between visits (set by the switcher and at sign-in). */
export const LANG_COOKIE = "ase_lang";

export const isLang = (v: unknown): v is Lang => typeof v === "string" && (LANGS as readonly string[]).includes(v);

/** Languages that live under a prefix (/en, /ru …). Georgian is at the plain URLs. */
const PREFIXED = LANGS.filter((l) => l !== DEFAULT_LANG);

/** Public URL for a path in a language. Georgian has no prefix; the others use /en, /ru, /tr, /hy. */
export function href(lang: Lang, path: string): string {
  if (lang === DEFAULT_LANG) return path;
  if (path === "/") return `/${lang}`;
  return path.startsWith("/?") ? `/${lang}${path.slice(1)}` : `/${lang}${path}`;
}

/** Language of a browser path ("/ru/cart" → "ru", "/cart" → "ka"). */
export function langOfPath(pathname: string): Lang {
  return PREFIXED.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)) ?? DEFAULT_LANG;
}

/** Strip the language prefix from a browser path ("/en/products" → "/products"). */
export function stripLang(pathname: string): string {
  const l = langOfPath(pathname);
  if (l === DEFAULT_LANG) return pathname;
  return pathname.slice(l.length + 1) || "/";
}

/** The page's language from a form's hidden "lang" field, Georgian if missing. */
export const langFrom = (v: unknown): Lang => (isLang(v) ? v : DEFAULT_LANG);
