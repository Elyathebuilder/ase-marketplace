import { describe, expect, it } from "vitest";
import { DEFAULT_DELIVERY_SETTINGS as S } from "./config";
import { packageFits, quoteCart, quoteShipment, volumeM3 } from "./engine";
import type { DeliverySettings, ShippingItem } from "./types";

const item = (o: Partial<ShippingItem>): ShippingItem => ({
  quantity: 1,
  weightKg: 1,
  lengthCm: 10,
  widthCm: 10,
  heightCm: 10,
  ...o,
});

function quoted(q: ReturnType<typeof quoteShipment>) {
  if (q.status !== "quoted") throw new Error(`expected a price, got manual: ${q.reason}`);
  return q;
}

describe("volume", () => {
  it("is L × W × H / 1,000,000", () => {
    expect(volumeM3(150, 60, 30)).toBeCloseTo(0.27);
  });
});

describe("brief example: 20 × (150×60×30 cm, 6 kg) over 12 km", () => {
  const q = quoted(quoteShipment([item({ quantity: 20, weightKg: 6, lengthCm: 150, widthCm: 60, heightCm: 30 })], 12, S));

  it("chooses the van", () => expect(q.vehicle.id).toBe("van"));
  it("totals 120 kg and 5.4 m³", () => {
    expect(q.totals.totalWeightKg).toBe(120);
    expect(q.totals.totalVolumeM3).toBeCloseTo(5.4);
  });
  it("uses the larger utilization (54%, not 12%)", () => {
    expect(q.weightUtilization).toBeCloseTo(0.12);
    expect(q.volumeUtilization).toBeCloseTo(0.54);
    expect(q.overallUtilization).toBeCloseTo(0.54);
  });
  it("costs 20 + 18 + 10.80 = 48.80 GEL", () => {
    expect(q.price).toEqual({ baseFee: 20, distanceFee: 18, spaceFee: 10.8, minimumTopUp: 0, total: 48.8 });
  });
});

describe("vehicle selection", () => {
  it("small light parcel goes by scooter", () => {
    const q = quoted(quoteShipment([item({ weightKg: 2, lengthCm: 30, widthCm: 20, heightCm: 10 })], 5, S));
    expect(q.vehicle.id).toBe("scooter");
    // 0 + 5 × 0.6 + max(2/15, 0.006/0.05) × 5 = 3 + 0.6667 = 3.67
    expect(q.price.total).toBe(3.67);
  });

  it("too heavy for a scooter goes by car", () => {
    const q = quoted(quoteShipment([item({ quantity: 4, weightKg: 5, lengthCm: 30, widthCm: 20, heightCm: 10 })], 10, S));
    expect(q.vehicle.id).toBe("car");
  });

  it("fragile goods skip the scooter", () => {
    const q = quoted(quoteShipment([item({ weightKg: 1, fragile: true })], 3, S));
    expect(q.vehicle.id).toBe("car");
  });

  it("special handling needs at least a van", () => {
    const q = quoted(quoteShipment([item({ weightKg: 1, specialHandling: true })], 3, S));
    expect(q.vehicle.id).toBe("van");
  });

  it("a long item that fits a car by volume but not by length goes by van", () => {
    // 0.054 m³ and 9 kg: fits a car by numbers, but 180 cm is longer than the car's 100 cm.
    const q = quoted(quoteShipment([item({ weightKg: 9, lengthCm: 180, widthCm: 15, heightCm: 20 })], 8, S));
    expect(q.vehicle.id).toBe("van");
  });

  it("packages may be rotated to fit", () => {
    const car = S.vehicles.find((v) => v.id === "car")!;
    expect(packageFits(item({ lengthCm: 55, widthCm: 95, heightCm: 40 }), car)).toBe(true);
  });

  it("overweight for a van goes by truck", () => {
    const q = quoted(quoteShipment([item({ quantity: 50, weightKg: 40, lengthCm: 60, widthCm: 40, heightCm: 40 })], 20, S));
    expect(q.vehicle.id).toBe("truck");
    // 2000 kg / 5000 = 40%; 4.8 m³ / 30 = 16% → 40% × 40 = 16; 50 + 20 × 2.5 + 16 = 116
    expect(q.price.total).toBe(116);
  });

  it("a load too full to pack reliably moves up a size", () => {
    // 9.5 m³ is under the van's 10 m³ but above 85% → truck
    const q = quoted(quoteShipment([item({ quantity: 95, weightKg: 5, lengthCm: 100, widthCm: 100, heightCm: 10 })], 10, S));
    expect(q.vehicle.id).toBe("truck");
  });

  it("disabled vehicles are skipped", () => {
    const settings: DeliverySettings = {
      ...S,
      vehicles: S.vehicles.map((v) => (v.id === "scooter" ? { ...v, enabled: false } : v)),
    };
    const q = quoted(quoteShipment([item({ weightKg: 1 })], 2, settings));
    expect(q.vehicle.id).toBe("car");
  });
});

describe("manual quotation", () => {
  it("when nothing can carry the weight", () => {
    const q = quoteShipment([item({ quantity: 6, weightKg: 1000, lengthCm: 100, widthCm: 100, heightCm: 100 })], 10, S);
    expect(q.status).toBe("manual");
    if (q.status === "manual") expect(q.reason).toBe("too_heavy");
  });

  it("when one item is longer than any vehicle", () => {
    const q = quoteShipment([item({ weightKg: 300, lengthCm: 1200, widthCm: 30, heightCm: 30 })], 10, S);
    expect(q.status).toBe("manual");
    if (q.status === "manual") expect(q.reason).toBe("package_too_large");
  });

  it("when a product has no shipping size", () => {
    const q = quoteShipment([item({ lengthCm: 0 })], 10, S);
    expect(q.status).toBe("manual");
    if (q.status === "manual") expect(q.reason).toBe("missing_dimensions");
  });

  it("when input is invalid", () => {
    expect(quoteShipment([item({ quantity: -1 })], 10, S).status).toBe("manual");
    expect(quoteShipment([item({})], -5, S).status).toBe("manual");
    expect(quoteShipment([], 5, S).status).toBe("manual");
  });
});

describe("minimum charge", () => {
  it("is not applied unless configured", () => {
    const q = quoted(quoteShipment([item({ weightKg: 1 })], 0, S));
    expect(q.price.minimumTopUp).toBe(0);
  });

  it("tops up to the configured minimum", () => {
    const settings: DeliverySettings = {
      ...S,
      vehicles: S.vehicles.map((v) => (v.id === "van" ? { ...v, minCharge: 60 } : v)),
    };
    const q = quoted(quoteShipment([item({ quantity: 20, weightKg: 6, lengthCm: 150, widthCm: 60, heightCm: 30 })], 12, settings));
    expect(q.price.minimumTopUp).toBe(11.2);
    expect(q.price.total).toBe(60);
  });
});

describe("cart with several manufacturers", () => {
  it("quotes one shipment per pickup location and adds them up", () => {
    const cart = quoteCart(
      [
        { originId: "telavi", distanceKm: 12, items: [item({ quantity: 20, weightKg: 6, lengthCm: 150, widthCm: 60, heightCm: 30 })] },
        { originId: "kutaisi", distanceKm: 5, items: [item({ weightKg: 2, lengthCm: 30, widthCm: 20, heightCm: 10 })] },
        { originId: "rustavi", distanceKm: 10, items: [item({ quantity: 4, weightKg: 5, lengthCm: 30, widthCm: 20, heightCm: 10 })] },
      ],
      S,
    );
    expect(cart.shipments.map((s) => (s.status === "quoted" ? s.vehicle.id : "manual"))).toEqual(["van", "scooter", "car"]);
    expect(cart.requiresManualQuote).toBe(false);
    // 48.80 + 3.67 + (10 × 0.6 + 20/100 × 10 = 8.00)
    expect(cart.quotedTotal).toBe(60.47);
  });

  it("flags the cart when one shipment needs a manual quote", () => {
    const cart = quoteCart(
      [
        { originId: "a", distanceKm: 5, items: [item({ weightKg: 2 })] },
        { originId: "b", distanceKm: 5, items: [item({ weightKg: 9000 })] },
      ],
      S,
    );
    expect(cart.requiresManualQuote).toBe(true);
    expect(cart.shipments[1].status).toBe("manual");
  });
});
