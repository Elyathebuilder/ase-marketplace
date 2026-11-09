/**
 * Preview build: the catalog comes from catalog.json (written by crawl.py from the running app),
 * because the static preview has no database. Same functions as src/lib/catalog.ts.
 */
import type { CatalogLookup } from "@/lib/cart-delivery";
import type { Manufacturer, Product } from "@/lib/types";

export * from "@/lib/catalog-core";

let products: Product[] = [];
let makers: Manufacturer[] = [];

export function setCatalog(d: { products: Product[]; makers: Manufacturer[] }) {
  products = d.products;
  makers = d.makers;
}

export const getAllProducts = () => products;
export const getManufacturers = () => makers;
export const getProduct = (slug: string) => products.find((p) => p.slug === slug);
export const getManufacturer = (slug: string) => makers.find((m) => m.slug === slug);
export const manufacturerOf = (p: Product) => getManufacturer(p.manufacturer)!;
export const previewLookup: CatalogLookup = { product: getProduct, maker: getManufacturer };
