/**
 * Seller product management and admin product moderation (server only).
 *
 * - A seller sees and edits only its own products.
 * - Any seller (also while its application is pending) may prepare draft products. Only an approved
 *   seller can publish; drafts and products of sellers that aren't approved never appear publicly.
 * - When product moderation is switched on (Admin → Settings), "publish" sends the product to an
 *   admin for approval first.
 * - Orders keep their own copy of each product (order_items.snapshot), so editing or archiving a
 *   product never changes an existing order.
 */
import { randomBytes } from "node:crypto";
import { getCategory } from "../catalog-core";
import { toTetri } from "../money";
import { adminAction, slugify } from "./accounts";
import { bumpCatalog, isApproved, toProduct, type ProductRow } from "./catalog-store";
import { tx } from "./db";
import { notifyAdmins, notifyUser, ownStore, requireAdmin, getMaker } from "./sellers";
import type { Ctx } from "./service";
import { getSettings } from "./settings";
import { MarketError, type Actor } from "./types";

export const UNITS = ["piece", "set", "pair", "box", "jar", "bottle", "kg", "m²", "m", "l", "pack", "pallet"] as const;
export const MAX_IMAGES = 8;

const iso = (ctx: Ctx) => ctx.now().toISOString();

export const getProductRow = (ctx: Ctx, slug: string) => ctx.db.prepare("SELECT * FROM products WHERE slug = ?").get(slug) as unknown as ProductRow | undefined;

function ownProduct(ctx: Ctx, actor: Actor | null, slug: string) {
  const m = ownStore(ctx, actor);
  const p = getProductRow(ctx, slug);
  // Another seller's product looks the same as a missing one.
  if (!p || p.manufacturer_slug !== m.slug) throw new MarketError("not_found");
  return { m, p };
}

export function productImages(ctx: Ctx, slug: string) {
  return ctx.db.prepare("SELECT id, file, position FROM product_images WHERE product_slug = ? ORDER BY position, id").all(slug) as { id: number; file: string; position: number }[];
}

export function productTiers(ctx: Ctx, slug: string) {
  return ctx.db.prepare("SELECT min_qty, unit_price_tetri FROM product_price_tiers WHERE product_slug = ? ORDER BY min_qty").all(slug) as { min_qty: number; unit_price_tetri: number }[];
}

/** The seller's products with images, any status. */
export function myProducts(ctx: Ctx, actor: Actor | null) {
  const m = ownStore(ctx, actor);
  const rows = ctx.db.prepare("SELECT * FROM products WHERE manufacturer_slug = ? ORDER BY CASE status WHEN 'archived' THEN 1 ELSE 0 END, updated_at DESC").all(m.slug) as unknown as ProductRow[];
  return rows.map((r) => ({ row: r, product: toProduct(r, productTiers(ctx, r.slug), productImages(ctx, r.slug).map((i) => `/api/files/${i.file}`)) }));
}

export function myProduct(ctx: Ctx, actor: Actor | null, slug: string) {
  const { p } = ownProduct(ctx, actor, slug);
  return { row: p, tiers: productTiers(ctx, slug), images: productImages(ctx, slug), ordered: timesOrdered(ctx, slug) };
}

const timesOrdered = (ctx: Ctx, slug: string) => (ctx.db.prepare("SELECT COUNT(*) AS n FROM order_items WHERE product_slug = ?").get(slug) as { n: number }).n;

/* ------------------------------------------------------------------ */
/* Input parsing                                                        */
/* ------------------------------------------------------------------ */

const str = (v: unknown, max: number) => {
  const s = typeof v === "string" ? v.trim() : "";
  if (s.length > max) throw new MarketError("invalid_input", "too long");
  return s;
};
const lines = (v: unknown, maxItems: number, maxLen: number) =>
  str(v, maxItems * (maxLen + 2))
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((l) => l.slice(0, maxLen));
const list = (v: unknown, maxItems: number) =>
  [...new Set(str(v, 2000).split(/[,\n]/).map((x) => x.trim()).filter(Boolean))].slice(0, maxItems).map((x) => x.slice(0, 60));
const num = (v: unknown, min: number, max: number, int = false, fallback?: number) => {
  const s = str(v, 20).replace(",", ".");
  if (!s && fallback !== undefined) return fallback;
  const n = Number(s);
  if (!Number.isFinite(n) || n < min || n > max || (int && !Number.isInteger(n))) throw new MarketError("invalid_input", "number");
  return n;
};
const money = (v: unknown): number | null => {
  const s = str(v, 20).replace(",", ".");
  if (!s) return null;
  let t: number;
  try {
    t = toTetri(s);
  } catch {
    throw new MarketError("invalid_input", "price");
  }
  if (t <= 0 || t > 100_000_000_00) throw new MarketError("invalid_input", "price");
  return t;
};
const flag = (v: unknown) => (v === "1" || v === "on" || v === true ? 1 : 0);

export interface ProductInput {
  name: unknown;
  nameKa?: unknown;
  category: unknown;
  description?: unknown;
  descriptionKa?: unknown;
  highlights?: unknown;
  specs?: unknown;
  materials?: unknown;
  colors?: unknown;
  variants?: unknown;
  retailPrice?: unknown;
  unit?: unknown;
  lengthCm?: unknown;
  widthCm?: unknown;
  heightCm?: unknown;
  weightKg?: unknown;
  fragile?: unknown;
  stock?: unknown;
  available?: unknown;
  moq?: unknown;
  productionDays?: unknown;
  customizable?: unknown;
  customizationOptions?: unknown;
  buyNow?: unknown;
  requestQuote?: unknown;
  wholesaleMinQty?: unknown;
  wholesaleQuoteOnly?: unknown;
  /** Rows of quantity prices: [{ minQty, price }] */
  tiers?: { minQty: unknown; price: unknown }[];
}

function parse(input: ProductInput) {
  const name = str(input.name, 160);
  if (!name) throw new MarketError("invalid_input", "name");
  const category = str(input.category, 60);
  if (!getCategory(category)) throw new MarketError("invalid_input", "category");
  const unit = str(input.unit, 20) || "piece";
  if (!(UNITS as readonly string[]).includes(unit)) throw new MarketError("invalid_input", "unit");
  const specs: Record<string, string> = {};
  for (const l of lines(input.specs, 20, 200)) {
    const i = l.indexOf(":");
    if (i > 0) specs[l.slice(0, i).trim().slice(0, 60)] = l.slice(i + 1).trim().slice(0, 140);
  }
  // "Size: S, M, L" per line
  const variants = lines(input.variants, 5, 300)
    .map((l) => {
      const i = l.indexOf(":");
      if (i <= 0) return null;
      const options = [...new Set(l.slice(i + 1).split(",").map((o) => o.trim()).filter(Boolean))].slice(0, 20).map((o) => o.slice(0, 40));
      return options.length ? { name: l.slice(0, i).trim().slice(0, 40), options } : null;
    })
    .filter((v): v is { name: string; options: string[] } => !!v);
  const retail = money(input.retailPrice);
  const tiers = (input.tiers ?? [])
    .map((t) => ({ min: str(t.minQty, 10), price: money(t.price) }))
    .filter((t) => t.min || t.price)
    .map((t) => {
      const min = num(t.min, 2, 1_000_000, true);
      if (!t.price) throw new MarketError("invalid_input", "tier price");
      if (retail && t.price >= retail) throw new MarketError("invalid_input", "tier price must be below the retail price");
      return { min, price: t.price };
    });
  if (new Set(tiers.map((t) => t.min)).size !== tiers.length) throw new MarketError("invalid_input", "duplicate tier");
  const buyNow = flag(input.buyNow);
  const requestQuote = flag(input.requestQuote);
  if (buyNow && !retail) throw new MarketError("invalid_input", "price required to sell directly");
  if (!buyNow && !requestQuote) throw new MarketError("invalid_input", "choose how customers can buy");
  return {
    name,
    name_ka: str(input.nameKa, 160) || null,
    category,
    description: str(input.description, 4000),
    description_ka: str(input.descriptionKa, 4000) || null,
    highlights: JSON.stringify(lines(input.highlights, 8, 120)),
    specs: JSON.stringify(specs),
    materials: JSON.stringify(list(input.materials, 12)),
    colors: JSON.stringify(list(input.colors, 20)),
    variants: JSON.stringify(variants),
    retail_price_tetri: retail,
    unit,
    length_cm: num(input.lengthCm, 0.1, 2000, false, 10),
    width_cm: num(input.widthCm, 0.1, 2000, false, 10),
    height_cm: num(input.heightCm, 0.1, 2000, false, 10),
    weight_kg: num(input.weightKg, 0.01, 30000, false, 1),
    fragile: flag(input.fragile),
    stock: num(input.stock, 0, 10_000_000, true, 0),
    available: flag(input.available),
    moq: num(input.moq, 1, 1_000_000, true, 1),
    production_days: num(input.productionDays, 0, 365, true, 0),
    customizable: flag(input.customizable),
    customization_options: JSON.stringify(lines(input.customizationOptions, 10, 120)),
    buy_now: buyNow,
    request_quote: requestQuote,
    wholesale_min_qty: str(input.wholesaleMinQty, 10) ? num(input.wholesaleMinQty, 2, 1_000_000, true) : tiers[0]?.min ?? null,
    wholesale_quote_only: flag(input.wholesaleQuoteOnly),
    tiers,
  };
}

/* ------------------------------------------------------------------ */
/* Seller                                                               */
/* ------------------------------------------------------------------ */

/** Create (slug null) or update a product. New products start as drafts. Returns the slug. */
export function saveProduct(ctx: Ctx, actor: Actor | null, slug: string | null, input: ProductInput): string {
  const m = ownStore(ctx, actor);
  if (m.account_status === "rejected" || m.account_status === "suspended") throw new MarketError("seller_not_approved");
  const d = parse(input);
  const now = iso(ctx);
  return tx(ctx.db, () => {
    let target = slug;
    if (target) {
      const { p } = ownProduct(ctx, actor, target);
      if (p.status === "archived") throw new MarketError("invalid_state");
      ctx.db
        .prepare(
          `UPDATE products SET name=?, name_ka=?, category=?, description=?, description_ka=?, highlights=?, specs=?, materials=?, colors=?, variants=?,
           retail_price_tetri=?, unit=?, length_cm=?, width_cm=?, height_cm=?, weight_kg=?, fragile=?, stock=?, available=?, moq=?, production_days=?,
           customizable=?, customization_options=?, buy_now=?, request_quote=?, wholesale_min_qty=?, wholesale_quote_only=?, updated_at=? WHERE slug = ?`,
        )
        .run(
          d.name, d.name_ka, d.category, d.description, d.description_ka, d.highlights, d.specs, d.materials, d.colors, d.variants,
          d.retail_price_tetri, d.unit, d.length_cm, d.width_cm, d.height_cm, d.weight_kg, d.fragile, d.stock, d.available, d.moq, d.production_days,
          d.customizable, d.customization_options, d.buy_now, d.request_quote, d.wholesale_min_qty, d.wholesale_quote_only, now, target,
        );
      ctx.db.prepare("DELETE FROM product_price_tiers WHERE product_slug = ?").run(target);
    } else {
      target = uniqueProductSlug(ctx, d.name);
      ctx.db
        .prepare(
          `INSERT INTO products (slug, manufacturer_slug, status, category, name, name_ka, description, description_ka, highlights, specs, materials, colors, variants,
           retail_price_tetri, unit, length_cm, width_cm, height_cm, weight_kg, fragile, stock, available, moq, production_days, customizable, customization_options,
           buy_now, request_quote, wholesale_min_qty, wholesale_quote_only, tone, created_at, updated_at)
           VALUES (?,?,'draft',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          target, m.slug, d.category, d.name, d.name_ka, d.description, d.description_ka, d.highlights, d.specs, d.materials, d.colors, d.variants,
          d.retail_price_tetri, d.unit, d.length_cm, d.width_cm, d.height_cm, d.weight_kg, d.fragile, d.stock, d.available, d.moq, d.production_days,
          d.customizable, d.customization_options, d.buy_now, d.request_quote, d.wholesale_min_qty, d.wholesale_quote_only, randomBytes(1)[0] % 8, now, now,
        );
    }
    const tier = ctx.db.prepare("INSERT INTO product_price_tiers (product_slug, min_qty, unit_price_tetri) VALUES (?,?,?)");
    for (const t of d.tiers) tier.run(target, t.min, t.price);
    bumpCatalog(ctx.db);
    return target;
  });
}

function uniqueProductSlug(ctx: Ctx, name: string) {
  const base = slugify(name);
  for (let i = 0; i < 1000; i++) {
    const s = i === 0 ? base : `${base}-${i + 1}`;
    if (!getProductRow(ctx, s)) return s;
  }
  return `${base}-${randomBytes(3).toString("hex")}`;
}

export function addProductImage(ctx: Ctx, actor: Actor | null, slug: string, saved: { file: string; name: string }) {
  ownProduct(ctx, actor, slug);
  tx(ctx.db, () => {
    const imgs = productImages(ctx, slug);
    if (imgs.length >= MAX_IMAGES) throw new MarketError("invalid_input", "too many images");
    ctx.db.prepare("INSERT INTO product_images (product_slug, file, position) VALUES (?,?,?)").run(slug, saved.file, imgs.length ? Math.max(...imgs.map((i) => i.position)) + 1 : 0);
    bumpCatalog(ctx.db);
  });
}

export function removeProductImage(ctx: Ctx, actor: Actor | null, slug: string, imageId: unknown) {
  ownProduct(ctx, actor, slug);
  const r = ctx.db.prepare("DELETE FROM product_images WHERE id = ? AND product_slug = ?").run(Number(imageId), slug);
  if (!r.changes) throw new MarketError("not_found");
  bumpCatalog(ctx.db);
}

/** Make one image the main (first) picture. */
export function makeMainImage(ctx: Ctx, actor: Actor | null, slug: string, imageId: unknown) {
  ownProduct(ctx, actor, slug);
  tx(ctx.db, () => {
    const imgs = productImages(ctx, slug);
    const main = imgs.find((i) => i.id === Number(imageId));
    if (!main) throw new MarketError("not_found");
    [main, ...imgs.filter((i) => i.id !== main.id)].forEach((img, i) => ctx.db.prepare("UPDATE product_images SET position = ? WHERE id = ?").run(i, img.id));
    bumpCatalog(ctx.db);
  });
}

/** What still blocks publishing. */
export function publishProblems(ctx: Ctx, p: ProductRow): string[] {
  const out: string[] = [];
  if (p.description.length < 20) out.push("description");
  if (p.buy_now && !p.retail_price_tetri) out.push("price");
  if (productImages(ctx, p.slug).length === 0) out.push("images");
  return out;
}

export function publishProduct(ctx: Ctx, actor: Actor | null, slug: string) {
  const { m, p } = ownProduct(ctx, actor, slug);
  if (!isApproved(m.account_status)) throw new MarketError("seller_not_approved");
  if (!["draft", "rejected"].includes(p.status)) throw new MarketError("invalid_state");
  if (publishProblems(ctx, p).length) throw new MarketError("invalid_input", "incomplete product");
  const moderated = getSettings(ctx).productModeration;
  tx(ctx.db, () => {
    ctx.db.prepare("UPDATE products SET status = ?, moderation_note = NULL, published_at = COALESCE(published_at, CASE WHEN ? THEN NULL ELSE ? END), updated_at = ? WHERE slug = ?")
      .run(moderated ? "pending_review" : "published", moderated ? 1 : 0, iso(ctx), iso(ctx), slug);
    if (moderated) notifyAdmins(ctx, "admin_product_review", { maker: m.name, product: p.name, link: "/admin/products" });
    bumpCatalog(ctx.db);
  });
}

/** Take a product off the marketplace (back to draft), archive it, or delete a draft that was never ordered. */
export function productStatusAction(ctx: Ctx, actor: Actor | null, slug: string, action: "unpublish" | "archive" | "restore" | "delete") {
  const { p } = ownProduct(ctx, actor, slug);
  tx(ctx.db, () => {
    if (action === "unpublish") {
      if (!["published", "pending_review"].includes(p.status)) throw new MarketError("invalid_state");
      ctx.db.prepare("UPDATE products SET status = 'draft', updated_at = ? WHERE slug = ?").run(iso(ctx), slug);
    } else if (action === "archive") {
      if (p.status === "archived") throw new MarketError("invalid_state");
      ctx.db.prepare("UPDATE products SET status = 'archived', updated_at = ? WHERE slug = ?").run(iso(ctx), slug);
    } else if (action === "restore") {
      if (p.status !== "archived") throw new MarketError("invalid_state");
      ctx.db.prepare("UPDATE products SET status = 'draft', updated_at = ? WHERE slug = ?").run(iso(ctx), slug);
    } else {
      // Ordered products are kept (archived), so order history stays complete.
      if (timesOrdered(ctx, slug) > 0 || p.status === "published") throw new MarketError("invalid_state");
      ctx.db.prepare("DELETE FROM products WHERE slug = ?").run(slug);
    }
    bumpCatalog(ctx.db);
  });
}

/* ------------------------------------------------------------------ */
/* Admin                                                                */
/* ------------------------------------------------------------------ */

export function adminProducts(ctx: Ctx, actor: Actor | null, status = "pending_review") {
  requireAdmin(actor);
  const where = status === "all" ? "" : "WHERE p.status = ?";
  const sql = `SELECT p.*, m.name AS maker_name, m.account_status FROM products p JOIN manufacturers m ON m.slug = p.manufacturer_slug ${where} ORDER BY p.updated_at DESC LIMIT 300`;
  const rows = (where ? ctx.db.prepare(sql).all(status) : ctx.db.prepare(sql).all()) as unknown as (ProductRow & { maker_name: string; account_status: string })[];
  return rows.map((r) => ({ row: r, image: productImages(ctx, r.slug)[0]?.file ?? null }));
}

/** Approve a product waiting for moderation, reject it, or take a published product down. The seller is told why. */
export function adminModerateProduct(ctx: Ctx, actor: Actor | null, slug: string, decision: "approve" | "reject", reason: unknown) {
  const admin = requireAdmin(actor);
  const p = getProductRow(ctx, slug);
  if (!p) throw new MarketError("not_found");
  const why = str(reason, 1000) || null;
  const m = getMaker(ctx, p.manufacturer_slug)!;
  tx(ctx.db, () => {
    if (decision === "approve") {
      if (p.status !== "pending_review") throw new MarketError("invalid_state");
      if (!isApproved(m.account_status)) throw new MarketError("seller_not_approved");
      ctx.db.prepare("UPDATE products SET status = 'published', published_at = COALESCE(published_at, ?), moderation_note = NULL, updated_at = ? WHERE slug = ?").run(iso(ctx), iso(ctx), slug);
    } else {
      if (!["pending_review", "published"].includes(p.status)) throw new MarketError("invalid_state");
      if (!why) throw new MarketError("invalid_input", "reason required");
      ctx.db.prepare("UPDATE products SET status = 'rejected', moderation_note = ?, updated_at = ? WHERE slug = ?").run(why, iso(ctx), slug);
    }
    if (m.owner_user_id) notifyUser(ctx, m.owner_user_id, decision === "approve" ? "product_approved" : "product_rejected", { product: p.name, reason: why ?? "", link: `/seller/products/${slug}` });
    adminAction(ctx, admin.id, `product_${decision}`, "product", slug, why);
    bumpCatalog(ctx.db);
  });
}
