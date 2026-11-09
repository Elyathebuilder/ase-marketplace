/**
 * The Verified Manufacturer badge (server only).
 *
 * Separate from seller approval: an approved seller (company or independent) may request it, and only
 * an admin can award it, after reviewing the information and completing an inspection appropriate to
 * the manufacturer's size. It is never given automatically: not for being registered, uploading a
 * document, or being approved to sell. Every step is kept in the history.
 */
import { randomBytes } from "node:crypto";
import { adminAction } from "./accounts";
import { bumpCatalog, isApproved, type MakerRow } from "./catalog-store";
import { tx } from "./db";
import { addSellerMessage, categoryList, getMaker, insertSellerFile, notifyAdmins, notifyUser, ownStore, requireAdmin } from "./sellers";
import type { Ctx } from "./service";
import { MarketError, type Actor } from "./types";

export const BADGE_STATUSES = ["not_requested", "submitted", "under_review", "inspection_scheduled", "inspection_completed", "info_required", "verified", "rejected", "revoked"] as const;
export type BadgeStatus = (typeof BADGE_STATUSES)[number];
const OPEN: BadgeStatus[] = ["submitted", "under_review", "inspection_scheduled", "inspection_completed", "info_required"];

/** Inspection checklist. Each item: confirmed, not confirmed, or not applicable at this scale. */
export const CHECKLIST = [
  "location_verified",
  "identity_verified",
  "manufacturing_confirmed",
  "environment_inspected",
  "safety_assessed",
  "capabilities_assessed",
  "quality_control_reviewed",
  "product_quality_inspected",
  "information_confirmed",
] as const;
export type ChecklistKey = (typeof CHECKLIST)[number];
export type ChecklistResult = "yes" | "no" | "na" | "";
export type Checklist = Partial<Record<ChecklistKey, { result: ChecklistResult; note: string }>> & { concerns?: string };

/** Items that are usually not applicable for a small home-based maker (an admin can still assess them). */
export const LIGHTER_FOR_HOME: ChecklistKey[] = ["capabilities_assessed", "quality_control_reviewed"];

export interface BadgeRequestRow {
  id: string;
  manufacturer_slug: string;
  status: BadgeStatus | "withdrawn";
  reason: "seller_request" | "reassessment";
  details: string;
  created_at: string;
  created_by: string;
  submitted_at: string | null;
  decided_at: string | null;
  decided_by: string | null;
  decided_by_name?: string | null;
  decision_reason: string | null;
}

export interface InspectionRow {
  id: string;
  request_id: string;
  manufacturer_slug: string;
  scale: "home" | "workshop" | "factory";
  scheduled_for: string | null;
  visited_at: string | null;
  inspector_id: string | null;
  inspector_name?: string | null;
  checklist: string;
  summary: string | null;
  recommendation: "approve" | "reject" | "more_info" | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface BadgeDetails {
  name: string;
  location: string;
  activities: string;
  categories: string[];
  capacity: string;
  contact: string;
  extra: string;
}

const iso = (ctx: Ctx) => ctx.now().toISOString();
const text = (v: unknown, max: number) => {
  const x = typeof v === "string" ? v.trim() : "";
  if (x.length > max) throw new MarketError("invalid_input", "too long");
  return x;
};

export const badgeRequests = (ctx: Ctx, slug: string) =>
  ctx.db
    .prepare("SELECT r.*, u.name AS decided_by_name FROM badge_requests r LEFT JOIN users u ON u.id = r.decided_by WHERE r.manufacturer_slug = ? ORDER BY r.created_at DESC, r.id DESC")
    .all(slug) as unknown as BadgeRequestRow[];

/** The request being worked on (if any). */
export const openRequest = (ctx: Ctx, slug: string) => badgeRequests(ctx, slug).find((r) => OPEN.includes(r.status as BadgeStatus));

export const inspectionOf = (ctx: Ctx, requestId: string) =>
  ctx.db.prepare("SELECT i.*, u.name AS inspector_name FROM inspections i LEFT JOIN users u ON u.id = i.inspector_id WHERE i.request_id = ?").get(requestId) as unknown as InspectionRow | undefined;

export const parseChecklist = (raw: string | null | undefined): Checklist => {
  try {
    return JSON.parse(raw || "{}") as Checklist;
  } catch {
    return {};
  }
};

function setBadge(ctx: Ctx, m: MakerRow, req: BadgeRequestRow | null, to: BadgeStatus, by: string, reason?: string | null, keepPublicBadge = false) {
  if (req) {
    ctx.db.prepare("UPDATE badge_requests SET status = ? WHERE id = ?").run(to, req.id);
    req.status = to;
  }
  // During a reassessment of a verified manufacturer, the public badge stays until a decision is made.
  const publicStatus = keepPublicBadge ? m.badge_status : to;
  if (publicStatus !== m.badge_status || !keepPublicBadge) {
    ctx.db.prepare("UPDATE manufacturers SET badge_status = ?, updated_at = ? WHERE slug = ?").run(publicStatus, iso(ctx), m.slug);
  }
  ctx.db
    .prepare("INSERT INTO seller_status_history (manufacturer_slug, track, from_status, to_status, at, by_user, reason) VALUES (?,?,?,?,?,?,?)")
    .run(m.slug, "badge", m.badge_status, to, iso(ctx), by, reason ?? null);
  m.badge_status = publicStatus;
  bumpCatalog(ctx.db);
}

/* ------------------------------------------------------------------ */
/* Seller                                                               */
/* ------------------------------------------------------------------ */

export function requestBadge(ctx: Ctx, actor: Actor | null, input: Partial<Record<keyof BadgeDetails, unknown>>, files: { kind: "badge_document" | "workshop_photo"; saved: { file: string; name: string } }[] = []) {
  const m = ownStore(ctx, actor);
  if (!isApproved(m.account_status)) throw new MarketError("seller_not_approved");
  const open = openRequest(ctx, m.slug);
  if (open && open.status !== "info_required") throw new MarketError("invalid_state");
  if (m.badge_status === "verified" && !open) throw new MarketError("invalid_state");
  const details: BadgeDetails = {
    name: text(input.name, 120) || m.name,
    location: text(input.location, 300),
    activities: text(input.activities, 3000),
    categories: categoryList(input.categories),
    capacity: text(input.capacity, 1000),
    contact: text(input.contact, 300),
    extra: text(input.extra, 3000),
  };
  if (!details.location || details.activities.length < 30 || !details.capacity || !details.contact || details.categories.length === 0) throw new MarketError("invalid_input", "incomplete request");
  tx(ctx.db, () => {
    let req = open;
    if (req) {
      // Answering "additional information required": update the same request and send it back.
      ctx.db.prepare("UPDATE badge_requests SET details = ?, submitted_at = ? WHERE id = ?").run(JSON.stringify(details), iso(ctx), req.id);
      setBadge(ctx, m, req, "submitted", actor!.id, "Updated with the requested information", req.reason === "reassessment");
    } else {
      const id = `VR-${randomBytes(5).toString("hex")}`;
      ctx.db
        .prepare("INSERT INTO badge_requests (id, manufacturer_slug, status, reason, details, created_at, created_by, submitted_at) VALUES (?,?,?,?,?,?,?,?)")
        .run(id, m.slug, "submitted", "seller_request", JSON.stringify(details), iso(ctx), actor!.id, iso(ctx));
      req = badgeRequests(ctx, m.slug).find((r) => r.id === id)!;
      setBadge(ctx, m, null, "submitted", actor!.id, null);
    }
    for (const f of files) insertSellerFile(ctx, m.slug, f.kind, f.saved, req.id, actor!.id);
    notifyAdmins(ctx, "admin_badge_requested", { maker: m.name, link: `/admin/sellers/${m.slug}/verification` });
  });
}

export function withdrawBadgeRequest(ctx: Ctx, actor: Actor | null) {
  const m = ownStore(ctx, actor);
  const req = openRequest(ctx, m.slug);
  if (!req || req.reason === "reassessment") throw new MarketError("invalid_state");
  tx(ctx.db, () => {
    ctx.db.prepare("UPDATE badge_requests SET status = 'withdrawn', decided_at = ? WHERE id = ?").run(iso(ctx), req.id);
    setBadge(ctx, m, null, "not_requested", actor!.id, "Withdrawn by the seller");
  });
}

/* ------------------------------------------------------------------ */
/* Admin                                                                */
/* ------------------------------------------------------------------ */

function adminCtx(ctx: Ctx, actor: Actor | null, slug: string) {
  const admin = requireAdmin(actor);
  const m = getMaker(ctx, slug);
  if (!m) throw new MarketError("not_found");
  return { admin, m, req: openRequest(ctx, slug) };
}

const notifySeller = (ctx: Ctx, m: MakerRow, kind: string, reason?: string | null) => {
  if (m.owner_user_id) notifyUser(ctx, m.owner_user_id, kind, { reason: reason ?? "", link: "/seller/verification" });
};

export function badgeStartReview(ctx: Ctx, actor: Actor | null, slug: string) {
  const { admin, m, req } = adminCtx(ctx, actor, slug);
  if (!req || req.status !== "submitted") throw new MarketError("invalid_state");
  tx(ctx.db, () => {
    setBadge(ctx, m, req, "under_review", admin.id, null, req.reason === "reassessment");
    notifySeller(ctx, m, "badge_under_review");
  });
}

export function badgeScheduleInspection(ctx: Ctx, actor: Actor | null, slug: string, input: { date: unknown; scale: unknown; note?: unknown }) {
  const { admin, m, req } = adminCtx(ctx, actor, slug);
  if (!req || !["submitted", "under_review", "info_required", "inspection_scheduled"].includes(req.status)) throw new MarketError("invalid_state");
  const date = text(input.date, 25);
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(date)) throw new MarketError("invalid_input", "date");
  const scale = input.scale === "home" || input.scale === "factory" ? input.scale : "workshop";
  const note = text(input.note, 1000) || null;
  tx(ctx.db, () => {
    const existing = inspectionOf(ctx, req.id);
    if (existing) ctx.db.prepare("UPDATE inspections SET scheduled_for = ?, scale = ?, inspector_id = ?, updated_at = ? WHERE id = ?").run(date, scale, admin.id, iso(ctx), existing.id);
    else
      ctx.db
        .prepare("INSERT INTO inspections (id, request_id, manufacturer_slug, scale, scheduled_for, inspector_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)")
        .run(`IN-${randomBytes(5).toString("hex")}`, req.id, slug, scale, date, admin.id, iso(ctx), iso(ctx));
    setBadge(ctx, m, req, "inspection_scheduled", admin.id, `${date}${note ? ` — ${note}` : ""}`, req.reason === "reassessment");
    if (note) addSellerMessage(ctx, slug, "badge", admin, note, "seller");
    notifySeller(ctx, m, "badge_inspection_scheduled", date.replace("T", " "));
  });
}

/** Save the checklist (can be filled in during the visit and saved several times); `complete` finishes the inspection. */
export function badgeRecordInspection(
  ctx: Ctx,
  actor: Actor | null,
  slug: string,
  input: { checklist: Checklist; summary: unknown; recommendation: unknown; visitedAt: unknown; scale: unknown; complete: boolean },
  photos: { file: string; name: string }[] = [],
) {
  const { admin, m, req } = adminCtx(ctx, actor, slug);
  if (!req || !["inspection_scheduled", "inspection_completed", "under_review"].includes(req.status)) throw new MarketError("invalid_state");
  const checklist: Checklist = {};
  for (const k of CHECKLIST) {
    const item = input.checklist[k];
    const result: ChecklistResult = item && ["yes", "no", "na"].includes(item.result) ? item.result : "";
    checklist[k] = { result, note: text(item?.note, 1000) };
  }
  checklist.concerns = text(input.checklist.concerns, 3000);
  const summary = text(input.summary, 3000) || null;
  const recommendation = input.recommendation === "approve" || input.recommendation === "reject" || input.recommendation === "more_info" ? input.recommendation : null;
  const visited = text(input.visitedAt, 25) || null;
  if (visited && !/^\d{4}-\d{2}-\d{2}/.test(visited)) throw new MarketError("invalid_input", "date");
  const scale = input.scale === "home" || input.scale === "factory" ? input.scale : "workshop";
  if (input.complete) {
    // A finished inspection has a visit date, an answer for every item, a summary and a recommendation.
    if (!visited || !summary || !recommendation || CHECKLIST.some((k) => !checklist[k]?.result)) throw new MarketError("invalid_input", "incomplete inspection");
  }
  tx(ctx.db, () => {
    let ins = inspectionOf(ctx, req.id);
    if (!ins) {
      ctx.db
        .prepare("INSERT INTO inspections (id, request_id, manufacturer_slug, scale, inspector_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?)")
        .run(`IN-${randomBytes(5).toString("hex")}`, req.id, slug, scale, admin.id, iso(ctx), iso(ctx));
      ins = inspectionOf(ctx, req.id)!;
    }
    ctx.db
      .prepare("UPDATE inspections SET checklist = ?, summary = ?, recommendation = ?, visited_at = ?, scale = ?, inspector_id = ?, updated_at = ?, completed_at = ? WHERE id = ?")
      .run(JSON.stringify(checklist), summary, recommendation, visited, scale, admin.id, iso(ctx), input.complete ? iso(ctx) : ins.completed_at, ins.id);
    for (const p of photos) insertSellerFile(ctx, slug, "inspection_photo", p, ins.id, admin.id);
    if (input.complete && req.status !== "inspection_completed") {
      setBadge(ctx, m, req, "inspection_completed", admin.id, summary, req.reason === "reassessment");
      notifySeller(ctx, m, "badge_inspection_completed");
    }
  });
}

export function badgeRequestInfo(ctx: Ctx, actor: Actor | null, slug: string, body: unknown) {
  const { admin, m, req } = adminCtx(ctx, actor, slug);
  if (!req || req.status === "info_required") throw new MarketError("invalid_state");
  const why = text(body, 3000);
  if (!why) throw new MarketError("invalid_input");
  tx(ctx.db, () => {
    setBadge(ctx, m, req, "info_required", admin.id, why, req.reason === "reassessment");
    addSellerMessage(ctx, slug, "badge", admin, why, "seller", "info_request");
    notifySeller(ctx, m, "badge_info_required", why);
  });
}

/** Award the badge. Only after a completed inspection, with the reason recorded. */
export function badgeApprove(ctx: Ctx, actor: Actor | null, slug: string, reason: unknown) {
  const { admin, m, req } = adminCtx(ctx, actor, slug);
  if (!req || req.status !== "inspection_completed") throw new MarketError("invalid_state");
  if (!isApproved(m.account_status)) throw new MarketError("seller_not_approved");
  const ins = inspectionOf(ctx, req.id);
  if (!ins?.completed_at) throw new MarketError("invalid_state");
  const why = text(reason, 2000);
  if (!why) throw new MarketError("invalid_input", "reason required");
  tx(ctx.db, () => {
    ctx.db.prepare("UPDATE badge_requests SET decided_at = ?, decided_by = ?, decision_reason = ? WHERE id = ?").run(iso(ctx), admin.id, why, req.id);
    setBadge(ctx, m, req, "verified", admin.id, why);
    ctx.db.prepare("UPDATE manufacturers SET verified_at = ? WHERE slug = ?").run(iso(ctx), slug);
    addSellerMessage(ctx, slug, "badge", admin, why, "seller", "decision");
    notifySeller(ctx, m, "badge_verified");
    adminAction(ctx, admin.id, "badge_award", "manufacturer", slug, why);
  });
}

export function badgeReject(ctx: Ctx, actor: Actor | null, slug: string, reason: unknown) {
  const { admin, m, req } = adminCtx(ctx, actor, slug);
  if (!req) throw new MarketError("invalid_state");
  const why = text(reason, 2000);
  if (!why) throw new MarketError("invalid_input", "reason required");
  tx(ctx.db, () => {
    ctx.db.prepare("UPDATE badge_requests SET decided_at = ?, decided_by = ?, decision_reason = ? WHERE id = ?").run(iso(ctx), admin.id, why, req.id);
    // A failed reassessment removes an existing badge.
    setBadge(ctx, m, req, req.reason === "reassessment" && m.badge_status === "verified" ? "revoked" : "rejected", admin.id, why);
    addSellerMessage(ctx, slug, "badge", admin, why, "seller", "decision");
    notifySeller(ctx, m, "badge_rejected", why);
    adminAction(ctx, admin.id, "badge_reject", "manufacturer", slug, why);
  });
}

/** Suspend or revoke an awarded badge. */
export function badgeRevoke(ctx: Ctx, actor: Actor | null, slug: string, reason: unknown) {
  const { admin, m } = adminCtx(ctx, actor, slug);
  if (m.badge_status !== "verified") throw new MarketError("invalid_state");
  const why = text(reason, 2000);
  if (!why) throw new MarketError("invalid_input", "reason required");
  tx(ctx.db, () => {
    const req = badgeRequests(ctx, slug).find((r) => r.status === "verified") ?? null;
    if (req) ctx.db.prepare("UPDATE badge_requests SET status = 'revoked' WHERE id = ?").run(req.id);
    const open = openRequest(ctx, slug);
    if (open) ctx.db.prepare("UPDATE badge_requests SET status = 'withdrawn', decided_at = ?, decided_by = ?, decision_reason = ? WHERE id = ?").run(iso(ctx), admin.id, why, open.id);
    setBadge(ctx, m, null, "revoked", admin.id, why);
    addSellerMessage(ctx, slug, "badge", admin, why, "seller", "decision");
    notifySeller(ctx, m, "badge_revoked", why);
    adminAction(ctx, admin.id, "badge_revoke", "manufacturer", slug, why);
  });
}

/** Ask for a new review or inspection (for example after a move or a change of ownership). The current badge stays until decided. */
export function badgeRequestReassessment(ctx: Ctx, actor: Actor | null, slug: string, reason: unknown) {
  const { admin, m, req } = adminCtx(ctx, actor, slug);
  if (req) throw new MarketError("invalid_state");
  if (!isApproved(m.account_status)) throw new MarketError("seller_not_approved");
  const why = text(reason, 2000);
  if (!why) throw new MarketError("invalid_input", "reason required");
  const last = badgeRequests(ctx, slug)[0];
  tx(ctx.db, () => {
    const id = `VR-${randomBytes(5).toString("hex")}`;
    ctx.db
      .prepare("INSERT INTO badge_requests (id, manufacturer_slug, status, reason, details, created_at, created_by, submitted_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(id, slug, "under_review", "reassessment", last?.details ?? "{}", iso(ctx), admin.id, iso(ctx));
    const created = badgeRequests(ctx, slug).find((r) => r.id === id)!;
    setBadge(ctx, m, created, "under_review", admin.id, why, m.badge_status === "verified");
    addSellerMessage(ctx, slug, "badge", admin, why, "seller", "info_request");
    notifySeller(ctx, m, "badge_reassessment", why);
    adminAction(ctx, admin.id, "badge_reassessment", "manufacturer", slug, why);
  });
}

export function adminBadgeQueue(ctx: Ctx, actor: Actor | null) {
  requireAdmin(actor);
  return ctx.db
    .prepare(
      `SELECT r.*, m.name AS maker_name, m.seller_type, m.city, m.badge_status AS public_status FROM badge_requests r JOIN manufacturers m ON m.slug = r.manufacturer_slug
       WHERE r.status IN ('submitted','under_review','inspection_scheduled','inspection_completed','info_required') ORDER BY r.submitted_at`,
    )
    .all() as unknown as (BadgeRequestRow & { maker_name: string; seller_type: string; city: string; public_status: string })[];
}
