export const LANGS = ["ka", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "ka";

export const isLang = (v: unknown): v is Lang => typeof v === "string" && (LANGS as readonly string[]).includes(v);

/** Public URL for a path in a language. Georgian has no prefix; English uses /en. */
export function href(lang: Lang, path: string): string {
  if (lang === "ka") return path;
  if (path === "/") return "/en";
  return path.startsWith("/?") ? `/en${path.slice(1)}` : `/en${path}`;
}

/** Strip the language prefix from a browser path ("/en/products" → "/products"). */
export function stripLang(pathname: string): string {
  if (pathname === "/en") return "/";
  if (pathname.startsWith("/en/")) return pathname.slice(3);
  return pathname;
}

/** Locale for dates and numbers. */
export const LOCALE: Record<Lang, string> = { ka: "ka-GE", en: "en-GB" };
