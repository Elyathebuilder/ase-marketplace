import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Info } from "lucide-react";
import { TestBanner, TestTag } from "@/components/market/journey";
import { ActionButton, ActionForm, FormNotice, ReasonAction, Status, Table, tetri, when } from "@/components/market/ui";
import { getDict, href, isLang, locMaker, place } from "@/i18n";
import { getManufacturer } from "@/lib/catalog";
import { adminOrNull } from "@/lib/market/auth";
import { adminOrder } from "@/lib/market/queries";
import { market } from "@/lib/market/server";
import { MarketError } from "@/lib/market/types";
import { formatBps } from "@/lib/money";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string; id: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, id } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").market.orders.order(id) };
}

const ADMIN_NEXT: Record<string, "collect" | "dispatch" | "deliver" | undefined> = { ready: "collect", collected: "dispatch", in_delivery: "deliver" };

export default async function AdminOrderPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const admin = await adminOrNull();
  if (!admin) return null;
  const { id } = await params;
  const sp = await searchParams;
  const m = t.market;
  const a = m.admin.order;
  const self = href(lang, `/admin/orders/${id}`);

  let v;
  try {
    v = adminOrder(market(), admin, id);
  } catch (e) {
    if (e instanceof MarketError) notFound();
    throw e;
  }
  const { order, finance: f } = v;
  const closed = ["completed", "cancelled", "refunded"].includes(order.status);
  const labelsFor = (entity: string) => (entity === "order" ? m.orderStatus : entity === "payment" ? m.paymentStatus : entity === "payout" ? m.payoutStatus : entity === "refund" ? m.refundStatus : m.shipmentStatus);

  return (
    <div className="space-y-6">
      <Link href={href(lang, "/admin/orders")} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-2 hover:text-red-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {a.back}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold md:text-3xl">{order.id}</h1>
        {order.is_test === 1 && <TestTag lang={lang} />}
        <Status value={order.status} labels={m.orderStatus} />
        <span className="text-sm text-muted">{when(order.created_at, lang)}</span>
      </div>
      {order.is_test === 1 && <TestBanner lang={lang} />}
      {order.hold_kind && (
        <p className="flex items-start gap-2 rounded-lg bg-warn-50 px-3 py-2 text-sm text-warn">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {a.onHold(order.hold_kind === "dispute" ? m.admin.orders.dispute : m.admin.orders.hold, order.hold_reason ?? "")}
        </p>
      )}
      <FormNotice lang={lang} sp={sp} />

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          {/* Shipments and settlements */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold">{a.shipments}</h2>
            <p className="text-xs text-muted">{a.commissionRate(formatBps(order.commission_bps), m.commissionBase[order.commission_base])}</p>
            {v.shipments.map((s) => {
              const maker = locMaker(getManufacturer(s.manufacturer_slug)!, lang);
              const step = ADMIN_NEXT[s.status];
              return (
                <div key={s.id} className="card overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2 border-b border-line bg-paper-2/60 px-4 py-2.5">
                    <span className="font-semibold">{s.id}</span>
                    <span className="text-sm text-ink-2">{maker.name}, {maker.city}</span>
                    <span className="ml-auto flex flex-wrap gap-1.5">
                      <Status value={s.status} labels={m.shipmentStatus} />
                      <Status value={s.payout.status} labels={m.payoutStatus} />
                    </span>
                  </div>
                  <ul className="divide-y divide-line text-sm">
                    {s.items.map((i) => (
                      <li key={i.id} className="flex justify-between gap-3 px-4 py-1.5"><span>{i.qty} × {i.product_name} <span className="text-muted">@ {tetri(i.unit_price_tetri)}</span></span><span className="tabular-nums">{tetri(i.line_tetri)}</span></li>
                    ))}
                  </ul>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line px-4 py-2 text-sm sm:grid-cols-4">
                    <div><dt className="text-xs text-muted">{a.fin.goods}</dt><dd className="tabular-nums">{tetri(s.goods_tetri)}</dd></div>
                    <div><dt className="text-xs text-muted">{a.fin.delivery}</dt><dd className="tabular-nums">{tetri(s.delivery_tetri)}</dd></div>
                    <div><dt className="text-xs text-muted">{a.fin.commission}</dt><dd className="tabular-nums">{tetri(s.commission_tetri)}</dd></div>
                    <div><dt className="text-xs text-muted">{a.fin.payable}</dt><dd className="font-semibold tabular-nums">{tetri(s.payable_tetri)}</dd></div>
                  </dl>
                  {s.reject_reason && <p className="border-t border-line px-4 py-2 text-sm text-red-700">{m.order.reason}: {s.reject_reason}</p>}
                  {(step || s.prepare_by) && (
                    <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-2.5">
                      {s.prepare_by && <span className="text-xs text-muted">{m.maker.prepareBy}: {when(s.prepare_by, lang, false)}</span>}
                      {step && <span className="ml-auto"><ActionButton op="adminStep" id={s.id} back={self} label={a[step]} extra={{ step }} tone="primary" /></span>}
                    </div>
                  )}
                </div>
              );
            })}
            {order.status === "delivered" && <ActionButton op="completeOrder" id={order.id} back={self} label={a.complete} tone="primary" />}
          </section>

          {/* Payments */}
          <section>
            <h2 className="text-lg font-bold">{a.payments}</h2>
            <div className="mt-3">
              <Table min="44rem" head={[m.admin.payments.id, m.admin.payments.expected, m.admin.payments.reported, m.admin.payments.reference, m.order.receivedAmount, m.admin.payments.status, m.admin.payments.verifiedBy]}>
                {v.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2"><Link href={href(lang, "/admin/payments")} className="font-semibold text-red-600 hover:underline">{p.id}</Link></td>
                    <td className="px-3 py-2 tabular-nums">{tetri(p.expected_tetri)}</td>
                    <td className="px-3 py-2 tabular-nums">{tetri(p.reported_tetri)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.reference ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{tetri(p.received_tetri)}</td>
                    <td className="px-3 py-2"><Status value={p.status} labels={m.paymentStatus} /></td>
                    <td className="px-3 py-2">{p.verified_by_name ?? "—"}<span className="block text-xs text-muted">{when(p.verified_at, lang)}</span></td>
                  </tr>
                ))}
              </Table>
            </div>
          </section>

          {/* Ledger */}
          <section>
            <h2 className="text-lg font-bold">{a.ledger}</h2>
            <p className="mt-1 text-xs text-muted">{m.admin.ledgerNote}</p>
            <div className="mt-3">
              <Table min="52rem" head={["#", a.kind, m.admin.settlements.manufacturer, m.admin.refunds.amount, a.bankRef, m.admin.refunds.reason, a.by, a.at]}>
                {v.ledger.map((l) => (
                  <tr key={l.id} className={l.amount_tetri < 0 ? "bg-paper-2/60" : ""}>
                    <td className="px-3 py-1.5 tabular-nums text-muted">{l.id}</td>
                    <td className="px-3 py-1.5">{m.ledgerKind[l.kind] ?? l.kind}{l.adjusts_entry_id ? <span className="block text-xs text-muted">{a.adjusts(l.adjusts_entry_id)}</span> : null}</td>
                    <td className="px-3 py-1.5 text-xs">{l.fulfillment_id ?? "—"}</td>
                    <td className={`px-3 py-1.5 font-semibold tabular-nums ${l.amount_tetri < 0 ? "text-red-700" : ""}`}>{tetri(l.amount_tetri)}</td>
                    <td className="px-3 py-1.5 font-mono text-xs">{l.bank_reference ?? "—"}</td>
                    <td className="px-3 py-1.5 text-xs text-ink-2">{l.note ?? ""}</td>
                    <td className="px-3 py-1.5 text-xs">{l.created_by_name}</td>
                    <td className="px-3 py-1.5 text-xs text-muted">{when(l.created_at, lang)}</td>
                  </tr>
                ))}
              </Table>
            </div>
          </section>

          {/* History */}
          <section>
            <h2 className="text-lg font-bold">{a.history}</h2>
            <div className="mt-3">
              <Table min="52rem" head={[a.at, a.entry, a.from, a.to, a.by, a.reason]}>
                {[...v.history].reverse().map((h) => (
                  <tr key={h.id}>
                    <td className="px-3 py-1.5 text-xs text-muted">{when(h.at, lang)}</td>
                    <td className="px-3 py-1.5 text-xs">{m.entity[h.entity]} {h.entity_id}</td>
                    <td className="px-3 py-1.5 text-xs">{h.from_status ? labelsFor(h.entity)[h.from_status] ?? h.from_status : "—"}</td>
                    <td className="px-3 py-1.5 text-xs font-semibold">{labelsFor(h.entity)[h.to_status] ?? h.to_status}</td>
                    <td className="px-3 py-1.5 text-xs">{h.by_name ?? h.by_user}</td>
                    <td className="px-3 py-1.5 text-xs text-ink-2">{h.note ?? ""}</td>
                  </tr>
                ))}
              </Table>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card p-4 text-sm">
            <h2 className="text-base font-bold">{a.customer}</h2>
            <p className="mt-2 font-semibold">{v.customerName}</p>
            <p className="text-ink-2">{order.delivery_name} · {order.delivery_phone}</p>
            <p className="text-ink-2">{order.delivery_address}, {place(order.delivery_city, lang)}</p>
            {order.delivery_note && <p className="mt-1 text-ink-2">{order.delivery_note}</p>}
          </section>

          <section className="card p-4">
            <h2 className="text-base font-bold">{a.finance}</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              {(
                [
                  [a.fin.received, f.received],
                  [a.fin.goods, f.goods],
                  [a.fin.delivery, f.delivery],
                  [a.fin.commission, f.commission],
                  [a.fin.payable, f.payable],
                  [a.fin.transferred, f.transferred],
                  [a.fin.owed, f.owedToManufacturers],
                  [a.fin.refunds, f.refundPaid],
                  [a.fin.refundOutstanding, f.refundOutstanding],
                  [a.fin.customerOutstanding, f.customerOutstanding],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3"><dt className="text-ink-2">{label}</dt><dd className="tabular-nums">{tetri(value)}</dd></div>
              ))}
              <div className="flex justify-between gap-3 border-t border-line pt-1.5 font-semibold"><dt>{m.order.payments}</dt><dd><Status value={v.payments.at(-1)?.status ?? "awaiting_payment"} labels={m.paymentStatus} /></dd></div>
            </dl>
            <p className="mt-2 flex gap-1.5 text-xs text-muted"><Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />{m.admin.ledgerNote}</p>
          </section>

          <section className="card space-y-2 p-4">
            <h2 className="text-base font-bold">{a.actions}</h2>
            {["payment_confirmed", "preparing", "ready", "collected", "in_delivery", "delivered"].includes(order.status) && (
              <>
                <ReasonAction op="flag" id={order.id} back={self} label={a.flagDelay} fieldLabel={a.reason} extra={{ flag: "preparation_delayed" }} />
                <ReasonAction op="flag" id={order.id} back={self} label={a.flagIssue} fieldLabel={a.reason} extra={{ flag: "delivery_issue" }} />
              </>
            )}
            {(order.status === "preparation_delayed" || order.status === "delivery_issue") && <ActionButton op="clearFlag" id={order.id} back={self} label={a.clearFlag} tone="ghost" />}
            {order.status === "awaiting_payment" && f.received > 0 && <ActionButton op="requestMore" id={order.id} back={self} label={m.admin.payments.requestMore} tone="ghost" />}
            {!order.hold_kind ? (
              <>
                <ReasonAction op="hold" id={order.id} back={self} label={a.hold} fieldLabel={a.reason} extra={{ kind: "hold" }} />
                <ReasonAction op="hold" id={order.id} back={self} label={a.dispute} fieldLabel={a.reason} extra={{ kind: "dispute" }} />
              </>
            ) : (
              <ReasonAction op="release" id={order.id} back={self} label={a.release} fieldLabel={a.reason} required={false} />
            )}
            {f.received - f.refundDue > 0 && (
              <details className="rounded-lg border border-line bg-surface">
                <summary className="cursor-pointer list-none px-3 py-1.5 text-sm font-semibold hover:bg-paper-2">{a.refund}</summary>
                <ActionForm op="refund" id={order.id} back={self} className="space-y-2 border-t border-line p-3">
                  <p className="text-xs text-muted">{a.refundHint}</p>
                  <label className="label" htmlFor="rf-amount">{a.amount}</label>
                  <input id="rf-amount" name="amount" required inputMode="decimal" defaultValue={((f.received - f.refundDue) / 100).toFixed(2)} className="input" />
                  <label className="label" htmlFor="rf-ship">{a.shipment}</label>
                  <select id="rf-ship" name="fulfillment" className="input" defaultValue="">
                    <option value="">{a.wholeOrder}</option>
                    {v.shipments.map((s) => <option key={s.id} value={s.id}>{s.id}</option>)}
                  </select>
                  <label className="label" htmlFor="rf-reason">{a.reason}</label>
                  <textarea id="rf-reason" name="reason" required maxLength={500} rows={2} className="input" />
                  <button type="submit" className="btn btn-dark px-3 py-1.5 text-sm">{a.refund}</button>
                </ActionForm>
              </details>
            )}
            {!closed && order.status !== "refund_processing" && (
              <div>
                <ReasonAction op="cancel" id={order.id} back={self} label={a.cancel} fieldLabel={a.reason} danger />
                <p className="mt-1 text-xs text-muted">{a.cancelHint}</p>
              </div>
            )}
          </section>

          <section className="card p-4">
            <h2 className="text-base font-bold">{a.notes}</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {v.notes.map((n) => (
                <li key={n.id} className="rounded-lg bg-paper-2 px-2.5 py-1.5">
                  <p>{n.body}</p>
                  <p className="text-xs text-muted">{n.by_name} · {when(n.at, lang)}</p>
                </li>
              ))}
            </ul>
            <ActionForm op="addNote" id={order.id} back={self} className="mt-3 space-y-2">
              <label className="sr-only" htmlFor="note-body">{a.addNote}</label>
              <textarea id="note-body" name="body" required maxLength={2000} rows={2} placeholder={a.notePlaceholder} className="input" />
              <button type="submit" className="btn btn-dark px-3 py-1.5 text-sm">{a.addNote}</button>
            </ActionForm>
          </section>
        </aside>
      </div>
    </div>
  );
}
