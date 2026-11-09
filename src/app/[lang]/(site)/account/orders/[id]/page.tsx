import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, Clock, Info, Landmark, MapPin, Paperclip } from "lucide-react";
import { ClearCart } from "@/components/market/ClearCart";
import { ActionButton, ActionForm, FormNotice, SignInRequired, Status, tetri, when } from "@/components/market/ui";
import { getDict, href, isLang, locMaker, place } from "@/i18n";
import { getManufacturer, getProduct } from "@/lib/catalog";
import { locProduct } from "@/i18n";
import { currentActor } from "@/lib/market/auth";
import { customerOrder } from "@/lib/market/queries";
import { market } from "@/lib/market/server";
import { ORDER_FLOW, MarketError } from "@/lib/market/types";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string; id: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, id } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").market.orders.order(id), robots: { index: false } };
}

export default async function CustomerOrderPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const { id } = await params;
  const sp = await searchParams;
  const m = t.market;
  const o = m.order;
  const self = href(lang, `/account/orders/${id}`);
  const actor = await currentActor();
  if (actor?.role !== "customer")
    return (
      <div className="container-page py-8">
        <SignInRequired lang={lang} text={m.signin.needCustomer} next={self} />
      </div>
    );

  let view;
  try {
    view = customerOrder(market(), actor, id);
  } catch (e) {
    if (e instanceof MarketError) notFound();
    throw e;
  }
  const { order, shipments, payments, refunds, history, bank } = view;
  const status = order.status;
  const flowIndex = (ORDER_FLOW as readonly string[]).indexOf(status);
  const reached = Math.max(
    flowIndex,
    ...history.filter((h) => h.entity === "order").map((h) => (ORDER_FLOW as readonly string[]).indexOf(h.to_status)),
  );
  const isException = flowIndex < 0;
  const canPay = ["awaiting_payment", "payment_rejected"].includes(status) && view.due > 0;
  const lastRejection = [...history].reverse().find((h) => h.entity === "order" && h.to_status === "payment_rejected");
  const partial = status === "awaiting_payment" && view.received > 0;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="container-page max-w-5xl space-y-6 py-6 md:py-8">
      {sp.placed === "1" && <ClearCart />}
      <Link href={href(lang, "/account/orders")} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-2 hover:text-red-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {o.back}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold md:text-3xl">{m.orders.order(order.id)}</h1>
        <Status value={status} labels={m.orderStatus} />
        <span className="text-sm text-muted">{m.orders.placedOn(when(order.created_at, lang))}</span>
      </div>
      {sp.placed === "1" && <p className="rounded-lg border border-[#c4e0cf] bg-ok-50 px-3 py-2 text-sm text-ok">{o.placedThanks}</p>}
      <FormNotice lang={lang} sp={sp} />

      {/* Payment instructions */}
      {canPay && (
        <section className="card overflow-hidden border-red-200" aria-labelledby="pay-h">
          <div className="bg-red-50 px-4 py-3">
            <h2 id="pay-h" className="flex items-center gap-2 text-lg font-bold text-ink">
              <Landmark className="h-5 w-5 text-red-600" aria-hidden="true" /> {o.payTitle}
            </h2>
            <p className="mt-1 text-sm text-ink-2">{o.payIntro}</p>
          </div>
          {status === "payment_rejected" && (
            <p className="flex items-start gap-2 border-b border-line bg-red-50/60 px-4 py-2 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span><strong>{o.rejectedTitle}.</strong> {lastRejection?.note ? `${o.reason}: ${lastRejection.note}. ` : ""}{o.rejectedText}</span>
            </p>
          )}
          {partial && (
            <p className="border-b border-line bg-warn-50 px-4 py-2 text-sm text-warn"><strong>{o.partialTitle}.</strong> {o.partialText(tetri(view.due))}</p>
          )}
          <dl className="grid gap-x-6 gap-y-3 p-4 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-muted">{o.amountToPay}</dt>
              <dd className="text-2xl font-extrabold tabular-nums text-ink">{tetri(view.due)}</dd>
            </div>
            <div><dt className="text-muted">{o.holder}</dt><dd className="font-semibold">{bank.holder}</dd></div>
            <div><dt className="text-muted">{o.bank}</dt><dd className="font-semibold">{bank.bank}</dd></div>
            <div><dt className="text-muted">{o.iban}</dt><dd className="font-mono font-semibold">{bank.iban}</dd></div>
            <div><dt className="text-muted">{o.swift}</dt><dd className="font-mono font-semibold">{bank.swift}</dd></div>
            <div><dt className="text-muted">{o.reference}</dt><dd className="font-mono text-base font-bold text-red-700">{order.id}</dd></div>
            {order.payment_deadline && <div><dt className="text-muted">{o.deadline}</dt><dd className="font-semibold">{when(order.payment_deadline, lang)}</dd></div>}
          </dl>
          <details className="border-t border-line" open={sp.error !== undefined}>
            <summary className="btn btn-primary m-4 cursor-pointer list-none">{o.madePayment}</summary>
            <ActionForm op="submitPayment" id={order.id} back={self} files className="space-y-3 px-4 pb-4">
              <h3 className="font-bold">{o.formTitle}</h3>
              <p className="flex gap-2 text-sm text-ink-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />{o.formIntro}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="label" htmlFor="pay-amount">{o.amount}</label>
                  <input id="pay-amount" name="amount" required inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" defaultValue={(view.due / 100).toFixed(2)} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="pay-date">{o.date}</label>
                  <input id="pay-date" name="date" type="date" required max={today} defaultValue={today} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="pay-ref">{o.bankRef}</label>
                  <input id="pay-ref" name="reference" required maxLength={100} className="input" />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="pay-receipt">{o.receipt}</label>
                <input id="pay-receipt" name="receipt" type="file" accept="application/pdf,image/png,image/jpeg" className="input" />
              </div>
              <button type="submit" className="btn btn-dark">{o.submit}</button>
            </ActionForm>
          </details>
        </section>
      )}

      {status === "payment_submitted" && (
        <section className="flex items-start gap-3 rounded-xl border border-[#cbd9e8] bg-[#eaf0f7] p-4 text-[#24476b]">
          <Clock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-bold">{o.pendingTitle}</h2>
            <p className="text-sm">{o.pendingText}</p>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {/* Timeline */}
          <section className="card p-4 md:p-5">
            <h2 className="text-base font-bold">{o.timeline}</h2>
            <ol className="mt-4 space-y-0">
              {ORDER_FLOW.map((step, i) => {
                const done = i <= reached && !(isException && i > reached);
                const current = !isException && i === flowIndex;
                const at = [...history].reverse().find((h) => h.entity === "order" && h.to_status === step)?.at;
                return (
                  <li key={step} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < ORDER_FLOW.length - 1 && <span className={`absolute left-[11px] top-6 h-full w-0.5 ${i < reached ? "bg-red-600" : "bg-line"}`} aria-hidden="true" />}
                    <span className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? "bg-red-600 text-white" : "border-2 border-line bg-surface text-muted"} ${current ? "ring-4 ring-red-100" : ""}`}>
                      {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-sm ${done ? "font-semibold text-ink" : "text-muted"}`}>{m.orderStatus[step]}</p>
                      {at && done && <p className="text-xs text-muted">{when(at, lang)}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
            {isException && (
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-warn-50 px-3 py-2 text-sm text-warn">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span><strong>{m.orderStatus[status]}</strong>{history.filter((h) => h.entity === "order").at(-1)?.note ? `: ${history.filter((h) => h.entity === "order").at(-1)!.note}` : ""}</span>
              </p>
            )}
            {status === "delivered" && (
              <div className="mt-4"><ActionButton op="completeOrder" id={order.id} back={self} label={o.confirmReceived} tone="primary" /></div>
            )}
          </section>

          {/* Shipments */}
          <section className="space-y-3">
            <h2 className="text-base font-bold">{o.shipments}</h2>
            {shipments.length > 1 && <p className="flex gap-2 text-sm text-ink-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />{o.separate}</p>}
            {shipments.map((s) => {
              const maker = locMaker(getManufacturer(s.manufacturer)!, lang);
              return (
                <div key={s.id} className="card overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2 border-b border-line bg-paper-2/60 px-4 py-2.5">
                    <MapPin className="h-4 w-4 text-red-600" aria-hidden="true" />
                    <span className="text-sm font-semibold">{o.shipmentFrom(maker.name, maker.city)}</span>
                    <span className="ml-auto"><Status value={s.status} labels={m.shipmentStatus} /></span>
                  </div>
                  <ul className="divide-y divide-line text-sm">
                    {s.items.map((it) => {
                      const p = getProduct(it.product_slug);
                      return (
                        <li key={it.id} className="flex justify-between gap-3 px-4 py-2">
                          <span>{it.qty} × {p ? locProduct(p, lang).name : it.product_name}</span>
                          <span className="tabular-nums">{tetri(it.line_tetri)}</span>
                        </li>
                      );
                    })}
                    <li className="flex justify-between gap-3 px-4 py-2 text-muted">
                      <span>{o.delivery}</span>
                      <span className="tabular-nums">{tetri(s.delivery)}</span>
                    </li>
                  </ul>
                  {s.rejectReason && <p className="border-t border-line px-4 py-2 text-sm text-red-700">{o.reason}: {s.rejectReason}</p>}
                </div>
              );
            })}
          </section>

          {/* Detailed history */}
          <section className="card p-4">
            <h2 className="text-base font-bold">{o.history}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {[...history].reverse().map((h) => (
                <li key={h.id} className="flex flex-wrap gap-x-2">
                  <span className="text-xs tabular-nums text-muted">{when(h.at, lang)}</span>
                  <span className="text-ink-2">
                    {m.entity[h.entity]}
                    {h.entity === "fulfillment" ? ` ${h.entity_id.slice(-1)}` : ""}: {h.from_status ? `${(h.entity === "order" ? m.orderStatus : h.entity === "refund" ? m.refundStatus : m.shipmentStatus)[h.from_status] ?? h.from_status} → ` : ""}
                    <strong className="text-ink">{(h.entity === "order" ? m.orderStatus : h.entity === "refund" ? m.refundStatus : m.shipmentStatus)[h.to_status] ?? h.to_status}</strong>
                    {h.by_role ? ` · ${m.roles[h.by_role as "customer"]}` : ""}
                    {h.note ? ` · ${h.note}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card p-4">
            <h2 className="text-base font-bold">{o.summary}</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-ink-2">{o.subtotal}</dt><dd className="tabular-nums">{tetri(order.goods_tetri)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-2">{o.delivery}</dt><dd className="tabular-nums">{tetri(order.delivery_tetri)}</dd></div>
              <div className="flex justify-between border-t border-line pt-1.5 font-bold"><dt>{o.total}</dt><dd className="tabular-nums">{tetri(order.total_tetri)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-2">{o.received}</dt><dd className="tabular-nums">{tetri(view.received)}</dd></div>
              {view.refunded > 0 && <div className="flex justify-between"><dt className="text-ink-2">{o.refunded}</dt><dd className="tabular-nums">{tetri(view.refunded)}</dd></div>}
              {view.due > 0 && <div className="flex justify-between font-semibold text-red-700"><dt>{o.due}</dt><dd className="tabular-nums">{tetri(view.due)}</dd></div>}
            </dl>
            <p className="mt-3 text-xs text-muted">{o.deliverTo}: {order.delivery_name}, {order.delivery_address}, {place(order.delivery_city, lang)}</p>
          </section>

          {payments.some((p) => p.submittedAt) && (
            <section className="card p-4">
              <h2 className="text-base font-bold">{o.payments}</h2>
              <ul className="mt-3 space-y-3 text-sm">
                {payments.filter((p) => p.submittedAt).map((p) => (
                  <li key={p.id} className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{p.id}</span><Status value={p.status} labels={m.paymentStatus} /></div>
                    <p className="text-ink-2">{o.reportedAmount}: {tetri(p.reported)} · {p.reportedDate} · {p.reference}</p>
                    {p.received != null && <p className="text-ink-2">{o.receivedAmount}: {tetri(p.received)}</p>}
                    {p.receiptFile && (
                      <a href={`/api/files/${p.receiptFile}`} className="inline-flex items-center gap-1 text-red-600 hover:underline" target="_blank" rel="noreferrer">
                        <Paperclip className="h-3.5 w-3.5" aria-hidden="true" /> {p.receiptName ?? o.receiptFile}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {refunds.length > 0 && (
            <section className="card p-4">
              <h2 className="text-base font-bold">{o.refunds}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {refunds.map((r) => (
                  <li key={r.id}>
                    <div className="flex flex-wrap items-center gap-2"><span className="font-semibold tabular-nums">{tetri(r.amount)}</span><Status value={r.status} labels={m.refundStatus} /></div>
                    <p className="text-ink-2">{r.reason}{r.reference ? ` · ${r.reference} · ${r.date}` : ""}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
