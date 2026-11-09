import { beforeEach, describe, expect, it } from "vitest";
import { percentOf, toTetri } from "../money";
import { adminOrder, adminPayments, customerOrder, customerOrders, financialOverview, makerFinance, makerOrder, makerOrders, notificationsFor, orderFinance } from "./queries";
import { DEMO_ADMIN, DEMO_CUSTOMERS, makerUserId, seedOrders } from "./seed";
import { memoryMarket } from "./server";
import {
  addNote,
  adminFulfillmentStep,
  authorizePayout,
  cancelOrder,
  completeOrder,
  completeRefund,
  confirmPayoutCompleted,
  createRefund,
  fulfillmentsOf,
  getOrder,
  getPayout,
  holdOrder,
  ledgerSum,
  manufacturerReject,
  manufacturerStep,
  paymentsOf,
  placeOrder,
  recordIncomingPayment,
  recordPayoutTransfer,
  rejectPayment,
  releaseOrder,
  requestAdditionalPayment,
  startVerification,
  submitPayment,
  type Ctx,
} from "./service";
import { TEST_BANK, getSettings, updateSettings } from "./settings";
import type { Actor } from "./types";

const [nino, giorgi] = DEMO_CUSTOMERS;
const admin = DEMO_ADMIN;
const maker = (slug: string): Actor => ({ id: makerUserId(slug), role: "manufacturer", name: slug, manufacturerSlug: slug });
const timber = maker("imereti-timber-works");
const botanicals = maker("bakuriani-botanicals");
const paints = maker("mtatsminda-paints");

let ctx: Ctx;
let clock: number;
beforeEach(() => {
  clock = Date.parse("2026-11-09T09:00:00Z");
  ctx = memoryMarket(() => new Date(clock));
});
const later = (h: number) => (clock += h * 3600_000);
const today = () => new Date(clock).toISOString().slice(0, 10);
const lari = (t: number) => (t / 100).toFixed(2);

const address = { city: "Tbilisi", name: "Nino Kapanadze", phone: "+995 555 11 22 33", address: "12 Chavchavadze Ave" };
const order = (lines: { slug: string; qty: number }[], who = nino, city = "Tbilisi") => placeOrder(ctx, who, { ...address, city, lines });
const payment = (orderId: string) => paymentsOf(ctx, orderId).at(-1)!;
const payoutFor = (fid: string) => (ctx.db.prepare("SELECT id FROM payouts WHERE fulfillment_id = ?").get(fid) as { id: string }).id;
const kinds = (userId: string) => notificationsFor(ctx, { ...admin, id: userId, role: "customer" }).map((n) => n.kind);

/** Customer pays the full amount and an admin verifies it in the bank. */
function payInFull(orderId: string, who = nino) {
  const total = getOrder(ctx, orderId)!.total_tetri;
  const pid = submitPayment(ctx, who, orderId, { amount: lari(total), date: today(), reference: "BOG-123" });
  startVerification(ctx, admin, pid);
  recordIncomingPayment(ctx, admin, pid, { received: lari(total), bankReference: "IN-1" });
  return pid;
}

describe("full workflow: order → bank transfer → verification → preparation → collection → payout → delivery", () => {
  it("runs end to end with a correct ledger and notifications", () => {
    const id = order([{ slug: "walnut-cutting-board", qty: 2 }]);
    let o = getOrder(ctx, id)!;
    expect(o.status).toBe("awaiting_payment");
    expect(o.goods_tetri).toBe(17000);
    expect(o.total_tetri).toBe(o.goods_tetri + o.delivery_tetri);
    expect(o.commission_bps).toBe(500);

    // Customer sees bank details and the amount; the order number is the payment reference.
    const view = customerOrder(ctx, nino, id);
    expect(view.bank.iban).toBe(getSettings(ctx).bankIban);
    expect(view.due).toBe(o.total_tetri);
    expect(kinds(nino.id)).toEqual(expect.arrayContaining(["order_placed", "payment_instructions"]));

    // "I have made the payment" does NOT confirm the payment.
    const pid = submitPayment(ctx, nino, id, { amount: lari(o.total_tetri), date: today(), reference: "BOG-998877", receipt: { file: "r1.pdf", name: "receipt.pdf" } });
    expect(payment(id).status).toBe("submitted");
    expect(getOrder(ctx, id)!.status).toBe("payment_submitted");
    expect(ledgerSum(ctx, id, "customer_payment")).toBe(0);
    expect(fulfillmentsOf(ctx, id)[0].status).toBe("awaiting_payment");

    // Admin checks the bank and records what arrived.
    startVerification(ctx, admin, pid);
    expect(payment(id).status).toBe("verification_pending");
    recordIncomingPayment(ctx, admin, pid, { received: lari(o.total_tetri), bankReference: "IN-55" });
    expect(payment(id).status).toBe("confirmed");
    expect(payment(id).verified_by).toBe(admin.id);
    expect(getOrder(ctx, id)!.status).toBe("payment_confirmed");
    const f = fulfillmentsOf(ctx, id)[0];
    expect(f.status).toBe("new");
    expect(f.prepare_by).not.toBeNull();
    expect(kinds(timber.id)).toEqual(["maker_payment_verified", "maker_new_order"]);

    // Commission 5% of the product subtotal; delivery is not the manufacturer's money.
    expect(f.commission_tetri).toBe(850);
    expect(f.payable_tetri).toBe(16150);

    // Manufacturer prepares.
    for (const step of ["accept", "prepare", "ready"] as const) manufacturerStep(ctx, timber, f.id, step);
    expect(getOrder(ctx, id)!.status).toBe("ready");
    const po = payoutFor(f.id);
    expect(getPayout(ctx, po)!.status).toBe("not_eligible");
    expect(() => authorizePayout(ctx, admin, po)).toThrow("invalid_state");

    // Collected and inspected → payout eligible.
    adminFulfillmentStep(ctx, admin, f.id, "collect");
    expect(getPayout(ctx, po)!.status).toBe("eligible");
    authorizePayout(ctx, admin, po);
    recordPayoutTransfer(ctx, admin, po, { reference: "OUT-77", date: today() });
    expect(getPayout(ctx, po)!.status).toBe("transfer_initiated");
    expect(ledgerSum(ctx, id, "manufacturer_payout")).toBe(0); // not booked until the bank confirms
    confirmPayoutCompleted(ctx, admin, po);
    expect(getPayout(ctx, po)!.status).toBe("transfer_completed");
    expect(ledgerSum(ctx, id, "manufacturer_payout")).toBe(16150);
    const makerKinds = kinds(timber.id);
    expect(makerKinds).toContain("maker_payout_authorized");
    expect(makerKinds).toContain("maker_payout_transferred");

    adminFulfillmentStep(ctx, admin, f.id, "dispatch");
    adminFulfillmentStep(ctx, admin, f.id, "deliver");
    expect(getOrder(ctx, id)!.status).toBe("delivered");
    completeOrder(ctx, nino, id);
    o = getOrder(ctx, id)!;
    expect(o.status).toBe("completed");

    const fin = orderFinance(ctx, o);
    expect(fin.received).toBe(o.total_tetri);
    expect(fin.commission + fin.payable + fin.delivery).toBe(fin.received);
    expect(fin.owedToManufacturers).toBe(0);
    expect(fin.held).toBe(o.total_tetri - 16150);

    // Every status change is recorded with who and when.
    const timeline = customerOrder(ctx, nino, id).history.filter((h) => h.entity === "order").map((h) => h.to_status);
    expect(timeline).toEqual(["placed", "awaiting_payment", "payment_submitted", "payment_confirmed", "preparing", "ready", "collected", "in_delivery", "delivered", "completed"]);
    expect(kinds(nino.id)).toEqual(
      expect.arrayContaining(["payment_verified", "fulfillment_accepted", "fulfillment_preparing", "fulfillment_ready", "fulfillment_collected", "delivery_started", "delivered"]),
    );
  });

  it("recalculates prices on the server and ignores anything else the browser sends", () => {
    const id = placeOrder(ctx, nino, { ...address, lines: [{ slug: "walnut-cutting-board", qty: 1, price: 1 } as never, { slug: "not-a-product", qty: 5 }] });
    expect(getOrder(ctx, id)!.goods_tetri).toBe(8500);
    expect(() => placeOrder(ctx, nino, { ...address, lines: [{ slug: "hotel-wardrobe-custom", qty: 1 }] })).toThrow("empty_cart");
  });
});

describe("incorrect and rejected payments", () => {
  it("partial payment keeps the order waiting; the rest completes it", () => {
    const id = order([{ slug: "walnut-cutting-board", qty: 1 }]);
    const total = getOrder(ctx, id)!.total_tetri;
    const p1 = submitPayment(ctx, nino, id, { amount: "50.00", date: today(), reference: "A" });
    recordIncomingPayment(ctx, admin, p1, { received: "50.00", bankReference: "IN-A" });
    expect(payment(id).status).toBe("partial");
    expect(getOrder(ctx, id)!.status).toBe("awaiting_payment");
    expect(fulfillmentsOf(ctx, id)[0].status).toBe("awaiting_payment");
    expect(customerOrder(ctx, nino, id).due).toBe(total - 5000);

    requestAdditionalPayment(ctx, admin, id, "Please send the rest");
    expect(kinds(nino.id)).toContain("payment_additional");

    const p2 = submitPayment(ctx, nino, id, { amount: lari(total - 5000), date: today(), reference: "B" });
    expect(p2).not.toBe(p1);
    recordIncomingPayment(ctx, admin, p2, { received: lari(total - 5000), bankReference: "IN-B" });
    expect(getOrder(ctx, id)!.status).toBe("payment_confirmed");
    expect(paymentsOf(ctx, id).map((p) => p.status)).toEqual(["confirmed", "confirmed"]);
  });

  it("overpayment is confirmed but flagged as incorrect amount", () => {
    const id = order([{ slug: "walnut-cutting-board", qty: 1 }]);
    const total = getOrder(ctx, id)!.total_tetri;
    const p = submitPayment(ctx, nino, id, { amount: lari(total + 1000), date: today(), reference: "X" });
    recordIncomingPayment(ctx, admin, p, { received: lari(total + 1000), bankReference: "IN-X" });
    expect(payment(id).status).toBe("incorrect_amount");
    expect(getOrder(ctx, id)!.status).toBe("payment_confirmed");
    expect(kinds(admin.id)).toContain("admin_overpaid");
    // The extra 10 ₾ can be refunded.
    const r = createRefund(ctx, admin, id, { amount: "10.00", reason: "Overpaid" });
    completeRefund(ctx, admin, r, { reference: "RET-1", date: today() });
    expect(ledgerSum(ctx, id, "refund_paid")).toBe(1000);
  });

  it("a rejected payment can be submitted again; nothing reaches the ledger", () => {
    const id = order([{ slug: "walnut-cutting-board", qty: 1 }]);
    const p = submitPayment(ctx, nino, id, { amount: "100.00", date: today(), reference: "WRONG" });
    rejectPayment(ctx, admin, p, "No transfer with this reference found");
    expect(payment(id).status).toBe("rejected");
    expect(getOrder(ctx, id)!.status).toBe("payment_rejected");
    expect(ledgerSum(ctx, id, "customer_payment")).toBe(0);
    expect(kinds(nino.id)).toContain("payment_rejected");
    payInFull(id);
    expect(getOrder(ctx, id)!.status).toBe("payment_confirmed");
    expect(paymentsOf(ctx, id)).toHaveLength(2);
    expect(paymentsOf(ctx, id)[0].status).toBe("rejected");
  });

  it("rejects bad amounts and dates", () => {
    const id = order([{ slug: "walnut-cutting-board", qty: 1 }]);
    expect(() => submitPayment(ctx, nino, id, { amount: "-5", date: today(), reference: "A" })).toThrow();
    expect(() => submitPayment(ctx, nino, id, { amount: "12.345", date: today(), reference: "A" })).toThrow();
    expect(() => submitPayment(ctx, nino, id, { amount: "10", date: "2099-01-01", reference: "A" })).toThrow();
  });
});

describe("manufacturer rejection, cancellation and refunds", () => {
  it("manufacturer rejection reverses its allocations and lets the admin refund", () => {
    const id = order([{ slug: "walnut-cutting-board", qty: 1 }]);
    payInFull(id);
    const f = fulfillmentsOf(ctx, id)[0];
    expect(() => manufacturerReject(ctx, timber, f.id, "")).toThrow("invalid_input");
    manufacturerReject(ctx, timber, f.id, "Workshop closed this week");
    expect(getOrder(ctx, id)!.status).toBe("manufacturer_rejected");
    expect(ledgerSum(ctx, id, "commission")).toBe(0);
    expect(ledgerSum(ctx, id, "manufacturer_payable")).toBe(0);
    // History is never overwritten: the original entries are still there, plus reversals.
    const ledger = adminOrder(ctx, admin, id).ledger;
    expect(ledger.filter((l) => l.amount_tetri < 0).every((l) => l.adjusts_entry_id !== null)).toBe(true);
    expect(kinds(admin.id)).toContain("admin_manufacturer_rejected");
    expect(kinds(nino.id)).toContain("manufacturer_rejected");

    const total = getOrder(ctx, id)!.total_tetri;
    const r = createRefund(ctx, admin, id, { amount: lari(total), reason: "Manufacturer rejected" });
    expect(getOrder(ctx, id)!.status).toBe("refund_processing");
    expect(payment(id).status).toBe("refund_pending");
    expect(() => createRefund(ctx, admin, id, { amount: "1.00", reason: "again" })).toThrow("invalid_input");
    completeRefund(ctx, admin, r, { reference: "RET-9", date: today() });
    expect(getOrder(ctx, id)!.status).toBe("refunded");
    expect(payment(id).status).toBe("refunded");
    expect(ledgerSum(ctx, id, "refund_paid")).toBe(total);
    expect(kinds(nino.id)).toEqual(expect.arrayContaining(["refund_pending", "refund_completed"]));
  });

  it("cancelling a paid order creates the refund, reverses allocations and tells the manufacturer", () => {
    const id = order([{ slug: "walnut-cutting-board", qty: 1 }]);
    payInFull(id);
    const f = fulfillmentsOf(ctx, id)[0];
    manufacturerStep(ctx, timber, f.id, "accept");
    cancelOrder(ctx, admin, id, "Customer changed their mind");
    expect(getOrder(ctx, id)!.status).toBe("refund_processing");
    expect(fulfillmentsOf(ctx, id)[0].status).toBe("cancelled");
    expect(getPayout(ctx, payoutFor(f.id))!.status).toBe("not_eligible");
    expect(kinds(timber.id)).toContain("maker_order_cancelled");
    expect(() => manufacturerStep(ctx, timber, f.id, "prepare")).toThrow();
    const refund = adminOrder(ctx, admin, id).refunds[0];
    expect(refund.amount_tetri).toBe(getOrder(ctx, id)!.total_tetri);
    completeRefund(ctx, admin, refund.id, { reference: "RET-2", date: today() });
    expect(getOrder(ctx, id)!.status).toBe("refunded");
  });

  it("cancelling an unpaid order needs no refund", () => {
    const id = order([{ slug: "walnut-cutting-board", qty: 1 }]);
    cancelOrder(ctx, admin, id, "No payment received");
    expect(getOrder(ctx, id)!.status).toBe("cancelled");
    expect(adminOrder(ctx, admin, id).refunds).toHaveLength(0);
    expect(payment(id).status).toBe("rejected");
  });

  it("a dispute blocks payouts until it is resolved", () => {
    const id = order([{ slug: "walnut-cutting-board", qty: 1 }]);
    payInFull(id);
    const f = fulfillmentsOf(ctx, id)[0];
    for (const s of ["accept", "prepare", "ready"] as const) manufacturerStep(ctx, timber, f.id, s);
    adminFulfillmentStep(ctx, admin, f.id, "collect");
    const po = payoutFor(f.id);
    holdOrder(ctx, admin, id, "dispute", "Customer reports damage");
    expect(getPayout(ctx, po)!.status).toBe("on_hold");
    expect(() => authorizePayout(ctx, admin, po)).toThrow("invalid_state");
    releaseOrder(ctx, admin, id, "Damage was cosmetic, customer accepted a discount");
    expect(getPayout(ctx, po)!.status).toBe("eligible");
    authorizePayout(ctx, admin, po);
  });

  it("partial refund keeps the order going", () => {
    const id = order([{ slug: "walnut-cutting-board", qty: 2 }]);
    payInFull(id);
    const r = createRefund(ctx, admin, id, { amount: "20.00", reason: "Small scratch, agreed discount" });
    completeRefund(ctx, admin, r, { reference: "RET-3", date: today() });
    expect(getOrder(ctx, id)!.status).toBe("payment_confirmed");
    expect(payment(id).status).toBe("confirmed");
  });
});

describe("several manufacturers in one order", () => {
  it("keeps separate shipments and settlements, and the order follows the slowest shipment", () => {
    const id = order([
      { slug: "walnut-cutting-board", qty: 1 },
      { slug: "honey-propolis-soap", qty: 4 },
      { slug: "interior-paint-matte-10l", qty: 1 },
    ]);
    const fs = fulfillmentsOf(ctx, id);
    expect(fs).toHaveLength(3);
    const o = getOrder(ctx, id)!;
    expect(fs.reduce((s, f) => s + f.goods_tetri, 0)).toBe(o.goods_tetri);
    expect(fs.reduce((s, f) => s + f.delivery_tetri, 0)).toBe(o.delivery_tetri);
    payInFull(id);

    const fOf = (slug: string) => fulfillmentsOf(ctx, id).find((f) => f.manufacturer_slug === slug)!;
    for (const s of ["accept", "prepare", "ready"] as const) manufacturerStep(ctx, timber, fOf(timber.manufacturerSlug!).id, s);
    manufacturerStep(ctx, botanicals, fOf(botanicals.manufacturerSlug!).id, "accept");
    expect(getOrder(ctx, id)!.status).toBe("payment_confirmed");

    // One manufacturer rejects; the others continue and get paid separately.
    manufacturerReject(ctx, paints, fOf(paints.manufacturerSlug!).id, "Colour discontinued");
    expect(getOrder(ctx, id)!.status).toBe("payment_confirmed");
    adminFulfillmentStep(ctx, admin, fOf(timber.manufacturerSlug!).id, "collect");
    expect(getPayout(ctx, payoutFor(fOf(timber.manufacturerSlug!).id))!.status).toBe("eligible");
    expect(getPayout(ctx, payoutFor(fOf(botanicals.manufacturerSlug!).id))!.status).toBe("not_eligible");

    // Each manufacturer sees only its own part.
    const mine = makerOrders(ctx, timber);
    expect(mine).toHaveLength(1);
    expect(mine[0].items.every((i) => i.fulfillment_id === mine[0].id)).toBe(true);
    expect(JSON.stringify(mine)).not.toContain("honey-propolis-soap");
    expect(JSON.stringify(mine)).not.toContain(address.address);
    expect(() => makerOrder(ctx, timber, fOf(botanicals.manufacturerSlug!).id)).toThrow("not_found");
    const fin = makerFinance(ctx, timber);
    expect(fin.payable).toBe(fOf(timber.manufacturerSlug!).payable_tetri);

    // The customer sees one order with every shipment, but no commission or payouts.
    const view = customerOrder(ctx, nino, id);
    expect(view.shipments).toHaveLength(3);
    expect(JSON.stringify(view)).not.toMatch(/commission|payable|payout/);
  });
});

describe("commission settings", () => {
  it("defaults to 5% of the product subtotal", () => {
    expect(getSettings(ctx).commissionBps).toBe(500);
    expect(getSettings(ctx).commissionBase).toBe("products");
  });

  it("a changed rate applies only to new orders, and can include delivery", () => {
    const before = order([{ slug: "walnut-cutting-board", qty: 2 }]);
    updateSettings(ctx, admin, { commissionBps: 750, commissionBase: "products_and_delivery" });
    const after = order([{ slug: "walnut-cutting-board", qty: 2 }]);
    const f1 = fulfillmentsOf(ctx, before)[0];
    const f2 = fulfillmentsOf(ctx, after)[0];
    expect(f1.commission_tetri).toBe(850);
    expect(getOrder(ctx, after)!.commission_bps).toBe(750);
    expect(f2.commission_tetri).toBe(percentOf(f2.goods_tetri + f2.delivery_tetri, 750));
    expect(f2.payable_tetri).toBe(f2.goods_tetri - f2.commission_tetri);
    // Settings history is kept.
    expect(ctx.db.prepare("SELECT COUNT(*) AS n FROM settings_history").get()).toEqual({ n: 2 });
  });

  it("uses exact integer maths (no floating-point drift)", () => {
    updateSettings(ctx, admin, { commissionBps: 333 });
    const id = order([{ slug: "honey-propolis-soap", qty: 7 }]);
    const f = fulfillmentsOf(ctx, id)[0];
    expect(Number.isInteger(f.commission_tetri)).toBe(true);
    expect(f.commission_tetri + f.payable_tetri).toBe(f.goods_tetri);
    expect(toTetri("0.1") + toTetri("0.2")).toBe(toTetri("0.3"));
  });

  it("refuses invalid settings and non-admins", () => {
    expect(() => updateSettings(ctx, admin, { commissionBps: -1 })).toThrow();
    expect(() => updateSettings(ctx, admin, { commissionBase: "everything" })).toThrow();
    expect(() => updateSettings(ctx, nino, { commissionBps: 0 })).toThrow("forbidden");
    expect(() => updateSettings(ctx, timber, { bankIban: "GE00 MINE" })).toThrow("forbidden");
  });
});

describe("unauthorized access", () => {
  it("customers cannot verify payments, act for others, or read other people's orders", () => {
    const id = order([{ slug: "walnut-cutting-board", qty: 1 }]);
    const p = submitPayment(ctx, nino, id, { amount: "100", date: today(), reference: "A" });
    expect(() => recordIncomingPayment(ctx, nino, p, { received: "100", bankReference: "x" })).toThrow("forbidden");
    expect(() => startVerification(ctx, nino, p)).toThrow("forbidden");
    expect(() => submitPayment(ctx, giorgi, id, { amount: "1", date: today(), reference: "A" })).toThrow("forbidden");
    expect(() => customerOrder(ctx, giorgi, id)).toThrow("not_found");
    expect(customerOrders(ctx, giorgi)).toHaveLength(0);
    expect(() => adminPayments(ctx, nino)).toThrow("forbidden");
    expect(() => financialOverview(ctx, nino)).toThrow("forbidden");
    expect(() => cancelOrder(ctx, nino, id, "x")).toThrow("forbidden");
    expect(() => addNote(ctx, nino, id, "x")).toThrow("forbidden");
  });

  it("manufacturers cannot confirm payments or payouts, or touch other manufacturers' orders", () => {
    const id = order([{ slug: "walnut-cutting-board", qty: 1 }, { slug: "honey-propolis-soap", qty: 1 }]);
    const p = submitPayment(ctx, nino, id, { amount: lari(getOrder(ctx, id)!.total_tetri), date: today(), reference: "A" });
    expect(() => recordIncomingPayment(ctx, timber, p, { received: "1000", bankReference: "x" })).toThrow("forbidden");
    recordIncomingPayment(ctx, admin, p, { received: lari(getOrder(ctx, id)!.total_tetri), bankReference: "IN" });
    const other = fulfillmentsOf(ctx, id).find((f) => f.manufacturer_slug === "bakuriani-botanicals")!;
    expect(() => manufacturerStep(ctx, timber, other.id, "accept")).toThrow("not_found");
    expect(() => manufacturerReject(ctx, timber, other.id, "no")).toThrow("not_found");
    const po = payoutFor(other.id);
    expect(() => authorizePayout(ctx, timber, po)).toThrow("forbidden");
    expect(() => confirmPayoutCompleted(ctx, timber, po)).toThrow("forbidden");
    expect(() => adminFulfillmentStep(ctx, timber, other.id, "collect")).toThrow("forbidden");
    expect(() => adminOrder(ctx, timber, id)).toThrow("forbidden");
    expect(() => placeOrder(ctx, timber, { ...address, lines: [{ slug: "walnut-cutting-board", qty: 1 }] })).toThrow("forbidden");
  });

  it("anonymous visitors can do nothing", () => {
    expect(() => placeOrder(ctx, null, { ...address, lines: [{ slug: "walnut-cutting-board", qty: 1 }] })).toThrow("forbidden");
    expect(() => customerOrders(ctx, null)).toThrow("forbidden");
  });

  it("a payment can't be confirmed twice, and steps can't be skipped", () => {
    const id = order([{ slug: "walnut-cutting-board", qty: 1 }]);
    const p = payInFull(id);
    expect(() => recordIncomingPayment(ctx, admin, p, { received: "1", bankReference: "again" })).toThrow("invalid_state");
    const f = fulfillmentsOf(ctx, id)[0];
    expect(() => manufacturerStep(ctx, timber, f.id, "ready")).toThrow("invalid_state");
    expect(() => adminFulfillmentStep(ctx, admin, f.id, "deliver")).toThrow("invalid_state");
  });
});

describe("audit trail", () => {
  it("ledger, history and notes can't be edited or deleted", () => {
    const id = order([{ slug: "walnut-cutting-board", qty: 1 }]);
    payInFull(id);
    addNote(ctx, admin, id, "Checked with the bank by phone");
    expect(() => ctx.db.prepare("UPDATE ledger_entries SET amount_tetri = 1").run()).toThrow(/append-only/);
    expect(() => ctx.db.prepare("DELETE FROM ledger_entries").run()).toThrow(/append-only/);
    expect(() => ctx.db.prepare("UPDATE status_history SET to_status = 'x'").run()).toThrow(/append-only/);
    expect(() => ctx.db.prepare("DELETE FROM notes").run()).toThrow(/append-only/);
  });

  it("every status change records previous status, new status, time and who", () => {
    const id = order([{ slug: "walnut-cutting-board", qty: 1 }]);
    later(2);
    payInFull(id);
    const h = adminOrder(ctx, admin, id).history;
    expect(h.length).toBeGreaterThan(5);
    for (const row of h) {
      expect(row.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(row.by_user).toBeTruthy();
      expect(row.to_status).toBeTruthy();
    }
    const confirmed = h.find((x) => x.entity === "payment" && x.to_status === "confirmed")!;
    expect(confirmed.from_status).toBe("verification_pending");
    expect(confirmed.by_user).toBe(admin.id);
  });
});

describe("demo data", () => {
  it("seeds a consistent set of orders through the real workflow", () => {
    seedOrders(ctx);
    const ov = financialOverview(ctx, admin, { test: true });
    expect(financialOverview(ctx, admin).received).toBe(0);
    expect(ov.received).toBeGreaterThan(0);
    expect(ov.payoutsCompleted).toBeGreaterThan(0);
    expect(ov.awaitingVerification.n).toBe(1);
    expect(ov.refundsPending.n).toBe(1);
    expect(ov.ledgerNet).toBe(ov.received - ov.payoutsCompleted - ov.refundsCompleted);
    const last = (ctx.db.prepare("SELECT MAX(at) AS m FROM status_history").get() as { m: string }).m;
    expect(Date.parse(last)).toBeLessThanOrEqual(clock);
  });
});

describe("test mode", () => {
  it("marks orders as TEST, hides real bank details and keeps them out of the real totals", () => {
    updateSettings(ctx, admin, { bankIban: "GE29 REAL 0000 1111 2222 33" });
    const real = order([{ slug: "walnut-cutting-board", qty: 1 }]);
    payInFull(real);
    ctx.testMode = true;
    const test = order([{ slug: "walnut-cutting-board", qty: 1 }]);
    expect(getOrder(ctx, real)!.is_test).toBe(0);
    expect(getOrder(ctx, test)!.is_test).toBe(1);

    const view = customerOrder(ctx, nino, test);
    expect(view.isTest).toBe(true);
    expect(view.bank).toEqual(TEST_BANK);
    expect(JSON.stringify(view)).not.toContain("GE29 REAL");
    expect(customerOrder(ctx, nino, real).bank.iban).toBe("GE29 REAL 0000 1111 2222 33");

    // A test payment is never confirmed by the form: it still waits for an admin.
    const pid = submitPayment(ctx, nino, test, { amount: lari(getOrder(ctx, test)!.total_tetri), date: today(), reference: "TEST-1" });
    expect(payment(test).status).toBe("submitted");
    recordIncomingPayment(ctx, admin, pid, { received: lari(getOrder(ctx, test)!.total_tetri), bankReference: "TEST" });

    const realTotals = financialOverview(ctx, admin);
    const testTotals = financialOverview(ctx, admin, { test: true });
    expect(realTotals.received).toBe(getOrder(ctx, real)!.total_tetri);
    expect(testTotals.received).toBe(getOrder(ctx, test)!.total_tetri);
    expect(realTotals.testOrders).toBe(1);
  });

  it("saves the customer's email and rejects an invalid one", () => {
    const id = placeOrder(ctx, nino, { ...address, email: "nino@example.ge", lines: [{ slug: "walnut-cutting-board", qty: 1 }] });
    expect(getOrder(ctx, id)!.delivery_email).toBe("nino@example.ge");
    expect(() => placeOrder(ctx, nino, { ...address, email: "not-an-email", lines: [{ slug: "walnut-cutting-board", qty: 1 }] })).toThrow("invalid_input");
  });
});
