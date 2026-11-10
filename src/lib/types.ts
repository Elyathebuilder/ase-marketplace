/** Public marketplace data model, read from the database (see lib/market/catalog-store.ts). */
import type { Lang } from "@/i18n/config";

/**
 * What customers see about a seller.
 * - approved: approved to sell on the marketplace (information checked, no inspection implied).
 * - verified: additionally passed Amartani's manual verification and an inspection (the Verified badge).
 */
export type VerificationStatus = "approved" | "verified";
export type SellerType = "company" | "independent";

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
  sellerType: SellerType;
  capabilities: string[];
  wholesale: string;
  contact: { email: string; phone: string };
  website?: string;
  social?: { facebook?: string; instagram?: string; linkedin?: string };
  featured?: boolean;
  /** Short initials for the generated logo. */
  monogram: string;
  employees: string;
  /** Uploaded logo (served by /api/files), otherwise a generated monogram is shown. */
  logoUrl?: string | null;
  /** Workshop / production photos. */
  photos?: string[];
  /**
   * The seller's own text in other languages (today: Georgian). The base fields above are the main text.
   * Pages pick the visitor's language and fall back to the base text; nothing is machine-translated.
   */
  translations?: Partial<Record<Lang, { name?: string | null; tagline?: string | null; description?: string | null }>>;
}

export interface ProductVariant {
  name: string;
  options: string[];
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
  /** quoteOnly: wholesale prices are agreed by quotation; otherwise the tier price applies at checkout. */
  wholesale: { minQty: number; tiers: PriceTier[]; quoteOnly?: boolean } | null;
  /** Uploaded photos (served by /api/files). Empty: a generated picture is shown. */
  images?: string[];
  colors?: string[];
  variants?: ProductVariant[];
  /** False when the seller has paused sales. */
  available?: boolean;
  /** The seller's own text in other languages (today: Georgian), as for Manufacturer.translations. */
  translations?: Partial<Record<Lang, { name?: string | null; description?: string | null; highlights?: string[] | null }>>;
  tags: string[];
  featured?: boolean;
  popularity: number;
  addedAt: string;
  /** Visual tone for the generated product image. */
  tone: number;
}

export type Availability = "in_stock" | "low_stock" | "made_to_order";
