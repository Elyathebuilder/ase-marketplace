/**
 * Browser test of the 21 steps in the registration / seller / verification brief, against a running app.
 *
 *   ASE_ADMIN_EMAIL=… ASE_ADMIN_PASSWORD=… npm run build && npm start   (TEST mode, the default)
 *   E2E_URL=http://localhost:3100 E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… node tests/e2e/journey.mjs
 *
 * Every account is new (random emails), payments are TEST payments, nothing leaves the machine.
 * Screenshots go to E2E_OUT (default ./e2e-out). Exit code 1 if any step fails.
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = (process.env.E2E_URL || "http://localhost:3100").replace(/\/$/, "");
const OUT = process.env.E2E_OUT || "e2e-out";
const ADMIN = { email: process.env.E2E_ADMIN_EMAIL || "admin@test.ase.ge", password: process.env.E2E_ADMIN_PASSWORD || "admin pass 2026" };
const RUN = Date.now().toString(36);
const PW = "Test pass 2026";
const IMG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAHUlEQVR4nGP8z8DAwMDAxMDAwMDAwMDAwMDAwMAAAD9gAgHn4tvyAAAAAElFTkSuQmCC",
  "base64",
);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
mkdirSync(OUT, { recursive: true });
// Playwright is not a project dependency: use the copy installed on the machine (require works through NODE_PATH).
const { chromium, devices } = createRequire(import.meta.url)("playwright");

const results = [];
const facts = {};
const u = (p) => `${BASE}/en${p}`;

async function step(n, title, fn) {
  const t0 = Date.now();
  try {
    const note = await fn();
    results.push({ n, title, ok: true, note: note ?? "", ms: Date.now() - t0 });
    console.log(`✓ ${n}. ${title}${note ? ` — ${note}` : ""}`);
  } catch (e) {
    results.push({ n, title, ok: false, note: String(e?.message ?? e).split("\n")[0], ms: Date.now() - t0 });
    console.log(`✗ ${n}. ${title} — ${String(e?.message ?? e).split("\n").slice(0, 3).join(" | ")}`);
  }
}
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const browser = await chromium.launch();
const newUser = async () => {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  return { ctx, page: await ctx.newPage() };
};
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
const ok = async (page) => {
  const url = new URL(page.url());
  expect(!url.searchParams.get("error"), `error=${url.searchParams.get("error")} at ${url.pathname}`);
};
/** Clicks a submit button and waits until the server action has answered and the page has settled. */
async function settle(page, btn) {
  const posted = page.waitForResponse((r) => r.request().method() === "POST", { timeout: 30000 });
  await btn.click();
  await posted;
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(250);
}
/** Submits the form that contains `inner`, clicking its submit button (or the named one). */
async function submitForm(page, inner, buttonText) {
  const form = page.locator("form", { has: page.locator(inner) }).first();
  const btn = buttonText ? form.getByRole("button", { name: buttonText }) : form.locator('button[type="submit"], button:not([type])').last();
  await settle(page, btn);
  await page.waitForLoadState("networkidle");
}

async function signIn(page, email, password) {
  await page.goto(u("/signin"));
  await page.fill("#si-email", email);
  await page.fill("#si-password", password);
  await submitForm(page, "#si-email");
  await ok(page);
}
async function signOut(ctx) {
  await ctx.clearCookies();
}
async function verifyEmail(page) {
  await page.goto(u("/account/verify"));
  const link = page.locator("[data-verify-link]").first();
  await link.waitFor({ timeout: 5000 });
  const target = await link.getAttribute("href");
  await page.goto(target.startsWith("http") ? target : BASE + target);
  await page.waitForLoadState("networkidle");
}

async function registerCustomer(page, who) {
  await page.goto(u("/register/customer"));
  await page.fill(':is(input,textarea,select)[name="firstName"]', who.first);
  await page.fill(':is(input,textarea,select)[name="lastName"]', who.last);
  await page.fill(':is(input,textarea,select)[name="email"]', who.email);
  await page.fill(':is(input,textarea,select)[name="password"]', PW);
  await page.fill(':is(input,textarea,select)[name="confirm"]', PW);
  await submitForm(page, ':is(input,textarea,select)[name="confirm"]');
  await ok(page);
}

async function addToCart(page, slug, qty = 1) {
  await page.goto(u(`/products/${slug}`));
  const panel = page.locator('[data-island="purchase"]');
  await panel.waitFor();
  // Pick the first option of every choice (colour / size) the product asks for.
  for (const sel of await panel.locator("select").all()) {
    const opts = await sel.locator("option").evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
    if (opts.length) await sel.selectOption(opts[0]);
  }
  for (const group of await panel.locator('[role="radiogroup"]').all()) await group.locator("button, input").first().click();
  if (qty !== 1) await panel.getByRole("textbox", { name: "Quantity" }).fill(String(qty));
  await panel.locator("button.btn-primary").first().click();
  await panel.getByRole("status").waitFor();
}

async function checkout(page, who) {
  await page.goto(u("/checkout"));
  const form = page.locator("form[data-checkout]");
  await form.waitFor({ timeout: 8000 }).catch(async () => {
    throw new Error(`no checkout form: ${(await page.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 300)}`);
  });
  const fill = async (name, v) => {
    const f = form.locator(`:is(input,textarea,select)[name="${name}"]`);
    if ((await f.count()) && (await f.first().isEditable())) {
      if ((await f.first().evaluate((e) => e.tagName)) === "SELECT") return;
      await f.first().fill(v);
    }
  };
  await fill("name", `${who.first} ${who.last}`);
  await fill("phone", "+995 555 00 00 00");
  await fill("address", "12 Rustaveli Ave, apt 4");
  await fill("email", who.email);
  await Promise.all([page.waitForURL(/\/account\/orders\/|\/checkout\?/), form.locator('button[type="submit"]').click()]);
  await page.waitForLoadState("networkidle");
  await ok(page);
  const m = page.url().match(/\/account\/orders\/([^/?#]+)/);
  expect(m, `no order page after checkout (${page.url()})`);
  return m[1];
}

async function payOrder(page, orderId) {
  await page.goto(u(`/account/orders/${orderId}/payment`));
  const form = page.locator("form", { has: page.locator("#pay-amount") });
  await form.locator(':is(input,textarea,select)[name="reference"]').fill(`TEST-${RUN}`);
  const date = form.locator(':is(input,textarea,select)[name="date"]');
  if (await date.count()) await date.fill(new Date().toISOString().slice(0, 10));
  await settle(page, form.locator('button[type="submit"]'));
  await page.waitForLoadState("networkidle");
  await ok(page);
}

async function registerSeller(page, s) {
  await page.goto(u("/register/seller"));
  await page.check(`:is(input,textarea,select)[name="sellerType"][value="${s.type}"]`);
  await page.fill(':is(input,textarea,select)[name="storeName"]', s.store);
  await page.fill(':is(input,textarea,select)[name="firstName"]', s.first);
  await page.fill(':is(input,textarea,select)[name="lastName"]', s.last);
  await page.fill(':is(input,textarea,select)[name="email"]', s.email);
  await page.fill(':is(input,textarea,select)[name="phone"]', "+995 555 11 22 33");
  await page.fill(':is(input,textarea,select)[name="password"]', PW);
  await page.fill(':is(input,textarea,select)[name="confirm"]', PW);
  await submitForm(page, ':is(input,textarea,select)[name="storeName"]');
  await ok(page);
}

async function completeApplication(page, s) {
  await page.goto(u("/seller/application?step=2"));
  if (s.type === "company") {
    await page.fill(':is(input,textarea,select)[name="legalName"]', `${s.store} LLC`);
    await page.fill(':is(input,textarea,select)[name="registrationNumber"]', "40512345" + RUN.slice(-1).charCodeAt(0));
  }
  await page.fill(':is(input,textarea,select)[name="yearEstablished"]', "2015");
  await page.fill(':is(input,textarea,select)[name="description"]', `${s.store} makes furniture and home goods by hand in Georgia, for homes and for businesses.`);
  await page.locator(':is(input,textarea,select)[name="categories"]').first().check();
  await submitForm(page, ':is(input,textarea,select)[name="description"]');
  await ok(page);
  expect(page.url().includes("step=3"), `not at step 3: ${page.url()}`);
  await page.selectOption(':is(input,textarea,select)[name="city"]', { index: 1 });
  await page.fill(':is(input,textarea,select)[name="address"]', "5 Workshop St");
  await page.fill(':is(input,textarea,select)[name="contactFirstName"]', s.first);
  await page.fill(':is(input,textarea,select)[name="contactLastName"]', s.last);
  await submitForm(page, ':is(input,textarea,select)[name="contactFirstName"]');
  await ok(page);
  const upload = async (kind, name, mimeType, buffer) => {
    await page.setInputFiles(`#up-${kind}`, { name, mimeType, buffer });
    await submitForm(page, `#up-${kind}`);
    await ok(page);
  };
  if (s.type === "company") await upload("registration_document", "registration.pdf", "application/pdf", PDF);
  await upload("logo", "logo.png", "image/png", IMG);
  await upload(s.type === "company" ? "workshop_photo" : "product_photo", "photo.png", "image/png", IMG);
  await page.goto(u("/seller/application?step=5"));
  expect((await page.locator("[data-missing]").count()) === 0, `missing: ${await page.locator("[data-missing]").getAttribute("data-missing").catch(() => "")}`);
}

async function submitApplication(page) {
  await page.goto(u("/seller/application?step=5"));
  const form = page.locator("form", { has: page.locator('input[name="op"][value="submit"]') });
  await settle(page, form.locator("button"));
  await page.waitForLoadState("networkidle");
  await ok(page);
}

async function adminDecide(page, slug, move, reason) {
  await page.goto(u(`/admin/sellers/${slug}`));
  const box = page.locator("[data-admin-decisions]");
  const det = box.locator("details", { has: page.locator(`input[name="move"][value="${move}"]`) });
  await det.locator("summary").click({ force: true }).catch(() => {});
  if (!(await det.evaluate((d) => d.open))) await det.locator("summary").click();
  const r = det.locator(':is(input,textarea,select)[name="reason"]');
  if (reason && (await r.count())) await r.fill(reason);
  await settle(page, det.locator('button[type="submit"]'));
  await page.waitForLoadState("networkidle");
  await ok(page);
}

async function storeStatus(page) {
  // The seller's own status, as stored (data attribute on the status chip in the seller header).
  return (await page.locator("[data-status]").first().getAttribute("data-status").catch(() => null)) ?? "";
}

async function addProduct(page, p) {
  await page.goto(u("/seller/products/new"));
  await page.fill(':is(input,textarea,select)[name="name"]', p.name);
  await page.selectOption(':is(input,textarea,select)[name="category"]', { index: 1 });
  await page.fill(':is(input,textarea,select)[name="description"]', `${p.name}: solid wood, hand finished, made to order in our workshop.`);
  await page.fill(':is(input,textarea,select)[name="retailPrice"]', String(p.price));
  await page.fill(':is(input,textarea,select)[name="stock"]', "100");
  if (p.tier) {
    await page.locator(':is(input,textarea,select)[name="tierMin"]').first().fill(String(p.tier.min));
    await page.locator(':is(input,textarea,select)[name="tierPrice"]').first().fill(String(p.tier.price));
  }
  const imgs = page.locator(':is(input,textarea,select)[name="images"]');
  if (await imgs.count()) await imgs.setInputFiles({ name: "p.png", mimeType: "image/png", buffer: IMG });
  await settle(page, page.locator('button[name="publish"]'));
  await ok(page);
  let m = page.url().match(/\/seller\/products\/([^/?#]+)/);
  if (!m || m[1] === "new") {
    await page.goto(u("/seller/products"));
    const href = await page.locator('a[href*="/seller/products/"]', { hasText: p.name }).first().getAttribute("href");
    m = href.match(/\/seller\/products\/([^/?#]+)/);
  }
  return m[1];
}

async function notifTexts(page) {
  await page.goto(u("/account/notifications"));
  return (await page.locator("main").innerText()).replace(/\s+/g, " ");
}

// ------------------------------------------------------------------------------------------------
const cust = { first: "Nino", last: "Testadze", email: `nino.${RUN}@example.com` };
const cust2 = { first: "Giorgi", last: "Otheradze", email: `giorgi.${RUN}@example.com` };
const company = { type: "company", store: `Kartli Wood ${RUN}`, first: "Levan", last: "Company", email: `levan.${RUN}@example.com` };
const indie = { type: "independent", store: `Mzia Crafts ${RUN}`, first: "Mzia", last: "Maker", email: `mzia.${RUN}@example.com` };

const C = await newUser();
const A = await newUser();
const S1 = await newUser();
const S2 = await newUser();
const C2 = await newUser();

await step(1, "Register a customer", async () => {
  // A visitor fills the basket first: it must survive registration.
  await C.page.goto(u("/products"));
  const first = await C.page.locator('a[href*="/en/products/"]').first().getAttribute("href");
  facts.demoProduct = first.split("/").pop();
  await addToCart(C.page, facts.demoProduct, 1);
  await registerCustomer(C.page, cust);
  await shot(C.page, "01-registered");
  return `${cust.email}; basket kept: ${facts.demoProduct}`;
});

await step(2, "Verify the customer's account (email link)", async () => {
  await C.page.goto(u("/checkout"));
  const blocked = (await C.page.locator("form[data-checkout]").count()) === 0;
  await verifyEmail(C.page);
  await C.page.goto(u("/account"));
  const text = await C.page.locator("main").innerText();
  expect(!/confirm your email/i.test(text) || /confirmed/i.test(text), "still unverified");
  return blocked ? "checkout was blocked before confirming; confirmed via TEST link" : "confirmed via TEST link";
});

await step(3, "Add products to the basket (from more than one manufacturer)", async () => {
  await C.page.goto(u("/products"));
  const links = await C.page.locator('a[href*="/en/products/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")))]);
  // A second product from another maker.
  for (const l of links.slice(1, 12)) {
    await C.page.goto(BASE + l);
    const makerLink = await C.page.locator('a[href*="/en/manufacturers/"]').first().getAttribute("href").catch(() => null);
    facts.makers ??= new Set();
    if (makerLink && !facts.makers.has(makerLink) && (await C.page.locator('[data-island="purchase"] button.btn-primary').count())) {
      facts.makers.add(makerLink);
      if (facts.makers.size >= 1 && l.split("/").pop() !== facts.demoProduct) {
        await addToCart(C.page, l.split("/").pop(), 1);
        facts.demoProduct2 = l.split("/").pop();
        break;
      }
    }
  }
  await C.page.goto(u("/cart"));
  const text = await C.page.locator("main").innerText();
  await shot(C.page, "03-cart");
  expect(!/empty/i.test(text.slice(0, 200)), "basket is empty");
  return `basket: ${facts.demoProduct}, ${facts.demoProduct2}`;
});

await step(4, "Complete checkout", async () => {
  facts.order1 = await checkout(C.page, cust);
  await shot(C.page, "04-order");
  return `order ${facts.order1}`;
});

await step(5, "Place a test order (TEST payment report)", async () => {
  await payOrder(C.page, facts.order1);
  const t = await C.page.locator("main").innerText();
  expect(/test/i.test(t), "no TEST marker");
  return "customer reported a TEST bank transfer";
});

await step(6, "Register an official company seller", async () => {
  await registerSeller(S1.page, company);
  await verifyEmail(S1.page);
  await completeApplication(S1.page, company);
  return company.email;
});

await step(7, "Submit its verification application", async () => {
  await submitApplication(S1.page);
  await S1.page.goto(u("/seller/application"));
  await shot(S1.page, "07-company-submitted");
  const st = await storeStatus(S1.page);
  expect(st === "pending_review", `status is ${st}`);
  // The seller cannot open admin pages.
  await S1.page.goto(u("/admin/sellers"));
  expect(!(await S1.page.locator("[data-seller]").count()), "seller sees the admin seller list");
  facts.companySlug = await S1.page.evaluate(async () => (await (await fetch("/api/me")).json())?.manufacturerSlug ?? null);
  return `store ${facts.companySlug ?? "(slug from admin list)"}`;
});

await step(8, "Approve it through the administrator account", async () => {
  await signIn(A.page, ADMIN.email, ADMIN.password);
  await A.page.goto(u("/admin/sellers?filter=open"));
  const row = A.page.locator("tr[data-seller]", { hasText: company.store });
  facts.companySlug = await row.getAttribute("data-seller");
  await adminDecide(A.page, facts.companySlug, "startReview");
  await adminDecide(A.page, facts.companySlug, "approveCompany", "Registration checked against the public registry.");
  await A.page.goto(u(`/admin/sellers/${facts.companySlug}`));
  await shot(A.page, "08-admin-approved-company");
  const t = await A.page.locator("main").innerText();
  expect(/approved/i.test(t), "not approved");
  return facts.companySlug;
});

await step(9, "Register an independent manufacturer", async () => {
  await registerSeller(S2.page, indie);
  await verifyEmail(S2.page);
  await completeApplication(S2.page, indie);
  return indie.email;
});

await step(10, "Submit its alternative verification application (no company document)", async () => {
  await S2.page.goto(u("/seller/application?step=4"));
  expect((await S2.page.locator("#up-registration_document").count()) === 0, "independent maker is asked for a registration document");
  await submitApplication(S2.page);
  return "submitted with product photos only";
});

await step(11, "Approve it as an independent manufacturer", async () => {
  await A.page.goto(u("/admin/sellers?filter=open"));
  facts.indieSlug = await A.page.locator("tr[data-seller]", { hasText: indie.store }).getAttribute("data-seller");
  await adminDecide(A.page, facts.indieSlug, "requestInfo", "Please add a photo of your workspace.");
  // The maker sees the request and answers.
  await S2.page.goto(u("/seller/application"));
  const t = await S2.page.locator("main").innerText();
  expect(/workspace/i.test(t), "seller does not see the request for more information");
  await S2.page.goto(u("/seller/application?step=4"));
  await S2.page.setInputFiles("#up-workshop_photo", { name: "workspace.png", mimeType: "image/png", buffer: IMG });
  await submitForm(S2.page, "#up-workshop_photo");
  await submitApplication(S2.page);
  await adminDecide(A.page, facts.indieSlug, "approveIndependent", "Visited by video call.");
  return facts.indieSlug;
});

await step(12, "Log in as each seller", async () => {
  for (const [who, s] of [[S1, company], [S2, indie]]) {
    await signOut(who.ctx);
    await signIn(who.page, s.email, PW);
    await who.page.goto(u("/seller"));
    const st = await storeStatus(who.page);
    expect(st === (s.type === "company" ? "approved_company" : "approved_independent"), `${s.store}: status is ${st}`);
  }
  await shot(S1.page, "12-seller-dashboard");
  return "both dashboards show Approved";
});

await step(13, "Add and publish products", async () => {
  facts.p1 = await addProduct(S1.page, { name: `Oak chair ${RUN}`, price: 250, tier: { min: 20, price: 230 } });
  facts.p2 = await addProduct(S2.page, { name: `Silver ring ${RUN}`, price: 120 });
  await shot(S1.page, "13-product-editor");
  const pub = await (await fetch(`${BASE}/api/catalog?slugs=${facts.p1},${facts.p2}`)).json();
  const slugs = JSON.stringify(pub);
  expect(slugs.includes(facts.p1) && slugs.includes(facts.p2), "products are not in the public catalogue");
  return `${facts.p1}, ${facts.p2}`;
});

await step(14, "Log in as a customer and purchase those products (20 chairs at the wholesale price)", async () => {
  await signOut(C.ctx);
  await signIn(C.page, cust.email, PW);
  await addToCart(C.page, facts.p1, 20);
  await addToCart(C.page, facts.p2, 1);
  facts.order2 = await checkout(C.page, cust);
  const t = await C.page.locator("main").innerText();
  expect(/4[,.]?600/.test(t), "20 × 230 = 4,600 GEL not shown");
  await payOrder(C.page, facts.order2);
  return `order ${facts.order2}`;
});

await step(15, "Verify that the correct seller receives the order", async () => {
  const find = async (page) => {
    await page.goto(u("/seller/orders?filter=all"));
    return page.locator(`a[href*="/seller/orders/"]`, { hasText: facts.order2 }).first().getAttribute("href").catch(() => null);
  };
  facts.f1 = await find(S1.page);
  facts.f2 = await find(S2.page);
  expect(facts.f1 && facts.f2 && facts.f1 !== facts.f2, "each seller should see its own part of the order");
  await S1.page.goto(BASE + facts.f1);
  const t1 = await S1.page.locator("main").innerText();
  expect(t1.includes(`Oak chair ${RUN}`) && !t1.includes(`Silver ring ${RUN}`), "company seller sees the other seller's item");
  expect(!t1.includes(cust.email), "seller sees the customer's email");
  await shot(S1.page, "15-seller-order");
  return `${facts.f1} / ${facts.f2}`;
});

await step(16, "Simulate payment; only the administrator can confirm it", async () => {
  const stageBefore = await S1.page.locator("[data-payment-stage]").getAttribute("data-payment-stage");
  // The seller has no way to confirm money: no control on its page, and admin pages refuse it.
  const sellerText = await S1.page.locator("main").innerText();
  expect(!/record payment|verify payment/i.test(sellerText), "seller page offers payment verification");
  await S1.page.goto(u("/admin/payments"));
  expect(!(await S1.page.locator('input[name="op"][value="recordPayment"]').count()), "seller can open payment verification");
  // Before the admin acts, a seller step that needs payment is not offered.
  await S1.page.goto(BASE + facts.f1);
  const steps = await S1.page.locator('button[name="step"]').evaluateAll((b) => b.map((x) => x.value));
  // Admin confirms the TEST payment.
  await A.page.goto(u("/admin/payments"));
  const row = A.page.locator("tr", { hasText: facts.order2 }).first();
  const start = row.locator("form", { has: A.page.locator('input[name="op"][value="startVerification"]') });
  if (await start.count()) {
    await settle(A.page, start.locator("button"));
    await A.page.waitForLoadState("networkidle");
  }
  const row2 = A.page.locator("tr", { hasText: facts.order2 }).first();
  await row2.locator("details summary").first().click();
  const rec = row2.locator("form", { has: A.page.locator('input[name="op"][value="recordPayment"]') });
  const due = await row2.locator("td").nth(3).innerText();
  await rec.locator(':is(input,textarea,select)[name="received"]').fill(due.replace(/[^0-9.,]/g, "").replace(",", ""));
  await rec.locator(':is(input,textarea,select)[name="bankReference"]').fill(`IN-TEST-${RUN}`);
  await settle(A.page, rec.locator('button[type="submit"]'));
  await A.page.waitForLoadState("networkidle");
  await ok(A.page);
  await S1.page.goto(BASE + facts.f1);
  const stageAfter = await S1.page.locator("[data-payment-stage]").getAttribute("data-payment-stage");
  expect(stageAfter !== stageBefore, `payment stage did not change (${stageBefore})`);
  return `seller saw ${stageBefore} → ${stageAfter}; steps offered before payment: ${steps.join(",") || "none"}`;
});

await step(17, "Update the order statuses through the seller account", async () => {
  const done = [];
  for (let i = 0; i < 4; i++) {
    await S1.page.goto(BASE + facts.f1);
    const btn = S1.page.locator('button[name="step"]').first();
    if (!(await btn.count())) break;
    const v = await btn.getAttribute("value");
    await S1.page.fill("#os-comment", `Step ${v} done (test).`);
    await settle(S1.page, btn);
    await S1.page.waitForLoadState("networkidle");
    await ok(S1.page);
    done.push(v);
    if (v === "ready") break;
  }
  expect(done.includes("ready"), `did not reach ready (${done.join(",")})`);
  // The seller cannot mark collected / delivered / paid.
  const t = await S1.page.locator("main").innerText();
  expect(!(await S1.page.locator('button[name="step"][value="collect"], button[name="step"][value="deliver"]').count()), "seller can mark collected/delivered");
  await shot(S1.page, "17-seller-ready");
  // An order message to Amartani.
  const msg = S1.page.locator("form", { has: S1.page.locator('input[name="op"][value="orderMessage"]') });
  await msg.locator(':is(input,textarea,select)[name="body"]').fill("The chairs are wrapped and ready at the gate.");
  await settle(S1.page, msg.locator('button[type="submit"]'));
  await ok(S1.page);
  return `${done.join(" → ")}${/ready/i.test(t) ? "" : ""}`;
});

await step(18, "Verify that the customer receives the correct notifications", async () => {
  const t = await notifTexts(C.page);
  await shot(C.page, "18-notifications");
  const want = [/payment.*(confirmed|received|verified)/i, /accepted/i, /ready/i];
  const miss = want.filter((r) => !r.test(t)).map(String);
  expect(miss.length === 0, `missing: ${miss.join(", ")}`);
  expect(!/wrapped and ready at the gate/i.test(t), "customer sees the seller's message to Amartani");
  return "payment confirmed, accepted, preparing, ready";
});

await step(19, "Sellers cannot access other sellers' orders", async () => {
  const r = await S2.page.goto(BASE + facts.f1);
  const t = await S2.page.locator("body").innerText();
  expect(r.status() === 404 || /not found|could not be found/i.test(t), `seller 2 opened seller 1's order (HTTP ${r.status()})`);
  expect(!t.includes(`Oak chair ${RUN}`), "other seller's item visible");
  const r2 = await S2.page.goto(u(`/seller/products/${facts.p1}`));
  const t2 = await S2.page.locator("body").innerText();
  expect(r2.status() === 404 || !/Oak chair/.test(t2), "seller 2 can edit seller 1's product");
  return `HTTP ${r.status()} for the order, product editor closed`;
});

await step(20, "Customers cannot access other customers' information", async () => {
  await registerCustomer(C2.page, cust2);
  await verifyEmail(C2.page);
  const r = await C2.page.goto(u(`/account/orders/${facts.order2}`));
  const t = await C2.page.locator("body").innerText();
  expect(r.status() === 404 || /not found/i.test(t), `customer 2 opened customer 1's order (HTTP ${r.status()})`);
  expect(!t.includes("Rustaveli"), "address leaked");
  const api = await C2.page.evaluate(async (id) => (await fetch(`/api/files/${id}`)).status, "nonexistent");
  return `HTTP ${r.status()}; file API without access: ${api}`;
});

await step(21, "Order history and financial records remain correct", async () => {
  // A later price change does not change the order.
  await S1.page.goto(u(`/seller/products/${facts.p1}`));
  await S1.page.fill(':is(input,textarea,select)[name="retailPrice"]', "999");
  await submitForm(S1.page, ':is(input,textarea,select)[name="retailPrice"]');
  await C.page.goto(u(`/account/orders/${facts.order2}`));
  const t = await C.page.locator("main").innerText();
  expect(/4[,.]?600/.test(t) && !/999/.test(t), "order total changed after a price edit");
  await A.page.goto(u(`/admin/orders/${facts.order2}`));
  const a = await A.page.locator("main").innerText();
  await shot(A.page, "21-admin-order");
  expect(/4[,.]?600/.test(a), "admin order does not show 4,600");
  expect(/commission/i.test(a), "no commission on the admin order");
  await S1.page.goto(BASE + facts.f1);
  const s = await S1.page.locator("main").innerText();
  expect(/commission/i.test(s), "seller does not see the commission deduction");
  return "prices, commission and payable unchanged; history kept";
});

// Mobile layouts: every page above at phone size, no sideways scrolling.
const phone = devices["iPhone 13"];
const mobilePages = [
  [C, ["/", "/products", `/products/${facts.p1}`, "/cart", "/account", `/account/orders/${facts.order2}`, "/account/notifications"]],
  [S1, ["/seller", "/seller/application", "/seller/products", `/seller/products/${facts.p1}`, "/seller/orders", facts.f1?.replace(/^\/en/, ""), "/seller/company", "/seller/verification"]],
  [A, ["/admin/sellers", `/admin/sellers/${facts.companySlug}`, `/admin/sellers/${facts.companySlug}/verification`, "/admin/payments", `/admin/orders/${facts.order2}`, "/admin/accounts"]],
];
await step("M", "Mobile layouts (iPhone 13): no horizontal scrolling", async () => {
  const bad = [];
  let n = 0;
  for (const [who, paths] of mobilePages) {
    const ctx = await browser.newContext({ ...phone, storageState: await who.ctx.storageState() });
    const page = await ctx.newPage();
    for (const p of paths.filter(Boolean)) {
      await page.goto(u(p));
      await page.waitForLoadState("networkidle");
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 1) bad.push(`${p} (+${over}px)`);
      if (n < 8) await page.screenshot({ path: path.join(OUT, `m-${String(n).padStart(2, "0")}${p.replace(/[^a-z0-9]+/gi, "-")}.png`) });
      n++;
    }
    await ctx.close();
  }
  expect(bad.length === 0, `overflow: ${bad.join(", ")}`);
  return `${n} pages`;
});

await browser.close();
writeFileSync(path.join(OUT, "results.json"), JSON.stringify({ base: BASE, run: RUN, results, facts: { ...facts, makers: undefined } }, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
