/**
 * Demo accounts and demo orders, so every screen has something to show.
 * The orders are created through the real workflow functions (not inserted by hand),
 * with a controlled clock, so their history and ledger are exactly what the app would record.
 */
import { MANUFACTURERS } from "../demo-data";
import { tx } from "./db";
import {
  addNote,
  adminFulfillmentStep,
  authorizePayout,
  confirmPayoutCompleted,
  createRefund,
  fulfillmentsOf,
  manufacturerReject,
  manufacturerStep,
  paymentsOf,
  placeOrder,
  recordIncomingPayment,
  recordPayoutTransfer,
  startVerification,
  submitPayment,
  completeOrder,
  type Ctx,
} from "./service";
import type { Actor } from "./types";

export const DEMO_CUSTOMERS: Actor[] = [
  { id: "cust-nino", role: "customer", name: "Nino Kapanadze" },
  { id: "cust-giorgi", role: "customer", name: "Giorgi Beridze" },
];
export const DEMO_ADMIN: Actor = { id: "admin-tamar", role: "admin", name: "Tamar (ASE admin)" };

export const makerUserId = (slug: string) => `maker-${slug}`;

export function demoMakers(): Actor[] {
  return MANUFACTURERS.map((m) => ({ id: makerUserId(m.slug), role: "manufacturer", name: m.name, manufacturerSlug: m.slug }));
}

export function seedUsers(ctx: Ctx) {
  const has = (ctx.db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n > 0;
  if (has) return;
  tx(ctx.db, () => {
    // Demo accounts have no password: they can only be used through the demo sign-in, which exists in TEST mode only.
    const at = "2026-01-15T09:00:00.000Z";
    const add = ctx.db.prepare(
      "INSERT INTO users (id, role, name, first_name, last_name, email, manufacturer_slug, email_verified_at, created_at, is_demo) VALUES (?,?,?,?,?,?,?,?,?,1)",
    );
    const split = (name: string) => [name.split(" ")[0], name.split(" ").slice(1).join(" ") || null];
    for (const u of [...DEMO_CUSTOMERS, DEMO_ADMIN]) add.run(u.id, u.role, u.name, ...split(u.name), `${u.id}@demo.ase.ge`, null, at, at);
    const bank = ctx.db.prepare("INSERT INTO manufacturer_bank_accounts (manufacturer_slug, account_holder, bank_name, iban) VALUES (?,?,?,?)");
    MANUFACTURERS.forEach((m, i) => {
      add.run(makerUserId(m.slug), "manufacturer", m.name, null, null, `${m.slug}@demo.ase.ge`, m.slug, at, at);
      bank.run(m.slug, `${m.name} LLC`, "Demo Bank", `GE${String(10 + i).padStart(2, "0")} DEMO 0000 0000 ${String(1000 + i * 37).padStart(4, "0")} 00`);
    });
  });
}

/** Demo orders at different stages. Only runs on an empty database. */
export function seedOrders(base: Ctx) {
  if ((base.db.prepare("SELECT COUNT(*) AS n FROM orders").get() as { n: number }).n > 0) return;
  // The story spans about nine days and ends shortly before "now".
  let clock = Math.floor(base.now().getTime() / 3600_000) * 3600_000 - 10 * 86_400_000;
  // Demo orders are always TEST orders: none of this is real money.
  const ctx: Ctx = { db: base.db, now: () => new Date(clock), testMode: true };
  const later = (hours: number) => (clock += hours * 3600_000);
  const day = () => new Date(clock).toISOString().slice(0, 10);
  const [nino, giorgi] = DEMO_CUSTOMERS;
  const admin = DEMO_ADMIN;
  const maker = (slug: string): Actor => ({ id: makerUserId(slug), role: "manufacturer", name: slug, manufacturerSlug: slug });
  const contact = (who: Actor, city: string) => ({ city, name: who.name, phone: "+995 555 00 00 00", address: city === "Tbilisi" ? "12 Chavchavadze Ave, apt 4" : "5 Rustaveli St" });
  const pay = (orderId: string, who: Actor, amount: string) => submitPayment(ctx, who, orderId, { amount, date: day(), reference: `BOG-${orderId.slice(4)}` });
  const verify = (orderId: string) => {
    const p = paymentsOf(ctx, orderId).at(-1)!;
    startVerification(ctx, admin, p.id);
    later(1);
    recordIncomingPayment(ctx, admin, p.id, { received: (p.reported_tetri! / 100).toFixed(2), bankReference: `IN-${orderId.slice(4)}` });
  };
  const total = (orderId: string) => ((ctx.db.prepare("SELECT total_tetri FROM orders WHERE id = ?").get(orderId) as { total_tetri: number }).total_tetri / 100).toFixed(2);

  // 1. Completed: paid, prepared, collected, delivered, manufacturer paid.
  const o1 = placeOrder(ctx, nino, { ...contact(nino, "Tbilisi"), lines: [{ slug: "walnut-cutting-board", qty: 2 }] });
  later(3);
  pay(o1, nino, total(o1));
  later(2);
  verify(o1);
  const f1 = fulfillmentsOf(ctx, o1)[0].id;
  for (const s of ["accept", "prepare", "ready"] as const) {
    later(10);
    manufacturerStep(ctx, maker("imereti-timber-works"), f1, s);
  }
  later(20);
  for (const s of ["collect", "dispatch", "deliver"] as const) {
    adminFulfillmentStep(ctx, admin, f1, s);
    later(6);
  }
  completeOrder(ctx, nino, o1);
  const po1 = (ctx.db.prepare("SELECT id FROM payouts WHERE fulfillment_id = ?").get(f1) as { id: string }).id;
  authorizePayout(ctx, admin, po1);
  later(2);
  recordPayoutTransfer(ctx, admin, po1, { reference: "OUT-0001", date: day() });
  later(20);
  confirmPayoutCompleted(ctx, admin, po1);

  // 2. Two manufacturers; one shipment collected (payout eligible), the other still preparing.
  later(2);
  const o2 = placeOrder(ctx, giorgi, {
    ...contact(giorgi, "Kutaisi"),
    lines: [
      { slug: "beech-bistro-chair", qty: 4 },
      { slug: "honey-propolis-soap", qty: 6 },
    ],
  });
  later(5);
  pay(o2, giorgi, total(o2));
  later(3);
  verify(o2);
  const [f2a, f2b] = fulfillmentsOf(ctx, o2);
  const bySlug = (f: { manufacturer_slug: string }) => maker(f.manufacturer_slug);
  for (const s of ["accept", "prepare"] as const) {
    later(4);
    manufacturerStep(ctx, bySlug(f2a), f2a.id, s);
    manufacturerStep(ctx, bySlug(f2b), f2b.id, s);
  }
  later(12);
  const soap = [f2a, f2b].find((f) => f.manufacturer_slug === "bakuriani-botanicals")!;
  manufacturerStep(ctx, bySlug(soap), soap.id, "ready");
  later(8);
  adminFulfillmentStep(ctx, admin, soap.id, "collect");

  // 3. Customer says they paid; waiting for an admin to check the bank.
  later(10);
  const o3 = placeOrder(ctx, nino, { ...contact(nino, "Tbilisi"), lines: [{ slug: "interior-paint-matte-10l", qty: 2 }, { slug: "clay-wine-jug-1l", qty: 1 }] });
  later(6);
  pay(o3, nino, total(o3));

  // 4. Paid less than the total: partial payment, the rest was requested.
  later(4);
  const o4 = placeOrder(ctx, giorgi, { ...contact(giorgi, "Tbilisi"), lines: [{ slug: "churchkhela-walnut-grape-6", qty: 3 }] });
  later(2);
  pay(o4, giorgi, (Number(total(o4)) - 10).toFixed(2));
  later(3);
  verify(o4);

  // 5. Manufacturer could not make it: rejected, refund recorded and waiting to be sent.
  later(5);
  const o5 = placeOrder(ctx, nino, { ...contact(nino, "Tbilisi"), lines: [{ slug: "wool-blanket-double", qty: 1 }] });
  later(2);
  pay(o5, nino, total(o5));
  later(2);
  verify(o5);
  later(6);
  const f5 = fulfillmentsOf(ctx, o5)[0];
  manufacturerReject(ctx, maker(f5.manufacturer_slug), f5.id, "Out of this colour until next month");
  later(1);
  createRefund(ctx, admin, o5, { amount: total(o5), reason: "Manufacturer rejected the order" });
  addNote(ctx, admin, o5, "Customer prefers the refund to the same account they paid from.");

  // 6. A new order for the demo seller, paid and waiting for the manufacturer to accept.
  later(3);
  const o6 = placeOrder(ctx, giorgi, { ...contact(giorgi, "Batumi"), lines: [{ slug: "oak-dining-table-180", qty: 1 }] });
  later(2);
  pay(o6, giorgi, total(o6));
  later(2);
  verify(o6);

  // 7. Just placed, nothing paid yet.
  later(1);
  placeOrder(ctx, nino, { ...contact(nino, "Tbilisi"), lines: [{ slug: "walnut-cutting-board", qty: 1 }, { slug: "beech-bistro-chair", qty: 2 }] });
}
