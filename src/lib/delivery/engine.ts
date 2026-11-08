import type {
  CartDeliveryQuote,
  DeliverySettings,
  ManualReason,
  ShipmentQuote,
  ShipmentRequest,
  ShipmentTotals,
  ShippingItem,
  VehicleConfig,
} from "./types";

/** Round money to 2 decimals (avoids 48.799999 style floating point results). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Volume of one package in m³: (L × W × H) / 1,000,000. */
export function volumeM3(lengthCm: number, widthCm: number, heightCm: number): number {
  return (lengthCm * widthCm * heightCm) / 1_000_000;
}

function isPositive(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

/**
 * Totals for one shipment: Σ(weight × quantity) and Σ(volume × quantity).
 * Weight is per unit; dimensions are per package.
 */
export function shipmentTotals(items: ShippingItem[]): ShipmentTotals {
  let totalWeightKg = 0;
  let totalVolumeM3 = 0;
  let packageCount = 0;
  for (const item of items) {
    const packages = item.quantity * (item.packagesPerUnit ?? 1);
    totalWeightKg += item.weightKg * item.quantity;
    totalVolumeM3 += volumeM3(item.lengthCm, item.widthCm, item.heightCm) * packages;
    packageCount += packages;
  }
  return {
    totalWeightKg,
    totalVolumeM3,
    packageCount,
    fragile: items.some((i) => i.fragile),
    specialHandling: items.some((i) => i.specialHandling),
  };
}

/** Does one package fit inside the cargo space, if we may rotate it? */
export function packageFits(item: ShippingItem, vehicle: VehicleConfig): boolean {
  const pkg = [item.lengthCm, item.widthCm, item.heightCm].sort((a, b) => b - a);
  const space = [vehicle.interior.lengthCm, vehicle.interior.widthCm, vehicle.interior.heightCm].sort((a, b) => b - a);
  return pkg.every((side, i) => side <= space[i]);
}

type Fit = { ok: true } | { ok: false; reason: ManualReason };

/** Why (or whether) a vehicle can carry this shipment. */
export function vehicleFit(
  items: ShippingItem[],
  totals: ShipmentTotals,
  vehicle: VehicleConfig,
  settings: DeliverySettings,
): Fit {
  if (totals.fragile && !vehicle.allowsFragile) return { ok: false, reason: "handling_not_supported" };
  if (totals.specialHandling && !vehicle.allowsSpecialHandling) return { ok: false, reason: "handling_not_supported" };
  if (totals.totalWeightKg > vehicle.maxWeightKg) return { ok: false, reason: "too_heavy" };
  if (totals.totalVolumeM3 > vehicle.maxVolumeM3) return { ok: false, reason: "too_large" };
  if (!items.every((item) => packageFits(item, vehicle))) return { ok: false, reason: "package_too_large" };
  // Volume alone fits, but boxes rarely pack perfectly. Above the ratio we can't be sure.
  if (totals.totalVolumeM3 > vehicle.maxVolumeM3 * settings.maxReliablePackingRatio)
    return { ok: false, reason: "cannot_confirm_fit" };
  return { ok: true };
}

const MANUAL_MESSAGES: Record<ManualReason, string> = {
  invalid_input: "Delivery could not be calculated. Our team will confirm the price.",
  missing_dimensions: "Some products have no shipping size or weight yet. Our team will confirm the price.",
  too_heavy: "This order is heavier than our standard vehicles carry. Our team will arrange transport and confirm the price.",
  too_large: "This order is larger than our standard vehicles carry. Our team will arrange transport and confirm the price.",
  package_too_large: "One item is too large for our standard vehicles. Our team will arrange transport and confirm the price.",
  cannot_confirm_fit: "We can't confirm automatically that everything fits in one vehicle. Our team will confirm the price.",
  handling_not_supported: "This order needs special handling. Our team will arrange transport and confirm the price.",
};

function manual(distanceKm: number, totals: ShipmentTotals | null, reason: ManualReason): ShipmentQuote {
  return { status: "manual", distanceKm, totals, reason, message: MANUAL_MESSAGES[reason] };
}

/**
 * Quote one shipment (one pickup location → the customer).
 *
 * 1. Add up weight and volume.
 * 2. Choose the smallest enabled vehicle that can carry it.
 * 3. Price = base fee + distance × price per km + overall utilization × space fee,
 *    where overall utilization = max(weight utilization, volume utilization).
 * 4. Apply the vehicle's minimum charge if one is configured, round to 2 decimals.
 *
 * If no vehicle is suitable, return a manual quotation requirement instead of a price.
 */
export function quoteShipment(
  items: ShippingItem[],
  distanceKm: number,
  settings: DeliverySettings,
): ShipmentQuote {
  if (!Number.isFinite(distanceKm) || distanceKm < 0 || items.length === 0) return manual(distanceKm, null, "invalid_input");
  if (items.some((i) => !Number.isInteger(i.quantity) || i.quantity <= 0)) return manual(distanceKm, null, "invalid_input");
  if (items.some((i) => ![i.weightKg, i.lengthCm, i.widthCm, i.heightCm].every(isPositive)))
    return manual(distanceKm, null, "missing_dimensions");

  const totals = shipmentTotals(items);
  // Smallest first: sort by capacity, so the admin can add vehicles in any order.
  const vehicles = settings.vehicles
    .filter((v) => v.enabled)
    .sort((a, b) => a.maxVolumeM3 - b.maxVolumeM3 || a.maxWeightKg - b.maxWeightKg);

  const reasons: ManualReason[] = [];
  for (const vehicle of vehicles) {
    const fit = vehicleFit(items, totals, vehicle, settings);
    if (!fit.ok) {
      reasons.push(fit.reason);
      continue;
    }
    const weightUtilization = totals.totalWeightKg / vehicle.maxWeightKg;
    const volumeUtilization = totals.totalVolumeM3 / vehicle.maxVolumeM3;
    const overallUtilization = Math.max(weightUtilization, volumeUtilization);

    const baseFee = vehicle.baseFee;
    const distanceFee = roundMoney(distanceKm * vehicle.pricePerKm);
    const spaceFee = roundMoney(overallUtilization * vehicle.spaceFee);
    const subtotal = roundMoney(baseFee + distanceFee + spaceFee);
    const minimumTopUp = vehicle.minCharge != null && subtotal < vehicle.minCharge ? roundMoney(vehicle.minCharge - subtotal) : 0;

    return {
      status: "quoted",
      vehicle: { id: vehicle.id, name: vehicle.name },
      distanceKm,
      totals,
      weightUtilization,
      volumeUtilization,
      overallUtilization,
      price: { baseFee, distanceFee, spaceFee, minimumTopUp, total: roundMoney(subtotal + minimumTopUp) },
    };
  }

  // The largest vehicle explains best why nothing fits.
  return manual(distanceKm, totals, reasons.at(-1) ?? "invalid_input");
}

/**
 * Quote a whole cart. Products from different manufacturers ship separately,
 * because each manufacturer has its own pickup location.
 */
export function quoteCart(requests: ShipmentRequest[], settings: DeliverySettings): CartDeliveryQuote {
  const shipments = requests.map((r) => ({ originId: r.originId, ...quoteShipment(r.items, r.distanceKm, settings) }));
  const quotedTotal = roundMoney(
    shipments.reduce((sum, s) => sum + (s.status === "quoted" ? s.price.total : 0), 0),
  );
  return { shipments, quotedTotal, requiresManualQuote: shipments.some((s) => s.status === "manual") };
}

/** Group cart lines by manufacturer so each group becomes one shipment. */
export function groupByOrigin<T extends { originId: string }>(lines: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const line of lines) groups.set(line.originId, [...(groups.get(line.originId) ?? []), line]);
  return groups;
}
