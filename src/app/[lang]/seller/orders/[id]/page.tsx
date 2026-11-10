import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info, Lock } from "lucide-react";
import { TextArea } from "@/components/forms/Field";
import { Submit } from "@/components/forms/Submit";
import { TestBanner, TestTag } from "@/components/market/journey";
import { itemName } from "@/components/market/maker";
import { FormNotice, ReasonAction, Status, tetri, when } from "@/components/market/ui";
import { SellerForm } from "@/components/seller/kit";
import { getDict, href, isLang, place, unit } from "@/i18n";
import { itemSnapshot, makerOrder } from "@/lib/market/queries";
import { sellerSession } from "@/lib/market/seller-page";
import { market } from "@/lib/market/server";
import { ORDER_MESSAGE_KINDS } from "@/lib/market/service";
import { MarketError } from "@/lib/market/types";
import { formatBps } from "@/lib/money";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string; id: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, id } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").market.orders.order(id) };
}

/** The steps a seller may take, by current status. Payment, collection and delivery are admin-only. */
const NEXT: Record<string, ("accept" | "prepare" | "progress" | "ready")[]> = {
  new: ["accept"],
  accepted: ["prepare"],
  preparing: ["progress", "ready"],
  in_progress: ["ready"],
};

/** Portal B: one order, only the seller's own part of it. */
export default async function SellerOrderPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const session = await sellerSession();
  if (!session) return null;
  const { id } = await params;
  const sp = await searchParams;
  const mk = t.market;
  const s = t.sell.orders;
  const self = href(lang, `/seller/orders/${id}`);

  let o;
  try {
    o = makerOrder(market(), session.actor, id);
  } catch (e) {
    if (e instanceof MarketError) notFound();
    throw e;
  }
  const paid = !!o.paymentStage && !["awaiting_customer", "customer_submitted"].includes(o.paymentStage);
  const next = o.orderCancelled || !paid ? [] : NEXT[o.status] ?? [];

  return (
    <div className="space-y-5">
      <Link href={href(lang, "/seller/orders")} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-2 hover:text-red-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {mk.maker.back}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">{mk.orders.order(o.orderNumber)}</h1>
        {o.isTest && <TestTag lang={lang} />}
        <Status value={o.status} labels={mk.shipmentStatus} />
        <span className="text-sm text-muted">{s.placed}: {when(o.placedAt, lang)}</span>
      </div>
      {o.isTest && <TestBanner lang={lang} />}
      <FormNotice lang={lang} sp={sp} />
      {o.status === "rejected" && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{mk.maker.rejected}{o.rejectReason ? `: ${o.rejectReason}` : ""}</p>}
      {o.orderCancelled && <p className="rounded-lg bg-paper-2 px-3 py-2 text-sm text-ink-2">{mk.maker.cancelled}</p>}

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-5">
          <section className="card overflow-hidden">
            <h2 className="border-b border-line px-4 py-3 text-base font-bold">{s.products}</h2>
            <ul className="divide-y divide-line text-sm">
              {o.items.map((i) => {
                const snap = itemSnapshot(i);
                const specs = Object.entries(snap.specs ?? {});
                const options = Object.entries(snap.options ?? {});
                return (
                  <li key={i.id} className="flex gap-3 px-4 py-3">
                    {snap.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- uploads are served by our own permission-checked route
                      <img src={snap.image} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="h-16 w-16 shrink-0 rounded-lg bg-paper-2" aria-hidden="true" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{itemName(i, lang)}</p>
                      <p className="text-ink-2">
                        {s.qty}: <strong>{i.qty}</strong> · {s.unitPrice}: <strong>{tetri(i.unit_price_tetri, lang)}</strong> / {unit(i.unit, lang)}
                        {i.pricing && <span className="ml-1 rounded bg-paper-2 px-1.5 py-0.5 text-xs font-semibold">{i.pricing === "wholesale" ? s.wholesale : s.retail}</span>}
                      </p>
                      {options.length > 0 && <p className="text-xs text-ink-2">{s.options}: {options.map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>}
                      {specs.length > 0 && <p className="mt-0.5 text-xs text-muted">{specs.map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>}
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums">{tetri(i.line_tetri, lang)}</span>
                  </li>
                );
              })}
            </ul>
            <dl className="space-y-1 border-t border-line bg-paper-2/50 px-4 py-3 text-sm">
              <div className="flex justify-between"><dt>{s.yourTotal}</dt><dd className="tabular-nums">{tetri(o.goods, lang)}</dd></div>
              <div className="flex justify-between text-ink-2"><dt>{s.commission} ({formatBps(o.commissionBps, lang)}, {mk.commissionBase[o.commissionBase]})</dt><dd className="tabular-nums">−{tetri(o.commission, lang)}</dd></div>
              <div className="flex justify-between font-bold"><dt>{s.settlement}</dt><dd className="tabular-nums">{tetri(o.payable, lang)}</dd></div>
            </dl>
          </section>

          {next.length > 0 && (
            <section className="card space-y-3 p-4" aria-labelledby="next-step">
              <h2 id="next-step" className="text-base font-bold">{s.nextStep}</h2>
              <SellerForm op="orderStep" back={self} lang={lang} values={{ id: o.id }} className="space-y-2">
                <TextArea id="os-comment" name="comment" label={s.stepComment} maxLength={500} rows={2} />
                <div className="flex flex-wrap gap-2">
                  {next.map((step, n) => (
                    <Submit key={step} name="step" value={step} className={`btn ${n === 0 ? "btn-primary" : "btn-dark"} px-3 py-1.5 text-sm`}>{s.steps[step]}</Submit>
                  ))}
                </div>
              </SellerForm>
              {["new", "accepted", "preparing", "in_progress"].includes(o.status) && (
                <ReasonAction op="makerReject" id={o.id} back={self} label={mk.maker.reject} fieldLabel={mk.maker.rejectReason} danger />
              )}
              <p className="flex gap-2 text-xs text-muted"><Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />{s.deliveryText}</p>
            </section>
          )}

          <section className="card space-y-3 p-4" aria-labelledby="order-messages">
            <h2 id="order-messages" className="text-base font-bold">{s.messages}</h2>
            <p className="flex items-center gap-1.5 text-xs text-muted"><Lock className="h-3 w-3" aria-hidden="true" />{s.messagesHint}</p>
            {o.messages.length === 0 ? (
              <p className="text-sm text-muted">{s.noMessages}</p>
            ) : (
              <ul className="space-y-2">
                {o.messages.map((m) => (
                  <li key={m.id} className={`rounded-lg border border-line px-3 py-2 text-sm ${m.author_role === "manufacturer" ? "bg-paper-2" : "bg-surface"}`}>
                    <p className="flex flex-wrap gap-x-2 text-xs text-muted">
                      <strong className="text-ink">{m.author_role === "admin" ? t.sell.app.fromAmartani : t.sell.app.you}</strong>
                      <span className="font-semibold">{s.kind[m.kind]}</span>
                      <span className="ml-auto tabular-nums">{when(m.at, lang)}</span>
                    </p>
                    <p className="mt-1 whitespace-pre-line text-ink-2">{m.body}</p>
                  </li>
                ))}
              </ul>
            )}
            <SellerForm op="orderMessage" back={self} lang={lang} values={{ id: o.id }} className="grid gap-2 sm:grid-cols-[12rem_1fr]">
              <div>
                <label className="label" htmlFor="om-kind">{s.kindLabel}</label>
                <select id="om-kind" name="kind" className="input">
                  {ORDER_MESSAGE_KINDS.map((k) => (
                    <option key={k} value={k}>{s.kind[k]}</option>
                  ))}
                </select>
              </div>
              <TextArea id="om-body" name="body" label={s.message} required maxLength={2000} rows={2} />
              <Submit className="btn btn-dark px-3 py-1.5 text-sm sm:col-start-2 sm:justify-self-start">{s.send}</Submit>
            </SellerForm>
          </section>

          <section className="card p-4">
            <h2 className="text-base font-bold">{s.history}</h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {[...o.history].reverse().map((h) => (
                <li key={h.id} className="flex flex-wrap gap-x-2">
                  <span className="text-xs tabular-nums text-muted">{when(h.at, lang)}</span>
                  <span className="text-ink-2">
                    {mk.entity[h.entity]}: {h.from_status ? `${(h.entity === "payout" ? mk.payoutStatus : mk.shipmentStatus)[h.from_status] ?? h.from_status} → ` : ""}
                    <strong className="text-ink">{(h.entity === "payout" ? mk.payoutStatus : mk.shipmentStatus)[h.to_status] ?? h.to_status}</strong>
                    {h.by_role ? ` · ${mk.roles[h.by_role as "admin"]}` : ""}
                    {h.note ? ` · ${h.note}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-4">
          {o.paymentStage && (
            <section className="card p-4 text-sm" data-payment-stage={o.paymentStage}>
              <h2 className="text-base font-bold">{s.paymentStageTitle}</h2>
              <p className={`mt-2 font-semibold ${paid ? "text-ok" : "text-warn"}`}>{s.paymentStage[o.paymentStage]}</p>
              {o.payout?.reference && <p className="mt-2 text-ink-2">{mk.maker.transferRef}: <span className="font-mono">{o.payout.reference}</span></p>}
              {o.payout?.status === "transfer_completed" && o.payout.date && <p className="text-ink-2">{mk.maker.transferDate}: {o.payout.date}</p>}
              {o.payout?.status === "on_hold" && o.payout.holdReason && <p className="mt-2 text-warn">{mk.maker.holdReason}: {o.payout.holdReason}</p>}
              <p className="mt-3 text-xs text-muted">{s.paymentOnlyAdmin}</p>
            </section>
          )}
          <section className="card p-4 text-sm">
            <h2 className="text-base font-bold">{s.customer}</h2>
            <p className="mt-2 font-semibold">{o.customer.name}</p>
            <p className="text-ink-2">{place(o.customer.city, lang)}</p>
            {o.customer.note && <p className="mt-2 text-ink-2">{mk.maker.deliveryNote}: {o.customer.note}</p>}
            {o.prepareBy && <p className="mt-3 rounded-lg bg-paper-2 px-2 py-1.5"><span className="text-muted">{mk.maker.prepareBy}:</span> <strong>{when(o.prepareBy, lang, false)}</strong></p>}
          </section>
          <section className="card p-4 text-sm">
            <h2 className="text-base font-bold">{s.delivery}</h2>
            <p className="mt-2 text-ink-2">{s.deliveryText}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
