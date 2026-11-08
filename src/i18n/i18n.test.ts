import { describe, expect, it } from "vitest";
import { DEFAULT_LANG, href, stripLang } from "./config";
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
