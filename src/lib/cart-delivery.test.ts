import { describe, expect, it } from "vitest";
import { quoteCartDelivery } from "./cart-delivery";
import { MANUFACTURERS, PRODUCTS } from "./demo-data";
import type { Manufacturer } from "./types";

// The demo catalog, as the database would return it.
const lookup = {
  product: (slug: string) => PRODUCTS.find((p) => p.slug === slug),
  maker: (slug: string) => MANUFACTURERS.find((m) => m.slug === slug) as unknown as Manufacturer | undefined,
};
const getProduct = lookup.product;
const manufacturerOf = (p: { manufacturer: string }) => lookup.maker(p.manufacturer)!;

// Interior paint is made by Mtatsminda Paints in Tbilisi.
const TBILISI_PRODUCT = "interior-paint-matte-10l";
// The walnut cutting board is made by Imereti Timber Works in Kutaisi.
const KUTAISI_PRODUCT = "walnut-cutting-board";

const deliveryTo = (city: string, lines = [{ slug: TBILISI_PRODUCT, qty: 1 }]) => quoteCartDelivery(lines, city, lookup).delivery;

describe("delivery depends on the customer's city", () => {
  it("uses manufacturers from the expected cities", () => {
    expect(manufacturerOf(getProduct(TBILISI_PRODUCT)!).city).toBe("Tbilisi");
    expect(manufacturerOf(getProduct(KUTAISI_PRODUCT)!).city).toBe("Kutaisi");
  });

  it("Tbilisi manufacturer → Tbilisi, Kutaisi and Batumi customers get different prices", () => {
    const [tbilisi, kutaisi, batumi] = ["Tbilisi", "Kutaisi", "Batumi"].map((c) => deliveryTo(c).quotedTotal);
    expect(tbilisi).toBeGreaterThan(0);
    expect(kutaisi).toBeGreaterThan(tbilisi);
    expect(batumi).toBeGreaterThan(kutaisi);
    // Same vehicle and load, so the difference is only the distance.
    const [st, sk, sb] = ["Tbilisi", "Kutaisi", "Batumi"].map((c) => deliveryTo(c).shipments[0]);
    expect(st.status === "quoted" && sk.status === "quoted" && sb.status === "quoted").toBe(true);
    if (st.status === "quoted" && sb.status === "quoted") {
      expect(sb.distanceKm).toBeGreaterThan(st.distanceKm);
      expect(sb.price.distanceFee).toBeGreaterThan(st.price.distanceFee);
    }
  });

  it("changes when the quantity changes", () => {
    const one = deliveryTo("Kutaisi", [{ slug: TBILISI_PRODUCT, qty: 1 }]).quotedTotal;
    const ten = deliveryTo("Kutaisi", [{ slug: TBILISI_PRODUCT, qty: 10 }]).quotedTotal;
    expect(ten).toBeGreaterThan(one);
  });
});

describe("a cart with two manufacturers", () => {
  const lines = [
    { slug: TBILISI_PRODUCT, qty: 2 },
    { slug: KUTAISI_PRODUCT, qty: 1 },
  ];
  const quote = quoteCartDelivery(lines, "Batumi", lookup);

  it("is split into one shipment per manufacturer", () => {
    expect(quote.groups.map((g) => g.manufacturer).sort()).toEqual(["imereti-timber-works", "mtatsminda-paints"]);
    expect(quote.delivery.shipments).toHaveLength(2);
    expect(quote.delivery.requiresManualQuote).toBe(false);
  });

  it("prices each shipment from its own city and adds them up", () => {
    const [a, b] = quote.delivery.shipments;
    if (a.status !== "quoted" || b.status !== "quoted") throw new Error("expected quotes");
    // Kutaisi is closer to Batumi than Tbilisi is.
    const fromTbilisi = quote.delivery.shipments.find((s) => s.originId === "mtatsminda-paints")!;
    const fromKutaisi = quote.delivery.shipments.find((s) => s.originId === "imereti-timber-works")!;
    expect(fromTbilisi.distanceKm).toBeGreaterThan(fromKutaisi.distanceKm);
    expect(quote.delivery.quotedTotal).toBeCloseTo(a.price.total + b.price.total, 2);
    expect(quote.total).toBeCloseTo(quote.goods + quote.delivery.quotedTotal, 2);
  });

  it("reads prices from the catalog, not from the cart", () => {
    expect(quote.goods).toBe(89 * 2 + 85);
  });

  it("ignores products that can't be bought directly", () => {
    const q = quoteCartDelivery([{ slug: "hotel-wardrobe-custom", qty: 1 }, { slug: "no-such-product", qty: 1 }], "Tbilisi", lookup);
    expect(q.groups).toHaveLength(0);
    expect(q.total).toBe(0);
  });
});
