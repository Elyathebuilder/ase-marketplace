/**
 * The order, bank-transfer payment and manufacturer settlement workflow.
 *
 * Every action takes the signed-in actor and checks permissions here, on the server.
 * Hiding a button in the UI is never the only protection.
 *
 * Money rules:
 * - Amounts are whole tetri (integers). Prices come from the catalog, never from the browser.
 * - Only an admin can record that money arrived in, or left, Amartani's bank account.
 * - The ledger is append-only. Corrections are new entries that point at the entry they adjust.
 * - The ledger records obligations and recorded bank transactions. It is not a bank balance.
 */
import { getProduct } from "../catalog";
import { quoteCartDelivery, type CartInputLine } from "../cart-delivery";
import { percentOf, toTetri, type Tetri } from "../money";
import { tx, type DB } from "./db";
import { getSettings } from "./settings";
import {
  MarketError,
  type Actor,
  type FulfillmentStatus,
  type LedgerKind,
  type OrderStatus,
  type PaymentStatus,
  type PayoutStatus,
} from "./types";

export interface Ctx {
  db: DB;
  now: () => Date;
  /** Overrides the ASE_TEST_MODE setting (tests use this). */
  testMode?: boolean;
}

type Row = Record<string, unknown>;

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const iso = (ctx: Ctx) => ctx.now().toISOString();

function need<T>(v: T | undefined | null, what = "record"): T {
  if (v === undefined || v === null) throw new MarketError("not_found", `${what} not found`);
  return v;
}

function requireRole(actor: Actor | null | undefined, ...roles: Actor["role"][]): Actor {
  if (!actor || !roles.includes(actor.role)) throw new MarketError("forbidden");
  return actor;
}

function cleanText(v: unknown, max: number, required = true): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (required && !s) throw new MarketError("invalid_input", "missing text");
  if (s.length > max) throw new MarketError("invalid_input", "text too long");
  return s;
}

function positiveTetri(v: unknown): Tetri {
  let t: Tetri;
  try {
    t = typeof v === "number" ? v : toTetri(String(v ?? ""));
  } catch {
    throw new MarketError("invalid_input", "invalid amount");
  }
  if (!Number.isSafeInteger(t) || t <= 0) throw new MarketError("invalid_input", "amount must be positive");
  return t;
}

export interface OrderRow {
  id: string;
  number: number;
  customer_id: string;
  status: OrderStatus;
  created_at: string;
  payment_deadline: string | null;
  goods_tetri: number;
  delivery_tetri: number;
  total_tetri: number;
  commission_bps: number;
  commission_base: string;
  delivery_name: string;
  delivery_phone: string;
  delivery_city: string;
  delivery_address: string;
  delivery_note: string | null;
  delivery_email: string | null;
  is_test: number;
  hold_kind: "hold" | "dispute" | null;
  hold_reason: string | null;
}

export interface FulfillmentRow {
  id: string;
  order_id: string;
  manufacturer_slug: string;
  status: FulfillmentStatus;
  goods_tetri: number;
  delivery_tetri: number;
  commission_tetri: number;
  payable_tetri: number;
  prepare_by: string | null;
  reject_reason: string | null;
}

export interface PaymentRow {
  id: string;
  order_id: string;
  method: string;
  status: PaymentStatus;
  expected_tetri: number;
  reported_tetri: number | null;
  reported_date: string | null;
  reference: string | null;
  receipt_file: string | null;
  receipt_name: string | null;
  created_at: string;
  submitted_at: string | null;
  submitted_by: string | null;
  received_tetri: number | null;
  verified_at: string | null;
  verified_by: string | null;
}

export interface PayoutRow {
  id: string;
  fulfillment_id: string;
  status: PayoutStatus;
  payable_tetri: number;
  authorized_at: string | null;
  authorized_by: string | null;
  transfer_reference: string | null;
  transfer_date: string | null;
  confirmation_file: string | null;
  confirmation_name: string | null;
  completed_at: string | null;
  completed_by: string | null;
  hold_reason: string | null;
}

export interface RefundRow {
  id: string;
  order_id: string;
  fulfillment_id: string | null;
  amount_tetri: number;
  reason: string;
  status: "pending" | "completed";
  reference: string | null;
  transfer_date: string | null;
  created_at: string;
  created_by: string;
  completed_at: string | null;
  completed_by: string | null;
}

export const getOrder = (ctx: Ctx, id: string) => ctx.db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as unknown as OrderRow | undefined;
export const getFulfillment = (ctx: Ctx, id: string) =>
  ctx.db.prepare("SELECT * FROM fulfillments WHERE id = ?").get(id) as unknown as FulfillmentRow | undefined;
export const getPayment = (ctx: Ctx, id: string) => ctx.db.prepare("SELECT * FROM payments WHERE id = ?").get(id) as unknown as PaymentRow | undefined;
export const getPayout = (ctx: Ctx, id: string) => ctx.db.prepare("SELECT * FROM payouts WHERE id = ?").get(id) as unknown as PayoutRow | undefined;
export const getRefund = (ctx: Ctx, id: string) => ctx.db.prepare("SELECT * FROM refunds WHERE id = ?").get(id) as unknown as RefundRow | undefined;
export const fulfillmentsOf = (ctx: Ctx, orderId: string) =>
  ctx.db.prepare("SELECT * FROM fulfillments WHERE order_id = ? ORDER BY id").all(orderId) as unknown as FulfillmentRow[];
export const paymentsOf = (ctx: Ctx, orderId: string) =>
  ctx.db.prepare("SELECT * FROM payments WHERE order_id = ? ORDER BY created_at, id").all(orderId) as unknown as PaymentRow[];
const payoutOf = (ctx: Ctx, fulfillmentId: string) =>
  ctx.db.prepare("SELECT * FROM payouts WHERE fulfillment_id = ?").get(fulfillmentId) as unknown as PayoutRow | undefined;

function nextId(ctx: Ctx, table: string, prefix: string) {
  const n = (ctx.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n + 1;
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

function history(ctx: Ctx, orderId: string, entity: string, entityId: string, from: string | null, to: string, by: string, note?: string | null) {
  ctx.db
    .prepare("INSERT INTO status_history (order_id, entity, entity_id, from_status, to_status, at, by_user, note) VALUES (?,?,?,?,?,?,?,?)")
    .run(orderId, entity, entityId, from, to, iso(ctx), by, note ?? null);
}

function ledger(
  ctx: Ctx,
  e: { orderId: string; kind: LedgerKind; amount: Tetri; by: string; fulfillmentId?: string | null; maker?: string | null; bankRef?: string | null; note?: string | null; adjusts?: number | null },
) {
  ctx.db
    .prepare(
      "INSERT INTO ledger_entries (order_id, fulfillment_id, manufacturer_slug, kind, amount_tetri, bank_reference, note, adjusts_entry_id, created_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)",
    )
    .run(e.orderId, e.fulfillmentId ?? null, e.maker ?? null, e.kind, e.amount, e.bankRef ?? null, e.note ?? null, e.adjusts ?? null, iso(ctx), e.by);
}

export function ledgerSum(ctx: Ctx, orderId: string, kind: LedgerKind, fulfillmentId?: string): Tetri {
  const row = fulfillmentId
    ? ctx.db.prepare("SELECT COALESCE(SUM(amount_tetri),0) AS s FROM ledger_entries WHERE order_id = ? AND kind = ? AND fulfillment_id = ?").get(orderId, kind, fulfillmentId)
    : ctx.db.prepare("SELECT COALESCE(SUM(amount_tetri),0) AS s FROM ledger_entries WHERE order_id = ? AND kind = ?").get(orderId, kind);
  return (row as { s: number }).s;
}

function notify(ctx: Ctx, userId: string, kind: string, opts: { orderId?: string; fulfillmentId?: string; params?: Row } = {}) {
  ctx.db
    .prepare("INSERT INTO notifications (user_id, kind, order_id, fulfillment_id, params, created_at) VALUES (?,?,?,?,?,?)")
    .run(userId, kind, opts.orderId ?? null, opts.fulfillmentId ?? null, JSON.stringify(opts.params ?? {}), iso(ctx));
}

const userIds = (ctx: Ctx, where: string, ...args: string[]) =>
  (ctx.db.prepare(`SELECT id FROM users WHERE ${where}`).all(...args) as { id: string }[]).map((u) => u.id);
const admins = (ctx: Ctx) => userIds(ctx, "role = 'admin'");
const makerUsers = (ctx: Ctx, slug: string) => userIds(ctx, "role = 'manufacturer' AND manufacturer_slug = ?", slug);

function notifyAdmins(ctx: Ctx, kind: string, opts: { orderId?: string; fulfillmentId?: string; params?: Row }) {
  for (const id of admins(ctx)) notify(ctx, id, kind, opts);
}
function notifyMaker(ctx: Ctx, slug: string, kind: string, opts: { orderId?: string; fulfillmentId?: string; params?: Row }) {
  for (const id of makerUsers(ctx, slug)) notify(ctx, id, kind, opts);
}

function setOrderStatus(ctx: Ctx, order: OrderRow, to: OrderStatus, by: string, note?: string | null) {
  if (order.status === to) return;
  ctx.db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(to, order.id);
  history(ctx, order.id, "order", order.id, order.status, to, by, note);
  order.status = to;
}

function setFulfillmentStatus(ctx: Ctx, f: FulfillmentRow, to: FulfillmentStatus, by: string, note?: string | null) {
  ctx.db.prepare("UPDATE fulfillments SET status = ? WHERE id = ?").run(to, f.id);
  history(ctx, f.order_id, "fulfillment", f.id, f.status, to, by, note);
  f.status = to;
}

function setPaymentStatus(ctx: Ctx, p: PaymentRow, to: PaymentStatus, by: string, note?: string | null) {
  ctx.db.prepare("UPDATE payments SET status = ? WHERE id = ?").run(to, p.id);
  history(ctx, p.order_id, "payment", p.id, p.status, to, by, note);
  p.status = to;
}

function setPayoutStatus(ctx: Ctx, orderId: string, p: PayoutRow, to: PayoutStatus, by: string, note?: string | null) {
  ctx.db.prepare("UPDATE payouts SET status = ? WHERE id = ?").run(to, p.id);
  history(ctx, orderId, "payout", p.id, p.status, to, by, note);
  p.status = to;
}

/** Fulfillment statuses that still count towards the order. */
const ACTIVE = (f: FulfillmentRow) => f.status !== "rejected" && f.status !== "cancelled";
const STAGE: Partial<Record<FulfillmentStatus, OrderStatus>> = {
  new: "payment_confirmed",
  accepted: "payment_confirmed",
  preparing: "preparing",
  ready: "ready",
  collected: "collected",
  in_delivery: "in_delivery",
  delivered: "delivered",
};
const STAGE_RANK: OrderStatus[] = ["payment_confirmed", "preparing", "ready", "collected", "in_delivery", "delivered"];
/** Order statuses that follow the manufacturers' progress automatically. */
const FOLLOWS_FULFILLMENT: OrderStatus[] = [...STAGE_RANK, "preparation_delayed", "delivery_issue", "manufacturer_rejected"];

/**
 * The customer sees one order. With several manufacturers, the order is as far along as its
 * slowest active shipment; each shipment's own progress is shown separately.
 */
function syncOrderStatus(ctx: Ctx, order: OrderRow, by: string, note?: string | null, force = false) {
  if (!force && !FOLLOWS_FULFILLMENT.includes(order.status)) return;
  const fs = fulfillmentsOf(ctx, order.id);
  const active = fs.filter(ACTIVE);
  if (active.length === 0) {
    setOrderStatus(ctx, order, fs.some((f) => f.status === "rejected") ? "manufacturer_rejected" : "cancelled", by, note);
    return;
  }
  const stages = active.map((f) => STAGE[f.status]).filter((s): s is OrderStatus => !!s);
  if (stages.length !== active.length) return; // still awaiting payment
  const min = stages.reduce((a, b) => (STAGE_RANK.indexOf(a) <= STAGE_RANK.indexOf(b) ? a : b));
  setOrderStatus(ctx, order, min, by, note);
}

/* ------------------------------------------------------------------ */
/* Customer: place an order                                            */
/* ------------------------------------------------------------------ */

export interface PlaceOrderInput {
  lines: CartInputLine[];
  city: string;
  name: string;
  phone: string;
  address: string;
  email?: string;
  note?: string;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function placeOrder(ctx: Ctx, actor: Actor | null, input: PlaceOrderInput): string {
  const customer = requireRole(actor, "customer");
  const name = cleanText(input.name, 120);
  const phone = cleanText(input.phone, 40);
  const address = cleanText(input.address, 300);
  const note = cleanText(input.note, 500, false) || null;
  const email = cleanText(input.email, 200, false) || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new MarketError("invalid_input", "invalid email");
  if (!Array.isArray(input.lines) || input.lines.length === 0 || input.lines.length > 100) throw new MarketError("empty_cart");

  // Prices and delivery are recalculated here from the catalog. Nothing from the browser is trusted.
  const quote = quoteCartDelivery(input.lines, input.city);
  if (quote.groups.length === 0) throw new MarketError("empty_cart");
  if (quote.delivery.requiresManualQuote) throw new MarketError("manual_delivery");

  const settings = getSettings(ctx);
  return tx(ctx.db, () => {
    const number = ((ctx.db.prepare("SELECT MAX(number) AS n FROM orders").get() as { n: number | null }).n ?? 10500) + 1;
    const id = `ASE-${number}`;
    const now = ctx.now();
    const deadline = settings.paymentDeadlineHours > 0 ? new Date(now.getTime() + settings.paymentDeadlineHours * 3600_000).toISOString() : null;

    const parts = quote.groups.map((g, i) => {
      const shipment = quote.delivery.shipments.find((s) => s.originId === g.manufacturer);
      if (!shipment || shipment.status !== "quoted") throw new MarketError("manual_delivery");
      const items = g.lines.map(({ product, qty }) => {
        const unit = toTetri(product.retailPrice!);
        return { product, qty, unit, line: unit * qty };
      });
      const goods = items.reduce((s, x) => s + x.line, 0);
      const delivery = toTetri(shipment.price.total);
      const base = settings.commissionBase === "products" ? goods : goods + delivery;
      const commission = Math.min(percentOf(base, settings.commissionBps), goods);
      return { id: `${id}-${LETTERS[i]}`, maker: g.manufacturer, items, goods, delivery, commission, payable: goods - commission };
    });
    const goods = parts.reduce((s, p) => s + p.goods, 0);
    const delivery = parts.reduce((s, p) => s + p.delivery, 0);

    ctx.db
      .prepare(
        `INSERT INTO orders (id, number, customer_id, status, created_at, payment_deadline, goods_tetri, delivery_tetri, total_tetri,
         commission_bps, commission_base, delivery_name, delivery_phone, delivery_city, delivery_address, delivery_note, delivery_email, is_test)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(id, number, customer.id, "placed", now.toISOString(), deadline, goods, delivery, goods + delivery, settings.commissionBps, settings.commissionBase, name, phone, input.city, address, note, email, settings.testMode ? 1 : 0);
    history(ctx, id, "order", id, null, "placed", customer.id);

    for (const p of parts) {
      ctx.db
        .prepare("INSERT INTO fulfillments (id, order_id, manufacturer_slug, status, goods_tetri, delivery_tetri, commission_tetri, payable_tetri) VALUES (?,?,?,?,?,?,?,?)")
        .run(p.id, id, p.maker, "awaiting_payment", p.goods, p.delivery, p.commission, p.payable);
      for (const it of p.items)
        ctx.db
          .prepare("INSERT INTO order_items (order_id, fulfillment_id, product_slug, product_name, unit, unit_price_tetri, qty, line_tetri) VALUES (?,?,?,?,?,?,?,?)")
          .run(id, p.id, it.product.slug, it.product.name, it.product.unit, it.unit, it.qty, it.line);
      const payoutId = nextId(ctx, "payouts", "PO");
      ctx.db.prepare("INSERT INTO payouts (id, fulfillment_id, status, payable_tetri) VALUES (?,?,?,?)").run(payoutId, p.id, "not_eligible", p.payable);
      notifyMaker(ctx, p.maker, "maker_new_order", { orderId: id, fulfillmentId: p.id, params: { goods: p.goods } });
    }

    const paymentId = nextId(ctx, "payments", "PAY");
    ctx.db.prepare("INSERT INTO payments (id, order_id, status, expected_tetri, created_at) VALUES (?,?,?,?,?)").run(paymentId, id, "awaiting_payment", goods + delivery, now.toISOString());
    history(ctx, id, "payment", paymentId, null, "awaiting_payment", customer.id);

    const order = need(getOrder(ctx, id));
    setOrderStatus(ctx, order, "awaiting_payment", customer.id);
    notify(ctx, customer.id, "order_placed", { orderId: id, params: { total: goods + delivery } });
    notify(ctx, customer.id, "payment_instructions", { orderId: id, params: { total: goods + delivery, deadline } });
    return id;
  });
}

/* ------------------------------------------------------------------ */
/* Customer: "I have made the payment"                                  */
/* ------------------------------------------------------------------ */

export interface SubmitPaymentInput {
  amount: string | number;
  date: string;
  reference: string;
  receipt?: { file: string; name: string } | null;
}

/** Amount still to be paid for an order, from verified payments only. */
export const amountDue = (ctx: Ctx, order: OrderRow) => Math.max(0, order.total_tetri - ledgerSum(ctx, order.id, "customer_payment"));

/** Records what the customer says they sent. It never confirms the payment: an admin does that. */
export function submitPayment(ctx: Ctx, actor: Actor | null, orderId: string, input: SubmitPaymentInput): string {
  const customer = requireRole(actor, "customer");
  const order = need(getOrder(ctx, orderId), "order");
  if (order.customer_id !== customer.id) throw new MarketError("forbidden");
  if (!["awaiting_payment", "payment_rejected", "payment_submitted"].includes(order.status)) throw new MarketError("invalid_state");
  const amount = positiveTetri(input.amount);
  const reference = cleanText(input.reference, 100);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date ?? "") || Number.isNaN(Date.parse(input.date))) throw new MarketError("invalid_input", "invalid date");
  if (Date.parse(input.date) > ctx.now().getTime() + 86_400_000) throw new MarketError("invalid_input", "date in the future");

  return tx(ctx.db, () => {
    const payments = paymentsOf(ctx, orderId);
    let p = payments.find((x) => x.status === "awaiting_payment");
    if (!p) {
      // A new submission after a rejected or partial one.
      if (payments.some((x) => x.status === "submitted" || x.status === "verification_pending")) throw new MarketError("invalid_state", "a submission is already waiting for verification");
      const id = nextId(ctx, "payments", "PAY");
      ctx.db.prepare("INSERT INTO payments (id, order_id, status, expected_tetri, created_at) VALUES (?,?,?,?,?)").run(id, orderId, "awaiting_payment", amountDue(ctx, order), iso(ctx));
      history(ctx, orderId, "payment", id, null, "awaiting_payment", customer.id);
      p = need(getPayment(ctx, id));
    }
    ctx.db
      .prepare("UPDATE payments SET reported_tetri = ?, reported_date = ?, reference = ?, receipt_file = ?, receipt_name = ?, submitted_at = ?, submitted_by = ? WHERE id = ?")
      .run(amount, input.date, reference, input.receipt?.file ?? null, input.receipt?.name ?? null, iso(ctx), customer.id, p.id);
    setPaymentStatus(ctx, p, "submitted", customer.id);
    setOrderStatus(ctx, order, "payment_submitted", customer.id);
    notifyAdmins(ctx, "admin_payment_submitted", { orderId, params: { payment: p.id, amount } });
    return p.id;
  });
}

/* ------------------------------------------------------------------ */
/* Admin: incoming payments                                             */
/* ------------------------------------------------------------------ */

export function startVerification(ctx: Ctx, actor: Actor | null, paymentId: string) {
  const admin = requireRole(actor, "admin");
  const p = need(getPayment(ctx, paymentId), "payment");
  if (p.status !== "submitted") throw new MarketError("invalid_state");
  tx(ctx.db, () => setPaymentStatus(ctx, p, "verification_pending", admin.id));
}

/**
 * The admin checked the real bank account and records the amount that actually arrived.
 * Full amount → payment confirmed and manufacturers can start. Less → partial payment.
 * More → confirmed, marked "incorrect amount" so the difference can be refunded.
 */
export function recordIncomingPayment(ctx: Ctx, actor: Actor | null, paymentId: string, input: { received: string | number; bankReference: string; note?: string }) {
  const admin = requireRole(actor, "admin");
  const p = need(getPayment(ctx, paymentId), "payment");
  if (!["awaiting_payment", "submitted", "verification_pending"].includes(p.status)) throw new MarketError("invalid_state");
  const order = need(getOrder(ctx, p.order_id), "order");
  if (["cancelled", "refunded", "refund_processing"].includes(order.status)) throw new MarketError("invalid_state");
  const received = positiveTetri(input.received);
  const bankRef = cleanText(input.bankReference, 100);
  const note = cleanText(input.note, 500, false) || null;

  tx(ctx.db, () => {
    ledger(ctx, { orderId: order.id, kind: "customer_payment", amount: received, by: admin.id, bankRef, note: `${p.id}${note ? `: ${note}` : ""}` });
    ctx.db.prepare("UPDATE payments SET received_tetri = ?, verified_at = ?, verified_by = ? WHERE id = ?").run(received, iso(ctx), admin.id, p.id);
    const total = ledgerSum(ctx, order.id, "customer_payment");

    if (total < order.total_tetri) {
      setPaymentStatus(ctx, p, "partial", admin.id, note);
      setOrderStatus(ctx, order, "awaiting_payment", admin.id, "partial payment");
      notify(ctx, order.customer_id, "payment_partial", { orderId: order.id, params: { received: total, remaining: order.total_tetri - total } });
      return;
    }

    setPaymentStatus(ctx, p, total > order.total_tetri ? "incorrect_amount" : "confirmed", admin.id, total > order.total_tetri ? `overpaid by ${total - order.total_tetri} tetri` : note);
    // Earlier partial payments on the same order are now complete too.
    for (const other of paymentsOf(ctx, order.id)) if (other.id !== p.id && other.status === "partial") setPaymentStatus(ctx, other, "confirmed", admin.id, "order fully paid");
    confirmOrderPaid(ctx, order, admin.id);
    if (total > order.total_tetri) notifyAdmins(ctx, "admin_overpaid", { orderId: order.id, params: { over: total - order.total_tetri } });
  });
}

/** Payment complete: book commission and manufacturer payables, and tell the manufacturers to start. */
function confirmOrderPaid(ctx: Ctx, order: OrderRow, by: string) {
  setOrderStatus(ctx, order, "payment_confirmed", by);
  for (const f of fulfillmentsOf(ctx, order.id)) {
    if (f.status !== "awaiting_payment") continue;
    ledger(ctx, { orderId: order.id, fulfillmentId: f.id, maker: f.manufacturer_slug, kind: "delivery_allocation", amount: f.delivery_tetri, by });
    ledger(ctx, { orderId: order.id, fulfillmentId: f.id, maker: f.manufacturer_slug, kind: "commission", amount: f.commission_tetri, by, note: `${order.commission_bps / 100}% of ${order.commission_base}` });
    ledger(ctx, { orderId: order.id, fulfillmentId: f.id, maker: f.manufacturer_slug, kind: "manufacturer_payable", amount: f.payable_tetri, by });
    const days = Math.max(
      3,
      ...(ctx.db.prepare("SELECT product_slug, qty FROM order_items WHERE fulfillment_id = ?").all(f.id) as { product_slug: string; qty: number }[]).map((i) => {
        const p = getProduct(i.product_slug);
        return p && p.stock < i.qty ? p.productionDays : 3;
      }),
    );
    const prepareBy = new Date(ctx.now().getTime() + days * 86_400_000).toISOString();
    ctx.db.prepare("UPDATE fulfillments SET prepare_by = ? WHERE id = ?").run(prepareBy, f.id);
    setFulfillmentStatus(ctx, f, "new", by);
    notifyMaker(ctx, f.manufacturer_slug, "maker_payment_verified", { orderId: order.id, fulfillmentId: f.id, params: { payable: f.payable_tetri, prepareBy } });
  }
  notify(ctx, order.customer_id, "payment_verified", { orderId: order.id, params: { total: order.total_tetri } });
}

export function rejectPayment(ctx: Ctx, actor: Actor | null, paymentId: string, reason: string) {
  const admin = requireRole(actor, "admin");
  const p = need(getPayment(ctx, paymentId), "payment");
  if (!["submitted", "verification_pending"].includes(p.status)) throw new MarketError("invalid_state");
  const why = cleanText(reason, 500);
  const order = need(getOrder(ctx, p.order_id), "order");
  tx(ctx.db, () => {
    ctx.db.prepare("UPDATE payments SET verified_at = ?, verified_by = ? WHERE id = ?").run(iso(ctx), admin.id, p.id);
    setPaymentStatus(ctx, p, "rejected", admin.id, why);
    setOrderStatus(ctx, order, "payment_rejected", admin.id, why);
    notify(ctx, order.customer_id, "payment_rejected", { orderId: order.id, params: { reason: why } });
  });
}

/** Ask the customer to send the rest after a partial payment. */
export function requestAdditionalPayment(ctx: Ctx, actor: Actor | null, orderId: string, note?: string) {
  const admin = requireRole(actor, "admin");
  const order = need(getOrder(ctx, orderId), "order");
  const due = amountDue(ctx, order);
  if (due <= 0 || order.status !== "awaiting_payment") throw new MarketError("invalid_state");
  const msg = cleanText(note, 500, false) || null;
  tx(ctx.db, () => {
    history(ctx, order.id, "order", order.id, order.status, order.status, admin.id, `additional payment requested: ${due} tetri${msg ? `. ${msg}` : ""}`);
    notify(ctx, order.customer_id, "payment_additional", { orderId: order.id, params: { remaining: due, note: msg } });
  });
}

export function addNote(ctx: Ctx, actor: Actor | null, orderId: string, body: string, paymentId?: string | null) {
  const admin = requireRole(actor, "admin");
  need(getOrder(ctx, orderId), "order");
  ctx.db.prepare("INSERT INTO notes (order_id, payment_id, body, at, by_user) VALUES (?,?,?,?,?)").run(orderId, paymentId ?? null, cleanText(body, 2000), iso(ctx), admin.id);
}

/* ------------------------------------------------------------------ */
/* Manufacturer: their own part of the order                            */
/* ------------------------------------------------------------------ */

function ownFulfillment(ctx: Ctx, actor: Actor | null, fulfillmentId: string) {
  const maker = requireRole(actor, "manufacturer");
  const f = need(getFulfillment(ctx, fulfillmentId), "fulfillment");
  // Another manufacturer's order looks the same as a missing one.
  if (!maker.manufacturerSlug || f.manufacturer_slug !== maker.manufacturerSlug) throw new MarketError("not_found");
  const order = need(getOrder(ctx, f.order_id), "order");
  if (order.status === "cancelled" || order.status === "refunded") throw new MarketError("invalid_state");
  return { maker, f, order };
}

const MAKER_STEPS: Record<"accept" | "prepare" | "ready", { from: FulfillmentStatus[]; to: FulfillmentStatus; notice: string }> = {
  accept: { from: ["new"], to: "accepted", notice: "fulfillment_accepted" },
  prepare: { from: ["accepted"], to: "preparing", notice: "fulfillment_preparing" },
  ready: { from: ["preparing"], to: "ready", notice: "fulfillment_ready" },
};

export function manufacturerStep(ctx: Ctx, actor: Actor | null, fulfillmentId: string, step: keyof typeof MAKER_STEPS) {
  const { maker, f, order } = ownFulfillment(ctx, actor, fulfillmentId);
  const rule = MAKER_STEPS[step];
  if (!rule) throw new MarketError("invalid_input");
  if (!rule.from.includes(f.status)) throw new MarketError("invalid_state");
  tx(ctx.db, () => {
    setFulfillmentStatus(ctx, f, rule.to, maker.id);
    notify(ctx, order.customer_id, rule.notice, { orderId: order.id, fulfillmentId: f.id, params: { maker: f.manufacturer_slug } });
    if (step === "ready") notifyAdmins(ctx, "admin_ready_for_collection", { orderId: order.id, fulfillmentId: f.id, params: { maker: f.manufacturer_slug } });
    syncOrderStatus(ctx, order, maker.id);
  });
}

/** Reverse this shipment's commission, payable and delivery entries with new, linked entries. */
function reverseAllocations(ctx: Ctx, order: OrderRow, f: FulfillmentRow, by: string, why: string) {
  const entries = ctx.db
    .prepare("SELECT id, kind, amount_tetri FROM ledger_entries WHERE fulfillment_id = ? AND kind IN ('commission','manufacturer_payable','delivery_allocation')")
    .all(f.id) as { id: number; kind: LedgerKind; amount_tetri: number }[];
  const reversed = new Set(
    (ctx.db.prepare("SELECT adjusts_entry_id FROM ledger_entries WHERE fulfillment_id = ? AND adjusts_entry_id IS NOT NULL").all(f.id) as { adjusts_entry_id: number }[]).map((r) => r.adjusts_entry_id),
  );
  for (const e of entries)
    if (e.amount_tetri > 0 && !reversed.has(e.id))
      ledger(ctx, { orderId: order.id, fulfillmentId: f.id, maker: f.manufacturer_slug, kind: e.kind, amount: -e.amount_tetri, by, note: `reversal: ${why}`, adjusts: e.id });
}

export function manufacturerReject(ctx: Ctx, actor: Actor | null, fulfillmentId: string, reason: string) {
  const { maker, f, order } = ownFulfillment(ctx, actor, fulfillmentId);
  if (!["new", "accepted", "preparing"].includes(f.status)) throw new MarketError("invalid_state");
  const why = cleanText(reason, 500);
  tx(ctx.db, () => {
    ctx.db.prepare("UPDATE fulfillments SET reject_reason = ? WHERE id = ?").run(why, f.id);
    setFulfillmentStatus(ctx, f, "rejected", maker.id, why);
    reverseAllocations(ctx, order, f, maker.id, "manufacturer rejected");
    const po = payoutOf(ctx, f.id);
    if (po) {
      ctx.db.prepare("UPDATE payouts SET hold_reason = ? WHERE id = ?").run("Manufacturer rejected the order", po.id);
      setPayoutStatus(ctx, order.id, po, "not_eligible", maker.id, "manufacturer rejected");
    }
    notifyAdmins(ctx, "admin_manufacturer_rejected", { orderId: order.id, fulfillmentId: f.id, params: { maker: f.manufacturer_slug, reason: why, refund: f.goods_tetri + f.delivery_tetri } });
    notify(ctx, order.customer_id, "manufacturer_rejected", { orderId: order.id, fulfillmentId: f.id, params: { maker: f.manufacturer_slug } });
    syncOrderStatus(ctx, order, maker.id, why);
  });
}

/* ------------------------------------------------------------------ */
/* Admin: collection, delivery, completion                              */
/* ------------------------------------------------------------------ */

const ADMIN_STEPS: Record<"collect" | "dispatch" | "deliver", { from: FulfillmentStatus[]; to: FulfillmentStatus; notice: string }> = {
  collect: { from: ["ready"], to: "collected", notice: "fulfillment_collected" },
  dispatch: { from: ["collected"], to: "in_delivery", notice: "delivery_started" },
  deliver: { from: ["in_delivery"], to: "delivered", notice: "delivered" },
};

export function adminFulfillmentStep(ctx: Ctx, actor: Actor | null, fulfillmentId: string, step: keyof typeof ADMIN_STEPS, note?: string) {
  const admin = requireRole(actor, "admin");
  const f = need(getFulfillment(ctx, fulfillmentId), "fulfillment");
  const order = need(getOrder(ctx, f.order_id), "order");
  const rule = ADMIN_STEPS[step];
  if (!rule || !rule.from.includes(f.status)) throw new MarketError("invalid_state");
  const msg = cleanText(note, 500, false) || null;
  tx(ctx.db, () => {
    setFulfillmentStatus(ctx, f, rule.to, admin.id, msg ?? (step === "collect" ? "collected and inspected" : null));
    notify(ctx, order.customer_id, rule.notice, { orderId: order.id, fulfillmentId: f.id, params: { maker: f.manufacturer_slug } });
    if (step === "collect") {
      // Collected and inspected: the manufacturer's payout can now be authorized.
      const po = payoutOf(ctx, f.id);
      if (po && po.status === "not_eligible") setPayoutStatus(ctx, order.id, po, order.hold_kind ? "on_hold" : "eligible", admin.id, order.hold_kind ? order.hold_reason : "goods collected and inspected");
    }
    if (order.status === "preparation_delayed" || order.status === "delivery_issue") syncOrderStatus(ctx, order, admin.id, msg, true);
    else syncOrderStatus(ctx, order, admin.id, msg);
  });
}

/** Exception statuses the admin can set on a running order: a delay, or a problem with delivery. */
export function flagOrder(ctx: Ctx, actor: Actor | null, orderId: string, flag: "preparation_delayed" | "delivery_issue", reason: string) {
  const admin = requireRole(actor, "admin");
  const order = need(getOrder(ctx, orderId), "order");
  if (!STAGE_RANK.includes(order.status) && order.status !== "preparation_delayed" && order.status !== "delivery_issue") throw new MarketError("invalid_state");
  const why = cleanText(reason, 500);
  tx(ctx.db, () => {
    setOrderStatus(ctx, order, flag, admin.id, why);
    notify(ctx, order.customer_id, flag === "preparation_delayed" ? "order_delayed" : "delivery_issue", { orderId, params: { reason: why } });
  });
}

/** Clears a delay or delivery-issue flag and returns the order to its normal progress. */
export function clearFlag(ctx: Ctx, actor: Actor | null, orderId: string) {
  const admin = requireRole(actor, "admin");
  const order = need(getOrder(ctx, orderId), "order");
  if (order.status !== "preparation_delayed" && order.status !== "delivery_issue") throw new MarketError("invalid_state");
  tx(ctx.db, () => syncOrderStatus(ctx, order, admin.id, "resolved", true));
}

/** All shipments delivered → the order is complete. The customer or an admin confirms it. */
export function completeOrder(ctx: Ctx, actor: Actor | null, orderId: string) {
  const who = requireRole(actor, "customer", "admin");
  const order = need(getOrder(ctx, orderId), "order");
  if (who.role === "customer" && order.customer_id !== who.id) throw new MarketError("forbidden");
  if (order.status !== "delivered") throw new MarketError("invalid_state");
  tx(ctx.db, () => {
    setOrderStatus(ctx, order, "completed", who.id);
    if (who.role === "admin") notify(ctx, order.customer_id, "order_completed", { orderId });
  });
}

/* ------------------------------------------------------------------ */
/* Admin: manufacturer settlements                                     */
/* ------------------------------------------------------------------ */

function payoutCtx(ctx: Ctx, payoutId: string) {
  const po = need(getPayout(ctx, payoutId), "payout");
  const f = need(getFulfillment(ctx, po.fulfillment_id), "fulfillment");
  const order = need(getOrder(ctx, f.order_id), "order");
  return { po, f, order };
}

export function authorizePayout(ctx: Ctx, actor: Actor | null, payoutId: string) {
  const admin = requireRole(actor, "admin");
  const { po, f, order } = payoutCtx(ctx, payoutId);
  if (po.status !== "eligible") throw new MarketError("invalid_state");
  if (order.hold_kind) throw new MarketError("invalid_state", "order is on hold");
  tx(ctx.db, () => {
    ctx.db.prepare("UPDATE payouts SET authorized_at = ?, authorized_by = ? WHERE id = ?").run(iso(ctx), admin.id, po.id);
    setPayoutStatus(ctx, order.id, po, "authorized", admin.id);
    notifyMaker(ctx, f.manufacturer_slug, "maker_payout_authorized", { orderId: order.id, fulfillmentId: f.id, params: { amount: po.payable_tetri } });
  });
}

/** The admin made the transfer in the bank and records its reference. Not yet confirmed as arrived. */
export function recordPayoutTransfer(ctx: Ctx, actor: Actor | null, payoutId: string, input: { reference: string; date: string; confirmation?: { file: string; name: string } | null }) {
  const admin = requireRole(actor, "admin");
  const { po, order } = payoutCtx(ctx, payoutId);
  if (!["authorized", "transfer_failed"].includes(po.status)) throw new MarketError("invalid_state");
  if (order.hold_kind) throw new MarketError("invalid_state", "order is on hold");
  const reference = cleanText(input.reference, 100);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date ?? "")) throw new MarketError("invalid_input", "invalid date");
  tx(ctx.db, () => {
    ctx.db
      .prepare("UPDATE payouts SET transfer_reference = ?, transfer_date = ?, confirmation_file = COALESCE(?, confirmation_file), confirmation_name = COALESCE(?, confirmation_name) WHERE id = ?")
      .run(reference, input.date, input.confirmation?.file ?? null, input.confirmation?.name ?? null, po.id);
    setPayoutStatus(ctx, order.id, po, "transfer_initiated", admin.id, reference);
  });
}

/** The bank confirms the transfer went through: book the payout in the ledger and tell the manufacturer. */
export function confirmPayoutCompleted(ctx: Ctx, actor: Actor | null, payoutId: string) {
  const admin = requireRole(actor, "admin");
  const { po, f, order } = payoutCtx(ctx, payoutId);
  if (po.status !== "transfer_initiated") throw new MarketError("invalid_state");
  tx(ctx.db, () => {
    ledger(ctx, { orderId: order.id, fulfillmentId: f.id, maker: f.manufacturer_slug, kind: "manufacturer_payout", amount: po.payable_tetri, by: admin.id, bankRef: po.transfer_reference, note: po.id });
    ctx.db.prepare("UPDATE payouts SET completed_at = ?, completed_by = ? WHERE id = ?").run(iso(ctx), admin.id, po.id);
    setPayoutStatus(ctx, order.id, po, "transfer_completed", admin.id);
    notifyMaker(ctx, f.manufacturer_slug, "maker_payout_transferred", { orderId: order.id, fulfillmentId: f.id, params: { amount: po.payable_tetri, reference: po.transfer_reference } });
  });
}

export function markPayoutFailed(ctx: Ctx, actor: Actor | null, payoutId: string, reason: string) {
  const admin = requireRole(actor, "admin");
  const { po, order } = payoutCtx(ctx, payoutId);
  if (po.status !== "transfer_initiated") throw new MarketError("invalid_state");
  const why = cleanText(reason, 500);
  tx(ctx.db, () => setPayoutStatus(ctx, order.id, po, "transfer_failed", admin.id, why));
}

export function holdPayout(ctx: Ctx, actor: Actor | null, payoutId: string, reason: string) {
  const admin = requireRole(actor, "admin");
  const { po, order } = payoutCtx(ctx, payoutId);
  if (!["not_eligible", "eligible", "authorized", "transfer_failed"].includes(po.status)) throw new MarketError("invalid_state");
  const why = cleanText(reason, 500);
  tx(ctx.db, () => {
    ctx.db.prepare("UPDATE payouts SET hold_reason = ? WHERE id = ?").run(why, po.id);
    setPayoutStatus(ctx, order.id, po, "on_hold", admin.id, why);
  });
}

function payoutStatusAfterHold(f: FulfillmentRow): PayoutStatus {
  return ["collected", "in_delivery", "delivered"].includes(f.status) ? "eligible" : "not_eligible";
}

export function releasePayout(ctx: Ctx, actor: Actor | null, payoutId: string) {
  const admin = requireRole(actor, "admin");
  const { po, f, order } = payoutCtx(ctx, payoutId);
  if (po.status !== "on_hold") throw new MarketError("invalid_state");
  if (order.hold_kind) throw new MarketError("invalid_state", "order is on hold");
  if (!ACTIVE(f)) throw new MarketError("invalid_state");
  tx(ctx.db, () => {
    ctx.db.prepare("UPDATE payouts SET hold_reason = NULL WHERE id = ?").run(po.id);
    setPayoutStatus(ctx, order.id, po, payoutStatusAfterHold(f), admin.id, "hold released");
  });
}

/* ------------------------------------------------------------------ */
/* Admin: holds, disputes, cancellations and refunds                    */
/* ------------------------------------------------------------------ */

/** On hold or disputed: no manufacturer payout can be authorized or sent until it is released. */
export function holdOrder(ctx: Ctx, actor: Actor | null, orderId: string, kind: "hold" | "dispute", reason: string) {
  const admin = requireRole(actor, "admin");
  const order = need(getOrder(ctx, orderId), "order");
  if (kind !== "hold" && kind !== "dispute") throw new MarketError("invalid_input");
  const why = cleanText(reason, 500);
  tx(ctx.db, () => {
    ctx.db.prepare("UPDATE orders SET hold_kind = ?, hold_reason = ? WHERE id = ?").run(kind, why, order.id);
    history(ctx, order.id, "order", order.id, order.status, order.status, admin.id, `${kind === "dispute" ? "dispute opened" : "order on hold"}: ${why}`);
    for (const f of fulfillmentsOf(ctx, order.id)) {
      const po = payoutOf(ctx, f.id);
      if (po && ["eligible", "authorized", "transfer_failed"].includes(po.status)) {
        ctx.db.prepare("UPDATE payouts SET hold_reason = ? WHERE id = ?").run(why, po.id);
        setPayoutStatus(ctx, order.id, po, "on_hold", admin.id, why);
      }
    }
  });
}

export function releaseOrder(ctx: Ctx, actor: Actor | null, orderId: string, note?: string) {
  const admin = requireRole(actor, "admin");
  const order = need(getOrder(ctx, orderId), "order");
  if (!order.hold_kind) throw new MarketError("invalid_state");
  const msg = cleanText(note, 500, false);
  tx(ctx.db, () => {
    ctx.db.prepare("UPDATE orders SET hold_kind = NULL, hold_reason = NULL WHERE id = ?").run(order.id);
    history(ctx, order.id, "order", order.id, order.status, order.status, admin.id, `${order.hold_kind === "dispute" ? "dispute resolved" : "hold released"}${msg ? `: ${msg}` : ""}`);
    for (const f of fulfillmentsOf(ctx, order.id)) {
      const po = payoutOf(ctx, f.id);
      if (po && po.status === "on_hold" && ACTIVE(f)) {
        ctx.db.prepare("UPDATE payouts SET hold_reason = NULL WHERE id = ?").run(po.id);
        setPayoutStatus(ctx, order.id, po, payoutStatusAfterHold(f), admin.id, "order hold released");
      }
    }
  });
}

/** Money the customer paid that has not been promised back yet. */
const refundable = (ctx: Ctx, orderId: string) => ledgerSum(ctx, orderId, "customer_payment") - ledgerSum(ctx, orderId, "refund_due");

export function cancelOrder(ctx: Ctx, actor: Actor | null, orderId: string, reason: string) {
  const admin = requireRole(actor, "admin");
  const order = need(getOrder(ctx, orderId), "order");
  if (["completed", "cancelled", "refunded", "refund_processing"].includes(order.status)) throw new MarketError("invalid_state");
  const why = cleanText(reason, 500);
  tx(ctx.db, () => {
    for (const f of fulfillmentsOf(ctx, order.id)) {
      const po = payoutOf(ctx, f.id);
      if (ACTIVE(f) && f.status !== "delivered") {
        setFulfillmentStatus(ctx, f, "cancelled", admin.id, why);
        notifyMaker(ctx, f.manufacturer_slug, "maker_order_cancelled", { orderId: order.id, fulfillmentId: f.id, params: { reason: why } });
      }
      // A payout that already left the bank stays recorded; everything else is reversed.
      if (po && po.status !== "transfer_completed") {
        reverseAllocations(ctx, order, f, admin.id, "order cancelled");
        ctx.db.prepare("UPDATE payouts SET hold_reason = ? WHERE id = ?").run("Order cancelled", po.id);
        if (po.status !== "not_eligible") setPayoutStatus(ctx, order.id, po, "not_eligible", admin.id, "order cancelled");
      }
    }
    for (const p of paymentsOf(ctx, order.id)) if (["awaiting_payment", "submitted", "verification_pending"].includes(p.status)) setPaymentStatus(ctx, p, "rejected", admin.id, "order cancelled");
    const owed = refundable(ctx, order.id);
    setOrderStatus(ctx, order, "cancelled", admin.id, why);
    notify(ctx, order.customer_id, "order_cancelled", { orderId: order.id, params: { reason: why, refund: owed } });
    if (owed > 0) createRefundInTx(ctx, admin, order, owed, `Order cancelled: ${why}`, null);
  });
}

function createRefundInTx(ctx: Ctx, admin: Actor, order: OrderRow, amount: Tetri, reason: string, fulfillmentId: string | null) {
  const id = nextId(ctx, "refunds", "RF");
  ctx.db
    .prepare("INSERT INTO refunds (id, order_id, fulfillment_id, amount_tetri, reason, status, created_at, created_by) VALUES (?,?,?,?,?,?,?,?)")
    .run(id, order.id, fulfillmentId, amount, reason, "pending", iso(ctx), admin.id);
  history(ctx, order.id, "refund", id, null, "pending", admin.id, reason);
  ledger(ctx, { orderId: order.id, fulfillmentId, kind: "refund_due", amount, by: admin.id, note: `${id}: ${reason}` });
  const paid = paymentsOf(ctx, order.id).filter((p) => ["confirmed", "incorrect_amount", "partial"].includes(p.status)).at(-1);
  if (paid) setPaymentStatus(ctx, paid, "refund_pending", admin.id, id);
  setOrderStatus(ctx, order, "refund_processing", admin.id, reason);
  notify(ctx, order.customer_id, "refund_pending", { orderId: order.id, params: { amount, refund: id } });
  return id;
}

/** Record a full or partial refund owed to the customer (paid by manual bank transfer later). */
export function createRefund(ctx: Ctx, actor: Actor | null, orderId: string, input: { amount: string | number; reason: string; fulfillmentId?: string | null }): string {
  const admin = requireRole(actor, "admin");
  const order = need(getOrder(ctx, orderId), "order");
  const amount = positiveTetri(input.amount);
  const reason = cleanText(input.reason, 500);
  if (input.fulfillmentId && need(getFulfillment(ctx, input.fulfillmentId), "fulfillment").order_id !== order.id) throw new MarketError("invalid_input");
  if (amount > refundable(ctx, order.id)) throw new MarketError("invalid_input", "refund is larger than the money received");
  return tx(ctx.db, () => createRefundInTx(ctx, admin, order, amount, reason, input.fulfillmentId ?? null));
}

/** The admin sent the refund from the bank: record it with its reference. */
export function completeRefund(ctx: Ctx, actor: Actor | null, refundId: string, input: { reference: string; date: string }) {
  const admin = requireRole(actor, "admin");
  const r = need(getRefund(ctx, refundId), "refund");
  if (r.status !== "pending") throw new MarketError("invalid_state");
  const reference = cleanText(input.reference, 100);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date ?? "")) throw new MarketError("invalid_input", "invalid date");
  const order = need(getOrder(ctx, r.order_id), "order");
  tx(ctx.db, () => {
    ctx.db.prepare("UPDATE refunds SET status = 'completed', reference = ?, transfer_date = ?, completed_at = ?, completed_by = ? WHERE id = ?").run(reference, input.date, iso(ctx), admin.id, r.id);
    history(ctx, order.id, "refund", r.id, "pending", "completed", admin.id, reference);
    ledger(ctx, { orderId: order.id, fulfillmentId: r.fulfillment_id, kind: "refund_paid", amount: r.amount_tetri, by: admin.id, bankRef: reference, note: r.id });

    const stillPending = (ctx.db.prepare("SELECT COUNT(*) AS n FROM refunds WHERE order_id = ? AND status = 'pending'").get(order.id) as { n: number }).n;
    const fully = ledgerSum(ctx, order.id, "refund_paid") >= ledgerSum(ctx, order.id, "customer_payment");
    const lastPayment = paymentsOf(ctx, order.id).filter((p) => p.status === "refund_pending").at(-1);
    if (fully) {
      if (lastPayment) setPaymentStatus(ctx, lastPayment, "refunded", admin.id, r.id);
      setOrderStatus(ctx, order, "refunded", admin.id, reference);
    } else if (!stillPending) {
      if (lastPayment) setPaymentStatus(ctx, lastPayment, "confirmed", admin.id, `partial refund ${r.id} sent`);
      const cancelledOrRejected = fulfillmentsOf(ctx, order.id).every((f) => !ACTIVE(f));
      if (cancelledOrRejected) setOrderStatus(ctx, order, "cancelled", admin.id, "partial refund sent");
      else syncOrderStatus(ctx, order, admin.id, "partial refund sent", true);
    }
    notify(ctx, order.customer_id, "refund_completed", { orderId: order.id, params: { amount: r.amount_tetri, reference } });
  });
}

/* ------------------------------------------------------------------ */
/* Reminders                                                            */
/* ------------------------------------------------------------------ */

/** Tell manufacturers when a preparation deadline is less than a day away (once per shipment). */
export function sendDeadlineReminders(ctx: Ctx) {
  const soon = new Date(ctx.now().getTime() + 86_400_000).toISOString();
  const due = ctx.db
    .prepare(
      `SELECT f.* FROM fulfillments f WHERE f.status IN ('new','accepted','preparing') AND f.prepare_by IS NOT NULL AND f.prepare_by <= ?
       AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.fulfillment_id = f.id AND n.kind = 'maker_deadline')`,
    )
    .all(soon) as unknown as FulfillmentRow[];
  if (!due.length) return 0;
  tx(ctx.db, () => {
    for (const f of due) notifyMaker(ctx, f.manufacturer_slug, "maker_deadline", { orderId: f.order_id, fulfillmentId: f.id, params: { prepareBy: f.prepare_by } });
  });
  return due.length;
}
