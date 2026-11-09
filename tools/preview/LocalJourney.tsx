/**
 * PREVIEW ONLY. The published preview is plain HTML with no server, so here the purchase journey
 * runs in the browser: checkout → payment → confirmation → tracking, using the same components as
 * the real site. Every order made here is a TEST order kept in this browser's storage. It uses
 * test bank details, is never sent anywhere and never counts as a payment.
 */
import { useState } from "react";
import { CheckoutForm, type CheckoutDetails } from "@/components/market/CheckoutForm";
import { CheckoutSteps, Confirmation, OrderSummary, OrderTimeline, PaymentFields, PaymentInstructions, TestBanner, TestTag, type SummaryShipment } from "@/components/market/journey";
import { href, locMaker, locProduct } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { clearCart } from "@/lib/cart";
import { quoteCartDelivery } from "@/lib/cart-delivery";
import { getManufacturer, previewLookup } from "./shims/catalog";
import { TEST_BANK } from "@/lib/market/test-bank";
import { toTetri } from "@/lib/money";
import { toFile } from "./shims/link";

const KEY = "ase-test-orders-v1";
const FLOW = ["placed", "awaiting_payment", "payment_submitted", "payment_confirmed", "preparing", "ready", "collected", "in_delivery", "delivered", "completed"];

interface LocalOrder {
  id: string;
  createdAt: string;
  deadline: string;
  details: CheckoutDetails;
  shipments: (SummaryShipment & { slug: string })[];
  goods: number;
  delivery: number;
  total: number;
  status: string;
  history: { to: string; at: string }[];
  report: { amount: number; date: string; reference: string } | null;
}

function load(): LocalOrder[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function save(orders: LocalOrder[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(orders.slice(-20)));
  } catch {
    /* storage blocked: the order still shows until the page is left */
  }
}
const go = (lang: "ka" | "en", path: string) => window.location.assign(toFile(href(lang, path)));

export function LocalCheckout() {
  const { lang, t } = useI18n();
  const city = new URLSearchParams(window.location.search).get("city") ?? "Tbilisi";
  return (
    <div className="container-page py-6 md:py-8">
      <h1 className="mb-4 text-2xl font-extrabold md:text-3xl">{t.market.checkout.title}</h1>
      <CheckoutSteps lang={lang} step={2} />
      <p className="mb-6 max-w-3xl text-sm text-ink-2">{t.market.checkout.intro}</p>
      <CheckoutForm
        defaultName=""
        defaultCity={city}
        testMode
        onPlace={(d) => {
          // Same calculation as the server: catalog prices and the delivery engine, in whole tetri.
          const q = quoteCartDelivery(d.lines, d.city, previewLookup);
          const shipments = q.groups.map((g) => {
            const m = locMaker(getManufacturer(g.manufacturer)!, lang);
            const s = q.delivery.shipments.find((x) => x.originId === g.manufacturer);
            return {
              id: g.manufacturer,
              slug: g.manufacturer,
              maker: m.name,
              city: m.city,
              status: "awaiting_payment",
              delivery: s?.status === "quoted" ? toTetri(s.price.total) : 0,
              items: g.lines.map(({ product, qty, unitPrice }) => ({ key: product.slug, name: locProduct(product, lang).name, qty, line: toTetri(unitPrice) * qty })),
            };
          });
          const goods = shipments.reduce((s, x) => s + x.items.reduce((a, i) => a + i.line, 0), 0);
          const delivery = shipments.reduce((s, x) => s + x.delivery, 0);
          const now = new Date();
          const order: LocalOrder = {
            id: `TEST-${String(Date.now()).slice(-6)}`,
            createdAt: now.toISOString(),
            deadline: new Date(now.getTime() + 72 * 3600_000).toISOString(),
            details: d,
            shipments,
            goods,
            delivery,
            total: goods + delivery,
            status: "awaiting_payment",
            history: [
              { to: "placed", at: now.toISOString() },
              { to: "awaiting_payment", at: now.toISOString() },
            ],
            report: null,
          };
          save([...load(), order]);
          clearCart();
          go(lang, `/test-order?id=${order.id}&view=payment`);
        }}
      />
    </div>
  );
}

export function LocalOrderPage() {
  const { lang, t } = useI18n();
  const m = t.market;
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") ?? "";
  const view = params.get("view") ?? "track";
  // This component only runs in the browser (preview islands), so storage can be read right away.
  const [order, setOrder] = useState<LocalOrder | null>(() => load().find((o) => o.id === id) ?? null);

  if (!order)
    return (
      <div className="container-page py-8">
        <p className="card mx-auto max-w-lg p-6 text-center text-sm text-ink-2">{m.test.previewMissing}</p>
      </div>
    );

  const update = (o: LocalOrder) => {
    save(load().map((x) => (x.id === o.id ? o : x)));
    setOrder(o);
  };
  const summary = <OrderSummary lang={lang} shipments={order.shipments} goods={order.goods} delivery={order.delivery} total={order.total} />;
  const banner = <TestBanner lang={lang} extra={m.test.previewNote} />;

  if (view === "payment" && order.status === "awaiting_payment")
    return (
      <div className="container-page max-w-5xl py-6 md:py-8">
        <h1 className="mb-4 text-2xl font-extrabold md:text-3xl">{m.pay.title}</h1>
        <CheckoutSteps lang={lang} step={3} />
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="min-w-0 space-y-5">
            {banner}
            <PaymentInstructions lang={lang} orderId={order.id} due={order.total} bank={TEST_BANK} deadline={order.deadline} isTest />
            <form
              className="card p-4 md:p-5"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                let amount = 0;
                try {
                  amount = toTetri(String(f.get("amount") ?? "").replace(",", "."));
                } catch {
                  return;
                }
                const at = new Date().toISOString();
                update({ ...order, status: "payment_submitted", report: { amount, date: String(f.get("date")), reference: String(f.get("reference")) }, history: [...order.history, { to: "payment_submitted", at }] });
                go(lang, `/test-order?id=${order.id}&view=confirmation`);
              }}
            >
              <PaymentFields lang={lang} due={order.total} isTest orderId={order.id} withReceipt={false} />
            </form>
          </div>
          <aside className="h-fit lg:sticky lg:top-32">{summary}</aside>
        </div>
      </div>
    );

  if (view === "confirmation")
    return (
      <div className="container-page max-w-5xl py-6 md:py-8">
        <CheckoutSteps lang={lang} step={4} />
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="min-w-0 space-y-5">
            {banner}
            <Confirmation lang={lang} orderId={order.id} isTest email={order.details.email || null} report={order.report} />
            <div className="flex flex-wrap gap-3">
              <a href={toFile(href(lang, `/test-order?id=${order.id}&view=track`))} className="btn btn-primary">{m.confirm.track}</a>
              <a href={toFile(href(lang, "/products"))} className="btn btn-ghost border border-line-strong">{m.confirm.continue}</a>
            </div>
          </div>
          <aside className="h-fit">{summary}</aside>
        </div>
      </div>
    );

  // Tracking page
  const idx = FLOW.indexOf(order.status);
  const next = FLOW[idx + 1];
  const shipmentStatus = (s: string) =>
    ({ payment_confirmed: "new", preparing: "preparing", ready: "ready", collected: "collected", in_delivery: "in_delivery", delivered: "delivered", completed: "delivered" })[s] ?? "awaiting_payment";
  return (
    <div className="container-page max-w-5xl space-y-6 py-6 md:py-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold md:text-3xl">{m.orders.order(order.id)}</h1>
        <TestTag lang={lang} />
        <span className="chip bg-paper-2 text-ink-2">{m.orderStatus[order.status]}</span>
      </div>
      {banner}
      {order.status === "awaiting_payment" && (
        <a href={toFile(href(lang, `/test-order?id=${order.id}&view=payment`))} className="btn btn-primary">{m.pay.go}</a>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-4">
          <OrderTimeline lang={lang} status={order.status} history={order.history} />
          {next && order.status !== "awaiting_payment" && (
            <div className="rounded-lg border-2 border-dashed border-[#d9a520] bg-warn-50 p-3 text-sm text-warn">
              <p>{m.test.previewAdmin}</p>
              <button
                type="button"
                className="btn btn-ghost mt-2 border border-[#ecd9ad] bg-surface px-3 py-1.5 text-sm"
                style={{ whiteSpace: "normal", maxWidth: "100%", height: "auto", textAlign: "left", borderRadius: "1rem" }}
                onClick={() => update({ ...order, status: next, history: [...order.history, { to: next, at: new Date().toISOString() }] })}
              >
                {m.test.previewAdvance}: {m.orderStatus[next]}
              </button>
            </div>
          )}
          {order.shipments.length > 1 && <p className="text-sm text-ink-2">{m.order.separate}</p>}
        </div>
        <aside className="h-fit">
          <OrderSummary
            lang={lang}
            shipments={order.shipments.map((s) => ({ ...s, status: shipmentStatus(order.status) }))}
            goods={order.goods}
            delivery={order.delivery}
            total={order.total}
          />
          <p className="mt-3 text-xs text-muted">{m.order.deliverTo}: {order.details.name}, {order.details.address}, {order.details.city}</p>
        </aside>
      </div>
    </div>
  );
}
