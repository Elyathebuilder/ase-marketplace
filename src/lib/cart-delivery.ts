/**
 * Delivery for a whole cart. Each manufacturer ships from its own city, so the cart
 * is split into one shipment per manufacturer; each shipment gets its own vehicle and
 * price from the delivery engine, and the customer pays the sum.
 *
 * Prices and weights are always read from the catalog (the `lookup`), never from what the browser
 * sends: on the server the lookup reads the database, in the browser it reads product data the
 * server returned. The server recalculates everything when an order is placed.
 */
import { unitPriceFor } from "./catalog-core";
import { DEFAULT_DELIVERY_SETTINGS, quoteCart, type CartDeliveryQuote, type DeliverySettings } from "./delivery";
import { approxRoadKm } from "./places";
import type { Manufacturer, Product } from "./types";

export interface CartInputLine {
  slug: string;
  qty: number;
  /** The customer's choices for the product's variations, e.g. { Size: "M" }. */
  options?: Record<string, string>;
}

/** Where product and seller data come from. */
export interface CatalogLookup {
  product: (slug: string) => Product | undefined;
  maker: (slug: string) => Manufacturer | undefined;
}

export interface CartGroup {
  manufacturer: string;
  lines: { product: Product; qty: number; unitPrice: number; pricing: "retail" | "wholesale"; options: Record<string, string>; lineTotal: number }[];
  goods: number;
}

export interface CartQuote {
  groups: CartGroup[];
  goods: number;
  delivery: CartDeliveryQuote;
  total: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Keeps only choices the product really offers. */
export function cleanOptions(product: Product, options: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const v of product.variants ?? []) {
    const chosen = options?.[v.name];
    if (chosen && v.options.includes(chosen)) out[v.name] = chosen;
  }
  return out;
}

export function quoteCartDelivery(lines: CartInputLine[], destinationCity: string, lookup: CatalogLookup, settings: DeliverySettings = DEFAULT_DELIVERY_SETTINGS): CartQuote {
  const groups = new Map<string, CartGroup>();
  for (const line of lines) {
    const product = lookup.product(line.slug);
    if (!product || !lookup.maker(product.manufacturer) || !Number.isInteger(line.qty) || line.qty <= 0) continue;
    // Only products that can be bought at a fixed price belong in the cart.
    const price = unitPriceFor(product, line.qty);
    if (!price) continue;
    const g = groups.get(product.manufacturer) ?? { manufacturer: product.manufacturer, lines: [], goods: 0 };
    const lineTotal = round(price.unit * line.qty);
    g.lines.push({ product, qty: line.qty, unitPrice: price.unit, pricing: price.pricing, options: cleanOptions(product, line.options), lineTotal });
    g.goods = round(g.goods + lineTotal);
    groups.set(product.manufacturer, g);
  }

  const list = [...groups.values()];
  const delivery = quoteCart(
    list.map((g) => {
      const origin = g.lines[0].product;
      return {
        originId: g.manufacturer,
        distanceKm: approxRoadKm(lookup.maker(origin.manufacturer)?.city ?? "", destinationCity) ?? Number.NaN,
        items: g.lines.map(({ product: p, qty }) => ({
          productId: p.slug,
          quantity: qty,
          weightKg: p.weightKg,
          lengthCm: p.lengthCm,
          widthCm: p.widthCm,
          heightCm: p.heightCm,
          fragile: p.fragile,
          specialHandling: p.specialHandling,
        })),
      };
    }),
    settings,
  );
  const goods = round(list.reduce((s, g) => s + g.goods, 0));
  return { groups: list, goods, delivery, total: round(goods + delivery.quotedTotal) };
}
