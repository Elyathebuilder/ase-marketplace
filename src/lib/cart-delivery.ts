/**
 * Delivery for a whole cart. Each manufacturer ships from its own city, so the cart
 * is split into one shipment per manufacturer; each shipment gets its own vehicle and
 * price from the delivery engine, and the customer pays the sum.
 *
 * Prices and weights are always read from the catalog, never from what the browser sends,
 * so the same function can run on the server at checkout.
 */
import { getProduct, manufacturerOf } from "./catalog";
import { DEFAULT_DELIVERY_SETTINGS, quoteCart, type CartDeliveryQuote, type DeliverySettings } from "./delivery";
import { approxRoadKm } from "./places";
import type { Product } from "./types";

export interface CartInputLine {
  slug: string;
  qty: number;
}

export interface CartGroup {
  manufacturer: string;
  lines: { product: Product; qty: number; lineTotal: number }[];
  goods: number;
}

export interface CartQuote {
  groups: CartGroup[];
  goods: number;
  delivery: CartDeliveryQuote;
  total: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

export function quoteCartDelivery(lines: CartInputLine[], destinationCity: string, settings: DeliverySettings = DEFAULT_DELIVERY_SETTINGS): CartQuote {
  const groups = new Map<string, CartGroup>();
  for (const line of lines) {
    const product = getProduct(line.slug);
    // Only products that can be bought at a fixed price belong in the cart.
    if (!product || !product.buyNow || product.retailPrice == null || !Number.isInteger(line.qty) || line.qty <= 0) continue;
    const g = groups.get(product.manufacturer) ?? { manufacturer: product.manufacturer, lines: [], goods: 0 };
    const lineTotal = round(product.retailPrice * line.qty);
    g.lines.push({ product, qty: line.qty, lineTotal });
    g.goods = round(g.goods + lineTotal);
    groups.set(product.manufacturer, g);
  }

  const list = [...groups.values()];
  const delivery = quoteCart(
    list.map((g) => {
      const origin = g.lines[0].product;
      return {
        originId: g.manufacturer,
        distanceKm: approxRoadKm(originCity(origin), destinationCity) ?? Number.NaN,
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

function originCity(p: Product) {
  return manufacturerOf(p).city;
}
