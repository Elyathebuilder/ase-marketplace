/**
 * Fills an empty database with the demo sellers and products (lib/demo-data.ts), so the
 * marketplace has something to show. Runs only when there are no sellers yet; real data is never touched.
 *
 * Demo sellers are approved companies. Their Verified badge follows the old demo labels:
 * "verified" gets an approved badge request, "pending" an open request, "unverified" none.
 */
import { toTetri } from "../money";
import { MANUFACTURERS, PRODUCTS } from "../demo-data";
import { MANUFACTURERS_KA, PRODUCTS_KA } from "@/i18n/data-ka";
import { bumpCatalog } from "./catalog-store";
import { tx } from "./db";
import type { Ctx } from "./service";

export const SYSTEM = "system";
const makerUserId = (slug: string) => `maker-${slug}`;

export function seedCatalog(ctx: Ctx) {
  if ((ctx.db.prepare("SELECT COUNT(*) AS n FROM manufacturers").get() as { n: number }).n > 0) return;
  const at = "2026-01-15T09:00:00.000Z";
  tx(ctx.db, () => {
    const maker = ctx.db.prepare(
      `INSERT INTO manufacturers (slug, owner_user_id, seller_type, name, name_ka, legal_name, registration_number, year_established, city, region, address,
        tagline, tagline_ka, description, description_ka, categories, capabilities, wholesale_note, employees, monogram,
        contact_first_name, contact_last_name, contact_email, contact_phone, website, social, account_status, badge_status, featured, is_demo,
        created_at, updated_at, submitted_at, approved_at, verified_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?,?)`,
    );
    const history = ctx.db.prepare("INSERT INTO seller_status_history (manufacturer_slug, track, from_status, to_status, at, by_user, reason) VALUES (?,?,?,?,?,?,?)");
    const request = ctx.db.prepare(
      "INSERT INTO badge_requests (id, manufacturer_slug, status, details, created_at, created_by, submitted_at, decided_at, decided_by, decision_reason) VALUES (?,?,?,?,?,?,?,?,?,?)",
    );
    MANUFACTURERS.forEach((m, i) => {
      const k = MANUFACTURERS_KA[m.slug];
      const owner = ctx.db.prepare("SELECT id FROM users WHERE id = ?").get(makerUserId(m.slug)) ? makerUserId(m.slug) : null;
      const badge = m.verification === "verified" ? "verified" : m.verification === "pending" ? "submitted" : "not_requested";
      maker.run(
        m.slug, owner, "company", m.name, k?.name ?? null, `${m.name} LLC`, `DEMO-${String(400100 + i * 7)}`, m.yearEstablished ?? null, m.city, m.region, "",
        m.tagline, k?.tagline ?? null, m.description, k?.description ?? null, JSON.stringify(m.categories), JSON.stringify(m.capabilities), m.wholesale, m.employees, m.monogram,
        null, null, m.contact.email, m.contact.phone, m.website ?? null, JSON.stringify(m.social ?? {}), "approved_company", badge, m.featured ? 1 : 0,
        at, at, at, at, badge === "verified" ? at : null,
      );
      history.run(m.slug, "account", null, "approved_company", at, SYSTEM, "Demo seller");
      if (badge !== "not_requested") {
        const details = JSON.stringify({ name: m.name, location: `${m.city}, ${m.region}`, activities: m.description, categories: m.categories, capacity: m.capabilities.join("; "), contact: m.contact.email });
        request.run(`VR-${m.slug}`, m.slug, badge, details, at, SYSTEM, at, badge === "verified" ? at : null, badge === "verified" ? SYSTEM : null, badge === "verified" ? "Demo seller" : null);
        history.run(m.slug, "badge", "not_requested", badge, at, SYSTEM, "Demo seller");
      }
    });

    const product = ctx.db.prepare(
      `INSERT INTO products (slug, manufacturer_slug, status, category, name, name_ka, description, description_ka, highlights, highlights_ka, specs, materials,
        retail_price_tetri, unit, length_cm, width_cm, height_cm, weight_kg, fragile, special_handling, stock, moq, production_days, customizable,
        customization_options, buy_now, request_quote, wholesale_min_qty, wholesale_quote_only, tags, featured, popularity, tone, created_at, updated_at, published_at)
       VALUES (?,?,'published',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?,?,?,?)`,
    );
    const tier = ctx.db.prepare("INSERT INTO product_price_tiers (product_slug, min_qty, unit_price_tetri) VALUES (?,?,?)");
    for (const p of PRODUCTS) {
      const k = PRODUCTS_KA[p.slug];
      const added = `${p.addedAt}T09:00:00.000Z`;
      product.run(
        p.slug, p.manufacturer, p.category, p.name, k?.name ?? null, p.description, k?.description ?? null, JSON.stringify(p.highlights), k?.highlights ? JSON.stringify(k.highlights) : null,
        JSON.stringify(p.specs), JSON.stringify(p.materials), p.retailPrice == null ? null : toTetri(p.retailPrice), p.unit, p.lengthCm, p.widthCm, p.heightCm, p.weightKg,
        p.fragile ? 1 : 0, p.specialHandling ? 1 : 0, p.stock, p.moq, p.productionDays, p.customizable ? 1 : 0, JSON.stringify(p.customizationOptions),
        p.buyNow ? 1 : 0, p.requestQuote ? 1 : 0, p.wholesale?.minQty ?? null, JSON.stringify(p.tags), p.featured ? 1 : 0, p.popularity, p.tone, added, added, added,
      );
      for (const t of p.wholesale?.tiers ?? []) tier.run(p.slug, Math.max(2, t.minQty), toTetri(t.unitPrice));
    }
  });
  bumpCatalog(ctx.db);
}
