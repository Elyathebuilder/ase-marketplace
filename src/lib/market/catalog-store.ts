/**
 * The public catalog, read from the database (server only).
 *
 * Customers only ever see published products of sellers whose account is approved and not suspended.
 * Reads are cached in memory and the cache is dropped whenever a seller or admin changes the catalog
 * (bumpCatalog), so pages stay fast without showing stale data.
 */
import type { Manufacturer, Product, VerificationStatus } from "../types";
import type { DB } from "./db";

export const APPROVED = ["approved_company", "approved_independent"] as const;
export const isApproved = (status: string) => (APPROVED as readonly string[]).includes(status);

export const fileUrl = (file: string) => `/api/files/${file}`;

const json = <T>(v: unknown, fallback: T): T => {
  if (typeof v !== "string" || !v) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
};

export interface MakerRow {
  slug: string;
  owner_user_id: string | null;
  seller_type: "company" | "independent";
  name: string;
  name_ka: string | null;
  legal_name: string | null;
  registration_number: string | null;
  year_established: number | null;
  city: string;
  region: string;
  address: string;
  tagline: string;
  tagline_ka: string | null;
  description: string;
  description_ka: string | null;
  categories: string;
  capabilities: string;
  wholesale_note: string;
  employees: string;
  monogram: string;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_email: string;
  contact_phone: string;
  website: string | null;
  social: string;
  extra_info: string | null;
  logo_file: string | null;
  account_status: string;
  badge_status: string;
  needs_reassessment: number;
  featured: number;
  is_demo: number;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  verified_at: string | null;
}

export interface ProductRow {
  slug: string;
  manufacturer_slug: string;
  status: "draft" | "pending_review" | "published" | "rejected" | "archived";
  category: string;
  name: string;
  name_ka: string | null;
  description: string;
  description_ka: string | null;
  highlights: string;
  highlights_ka: string | null;
  specs: string;
  materials: string;
  colors: string;
  variants: string;
  retail_price_tetri: number | null;
  unit: string;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  weight_kg: number;
  fragile: number;
  special_handling: number;
  stock: number;
  available: number;
  moq: number;
  production_days: number;
  customizable: number;
  customization_options: string;
  buy_now: number;
  request_quote: number;
  wholesale_min_qty: number | null;
  wholesale_quote_only: number;
  tags: string;
  featured: number;
  popularity: number;
  tone: number;
  moderation_note: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

/** Public view of a seller. The badge is shown only when an admin awarded it. */
export function toManufacturer(r: MakerRow, photos: string[] = []): Manufacturer {
  const social = json<Manufacturer["social"]>(r.social, {});
  const verification: VerificationStatus = r.badge_status === "verified" ? "verified" : "approved";
  return {
    slug: r.slug,
    name: r.name,
    tagline: r.tagline,
    description: r.description,
    city: r.city,
    region: r.region,
    categories: json<string[]>(r.categories, []),
    yearEstablished: r.year_established ?? undefined,
    verification,
    sellerType: r.seller_type,
    capabilities: json<string[]>(r.capabilities, []),
    wholesale: r.wholesale_note,
    contact: { email: r.contact_email, phone: r.contact_phone },
    website: r.website ?? undefined,
    social: social && Object.keys(social).length ? social : undefined,
    featured: !!r.featured,
    monogram: r.monogram || initials(r.name),
    employees: r.employees,
    logoUrl: r.logo_file ? fileUrl(r.logo_file) : null,
    photos,
    ka: { name: r.name_ka, tagline: r.tagline_ka, description: r.description_ka },
  };
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

export function toProduct(r: ProductRow, tiers: { min_qty: number; unit_price_tetri: number }[], images: string[]): Product {
  const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);
  return {
    slug: r.slug,
    name: r.name,
    manufacturer: r.manufacturer_slug,
    category: r.category,
    retailPrice: r.retail_price_tetri == null ? null : r.retail_price_tetri / 100,
    unit: r.unit,
    description: r.description,
    highlights: json<string[]>(r.highlights, []),
    specs: json<Record<string, string>>(r.specs, {}),
    materials: json<string[]>(r.materials, []),
    lengthCm: r.length_cm,
    widthCm: r.width_cm,
    heightCm: r.height_cm,
    weightKg: r.weight_kg,
    fragile: !!r.fragile,
    specialHandling: !!r.special_handling,
    stock: r.stock,
    moq: r.moq,
    productionDays: r.production_days,
    customizable: !!r.customizable,
    customizationOptions: json<string[]>(r.customization_options, []),
    buyNow: !!r.buy_now && !!r.available,
    requestQuote: !!r.request_quote,
    wholesale:
      sorted.length || r.wholesale_min_qty
        ? {
            minQty: r.wholesale_min_qty ?? sorted[0]?.min_qty ?? 2,
            tiers: sorted.map((t) => ({ minQty: t.min_qty, unitPrice: t.unit_price_tetri / 100 })),
            quoteOnly: !!r.wholesale_quote_only,
          }
        : null,
    tags: json<string[]>(r.tags, []),
    featured: !!r.featured,
    popularity: r.popularity,
    addedAt: (r.published_at ?? r.created_at).slice(0, 10),
    tone: r.tone,
    images,
    colors: json<string[]>(r.colors, []),
    variants: json<Product["variants"]>(r.variants, []),
    available: !!r.available,
    ka: { name: r.name_ka, description: r.description_ka, highlights: r.highlights_ka ? json<string[]>(r.highlights_ka, []) : null },
  };
}

/* ------------------------------------------------------------------ */
/* Cached public catalog                                                */
/* ------------------------------------------------------------------ */

interface Snapshot {
  version: number;
  products: Product[];
  bySlug: Map<string, Product>;
  makers: Manufacturer[];
  makerBySlug: Map<string, Manufacturer>;
}

// Kept on globalThis: Next.js can load this file more than once (pages, server actions and API routes
// are separate bundles), and a change made by one copy must drop the cache of every copy.
const shared = globalThis as unknown as { __aseCatalog?: { versions: WeakMap<DB, number>; cache: WeakMap<DB, Snapshot> } };
shared.__aseCatalog ??= { versions: new WeakMap(), cache: new WeakMap() };
const { versions, cache } = shared.__aseCatalog;

/** Call after any change to sellers, products or their images. */
export function bumpCatalog(db: DB) {
  versions.set(db, (versions.get(db) ?? 0) + 1);
}

export function publicCatalog(db: DB): Snapshot {
  const version = versions.get(db) ?? 0;
  const hit = cache.get(db);
  if (hit && hit.version === version) return hit;

  const makerRows = db
    .prepare(`SELECT * FROM manufacturers WHERE account_status IN ('approved_company','approved_independent') ORDER BY name`)
    .all() as unknown as MakerRow[];
  const photoRows = db
    .prepare(
      `SELECT f.manufacturer_slug, f.file FROM seller_files f JOIN manufacturers m ON m.slug = f.manufacturer_slug
       WHERE f.kind = 'workshop_photo' AND f.related_id IS NULL AND f.removed_at IS NULL AND m.account_status IN ('approved_company','approved_independent') ORDER BY f.uploaded_at`,
    )
    .all() as { manufacturer_slug: string; file: string }[];
  const photos = group(photoRows, (r) => r.manufacturer_slug, (r) => fileUrl(r.file));
  const makers = makerRows.map((r) => toManufacturer(r, photos.get(r.slug) ?? []));
  const makerBySlug = new Map(makers.map((m) => [m.slug, m]));

  const rows = db
    .prepare(
      `SELECT p.* FROM products p JOIN manufacturers m ON m.slug = p.manufacturer_slug
       WHERE p.status = 'published' AND m.account_status IN ('approved_company','approved_independent')`,
    )
    .all() as unknown as ProductRow[];
  const tierRows = db
    .prepare(
      `SELECT t.* FROM product_price_tiers t JOIN products p ON p.slug = t.product_slug WHERE p.status = 'published'`,
    )
    .all() as { product_slug: string; min_qty: number; unit_price_tetri: number }[];
  const imageRows = db
    .prepare(`SELECT i.product_slug, i.file FROM product_images i JOIN products p ON p.slug = i.product_slug WHERE p.status = 'published' ORDER BY i.position, i.id`)
    .all() as { product_slug: string; file: string }[];
  const tiers = group(tierRows, (r) => r.product_slug, (r) => r);
  const images = group(imageRows, (r) => r.product_slug, (r) => fileUrl(r.file));
  const products = rows.map((r) => toProduct(r, tiers.get(r.slug) ?? [], images.get(r.slug) ?? []));

  const snap: Snapshot = { version, products, bySlug: new Map(products.map((p) => [p.slug, p])), makers, makerBySlug };
  cache.set(db, snap);
  return snap;
}

function group<R, V>(rows: R[], key: (r: R) => string, val: (r: R) => V): Map<string, V[]> {
  const m = new Map<string, V[]>();
  for (const r of rows) {
    const k = key(r);
    const list = m.get(k) ?? [];
    list.push(val(r));
    m.set(k, list);
  }
  return m;
}

/** Product and seller lookup for price and delivery calculations on the server. */
export function catalogLookup(db: DB) {
  const s = publicCatalog(db);
  return { product: (slug: string) => s.bySlug.get(slug), maker: (slug: string) => s.makerBySlug.get(slug) };
}
