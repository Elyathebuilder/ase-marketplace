/**
 * Delivery engine types.
 *
 * Everything here is plain data so the same engine can run on the server
 * (the price that is actually charged) and in the browser (a preview).
 * The server always recalculates; a price sent from the browser is never trusted.
 */

export type VehicleId = "scooter" | "car" | "van" | "truck";

export interface VehicleConfig {
  id: VehicleId;
  name: string;
  /** Maximum load in kilograms. */
  maxWeightKg: number;
  /** Maximum load volume in cubic metres. */
  maxVolumeM3: number;
  /** Usable cargo space. Each package must fit inside it (rotation allowed). */
  interior: { lengthCm: number; widthCm: number; heightCm: number };
  /** Fixed fee per shipment, GEL. */
  baseFee: number;
  /** Price per kilometre, GEL. */
  pricePerKm: number;
  /** Fee charged at 100% utilization, GEL. Charged proportionally. */
  spaceFee: number;
  /** Minimum charge, GEL. null = no minimum. */
  minCharge: number | null;
  /** Can this vehicle carry fragile goods? */
  allowsFragile: boolean;
  /** Can this vehicle carry goods that need special handling? */
  allowsSpecialHandling: boolean;
  /** Admin can switch a vehicle off without deleting it. */
  enabled: boolean;
}

export interface DeliverySettings {
  vehicles: VehicleConfig[];
  /**
   * Total volume may use at most this share of a vehicle's volume capacity
   * before we stop trusting that the load can actually be packed.
   * Above it the engine tries a bigger vehicle, and finally asks for a manual quote.
   */
  maxReliablePackingRatio: number;
}

/** One product line in a shipment. Dimensions are of one packed unit. */
export interface ShippingItem {
  productId?: string;
  quantity: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  fragile?: boolean;
  specialHandling?: boolean;
  /** Packages per unit (e.g. a table shipped in 2 boxes). Default 1. Dimensions are per package. */
  packagesPerUnit?: number;
}

export interface ShipmentTotals {
  totalWeightKg: number;
  totalVolumeM3: number;
  packageCount: number;
  fragile: boolean;
  specialHandling: boolean;
}

export interface PriceBreakdown {
  baseFee: number;
  distanceFee: number;
  spaceFee: number;
  /** Amount added to reach the minimum charge (0 when not applied). */
  minimumTopUp: number;
  total: number;
}

export type ShipmentQuote =
  | {
      status: "quoted";
      vehicle: { id: VehicleId; name: string };
      distanceKm: number;
      totals: ShipmentTotals;
      weightUtilization: number;
      volumeUtilization: number;
      /** max(weight, volume) — the one that is charged. */
      overallUtilization: number;
      price: PriceBreakdown;
    }
  | {
      status: "manual";
      distanceKm: number;
      totals: ShipmentTotals | null;
      reason: ManualReason;
      message: string;
    };

export type ManualReason =
  | "invalid_input"
  | "missing_dimensions"
  | "too_heavy"
  | "too_large"
  | "package_too_large"
  | "cannot_confirm_fit"
  | "handling_not_supported";

/** A cart is split into one shipment per pickup location (normally one per manufacturer). */
export interface ShipmentRequest {
  /** Key of the pickup location, e.g. the manufacturer id. */
  originId: string;
  distanceKm: number;
  items: ShippingItem[];
}

export interface CartDeliveryQuote {
  shipments: (ShipmentQuote & { originId: string })[];
  /** Sum of all quoted shipments, GEL. */
  quotedTotal: number;
  /** True if at least one shipment needs a manual transport quote. */
  requiresManualQuote: boolean;
}
