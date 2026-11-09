/**
 * The registration, seller verification, Verified badge, product and seller-order rules, tested on
 * the services (the same functions the pages and form actions call). Follows the 21 test steps.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { authenticate, bootstrapAdmin, latestEmail, registerCustomer, registerSeller, verifyEmail } from "./accounts";
import { adminSellerDecision, adminSellerMessage, addSellerFile, getMaker, saveApplication, sellerHistory, sellerMessages, submitApplication } from "./sellers";
import { badgeApprove, badgeRecordInspection, badgeScheduleInspection, badgeStartReview, requestBadge, CHECKLIST, type Checklist } from "./badge";
import { addProductImage, adminModerateProduct, publishProduct, saveProduct } from "./products";
import { publicCatalog } from "./catalog-store";
import { customerOrder, makerOrder, makerOrders, notificationsFor } from "./queries";
import { DEMO_ADMIN } from "./seed";
import { memoryMarket } from "./server";
import { addOrderMessage, adminFulfillmentStep, fulfillmentsOf, getOrder, manufacturerStep, orderMessages, paymentsOf, placeOrder, recordIncomingPayment, startVerification, submitPayment, type Ctx } from "./service";
import { updateSettings } from "./settings";
import { MarketError, type Actor } from "./types";

let ctx: Ctx;
let clock: number;
beforeEach(() => {
  clock = Date.parse("2026-11-09T09:00:00Z");
  ctx = memoryMarket(() => new Date(clock));
});
const admin = DEMO_ADMIN;
const fakeFile = (n: string, ext = "png") => ({ file: `${n.padEnd(32, "0").slice(0, 32)}.${ext}`, name: `${n}.${ext}` });
const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof MarketError ? e.code : String(e);
  }
  return "ok";
};
const tokenOf = (userId: string, kind: string) => new URL(`http://x${latestEmail(ctx, userId, kind)!.link}`).searchParams.get("token")!;
const actorOf = (id: string): Actor => {
  const u = ctx.db.prepare("SELECT id, role, name, manufacturer_slug FROM users WHERE id = ?").get(id) as { id: string; role: Actor["role"]; name: string; manufacturer_slug: string | null };
  return { id: u.id, role: u.role, name: u.name, manufacturerSlug: u.manufacturer_slug };
};

function newCustomer(email = "ana@example.com") {
  const id = registerCustomer(ctx, { firstName: "Ana", lastName: "Beridze", email, password: "secret123", confirm: "secret123" });
  verifyEmail(ctx, tokenOf(id, "verify_email"));
  return actorOf(id);
}

function newSeller(type: "company" | "independent", store: string, email: string) {
  const { userId } = registerSeller(ctx, { firstName: "Levan", lastName: "Gelashvili", email, phone: "+995 555 000 111", password: "secret123", confirm: "secret123", sellerType: type, storeName: store });
  verifyEmail(ctx, tokenOf(userId, "verify_email"));
  const seller = actorOf(userId);
  saveApplication(ctx, seller, "business", {
    name: store,
    registrationNumber: type === "company" ? "404123456" : "",
    yearEstablished: "2015",
    description: "We make solid oak furniture by hand in our own workshop near Kutaisi.",
    categories: ["furniture-home"],
  });
  saveApplication(ctx, seller, "contact", { city: "Kutaisi", region: "Imereti", address: "5 Tsereteli St", contactFirstName: "Levan", contactLastName: "Gelashvili", contactEmail: email, contactPhone: "+995 555 000 111" });
  if (type === "company") addSellerFile(ctx, seller, "registration_document", fakeFile("regdoc", "pdf"));
  else addSellerFile(ctx, seller, "workshop_photo", fakeFile("workshop"));
  return seller;
}

function publish(seller: Actor, name: string, price: string, tiers: { minQty: string; price: string }[] = []) {
  const slug = saveProduct(ctx, seller, null, {
    name,
    category: "furniture-home",
    description: "A sturdy hand-made piece of furniture.",
    retailPrice: price,
    unit: "piece",
    buyNow: "1",
    requestQuote: "1",
    available: "1",
    stock: "50",
    moq: "1",
    lengthCm: "100",
    widthCm: "50",
    heightCm: "40",
    weightKg: "20",
    tiers,
  });
  addProductImage(ctx, seller, slug, fakeFile(`img-${slug}`));
  publishProduct(ctx, seller, slug);
  return slug;
}

function payAndVerify(orderId: string, customer: Actor) {
  const total = getOrder(ctx, orderId)!.total_tetri;
  const pid = submitPayment(ctx, customer, orderId, { amount: (total / 100).toFixed(2), date: "2026-11-09", reference: "TEST-1" });
  return { pid, total };
}

describe("customer registration (steps 1–2)", () => {
  it("registers, needs a confirmed email to order, and signs in with the password", () => {
    const id = registerCustomer(ctx, { firstName: "Ana", lastName: "Beridze", email: "Ana@Example.com", password: "secret123", confirm: "secret123" });
    const ana = actorOf(id);
    expect(ana.role).toBe("customer");
    expect(code(() => placeOrder(ctx, ana, { city: "Tbilisi", name: "Ana", phone: "+995 555 1", address: "x", lines: [{ slug: "walnut-cutting-board", qty: 1 }] }))).toBe("email_unverified");
    verifyEmail(ctx, tokenOf(id, "verify_email"));
    expect(code(() => verifyEmail(ctx, tokenOf(id, "verify_email")))).toBe("token_invalid"); // one use only
    expect(authenticate(ctx, "ana@example.com", "secret123").id).toBe(id);
    expect(code(() => authenticate(ctx, "ana@example.com", "wrong-pass1"))).toBe("bad_credentials");
    expect(code(() => registerCustomer(ctx, { firstName: "A", lastName: "B", email: "ana@example.com", password: "secret123", confirm: "secret123" }))).toBe("email_taken");
  });
});

describe("first administrator for the live site", () => {
  it("is created once from server settings and can sign in", () => {
    const ctx = memoryMarket();
    expect(bootstrapAdmin(ctx, {})).toBeNull();
    const env = { ASE_ADMIN_EMAIL: "Owner@Example.ge", ASE_ADMIN_PASSWORD: "strong pass 42", ASE_ADMIN_NAME: "Eliah" };
    const id = bootstrapAdmin(ctx, env);
    expect(id).toMatch(/^adm-/);
    expect(bootstrapAdmin(ctx, { ...env, ASE_ADMIN_PASSWORD: "another pass 43" })).toBeNull();
    const u = authenticate(ctx, "owner@example.ge", "strong pass 42");
    expect(u.role).toBe("admin");
    expect(() => bootstrapAdmin(ctx, { ASE_ADMIN_EMAIL: "x@example.ge", ASE_ADMIN_PASSWORD: "short" })).toThrow(MarketError);
  });
});

describe("seller verification (steps 6–12)", () => {
  it("company and independent maker are approved only by an admin, with history", () => {
    const company = newSeller("company", "Oak Works", "oak@example.com");
    const maker = newSeller("independent", "Nana Ceramics", "nana@example.com");
    for (const s of [company, maker]) {
      expect(getMaker(ctx, s.manufacturerSlug!)!.account_status).toBe("draft");
      submitApplication(ctx, s);
      expect(getMaker(ctx, s.manufacturerSlug!)!.account_status).toBe("pending_review");
      // A seller can never decide on its own application.
      expect(code(() => adminSellerDecision(ctx, s, s.manufacturerSlug!, "approveCompany", ""))).toBe("forbidden");
    }
    // Admin notes stay internal.
    adminSellerMessage(ctx, admin, company.manufacturerSlug!, "account", "Registry checked by phone", true);
    expect(sellerMessages(ctx, company.manufacturerSlug!, "account", false)).toHaveLength(0);

    adminSellerDecision(ctx, admin, company.manufacturerSlug!, "startReview", "");
    expect(code(() => adminSellerDecision(ctx, admin, maker.manufacturerSlug!, "requestInfo", ""))).toBe("invalid_input"); // reason required
    adminSellerDecision(ctx, admin, maker.manufacturerSlug!, "requestInfo", "Please add a photo of finished pieces");
    expect(getMaker(ctx, maker.manufacturerSlug!)!.account_status).toBe("info_required");
    addSellerFile(ctx, maker, "product_photo", fakeFile("pots"));
    submitApplication(ctx, maker);

    adminSellerDecision(ctx, admin, company.manufacturerSlug!, "approveCompany", "");
    adminSellerDecision(ctx, admin, maker.manufacturerSlug!, "approveIndependent", "Visited the market stall");
    expect(getMaker(ctx, company.manufacturerSlug!)!.account_status).toBe("approved_company");
    expect(getMaker(ctx, maker.manufacturerSlug!)!.account_status).toBe("approved_independent");
    // Approval is not the Verified badge.
    expect(getMaker(ctx, company.manufacturerSlug!)!.badge_status).toBe("not_requested");
    expect(sellerHistory(ctx, maker.manufacturerSlug!, "account").map((h) => h.to_status)).toEqual(["draft", "pending_review", "info_required", "pending_review", "approved_independent"]);
    expect(notificationsFor(ctx, maker).map((n) => n.kind)).toContain("seller_approved");
  });

  it("an unapproved seller can prepare drafts but cannot publish", () => {
    const s = newSeller("company", "Draft Co", "draft@example.com");
    const slug = saveProduct(ctx, s, null, { name: "Chair", category: "furniture-home", description: "A good chair made of oak wood.", retailPrice: "100", buyNow: "1" });
    addProductImage(ctx, s, slug, fakeFile("chair"));
    expect(code(() => publishProduct(ctx, s, slug))).toBe("seller_not_approved");
    expect(publicCatalog(ctx.db).products.some((p) => p.slug === slug)).toBe(false);
  });
});

describe("selling, payment and seller orders (steps 3–5, 13–21)", () => {
  function setup() {
    const a = newSeller("company", "Oak Works", "oak@example.com");
    const b = newSeller("independent", "Nana Ceramics", "nana@example.com");
    submitApplication(ctx, a);
    submitApplication(ctx, b);
    adminSellerDecision(ctx, admin, a.manufacturerSlug!, "approveCompany", "");
    adminSellerDecision(ctx, admin, b.manufacturerSlug!, "approveIndependent", "");
    const table = publish(a, "Oak table", "250", [{ minQty: "20", price: "230" }, { minQty: "50", price: "210" }, { minQty: "100", price: "190" }]);
    const vase = publish(b, "Clay vase", "40");
    return { a, b, table, vase };
  }

  it("splits one order between sellers, keeps prices, and only the admin confirms money", () => {
    const { a, b, table, vase } = setup();
    expect(publicCatalog(ctx.db).products.find((p) => p.slug === table)?.wholesale?.tiers).toHaveLength(3);
    const ana = newCustomer();
    const giorgi = newCustomer("giorgi@example.com");
    const id = placeOrder(ctx, ana, { city: "Tbilisi", name: "Ana Beridze", phone: "+995 555 1", address: "1 Rustaveli Ave", lines: [{ slug: table, qty: 20 }, { slug: vase, qty: 2 }] });
    const items = ctx.db.prepare("SELECT product_slug, unit_price_tetri, pricing, manufacturer_slug FROM order_items WHERE order_id = ? ORDER BY id").all(id) as { product_slug: string; unit_price_tetri: number; pricing: string; manufacturer_slug: string }[];
    expect(items).toEqual([
      { product_slug: table, unit_price_tetri: 23000, pricing: "wholesale", manufacturer_slug: a.manufacturerSlug },
      { product_slug: vase, unit_price_tetri: 4000, pricing: "retail", manufacturer_slug: b.manufacturerSlug },
    ]);

    // Step 15 and 19: each seller sees only its own part.
    const [fa, fb] = fulfillmentsOf(ctx, id).sort((x) => (x.manufacturer_slug === a.manufacturerSlug ? -1 : 1));
    expect(makerOrders(ctx, a).map((o) => o.id)).toEqual([fa.id]);
    expect(code(() => makerOrder(ctx, a, fb.id))).toBe("not_found");
    expect(code(() => addOrderMessage(ctx, a, fb.id, "question", "hi"))).toBe("not_found");
    expect(code(() => manufacturerStep(ctx, a, fb.id, "accept"))).toBe("not_found");
    // Step 20: another customer can't read it.
    expect(code(() => customerOrder(ctx, giorgi, id))).toBe("not_found");
    // The seller sees name and city, not the street address or phone.
    const view = makerOrder(ctx, a, fa.id);
    expect(JSON.stringify(view)).not.toContain("Rustaveli");
    expect(JSON.stringify(view)).not.toContain("+995 555 1");
    expect(view.paymentStage).toBe("awaiting_customer");

    // Step 16: the customer reports a payment; only an admin can verify it.
    const { pid, total } = payAndVerify(id, ana);
    expect(makerOrder(ctx, a, fa.id).paymentStage).toBe("customer_submitted");
    expect(code(() => startVerification(ctx, a, pid))).toBe("forbidden");
    expect(code(() => recordIncomingPayment(ctx, a, pid, { received: (total / 100).toFixed(2), bankReference: "X" }))).toBe("forbidden");
    expect(code(() => manufacturerStep(ctx, a, fa.id, "accept"))).toBe("invalid_state"); // not paid yet
    startVerification(ctx, admin, pid);
    recordIncomingPayment(ctx, admin, pid, { received: (total / 100).toFixed(2), bankReference: "IN-1" });
    expect(paymentsOf(ctx, id)[0].status).toBe("confirmed");
    expect(makerOrder(ctx, a, fa.id).paymentStage).toBe("verified");

    // Step 17: seller statuses, with comments and history; admin-only steps stay admin-only.
    manufacturerStep(ctx, a, fa.id, "accept");
    manufacturerStep(ctx, a, fa.id, "prepare");
    manufacturerStep(ctx, a, fa.id, "progress", "Varnish drying");
    manufacturerStep(ctx, a, fa.id, "ready");
    expect(code(() => adminFulfillmentStep(ctx, a, fa.id, "collect"))).toBe("forbidden");
    addOrderMessage(ctx, a, fa.id, "delay", "One leg needs another day");
    expect(orderMessages(ctx, fa.id)).toHaveLength(1);
    const hist = ctx.db.prepare("SELECT from_status, to_status, by_user, note FROM status_history WHERE entity = 'fulfillment' AND entity_id = ? ORDER BY id").all(fa.id) as { from_status: string; to_status: string; by_user: string; note: string | null }[];
    expect(hist.map((h) => h.to_status)).toEqual(["new", "accepted", "preparing", "in_progress", "ready"]);
    expect(hist.find((h) => h.to_status === "in_progress")).toMatchObject({ from_status: "preparing", by_user: a.id, note: "Varnish drying" });
    expect(() => ctx.db.prepare("DELETE FROM status_history").run()).toThrow(/append-only/);

    // Step 18: the customer was told about each step, and the payment only by the admin's verification.
    const kinds = notificationsFor(ctx, ana).map((n) => n.kind);
    expect(kinds).toEqual(expect.arrayContaining(["payment_verified", "fulfillment_accepted", "fulfillment_preparing", "fulfillment_in_progress", "fulfillment_ready"]));
    // Order messages are never shown to customers.
    expect(JSON.stringify(customerOrder(ctx, ana, id))).not.toContain("One leg");

    // Step 21: a later price change does not touch the order.
    saveProduct(ctx, a, table, { name: "Oak table", category: "furniture-home", description: "A sturdy hand-made piece of furniture.", retailPrice: "300", buyNow: "1", requestQuote: "1", available: "1" });
    expect((ctx.db.prepare("SELECT unit_price_tetri FROM order_items WHERE order_id = ? AND product_slug = ?").get(id, table) as { unit_price_tetri: number }).unit_price_tetri).toBe(23000);
    expect(getOrder(ctx, id)!.total_tetri).toBe(total);
    expect(() => ctx.db.prepare("UPDATE ledger_entries SET amount_tetri = 1").run()).toThrow(/append-only/);
  });

  it("product moderation, when switched on, needs an admin", () => {
    const { a } = setup();
    updateSettings(ctx, admin, { productModeration: true });
    const slug = saveProduct(ctx, a, null, { name: "Bench", category: "furniture-home", description: "A long oak bench for the garden.", retailPrice: "120", buyNow: "1" });
    addProductImage(ctx, a, slug, fakeFile("bench"));
    publishProduct(ctx, a, slug);
    expect(publicCatalog(ctx.db).products.some((p) => p.slug === slug)).toBe(false);
    expect(code(() => adminModerateProduct(ctx, a, slug, "approve", ""))).toBe("forbidden");
    adminModerateProduct(ctx, admin, slug, "approve", "");
    expect(publicCatalog(ctx.db).products.some((p) => p.slug === slug)).toBe(true);
  });
});

describe("Verified Manufacturer badge (part 15)", () => {
  it("is only awarded by an admin after a completed inspection", () => {
    const s = newSeller("independent", "Nana Ceramics", "nana@example.com");
    expect(code(() => requestBadge(ctx, s, {}))).toBe("seller_not_approved");
    submitApplication(ctx, s);
    adminSellerDecision(ctx, admin, s.manufacturerSlug!, "approveIndependent", "");
    const slug = s.manufacturerSlug!;
    requestBadge(ctx, s, { location: "Kutaisi, 5 Tsereteli St", activities: "Throwing, drying and firing clay pots in a wood kiln.", categories: ["glass-ceramics"], capacity: "40 pots a month", contact: "Levan, +995 555 000 111" });
    expect(getMaker(ctx, slug)!.badge_status).toBe("submitted");
    expect(code(() => badgeApprove(ctx, s, slug, "self"))).toBe("forbidden");
    badgeStartReview(ctx, admin, slug);
    expect(code(() => badgeApprove(ctx, admin, slug, "looks good"))).toBe("invalid_state"); // no inspection yet
    badgeScheduleInspection(ctx, admin, slug, { date: "2026-11-12T10:00", scale: "home" });
    const checklist: Checklist = Object.fromEntries(CHECKLIST.map((k) => [k, { result: k === "quality_control_reviewed" ? "na" : "yes", note: "" }]));
    expect(code(() => badgeRecordInspection(ctx, admin, slug, { checklist: {}, summary: "", recommendation: "", visitedAt: "", scale: "home", complete: true }))).toBe("invalid_input");
    badgeRecordInspection(ctx, admin, slug, { checklist, summary: "Real home workshop with a wood kiln.", recommendation: "approve", visitedAt: "2026-11-12", scale: "home", complete: true });
    expect(publicCatalog(ctx.db).makers.find((m) => m.slug === slug)?.verification).toBe("approved");
    badgeApprove(ctx, admin, slug, "Inspection confirmed production on site");
    expect(getMaker(ctx, slug)!.badge_status).toBe("verified");
    expect(publicCatalog(ctx.db).makers.find((m) => m.slug === slug)?.verification).toBe("verified");
    expect(sellerHistory(ctx, slug, "badge").map((h) => h.to_status)).toEqual(["submitted", "under_review", "inspection_scheduled", "inspection_completed", "verified"]);
  });
});
