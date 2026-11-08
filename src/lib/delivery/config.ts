import type { DeliverySettings } from "./types";

/**
 * Starting configuration from the project brief.
 * Capacities are examples, not specifications of a real transport company.
 * In Phase 7 these values move to the database and become editable in the admin dashboard.
 */
export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  maxReliablePackingRatio: 0.85,
  vehicles: [
    {
      id: "scooter",
      name: "Scooter",
      maxWeightKg: 15,
      maxVolumeM3: 0.05,
      interior: { lengthCm: 50, widthCm: 40, heightCm: 35 },
      baseFee: 0,
      pricePerKm: 0.6,
      spaceFee: 5,
      minCharge: null,
      allowsFragile: false,
      allowsSpecialHandling: false,
      enabled: true,
    },
    {
      id: "car",
      name: "Car",
      maxWeightKg: 100,
      maxVolumeM3: 0.5,
      interior: { lengthCm: 100, widthCm: 90, heightCm: 60 },
      baseFee: 0,
      pricePerKm: 0.6,
      spaceFee: 10,
      minCharge: null,
      allowsFragile: true,
      allowsSpecialHandling: false,
      enabled: true,
    },
    {
      id: "van",
      name: "Van",
      maxWeightKg: 1000,
      maxVolumeM3: 10,
      interior: { lengthCm: 320, widthCm: 175, heightCm: 180 },
      baseFee: 20,
      pricePerKm: 1.5,
      spaceFee: 20,
      minCharge: null,
      allowsFragile: true,
      allowsSpecialHandling: true,
      enabled: true,
    },
    {
      id: "truck",
      name: "Truck",
      maxWeightKg: 5000,
      maxVolumeM3: 30,
      interior: { lengthCm: 620, widthCm: 245, heightCm: 240 },
      baseFee: 50,
      pricePerKm: 2.5,
      spaceFee: 40,
      minCharge: null,
      allowsFragile: true,
      allowsSpecialHandling: true,
      enabled: true,
    },
  ],
};
