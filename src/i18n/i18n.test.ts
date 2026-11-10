import { describe, expect, it } from "vitest";
import { DEFAULT_LANG, LANGS, href, langOfPath, stripLang } from "./config";
import { DICTS } from "./dictionaries";
import { CATALOG_TEXT } from "./catalog-text";
import { plural } from "./plural";
import { formatTetri, formatBps } from "@/lib/money";
import { en } from "./en";
import { ka } from "./ka";
import { CATEGORIES_KA, MANUFACTURERS_KA, PLACES_KA, PRODUCTS_KA } from "./data-ka";
import { getCategories, getManufacturers, getAllProducts } from "@/lib/catalog";
import { PLACES } from "@/lib/places";

/** Every text path in a dictionary ("cart.title", "seller.nav.orders", …). */
function keys(o: unknown, prefix = ""): string[] {
  if (o && typeof o === "object" && !Array.isArray(o))
    return Object.entries(o).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
  return [prefix];
}

describe("languages", () => {
  it("Georgian is the default", () => {
    expect(DEFAULT_LANG).toBe("ka");
    expect(href("ka", "/products")).toBe("/products");
    expect(href("en", "/products")).toBe("/en/products");
    expect(href("en", "/")).toBe("/en");
    expect(stripLang("/en/cart")).toBe("/cart");
  });

  it("every language gets a clean prefixed URL", () => {
    for (const l of ["en", "ru", "tr", "hy"] as const) {
      expect(href(l, "/cart")).toBe(`/${l}/cart`);
      expect(langOfPath(`/${l}/cart`)).toBe(l);
      expect(stripLang(`/${l}/cart`)).toBe("/cart");
      expect(stripLang(`/${l}`)).toBe("/");
    }
    expect(langOfPath("/cart")).toBe("ka");
    expect(langOfPath("/hyacinth")).toBe("ka");
  });

  it("every language has every English text (except open-ended lookup tables)", () => {
    const lookup = (k: string) => /^(delivery\.cities|units|unitForms|admin\.vehicleNames)\./.test(k);
    const want = keys(en).filter((k) => !lookup(k));
    for (const l of LANGS) {
      const have = new Set(keys(DICTS[l]));
      expect({ l, missing: want.filter((k) => !have.has(k)) }).toEqual({ l, missing: [] });
    }
  });

  it("catalog names exist in every new language", () => {
    for (const l of ["ru", "tr", "hy"] as const) {
      const t = CATALOG_TEXT[l]!;
      expect({ l, c: getCategories().filter((c) => !t.categories[c.slug]).map((c) => c.slug) }).toEqual({ l, c: [] });
      expect({ l, p: Object.keys(PLACES).filter((p) => !t.places[p]) }).toEqual({ l, p: [] });
    }
  });

  it("plurals and numbers follow each language", () => {
    const f = { one: "товар", few: "товара", many: "товаров", other: "товара" };
    expect([1, 3, 5, 21, 11].map((n) => plural("ru", n, f))).toEqual(["товар", "товара", "товаров", "товар", "товаров"]);
    expect(formatTetri(123456, "en")).toBe("1,234.56 ₾");
    expect(formatTetri(123456, "ru").replace(/\s/g, " ")).toBe("1 234,56 ₾");
    expect(formatTetri(123456, "tr")).toBe("1.234,56 ₾");
    expect(formatBps(1250, "tr")).toMatch(/^%12,5/);
    expect(formatBps(1250, "en")).toMatch(/^12\.5%/);
  });

  it("Georgian has every English text (except open-ended lookup tables)", () => {
    const lookup = (k: string) => /^(delivery\.cities|units|admin\.vehicleNames)\./.test(k);
    const missing = keys(en).filter((k) => !lookup(k) && !keys(ka).includes(k));
    expect(missing).toEqual([]);
  });

  it("all catalog data and delivery cities have Georgian names", () => {
    expect(getCategories().filter((c) => !CATEGORIES_KA[c.slug])).toEqual([]);
    expect(getManufacturers().filter((m) => !MANUFACTURERS_KA[m.slug]).map((m) => m.slug)).toEqual([]);
    expect(getAllProducts().filter((p) => !PRODUCTS_KA[p.slug]).map((p) => p.slug)).toEqual([]);
    expect(Object.keys(PLACES).filter((p) => !PLACES_KA[p])).toEqual([]);
  });
});
