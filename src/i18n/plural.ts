import { LOCALE, type Lang } from "./config";

/**
 * Picks the right word form for a count, by the language's plural rules (Intl.PluralRules).
 * Russian needs three forms: plural("ru", n, { one: "товар", few: "товара", many: "товаров" }).
 * Georgian, Turkish and Armenian keep the noun singular after a number, so they pass only `other`.
 */
export type Forms = { one?: string; few?: string; many?: string; other: string };

const rules = new Map<Lang, Intl.PluralRules>();

export function plural(lang: Lang, n: number, forms: Forms): string {
  let r = rules.get(lang);
  if (!r) rules.set(lang, (r = new Intl.PluralRules(LOCALE[lang])));
  const cat = r.select(n) as keyof Forms;
  return forms[cat] ?? forms.other;
}

/** Russian shorthand: ru(n, "товар", "товара", "товаров"). Fractions use the "few" form, as in "1,5 кг". */
export const ru = (n: number, one: string, few: string, many: string) => plural("ru", n, { one, few, many, other: few });
