/**
 * What each role is allowed to read. Every function checks the actor first:
 * - a customer reads only their own orders, and never internal notes, payouts or commission;
 * - a manufacturer reads only its own part of each order and its own payouts;
 * - an admin reads everything.
 */
import { TEST_BANK, getSettings } from "./settings";
import {
  amountDue,
  fulfillmentsOf,
  getOrder,
  ledgerSum,
  orderMessages,
  paymentsOf,
  type Ctx,
  type FulfillmentRow,
  type OrderRow,
  type PaymentRow,
  type PayoutRow,
  type RefundRow,
} from "./service";
import { MarketError, type Actor } from "./types";

export interface ItemRow {
  id: number;
  order_id: string;
  fulfillment_id: string;
  product_slug: string;
  product_name: string;
  unit: string;
  unit_price_tetri: number;
  qty: number;
  line_tetri: number;
  manufacturer_slug: string | null;
  manufacturer_name: string | null;
  /** "retail" or "wholesale": which price the customer got. Older orders have none. */
  pricing: string | null;
  /** JSON: the product as it was when ordered (see productSnapshot in service.ts). */
  snapshot: string | null;
}

export interface ItemSnapshot {
  name?: string;
  nameKa?: string | null;
  specs?: Record<string, string>;
  materials?: string[];
  image?: string | null;
  options?: Record<string, string>;
  dimensionsCm?: (number | null)[];
  weightKg?: number | null;
}

export function itemSnapshot(i: ItemRow): ItemSnapshot {
  try {
    return i.snapshot ? (JSON.parse(i.snapshot) as ItemSnapshot) : {};
  } catch {
    return {};
  }
}

export interface HistoryRow {
  id: number;
  order_id: string;
  entity: "order" | "fulfillment" | "payment" | "payout" | "refund";
  entity_id: string;
  from_status: string | null;
  to_status: string;
  at: string;
  by_user: string;
  by_name?: string;
  by_role?: string;
  note: string | null;
}

export interface LedgerRow {
  id: number;
  order_id: string;
  fulfillment_id: string | null;
  manufacturer_slug: string | null;
  kind: string;
  amount_tetri: number;
  bank_reference: string | null;
  note: string | null;
  adjusts_entry_id: number | null;
  created_at: string;
  created_by: string;
  created_by_name?: string;
}

export interface NotificationRow {
  id: number;
  user_id: string;
  kind: string;
  order_id: string | null;
  fulfillment_id: string | null;
  params: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
}

const isAdmin = (a: Actor | null): a is Actor => !!a && a.role === "admin";
function requireAdmin(a: Actor | null): Actor {
  if (!isAdmin(a)) throw new MarketError("forbidden");
  return a;
}

const itemsOf = (ctx: Ctx, orderId: string) => ctx.db.prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id").all(orderId) as unknown as ItemRow[];
const payoutOf = (ctx: Ctx, fid: string) => ctx.db.prepare("SELECT * FROM payouts WHERE fulfillment_id = ?").get(fid) as unknown as PayoutRow | undefined;
const refundsOf = (ctx: Ctx, orderId: string) => ctx.db.prepare("SELECT * FROM refunds WHERE order_id = ? ORDER BY created_at, id").all(orderId) as unknown as RefundRow[];
const userName = (ctx: Ctx, id: string | null) => (id ? ((ctx.db.prepare("SELECT name FROM users WHERE id = ?").get(id) as { name: string } | undefined)?.name ?? id) : null);

function historyOf(ctx: Ctx, orderId: string, entities: HistoryRow["entity"][]) {
  const rows = ctx.db
    .prepare(
      `SELECT h.*, u.name AS by_name, u.role AS by_role FROM status_history h LEFT JOIN users u ON u.id = h.by_user
       WHERE h.order_id = ? AND h.entity IN (${entities.map(() => "?").join(",")}) ORDER BY h.id`,
    )
    .all(orderId, ...entities) as unknown as HistoryRow[];
  return rows;
}

/* ------------------------------------------------------------------ */
/* Customer                                                             */
/* ------------------------------------------------------------------ */

export function customerOrders(ctx: Ctx, actor: Actor | null) {
  if (!actor || actor.role !== "customer") throw new MarketError("forbidden");
  return ctx.db.prepare("SELECT * FROM orders WHERE customer_id = ? ORDER BY number DESC").all(actor.id) as unknown as OrderRow[];
}

/** The customer's one unified view of an order. Internal notes, commission and payouts are left out. */
export function customerOrder(ctx: Ctx, actor: Actor | null, orderId: string) {
  if (!actor || actor.role !== "customer") throw new MarketError("forbidden");
  const order = getOrder(ctx, orderId);
  // Someone else's order looks the same as a missing one.
  if (!order || order.customer_id !== actor.id) throw new MarketError("not_found");
  const s = getSettings(ctx);
  const items = itemsOf(ctx, orderId);
  const shipments = fulfillmentsOf(ctx, orderId).map((f) => ({
    id: f.id,
    manufacturer: f.manufacturer_slug,
    status: f.status,
    goods: f.goods_tetri,
    delivery: f.delivery_tetri,
    rejectReason: f.reject_reason,
    items: items.filter((i) => i.fulfillment_id === f.id),
  }));
  const payments = paymentsOf(ctx, orderId).map((p) => ({
    id: p.id,
    status: p.status,
    expected: p.expected_tetri,
    reported: p.reported_tetri,
    reportedDate: p.reported_date,
    reference: p.reference,
    receiptName: p.receipt_name,
    receiptFile: p.receipt_file,
    submittedAt: p.submitted_at,
    received: p.received_tetri,
    verifiedAt: p.verified_at,
  }));
  const refunds = refundsOf(ctx, orderId).map((r) => ({ id: r.id, amount: r.amount_tetri, reason: r.reason, status: r.status, reference: r.reference, date: r.transfer_date }));
  const history = historyOf(ctx, orderId, ["order", "fulfillment", "refund"]).map((h) => ({ ...h, by_name: undefined, by_user: "" }));
  // The customer doesn't see the platform's commission or internal hold notes.
  const { commission_bps: _c, commission_base: _b, hold_reason: _h, ...publicOrder } = order;
  void _c;
  void _b;
  void _h;
  return {
    order: publicOrder,
    shipments,
    payments,
    refunds,
    history,
    received: ledgerSum(ctx, orderId, "customer_payment"),
    refunded: ledgerSum(ctx, orderId, "refund_paid"),
    due: amountDue(ctx, order),
    // A TEST order never shows a real bank account, so nobody transfers real money for it.
    bank: order.is_test ? TEST_BANK : { holder: s.bankAccountHolder, bank: s.bankName, iban: s.bankIban, swift: s.bankSwift },
    isTest: order.is_test === 1,
  };
}

/* ------------------------------------------------------------------ */
/* Manufacturer                                                         */
/* ------------------------------------------------------------------ */

function requireMaker(a: Actor | null): Actor & { manufacturerSlug: string } {
  if (!a || a.role !== "manufacturer" || !a.manufacturerSlug) throw new MarketError("forbidden");
  return a as Actor & { manufacturerSlug: string };
}

/** Where the money stands, as the seller sees it. Only an administrator's actions move it forward. */
export type SellerPaymentStage = "awaiting_customer" | "customer_submitted" | "verified" | "approved_for_preparation" | "payout_pending" | "paid" | "settled";

function sellerPaymentStage(ctx: Ctx, order: OrderRow, f: FulfillmentRow, po: PayoutRow | undefined): SellerPaymentStage | null {
  if (order.status === "cancelled" || order.status === "refunded" || f.status === "rejected" || f.status === "cancelled") return null;
  if (ledgerSum(ctx, order.id, "customer_payment") < order.total_tetri)
    return paymentsOf(ctx, order.id).some((p) => p.status === "submitted" || p.status === "verification_pending") ? "customer_submitted" : "awaiting_customer";
  if (po?.status === "transfer_completed") return order.status === "completed" ? "settled" : "paid";
  if (po && po.status !== "not_eligible") return "payout_pending";
  return f.status === "new" ? "verified" : "approved_for_preparation";
}

/** What a manufacturer sees of one order: its own shipment only, and only what it needs to prepare it. */
function makerView(ctx: Ctx, f: FulfillmentRow) {
  const order = getOrder(ctx, f.order_id)!;
  const po = payoutOf(ctx, f.id);
  return {
    paymentStage: sellerPaymentStage(ctx, order, f, po),
    orderStatus: order.status,
    disputed: order.hold_kind === "dispute",
    messages: orderMessages(ctx, f.id),
    id: f.id,
    orderNumber: order.id,
    isTest: order.is_test === 1,
    placedAt: order.created_at,
    status: f.status,
    orderCancelled: order.status === "cancelled" || order.status === "refunded",
    paymentConfirmed: ledgerSum(ctx, order.id, "customer_payment") >= order.total_tetri,
    prepareBy: f.prepare_by,
    rejectReason: f.reject_reason,
    // Amartani collects and delivers, so the manufacturer gets the name, city and any note, not the full address.
    customer: { name: order.delivery_name, city: order.delivery_city, note: order.delivery_note },
    deliveryMethod: "amartani" as const,
    items: ctx.db.prepare("SELECT * FROM order_items WHERE fulfillment_id = ? ORDER BY id").all(f.id) as unknown as ItemRow[],
    goods: f.goods_tetri,
    commissionBps: order.commission_bps,
    commissionBase: order.commission_base,
    commission: f.commission_tetri,
    payable: f.payable_tetri,
    payout: po
      ? { id: po.id, status: po.status, reference: po.status === "transfer_completed" || po.status === "transfer_initiated" ? po.transfer_reference : null, date: po.transfer_date, holdReason: po.hold_reason }
      : null,
    history: historyOf(ctx, order.id, ["fulfillment", "payout"])
      .filter((h) => h.entity_id === f.id || h.entity_id === po?.id)
      .map((h) => ({ ...h, by_name: undefined })),
  };
}
export type MakerOrder = ReturnType<typeof makerView>;

export function makerOrders(ctx: Ctx, actor: Actor | null): MakerOrder[] {
  const m = requireMaker(actor);
  const rows = ctx.db
    .prepare("SELECT f.* FROM fulfillments f JOIN orders o ON o.id = f.order_id WHERE f.manufacturer_slug = ? ORDER BY o.number DESC")
    .all(m.manufacturerSlug) as unknown as FulfillmentRow[];
  return rows.map((f) => makerView(ctx, f));
}

export function makerOrder(ctx: Ctx, actor: Actor | null, fulfillmentId: string): MakerOrder {
  const m = requireMaker(actor);
  const f = ctx.db.prepare("SELECT * FROM fulfillments WHERE id = ?").get(fulfillmentId) as unknown as FulfillmentRow | undefined;
  if (!f || f.manufacturer_slug !== m.manufacturerSlug) throw new MarketError("not_found");
  return makerView(ctx, f);
}

/** The manufacturer's own settlement figures. Nothing about other manufacturers or Amartani's account. */
export function makerFinance(ctx: Ctx, actor: Actor | null) {
  const m = requireMaker(actor);
  const sum = (kind: string) =>
    (ctx.db.prepare("SELECT COALESCE(SUM(amount_tetri),0) AS s FROM ledger_entries WHERE manufacturer_slug = ? AND kind = ?").get(m.manufacturerSlug, kind) as { s: number }).s;
  const orders = makerOrders(ctx, actor).filter((o) => o.payout && o.status !== "awaiting_payment");
  const by = (statuses: string[]) => orders.filter((o) => statuses.includes(o.payout!.status) && o.status !== "rejected" && o.status !== "cancelled").reduce((s, o) => s + o.payable, 0);
  const bank = ctx.db.prepare("SELECT * FROM manufacturer_bank_accounts WHERE manufacturer_slug = ?").get(m.manufacturerSlug) as
    | { account_holder: string; bank_name: string; iban: string }
    | undefined;
  return {
    sales: orders.filter((o) => o.status !== "rejected" && o.status !== "cancelled").reduce((s, o) => s + o.goods, 0),
    commission: sum("commission"),
    payable: sum("manufacturer_payable"),
    transferred: sum("manufacturer_payout"),
    notYetEligible: by(["not_eligible"]),
    awaiting: by(["eligible", "authorized", "transfer_initiated", "transfer_failed"]),
    onHold: by(["on_hold"]),
    orders,
    bank,
  };
}

/* ------------------------------------------------------------------ */
/* Admin                                                                */
/* ------------------------------------------------------------------ */

export interface AdminPaymentRow extends PaymentRow {
  customer_name: string;
  is_test: number;
  order_total: number;
  verified_by_name: string | null;
}

export function adminPayments(ctx: Ctx, actor: Actor | null, status?: string) {
  requireAdmin(actor);
  const rows = ctx.db
    .prepare(
      `SELECT p.*, u.name AS customer_name, o.total_tetri AS order_total, o.is_test, v.name AS verified_by_name
       FROM payments p JOIN orders o ON o.id = p.order_id JOIN users u ON u.id = o.customer_id LEFT JOIN users v ON v.id = p.verified_by
       ${status ? "WHERE p.status = ?" : ""} ORDER BY COALESCE(p.submitted_at, p.created_at) DESC, p.id DESC`,
    )
    .all(...(status ? [status] : [])) as unknown as AdminPaymentRow[];
  return rows;
}

export function adminOrders(ctx: Ctx, actor: Actor | null) {
  requireAdmin(actor);
  return ctx.db
    .prepare(
      `SELECT o.*, u.name AS customer_name,
         (SELECT COALESCE(SUM(amount_tetri),0) FROM ledger_entries l WHERE l.order_id = o.id AND l.kind = 'customer_payment') AS received_tetri,
         (SELECT COUNT(*) FROM fulfillments f WHERE f.order_id = o.id) AS shipments
       FROM orders o JOIN users u ON u.id = o.customer_id ORDER BY o.number DESC`,
    )
    .all() as unknown as (OrderRow & { customer_name: string; received_tetri: number; shipments: number })[];
}

/** Per-order money picture, from the ledger. Not a bank balance. */
export function orderFinance(ctx: Ctx, order: OrderRow) {
  const s = (k: Parameters<typeof ledgerSum>[2]) => ledgerSum(ctx, order.id, k);
  const received = s("customer_payment");
  const payable = s("manufacturer_payable");
  const transferred = s("manufacturer_payout");
  const refundDue = s("refund_due");
  const refundPaid = s("refund_paid");
  return {
    received,
    goods: order.goods_tetri,
    delivery: s("delivery_allocation"),
    commission: s("commission"),
    payable,
    transferred,
    owedToManufacturers: Math.max(0, payable - transferred),
    refundDue,
    refundPaid,
    refundOutstanding: refundDue - refundPaid,
    customerOutstanding: amountDue(ctx, order),
    /** Customer money recorded as received and not yet sent back out. */
    held: received - transferred - refundPaid,
  };
}

export function adminOrder(ctx: Ctx, actor: Actor | null, orderId: string) {
  requireAdmin(actor);
  const order = getOrder(ctx, orderId);
  if (!order) throw new MarketError("not_found");
  const items = itemsOf(ctx, orderId);
  return {
    order,
    customerName: userName(ctx, order.customer_id),
    shipments: fulfillmentsOf(ctx, orderId).map((f) => ({ ...f, items: items.filter((i) => i.fulfillment_id === f.id), payout: payoutOf(ctx, f.id)!, messages: orderMessages(ctx, f.id) })),
    payments: paymentsOf(ctx, orderId).map((p) => ({ ...p, verified_by_name: userName(ctx, p.verified_by) })),
    refunds: refundsOf(ctx, orderId),
    ledger: ctx.db
      .prepare("SELECT l.*, u.name AS created_by_name FROM ledger_entries l LEFT JOIN users u ON u.id = l.created_by WHERE l.order_id = ? ORDER BY l.id")
      .all(orderId) as unknown as LedgerRow[],
    history: historyOf(ctx, orderId, ["order", "fulfillment", "payment", "payout", "refund"]),
    notes: ctx.db.prepare("SELECT n.*, u.name AS by_name FROM notes n LEFT JOIN users u ON u.id = n.by_user WHERE order_id = ? ORDER BY n.id").all(orderId) as unknown as {
      id: number;
      payment_id: string | null;
      body: string;
      at: string;
      by_name: string;
    }[],
    finance: orderFinance(ctx, order),
  };
}

export interface SettlementRow extends PayoutRow {
  is_test: number;
  order_id: string;
  fulfillment_id: string;
  manufacturer_slug: string;
  fulfillment_status: string;
  goods_tetri: number;
  commission_tetri: number;
  commission_bps: number;
  commission_base: string;
  order_hold: string | null;
  account_holder: string | null;
  bank_name: string | null;
  iban: string | null;
  authorized_by_name: string | null;
  completed_by_name: string | null;
}

export function adminSettlements(ctx: Ctx, actor: Actor | null) {
  requireAdmin(actor);
  return ctx.db
    .prepare(
      `SELECT po.*, o.is_test, f.order_id, f.manufacturer_slug, f.status AS fulfillment_status, f.goods_tetri, f.commission_tetri,
         o.commission_bps, o.commission_base, o.hold_kind AS order_hold, b.account_holder, b.bank_name, b.iban,
         ua.name AS authorized_by_name, uc.name AS completed_by_name
       FROM payouts po JOIN fulfillments f ON f.id = po.fulfillment_id JOIN orders o ON o.id = f.order_id
       LEFT JOIN manufacturer_bank_accounts b ON b.manufacturer_slug = f.manufacturer_slug
       LEFT JOIN users ua ON ua.id = po.authorized_by LEFT JOIN users uc ON uc.id = po.completed_by
       ORDER BY CASE po.status WHEN 'eligible' THEN 0 WHEN 'authorized' THEN 1 WHEN 'transfer_initiated' THEN 2 WHEN 'transfer_failed' THEN 3 WHEN 'on_hold' THEN 4 WHEN 'not_eligible' THEN 5 ELSE 6 END, o.number DESC`,
    )
    .all() as unknown as SettlementRow[];
}

export function adminRefunds(ctx: Ctx, actor: Actor | null) {
  requireAdmin(actor);
  return ctx.db
    .prepare("SELECT r.*, u.name AS customer_name FROM refunds r JOIN orders o ON o.id = r.order_id JOIN users u ON u.id = o.customer_id ORDER BY r.status = 'completed', r.created_at DESC")
    .all() as unknown as (RefundRow & { customer_name: string })[];
}

/**
 * Totals across all orders, from the ledger. These are what admins have recorded,
 * not a balance read from the bank.
 */
export function financialOverview(ctx: Ctx, actor: Actor | null, opts: { test?: boolean } = {}) {
  requireAdmin(actor);
  // Real and TEST orders are never added together. TEST orders are shown only on request.
  const t = opts.test ? 1 : 0;
  const ledger = "ledger_entries l JOIN orders o ON o.id = l.order_id AND o.is_test = ?";
  const one = <T>(sql: string, ...a: (string | number)[]) => ctx.db.prepare(sql).get(...a) as T;
  const sum = (kind: string) => one<{ s: number }>(`SELECT COALESCE(SUM(l.amount_tetri),0) AS s FROM ${ledger} WHERE l.kind = ?`, t, kind).s;
  const today = ctx.now().toISOString().slice(0, 10);
  const received = sum("customer_payment");
  const payable = sum("manufacturer_payable");
  const transferred = sum("manufacturer_payout");
  const refundPaid = sum("refund_paid");
  const nS = "COUNT(*) AS n, COALESCE(SUM(x),0) AS s";
  const payouts = (statuses: string) =>
    one<{ n: number; s: number }>(
      `SELECT ${nS.replace("x", "po.payable_tetri")} FROM payouts po JOIN fulfillments f ON f.id = po.fulfillment_id JOIN orders o ON o.id = f.order_id AND o.is_test = ? WHERE po.status IN (${statuses})`,
      t,
    );
  return {
    test: !!opts.test,
    testOrders: one<{ n: number }>("SELECT COUNT(*) AS n FROM orders WHERE is_test = 1").n,
    realOrders: one<{ n: number }>("SELECT COUNT(*) AS n FROM orders WHERE is_test = 0").n,
    received,
    awaitingVerification: one<{ n: number; s: number }>(
      `SELECT ${nS.replace("x", "p.reported_tetri")} FROM payments p JOIN orders o ON o.id = p.order_id AND o.is_test = ? WHERE p.status IN ('submitted','verification_pending')`,
      t,
    ),
    verifiedToday: one<{ s: number }>(`SELECT COALESCE(SUM(l.amount_tetri),0) AS s FROM ${ledger} WHERE l.kind = 'customer_payment' AND substr(l.created_at,1,10) = ?`, t, today).s,
    // Active orders: received minus what already left the bank for them.
    allocatedToActiveOrders: one<{ s: number }>(
      `SELECT COALESCE(SUM(CASE l.kind WHEN 'customer_payment' THEN l.amount_tetri ELSE -l.amount_tetri END),0) AS s FROM ${ledger}
       WHERE o.status NOT IN ('completed','cancelled','refunded') AND l.kind IN ('customer_payment','refund_paid','manufacturer_payout')`,
      t,
    ).s,
    owedToManufacturers: payable - transferred,
    payoutsAwaitingAuthorization: payouts("'eligible'"),
    payoutsInProgress: payouts("'authorized','transfer_initiated','transfer_failed'"),
    payoutsCompleted: transferred,
    refundsPending: one<{ n: number; s: number }>(
      `SELECT ${nS.replace("x", "r.amount_tetri")} FROM refunds r JOIN orders o ON o.id = r.order_id AND o.is_test = ? WHERE r.status = 'pending'`,
      t,
    ),
    refundsCompleted: refundPaid,
    commission: sum("commission"),
    delivery: sum("delivery_allocation"),
    /** Received minus everything recorded as sent out. Compare with the real bank statement. */
    ledgerNet: received - transferred - refundPaid,
  };
}

export function manufacturerBankAccounts(ctx: Ctx, actor: Actor | null) {
  requireAdmin(actor);
  return ctx.db.prepare("SELECT * FROM manufacturer_bank_accounts ORDER BY manufacturer_slug").all() as { manufacturer_slug: string; account_holder: string; bank_name: string; iban: string }[];
}

/* ------------------------------------------------------------------ */
/* Notifications (in-app)                                               */
/* ------------------------------------------------------------------ */

export function notificationsFor(ctx: Ctx, actor: Actor | null, limit = 50): NotificationRow[] {
  if (!actor) throw new MarketError("forbidden");
  return (ctx.db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT ?").all(actor.id, limit) as unknown as (Omit<NotificationRow, "params"> & { params: string })[]).map(
    (n) => ({ ...n, params: JSON.parse(n.params) as Record<string, unknown> }),
  );
}

export function unreadCount(ctx: Ctx, actor: Actor | null): number {
  if (!actor) return 0;
  return (ctx.db.prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL").get(actor.id) as { n: number }).n;
}

/** Marks the actor's own notifications read (all of them, or one). */
export function markNotificationsRead(ctx: Ctx, actor: Actor | null, id?: number) {
  if (!actor) throw new MarketError("forbidden");
  const at = ctx.now().toISOString();
  if (id === undefined) ctx.db.prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL").run(at, actor.id);
  else ctx.db.prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND id = ? AND read_at IS NULL").run(at, actor.id, id);
}

/**
 * Who may download an uploaded file.
 * - Public: photos of published products, and logos and workshop photos of approved sellers.
 * - The seller: everything it uploaded itself (documents, draft product photos), but never inspection photos.
 * - The customer: their own payment receipts. The manufacturer: confirmations of its completed payouts.
 * - Admins: everything. Registration documents are never public.
 */
export function canReadFile(ctx: Ctx, actor: Actor | null, file: string): boolean {
  if (isPublicFile(ctx, file)) return true;
  if (!actor) return false;
  if (actor.role === "admin") return true;
  if (actor.role === "customer") {
    return (
      !!ctx.db.prepare("SELECT 1 FROM payments p JOIN orders o ON o.id = p.order_id WHERE p.receipt_file = ? AND o.customer_id = ?").get(file, actor.id) ||
      // The photo of a product as it was when they ordered it, even if the seller later removed it.
      !!ctx.db.prepare("SELECT 1 FROM order_items i JOIN orders o ON o.id = i.order_id WHERE o.customer_id = ? AND instr(i.snapshot, ?) > 0").get(actor.id, `/api/files/${file}`)
    );
  }
  const slug = actor.manufacturerSlug ?? "";
  return (
    // Registration documents are for administrators only, also after the seller uploaded them; so are inspection photos.
    !!ctx.db.prepare("SELECT 1 FROM seller_files WHERE file = ? AND manufacturer_slug = ? AND kind NOT IN ('inspection_photo','registration_document')").get(file, slug) ||
    !!ctx.db.prepare("SELECT 1 FROM order_items WHERE manufacturer_slug = ? AND instr(snapshot, ?) > 0").get(slug, `/api/files/${file}`) ||
    !!ctx.db.prepare("SELECT 1 FROM product_images i JOIN products p ON p.slug = i.product_slug WHERE i.file = ? AND p.manufacturer_slug = ?").get(file, slug) ||
    !!ctx.db.prepare("SELECT 1 FROM manufacturers WHERE logo_file = ? AND slug = ?").get(file, slug) ||
    !!ctx.db
      .prepare("SELECT 1 FROM payouts po JOIN fulfillments f ON f.id = po.fulfillment_id WHERE po.confirmation_file = ? AND f.manufacturer_slug = ? AND po.status = 'transfer_completed'")
      .get(file, slug)
  );
}

const APPROVED_SQL = "('approved_company','approved_independent')";
export function isPublicFile(ctx: Ctx, file: string): boolean {
  return (
    !!ctx.db
      .prepare(`SELECT 1 FROM product_images i JOIN products p ON p.slug = i.product_slug JOIN manufacturers m ON m.slug = p.manufacturer_slug WHERE i.file = ? AND p.status = 'published' AND m.account_status IN ${APPROVED_SQL}`)
      .get(file) ||
    !!ctx.db.prepare(`SELECT 1 FROM manufacturers WHERE logo_file = ? AND account_status IN ${APPROVED_SQL}`).get(file) ||
    !!ctx.db
      .prepare(`SELECT 1 FROM seller_files f JOIN manufacturers m ON m.slug = f.manufacturer_slug WHERE f.file = ? AND f.kind = 'workshop_photo' AND f.related_id IS NULL AND f.removed_at IS NULL AND m.account_status IN ${APPROVED_SQL}`)
      .get(file)
  );
}
