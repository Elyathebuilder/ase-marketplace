import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, Info } from "lucide-react";
import { TestBanner, TestTag } from "@/components/market/journey";
import { ActionButton, FormNotice, ReasonAction, SignInRequired, Status, tetri, when } from "@/components/market/ui";
import { getDict, href, isLang, locProduct, place } from "@/i18n";
import { getProduct } from "@/lib/catalog";
import { currentActor } from "@/lib/market/auth";
import { makerOrder } from "@/lib/market/queries";
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

const NEXT: Record<string, "accept" | "prepare" | "ready" | undefined> = { new: "accept", accepted: "prepare", preparing: "ready" };

export default async function MakerOrderPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const { id } = await params;
  const sp = await searchParams;
  const mk = t.market;
  const m = mk.maker;
  const self = href(lang, `/seller/orders/live/${id}`);
  const actor = await currentActor();
  if (actor?.role !== "manufacturer") return <SignInRequired lang={lang} text={mk.signin.needMaker} next={self} />;

  let o;
  try {
    o = makerOrder(market(), actor, id);
  } catch (e) {
    if (e instanceof MarketError) notFound();
    throw e;
  }
  const next = o.orderCancelled ? undefined : NEXT[o.status];

  return (
    <div className="space-y-5">
      <Link href={href(lang, "/seller/orders")} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-2 hover:text-red-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {m.back}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">{mk.orders.order(o.orderNumber)}</h1>
        {o.isTest && <TestTag lang={lang} />}
        <Status value={o.status} labels={mk.shipmentStatus} />
        <span className="text-sm text-muted">{when(o.placedAt, lang)}</span>
      </div>
      {o.isTest && <TestBanner lang={lang} />}
      <FormNotice lang={lang} sp={sp} />

      {o.status !== "rejected" && o.status !== "cancelled" &&
        (o.paymentConfirmed ? (
          <p className="flex items-center gap-2 rounded-lg border border-[#c4e0cf] bg-ok-50 px-3 py-2 text-sm font-semibold text-ok">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {m.paymentConfirmed}
          </p>
        ) : (
          <p className="flex items-center gap-2 rounded-lg bg-warn-50 px-3 py-2 text-sm font-semibold text-warn">
            <Clock className="h-4 w-4" aria-hidden="true" /> {m.paymentWaiting}
          </p>
        ))}
      {o.status === "rejected" && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{m.rejected}{o.rejectReason ? `: ${o.rejectReason}` : ""}</p>}
      {o.status === "cancelled" && <p className="rounded-lg bg-paper-2 px-3 py-2 text-sm text-ink-2">{m.cancelled}</p>}

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <section className="card overflow-hidden">
            <ul className="divide-y divide-line text-sm">
              {o.items.map((i) => {
                const p = getProduct(i.product_slug);
                return (
                  <li key={i.id} className="flex justify-between gap-3 px-4 py-2.5">
                    <span>{i.qty} × {p ? locProduct(p, lang).name : i.product_name}</span>
                    <span className="tabular-nums">{tetri(i.line_tetri)}</span>
                  </li>
                );
              })}
            </ul>
            <dl className="space-y-1 border-t border-line bg-paper-2/50 px-4 py-3 text-sm">
              <div className="flex justify-between"><dt>{m.goods}</dt><dd className="tabular-nums">{tetri(o.goods)}</dd></div>
              <div className="flex justify-between text-ink-2"><dt>{m.commission(formatBps(o.commissionBps), mk.commissionBase[o.commissionBase])}</dt><dd className="tabular-nums">−{tetri(o.commission)}</dd></div>
              <div className="flex justify-between font-bold"><dt>{m.payout}</dt><dd className="tabular-nums">{tetri(o.payable)}</dd></div>
            </dl>
          </section>

          {next && o.paymentConfirmed && (
            <section className="card space-y-3 p-4">
              <div className="flex flex-wrap gap-2">
                <ActionButton op="makerStep" id={o.id} back={self} label={m[next]} extra={{ step: next }} tone="primary" />
              </div>
              <ReasonAction op="makerReject" id={o.id} back={self} label={m.reject} fieldLabel={m.rejectReason} danger />
              <p className="flex gap-2 text-xs text-muted"><Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />{m.collectedNote}</p>
            </section>
          )}

          <section className="card p-4">
            <h2 className="text-base font-bold">{m.history}</h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {[...o.history].reverse().map((h) => (
                <li key={h.id} className="flex flex-wrap gap-x-2">
                  <span className="text-xs tabular-nums text-muted">{when(h.at, lang)}</span>
                  <span className="text-ink-2">
                    {mk.entity[h.entity]}: <strong className="text-ink">{(h.entity === "payout" ? mk.payoutStatus : mk.shipmentStatus)[h.to_status] ?? h.to_status}</strong>
                    {h.by_role ? ` · ${mk.roles[h.by_role as "admin"]}` : ""}
                    {h.note ? ` · ${h.note}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card p-4 text-sm">
            <h2 className="text-base font-bold">{m.customer}</h2>
            <p className="mt-2 font-semibold">{o.customer.name}</p>
            <p className="text-ink-2">{place(o.customer.city, lang)}</p>
            {o.customer.note && <p className="mt-2 text-ink-2">{m.deliveryNote}: {o.customer.note}</p>}
            {o.prepareBy && <p className="mt-3 rounded-lg bg-paper-2 px-2 py-1.5"><span className="text-muted">{m.prepareBy}:</span> <strong>{when(o.prepareBy, lang, false)}</strong></p>}
          </section>
          {o.payout && o.status !== "rejected" && o.status !== "cancelled" && (
            <section className="card p-4 text-sm">
              <h2 className="text-base font-bold">{m.payoutStatus}</h2>
              <div className="mt-2"><Status value={o.payout.status} labels={mk.payoutStatus} /></div>
              {o.payout.reference && <p className="mt-2 text-ink-2">{m.transferRef}: <span className="font-mono">{o.payout.reference}</span></p>}
              {o.payout.status === "transfer_completed" && o.payout.date && <p className="text-ink-2">{m.transferDate}: {o.payout.date}</p>}
              {o.payout.status === "on_hold" && o.payout.holdReason && <p className="mt-2 text-warn">{m.holdReason}: {o.payout.holdReason}</p>}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
