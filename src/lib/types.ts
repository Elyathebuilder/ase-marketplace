/** Marketplace data model (Phase 1 — mirrors the tables planned for Supabase in Phase 2). */

export type VerificationStatus = "unverified" | "pending" | "verified";

export interface Category {
  slug: string;
  name: string;
  description: string;
  /** lucide-react icon name, see components/CategoryIcon.tsx */
  icon: string;
}

export interface Manufacturer {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  city: string;
  region: string;
  categories: string[];
  yearEstablished?: number;
  verification: VerificationStatus;
  capabilities: string[];
  wholesale: string;
  contact: { email: string; phone: string };
  website?: string;
  social?: { facebook?: string; instagram?: string; linkedin?: string };
  featured?: boolean;
  /** Short initials for the generated logo. */
  monogram: string;
  employees: string;
}

export interface PriceTier {
  minQty: number;
  unitPrice: number;
}

export interface Product {
  slug: string;
  name: string;
  manufacturer: string;
  category: string;
  /** Retail price per unit in GEL; null if the product is not sold at retail. */
  retailPrice: number | null;
  /** Price unit shown after the price, e.g. "piece", "m²", "kg". */
  unit: string;
  description: string;
  highlights: string[];
  specs: Record<string, string>;
  materials: string[];
  /** Shipping size of one packed unit. */
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  fragile: boolean;
  specialHandling: boolean;
  stock: number;
  moq: number;
  /** Working days to produce when out of stock or customised. */
  productionDays: number;
  customizable: boolean;
  customizationOptions: string[];
  buyNow: boolean;
  requestQuote: boolean;
  wholesale: { minQty: number; tiers: PriceTier[] } | null;
  tags: string[];
  featured?: boolean;
  popularity: number;
  addedAt: string;
  /** Visual tone for the generated product image. */
  tone: number;
}

export type Availability = "in_stock" | "low_stock" | "made_to_order";
