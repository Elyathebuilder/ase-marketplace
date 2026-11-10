import { LOCALE, type Lang } from "@/i18n/config";

const cache = new Map<string, Intl.NumberFormat>();

/** Number format for a language ("1,250.5" in English, "1 250,5" in Russian, "1.250,5" in Turkish). Display only. */
export function numberFormat(lang: Lang | undefined, minFrac = 0, maxFrac = 2): Intl.NumberFormat {
  const locale = lang ? LOCALE[lang] : "en-US";
  const key = `${locale}|${minFrac}|${maxFrac}`;
  let f = cache.get(key);
  if (!f) cache.set(key, (f = new Intl.NumberFormat(locale, { minimumFractionDigits: minFrac, maximumFractionDigits: maxFrac })));
  return f;
}

/** "1,250.50 ₾" — GEL with the lari sign after the amount, as used in Georgia. Only the display changes by language. */
export function formatGel(amount: number, lang?: Lang): string {
  return `${numberFormat(lang).format(amount)} ₾`;
}

export function formatNumber(n: number, lang?: Lang): string {
  return numberFormat(lang, 0, 3).format(n);
}
