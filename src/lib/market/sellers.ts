/**
 * Seller accounts: the application to sell, its review by Amartani, and the store profile (server only).
 *
 * Two routes:
 * - company: an officially registered company (registration number and registration document required);
 * - independent: a maker without a registered company (no document required; photos of products and
 *   workspace instead). Never approved automatically.
 *
 * Only an admin can move an application past "pending review". A seller can never approve itself,
 * change its own status, or give itself the Verified badge (that is badge.ts, also admin-only).
 */
import { randomBytes } from "node:crypto";
import { getCategory } from "../catalog-core";
import { PLACES } from "../places";
import { adminAction } from "./accounts";
import { bumpCatalog, isApproved, type MakerRow } from "./catalog-store";
import { tx } from "./db";
import { queueEmail } from "./mailer";
import { notificationText } from "./notification-text";
import type { Ctx } from "./service";
import { MarketError, type Actor } from "./types";

export const ACCOUNT_STATUSES = ["draft", "pending_review", "under_review", "info_required", "approved_company", "approved_independent", "rejected", "suspended"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];
/** The seller may still edit and submit the application. */
const EDITABLE: string[] = ["draft", "pending_review", "info_required"];
/** Changing these after approval asks Amartani to look again. */
const SENSITIVE = ["legal_name", "registration_number", "city", "region", "address", "seller_type"] as const;

export const FILE_KINDS = ["registration_document", "logo", "workshop_photo", "product_photo", "supporting_document", "badge_document", "inspection_photo"] as const;
export type FileKind = (typeof FILE_KINDS)[number];

export interface SellerFile {
  id: string;
  manufacturer_slug: string;
  kind: FileKind;
  file: string;
  name: string;
  related_id: string | null;
  uploaded_by: string;
  uploaded_at: string;
}

export interface SellerMessage {
  id: number;
  manufacturer_slug: string;
  track: "account" | "badge";
  author_id: string;
  author_role: "manufacturer" | "admin";
  author_name?: string;
  visibility: "seller" | "internal";
  kind: "message" | "info_request" | "decision";
  body: string;
  at: string;
}

export interface SellerHistory {
  id: number;
  track: "account" | "badge";
  from_status: string | null;
  to_status: string;
  at: string;
  by_user: string;
  by_name?: string;
  reason: string | null;
}

const iso = (ctx: Ctx) => ctx.now().toISOString();

export const getMaker = (ctx: Ctx, slug: string) => ctx.db.prepare("SELECT * FROM manufacturers WHERE slug = ?").get(slug) as unknown as MakerRow | undefined;

/** The signed-in seller's own store. Another seller's store is never reachable from here. */
export function ownStore(ctx: Ctx, actor: Actor | null): MakerRow {
  if (!actor || actor.role !== "manufacturer" || !actor.manufacturerSlug) throw new MarketError("forbidden");
  const m = getMaker(ctx, actor.manufacturerSlug);
  if (!m) throw new MarketError("not_found");
  return m;
}

export function requireAdmin(actor: Actor | null): Actor {
  if (!actor || actor.role !== "admin") throw new MarketError("forbidden");
  return actor;
}

export function sellerFiles(ctx: Ctx, slug: string, kinds?: FileKind[]) {
  const rows = ctx.db.prepare("SELECT * FROM seller_files WHERE manufacturer_slug = ? AND removed_at IS NULL ORDER BY uploaded_at, id").all(slug) as unknown as SellerFile[];
  return kinds ? rows.filter((r) => kinds.includes(r.kind)) : rows;
}

export function sellerHistory(ctx: Ctx, slug: string, track?: "account" | "badge") {
  const rows = ctx.db
    .prepare("SELECT h.*, u.name AS by_name FROM seller_status_history h LEFT JOIN users u ON u.id = h.by_user WHERE h.manufacturer_slug = ? ORDER BY h.id")
    .all(slug) as unknown as SellerHistory[];
  return track ? rows.filter((r) => r.track === track) : rows;
}

/** Messages. Internal admin notes are returned only when `internal` is true (admin pages). */
export function sellerMessages(ctx: Ctx, slug: string, track: "account" | "badge", internal: boolean) {
  const rows = ctx.db
    .prepare("SELECT m.*, u.name AS author_name FROM seller_messages m LEFT JOIN users u ON u.id = m.author_id WHERE m.manufacturer_slug = ? AND m.track = ? ORDER BY m.id")
    .all(slug, track) as unknown as SellerMessage[];
  return internal ? rows : rows.filter((r) => r.visibility === "seller");
}

export function setAccountStatus(ctx: Ctx, m: MakerRow, to: AccountStatus, by: string, reason?: string | null) {
  ctx.db.prepare("UPDATE manufacturers SET account_status = ?, updated_at = ? WHERE slug = ?").run(to, iso(ctx), m.slug);
  ctx.db
    .prepare("INSERT INTO seller_status_history (manufacturer_slug, track, from_status, to_status, at, by_user, reason) VALUES (?,?,?,?,?,?,?)")
    .run(m.slug, "account", m.account_status, to, iso(ctx), by, reason ?? null);
  m.account_status = to;
  bumpCatalog(ctx.db);
}

export function addSellerMessage(ctx: Ctx, slug: string, track: "account" | "badge", author: Actor, body: string, visibility: "seller" | "internal", kind: SellerMessage["kind"] = "message") {
  ctx.db
    .prepare("INSERT INTO seller_messages (manufacturer_slug, track, author_id, author_role, visibility, kind, body, at) VALUES (?,?,?,?,?,?,?,?)")
    .run(slug, track, author.id, author.role === "admin" ? "admin" : "manufacturer", visibility, kind, body, iso(ctx));
}

/** In-app notification, plus an email when the person has confirmed their address. */
export function notifyUser(ctx: Ctx, userId: string, kind: string, params: Record<string, unknown> = {}) {
  ctx.db.prepare("INSERT INTO notifications (user_id, kind, params, created_at) VALUES (?,?,?,?)").run(userId, kind, JSON.stringify(params), iso(ctx));
  emailNotification(ctx, userId, kind, null, params);
}

export function emailNotification(ctx: Ctx, userId: string, kind: string, orderId: string | null, params: Record<string, unknown>) {
  const u = ctx.db.prepare("SELECT email, email_verified_at, status FROM users WHERE id = ?").get(userId) as { email: string; email_verified_at: string | null; status: string } | undefined;
  if (!u || !u.email_verified_at || u.status !== "active") return;
  const ka = notificationText("ka", kind, orderId, params);
  const en = notificationText("en", kind, orderId, params);
  if (ka === kind) return; // no text for this kind: nothing useful to email
  queueEmail(ctx, { userId, to: u.email, kind: `notify:${kind}`, subject: `ASE: ${en}`.slice(0, 160), text: `${ka}\n\n---\n\n${en}`, link: typeof params.link === "string" ? params.link : null });
}

export function notifyAdmins(ctx: Ctx, kind: string, params: Record<string, unknown>) {
  for (const { id } of ctx.db.prepare("SELECT id FROM users WHERE role = 'admin' AND status = 'active'").all() as { id: string }[]) notifyUser(ctx, id, kind, params);
}

export const ownerOf = (m: MakerRow) => m.owner_user_id;

/* ------------------------------------------------------------------ */
/* Seller: fill in and submit the application                           */
/* ------------------------------------------------------------------ */

const s = (v: unknown, max: number) => {
  const x = typeof v === "string" ? v.trim() : "";
  if (x.length > max) throw new MarketError("invalid_input", "too long");
  return x;
};
const opt = (v: unknown, max: number) => s(v, max) || null;

function url(v: unknown): string | null {
  const x = s(v, 300);
  if (!x) return null;
  const withScheme = /^https?:\/\//i.test(x) ? x : `https://${x}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
    return u.toString();
  } catch {
    throw new MarketError("invalid_input", "link");
  }
}

function year(v: unknown, now: Date): number | null {
  const x = s(v, 4);
  if (!x) return null;
  const n = Number(x);
  if (!Number.isInteger(n) || n < 1800 || n > now.getUTCFullYear()) throw new MarketError("invalid_input", "year");
  return n;
}

export function categoryList(v: unknown): string[] {
  const list = (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : []).map((c) => String(c).trim()).filter((c) => !!getCategory(c));
  return [...new Set(list)].slice(0, 13);
}

export interface ApplicationInput {
  // business
  name?: unknown;
  legalName?: unknown;
  registrationNumber?: unknown;
  yearEstablished?: unknown;
  description?: unknown;
  categories?: unknown;
  website?: unknown;
  facebook?: unknown;
  instagram?: unknown;
  extraInfo?: unknown;
  // location and contact
  city?: unknown;
  region?: unknown;
  address?: unknown;
  contactFirstName?: unknown;
  contactLastName?: unknown;
  contactEmail?: unknown;
  contactPhone?: unknown;
}

/** Save one step of the application (or, after approval, the store profile). */
export function saveApplication(ctx: Ctx, actor: Actor | null, step: "business" | "contact", input: ApplicationInput) {
  const m = ownStore(ctx, actor);
  const approved = isApproved(m.account_status);
  if (!approved && !EDITABLE.includes(m.account_status)) throw new MarketError("invalid_state");
  const before = { ...m };
  const now = iso(ctx);
  tx(ctx.db, () => {
    if (step === "business") {
      const name = s(input.name, 120);
      if (!name) throw new MarketError("invalid_input", "name");
      const social = { facebook: url(input.facebook) ?? undefined, instagram: url(input.instagram) ?? undefined };
      ctx.db
        .prepare(
          `UPDATE manufacturers SET name = ?, legal_name = ?, registration_number = ?, year_established = ?, description = ?, categories = ?, website = ?, social = ?,
           extra_info = ?, monogram = ?, updated_at = ? WHERE slug = ?`,
        )
        .run(
          name,
          m.seller_type === "company" ? opt(input.legalName, 200) : null,
          m.seller_type === "company" ? opt(input.registrationNumber, 40) : null,
          year(input.yearEstablished, ctx.now()),
          s(input.description, 3000),
          JSON.stringify(categoryList(input.categories)),
          url(input.website),
          JSON.stringify(social),
          opt(input.extraInfo, 2000),
          monogramOf(name),
          now,
          m.slug,
        );
    } else {
      const city = s(input.city, 80);
      if (city && !PLACES[city]) throw new MarketError("invalid_input", "city");
      const email = s(input.contactEmail, 200).toLowerCase();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new MarketError("invalid_input", "email");
      const phone = s(input.contactPhone, 40);
      if (phone && !/^[+\d][\d\s()-]{5,}$/.test(phone)) throw new MarketError("invalid_input", "phone");
      ctx.db
        .prepare(
          `UPDATE manufacturers SET city = ?, region = ?, address = ?, contact_first_name = ?, contact_last_name = ?, contact_email = ?, contact_phone = ?, updated_at = ? WHERE slug = ?`,
        )
        .run(city, s(input.region, 80), s(input.address, 300), opt(input.contactFirstName, 80), opt(input.contactLastName, 80), email, phone, now, m.slug);
    }
    const after = getMaker(ctx, m.slug)!;
    // An approved seller changed details we verified: keep selling, but ask Amartani to look again.
    if (approved && SENSITIVE.some((k) => before[k] !== after[k])) {
      ctx.db.prepare("UPDATE manufacturers SET needs_reassessment = 1 WHERE slug = ?").run(m.slug);
      const changed = SENSITIVE.filter((k) => before[k] !== after[k]).join(", ");
      addSellerMessage(ctx, m.slug, "account", actor!, `Changed after approval: ${changed}`, "internal");
      notifyAdmins(ctx, "admin_seller_changed", { maker: after.name, changed, link: `/admin/sellers/${m.slug}` });
    }
    bumpCatalog(ctx.db);
  });
}

const monogramOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** The seller attaches an uploaded document or photo to its store. (Inspection photos are added by admins in badge.ts.) */
export function addSellerFile(ctx: Ctx, actor: Actor | null, kind: FileKind, saved: { file: string; name: string }, relatedId: string | null = null) {
  if (kind === "inspection_photo") throw new MarketError("forbidden");
  const m = ownStore(ctx, actor);
  if (kind === "registration_document" && !EDITABLE.includes(m.account_status) && !isApproved(m.account_status)) throw new MarketError("invalid_state");
  tx(ctx.db, () => {
    insertSellerFile(ctx, m.slug, kind, saved, relatedId, actor!.id);
    if (kind === "logo") ctx.db.prepare("UPDATE manufacturers SET logo_file = ?, updated_at = ? WHERE slug = ?").run(saved.file, iso(ctx), m.slug);
    if (isApproved(m.account_status) && kind === "registration_document") {
      ctx.db.prepare("UPDATE manufacturers SET needs_reassessment = 1 WHERE slug = ?").run(m.slug);
      notifyAdmins(ctx, "admin_seller_changed", { maker: m.name, changed: "registration document", link: `/admin/sellers/${m.slug}` });
    }
    bumpCatalog(ctx.db);
  });
}

export function insertSellerFile(ctx: Ctx, slug: string, kind: FileKind, saved: { file: string; name: string }, relatedId: string | null, by: string) {
  const count = (ctx.db.prepare("SELECT COUNT(*) AS n FROM seller_files WHERE manufacturer_slug = ? AND kind = ? AND removed_at IS NULL").get(slug, kind) as { n: number }).n;
  if (kind === "logo") ctx.db.prepare("UPDATE seller_files SET removed_at = ? WHERE manufacturer_slug = ? AND kind = 'logo' AND removed_at IS NULL").run(iso(ctx), slug);
  else if (count >= 20) throw new MarketError("invalid_input", "too many files");
  const id = `SF-${randomBytes(6).toString("hex")}`;
  ctx.db
    .prepare("INSERT INTO seller_files (id, manufacturer_slug, kind, file, name, related_id, uploaded_by, uploaded_at) VALUES (?,?,?,?,?,?,?,?)")
    .run(id, slug, kind, saved.file, saved.name, relatedId, by, iso(ctx));
  return id;
}

/** Remove a file (kept in the database as removed, so the record of what was submitted stays). */
export function removeSellerFile(ctx: Ctx, actor: Actor | null, fileId: string) {
  const m = ownStore(ctx, actor);
  const f = ctx.db.prepare("SELECT * FROM seller_files WHERE id = ? AND manufacturer_slug = ? AND removed_at IS NULL").get(fileId, m.slug) as unknown as SellerFile | undefined;
  if (!f || f.kind === "inspection_photo") throw new MarketError("not_found");
  // A submitted registration document stays while the application is being reviewed.
  if (f.kind === "registration_document" && !EDITABLE.includes(m.account_status)) throw new MarketError("invalid_state");
  tx(ctx.db, () => {
    ctx.db.prepare("UPDATE seller_files SET removed_at = ? WHERE id = ?").run(iso(ctx), f.id);
    if (f.kind === "logo") ctx.db.prepare("UPDATE manufacturers SET logo_file = NULL WHERE slug = ? AND logo_file = ?").run(m.slug, f.file);
    bumpCatalog(ctx.db);
  });
}

/** What is still missing before the application can be submitted. */
export function missingForSubmit(ctx: Ctx, m: MakerRow): string[] {
  const missing: string[] = [];
  const files = sellerFiles(ctx, m.slug);
  if (!m.name) missing.push("name");
  if (!m.description || m.description.length < 30) missing.push("description");
  if (JSON.parse(m.categories || "[]").length === 0) missing.push("categories");
  if (!m.year_established) missing.push("yearEstablished");
  if (!m.city) missing.push("city");
  if (!m.address) missing.push("address");
  if (!m.contact_first_name || !m.contact_last_name) missing.push("contactName");
  if (!m.contact_email) missing.push("contactEmail");
  if (!m.contact_phone) missing.push("contactPhone");
  if (m.seller_type === "company") {
    if (!m.registration_number) missing.push("registrationNumber");
    if (!files.some((f) => f.kind === "registration_document")) missing.push("registrationDocument");
  } else if (!files.some((f) => f.kind === "workshop_photo" || f.kind === "product_photo")) missing.push("photos");
  return missing;
}

export function submitApplication(ctx: Ctx, actor: Actor | null) {
  const m = ownStore(ctx, actor);
  if (m.account_status !== "draft" && m.account_status !== "info_required") throw new MarketError("invalid_state");
  if (missingForSubmit(ctx, m).length) throw new MarketError("invalid_input", "incomplete application");
  tx(ctx.db, () => {
    const resubmit = m.account_status === "info_required";
    ctx.db.prepare("UPDATE manufacturers SET submitted_at = COALESCE(submitted_at, ?) WHERE slug = ?").run(iso(ctx), m.slug);
    setAccountStatus(ctx, m, "pending_review", actor!.id, resubmit ? "Updated after a request for information" : null);
    notifyAdmins(ctx, resubmit ? "admin_application_updated" : "admin_application_submitted", { maker: m.name, type: m.seller_type, link: `/admin/sellers/${m.slug}` });
  });
}

/** The seller answers a request for more information (and can then resubmit). */
export function sellerReply(ctx: Ctx, actor: Actor | null, track: "account" | "badge", body: unknown) {
  const m = ownStore(ctx, actor);
  const text = s(body, 3000);
  if (!text) throw new MarketError("invalid_input");
  tx(ctx.db, () => {
    addSellerMessage(ctx, m.slug, track, actor!, text, "seller");
    notifyAdmins(ctx, "admin_seller_message", { maker: m.name, link: `/admin/sellers/${m.slug}${track === "badge" ? "/verification" : ""}` });
  });
}

/* ------------------------------------------------------------------ */
/* Admin: review applications                                           */
/* ------------------------------------------------------------------ */

const ADMIN_MOVES: Record<string, { from: AccountStatus[]; to: AccountStatus; needsReason: boolean; notice: string | null }> = {
  startReview: { from: ["pending_review"], to: "under_review", needsReason: false, notice: "seller_under_review" },
  requestInfo: { from: ["pending_review", "under_review"], to: "info_required", needsReason: true, notice: "seller_info_required" },
  approveCompany: { from: ["pending_review", "under_review"], to: "approved_company", needsReason: false, notice: "seller_approved" },
  approveIndependent: { from: ["pending_review", "under_review"], to: "approved_independent", needsReason: false, notice: "seller_approved" },
  reject: { from: ["pending_review", "under_review", "info_required"], to: "rejected", needsReason: true, notice: "seller_rejected" },
  suspend: { from: ["approved_company", "approved_independent"], to: "suspended", needsReason: true, notice: "seller_suspended" },
};

export function adminSellerDecision(ctx: Ctx, actor: Actor | null, slug: string, move: string, reason: unknown) {
  const admin = requireAdmin(actor);
  const m = getMaker(ctx, slug);
  if (!m) throw new MarketError("not_found");
  const why = s(reason, 2000) || null;
  tx(ctx.db, () => {
    if (move === "reactivate") {
      if (m.account_status !== "suspended") throw new MarketError("invalid_state");
      // Back to the approval it had before the suspension.
      const prev = (ctx.db
        .prepare("SELECT to_status FROM seller_status_history WHERE manufacturer_slug = ? AND track = 'account' AND to_status LIKE 'approved_%' ORDER BY id DESC LIMIT 1")
        .get(slug) as { to_status: AccountStatus } | undefined)?.to_status ?? (m.seller_type === "company" ? "approved_company" : "approved_independent");
      setAccountStatus(ctx, m, prev, admin.id, why);
      if (why) addSellerMessage(ctx, slug, "account", admin, why, "seller", "decision");
      if (m.owner_user_id) notifyUser(ctx, m.owner_user_id, "seller_reactivated", { link: "/seller" });
      adminAction(ctx, admin.id, "seller_reactivate", "manufacturer", slug, why);
      return;
    }
    const rule = ADMIN_MOVES[move];
    if (!rule) throw new MarketError("invalid_input");
    if (!rule.from.includes(m.account_status as AccountStatus)) throw new MarketError("invalid_state");
    if (rule.needsReason && !why) throw new MarketError("invalid_input", "reason required");
    setAccountStatus(ctx, m, rule.to, admin.id, why);
    if (rule.to.startsWith("approved_")) ctx.db.prepare("UPDATE manufacturers SET approved_at = ?, needs_reassessment = 0 WHERE slug = ?").run(iso(ctx), slug);
    if (why) addSellerMessage(ctx, slug, "account", admin, why, "seller", move === "requestInfo" ? "info_request" : "decision");
    if (rule.notice && m.owner_user_id) notifyUser(ctx, m.owner_user_id, rule.notice, { reason: why ?? "", link: "/seller/application" });
    adminAction(ctx, admin.id, `seller_${move}`, "manufacturer", slug, why);
  });
}

/** An internal note (never shown to the seller) or a message to the applicant. */
export function adminSellerMessage(ctx: Ctx, actor: Actor | null, slug: string, track: "account" | "badge", body: unknown, internal: boolean) {
  const admin = requireAdmin(actor);
  const m = getMaker(ctx, slug);
  if (!m) throw new MarketError("not_found");
  const text = s(body, 3000);
  if (!text) throw new MarketError("invalid_input");
  tx(ctx.db, () => {
    addSellerMessage(ctx, slug, track, admin, text, internal ? "internal" : "seller");
    if (!internal && m.owner_user_id) notifyUser(ctx, m.owner_user_id, "seller_message", { link: track === "badge" ? "/seller/verification" : "/seller/application" });
  });
}

export function adminClearReassessment(ctx: Ctx, actor: Actor | null, slug: string) {
  const admin = requireAdmin(actor);
  const r = ctx.db.prepare("UPDATE manufacturers SET needs_reassessment = 0 WHERE slug = ?").run(slug);
  if (!r.changes) throw new MarketError("not_found");
  adminAction(ctx, admin.id, "seller_reviewed_changes", "manufacturer", slug, null);
}

export function adminSellerList(ctx: Ctx, actor: Actor | null, filter?: string) {
  requireAdmin(actor);
  const rows = ctx.db
    .prepare(
      `SELECT m.*, u.email AS owner_email, (SELECT COUNT(*) FROM products p WHERE p.manufacturer_slug = m.slug AND p.status = 'published') AS published
       FROM manufacturers m LEFT JOIN users u ON u.id = m.owner_user_id ORDER BY
       CASE m.account_status WHEN 'pending_review' THEN 0 WHEN 'under_review' THEN 1 WHEN 'info_required' THEN 2 WHEN 'draft' THEN 3 ELSE 4 END, m.updated_at DESC`,
    )
    .all() as unknown as (MakerRow & { owner_email: string | null; published: number })[];
  if (!filter || filter === "all") return rows;
  if (filter === "open") return rows.filter((r) => ["pending_review", "under_review", "info_required"].includes(r.account_status) || r.needs_reassessment);
  if (filter === "approved") return rows.filter((r) => isApproved(r.account_status));
  return rows.filter((r) => r.account_status === filter);
}
