import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { Kpi } from "@/components/seller/Kpi";
import { formatBps } from "@/lib/money";
import { getDict, href, locProduct, place, type Lang } from "@/i18n";
import { getProduct } from "@/lib/catalog";
import type { Actor } from "@/lib/market/types";
import { makerFinance, makerOrders, type MakerOrder } from "@/lib/market/queries";
import { market } from "@/lib/market/server";
import { Status, Table, tetri, when } from "./ui";

const itemsText = (o: MakerOrder, lang: Lang) =>
  o.items.map((i) => { const p = getProduct(i.product_slug); return `${i.qty} × ${p ? locProduct(p, lang).name : i.product_name}`; }).join(", ");

function PaymentFlag({ o, lang }: { o: MakerOrder; lang: Lang }) {
  const m = getDict(lang).market.maker;
  if (o.status === "rejected" || o.status === "cancelled") return null;
  return o.paymentConfirmed ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-ok"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />{m.paymentConfirmed}</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-warn"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{m.paymentWaiting}</span>
  );
}

export function MakerOrderCard({ o, lang }: { o: MakerOrder; lang: Lang }) {
  const m = getDict(lang).market;
  return (
    <Link href={href(lang, `/seller/orders/live/${o.id}`)} className={`card block p-4 transition hover:shadow-[var(--shadow-lift)] ${o.status === "new" ? "border-red-200" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-ink">{o.orderNumber}</span>
        <Status value={o.status} labels={m.shipmentStatus} />
        <span className="ml-auto text-xs text-muted">{when(o.placedAt, lang)}</span>
      </div>
      <p className="mt-2 text-sm text-ink-2">{itemsText(o, lang)}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <PaymentFlag o={o} lang={lang} />
        {o.prepareBy && !["ready", "collected", "in_delivery", "delivered", "rejected", "cancelled"].includes(o.status) && (
          <span className="text-xs text-muted">{m.maker.prepareBy}: {when(o.prepareBy, lang, false)}</span>
        )}
        <span className="text-muted">{o.customer.name} · {place(o.customer.city, lang)}</span>
        <span className="ml-auto text-right">
          <span className="block font-bold tabular-nums text-ink">{tetri(o.payable)}</span>
          <span className="block text-xs text-muted">{m.maker.payout}</span>
        </span>
      </div>
    </Link>
  );
}

export function LiveOrders({ actor, lang }: { actor: Actor; lang: Lang }) {
  const m = getDict(lang).market.maker;
  const orders = makerOrders(market(), actor);
  return (
    <div>
      <h1 className="text-2xl font-extrabold">{m.ordersTitle}</h1>
      <p className="mt-1 text-sm text-muted">{m.ordersIntro}</p>
      {orders.length === 0 ? (
        <p className="card mt-4 p-8 text-center text-sm text-muted">{m.none}</p>
      ) : (
        <ul className="mt-4 space-y-3">{orders.map((o) => <li key={o.id}><MakerOrderCard o={o} lang={lang} /></li>)}</ul>
      )}
    </div>
  );
}

export function LiveFinance({ actor, lang }: { actor: Actor; lang: Lang }) {
  const mk = getDict(lang).market;
  const m = mk.maker;
  const f = makerFinance(market(), actor);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">{m.financeTitle}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">{m.financeIntro}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label={m.sales} value={tetri(f.sales)} />
        <Kpi label={m.commissionTotal} value={tetri(f.commission)} />
        <Kpi label={m.awaiting} value={tetri(f.awaiting)} hint={`${m.notYet}: ${tetri(f.notYetEligible)}${f.onHold ? ` · ${m.onHold}: ${tetri(f.onHold)}` : ""}`} />
        <Kpi label={m.transferred} value={tetri(f.transferred)} />
      </div>
      {f.bank && (
        <p className="text-sm text-ink-2">{m.bankAccount}: <strong>{f.bank.account_holder}</strong>, {f.bank.bank_name}, <span className="font-mono">{f.bank.iban}</span></p>
      )}
      <section>
        <h2 className="text-lg font-bold">{m.payouts}</h2>
        <div className="mt-3">
          <Table head={[m.order, m.goods, m.commissionTotal, m.payout, m.status, m.transferRef, m.transferDate]}>
            {f.orders.map((o) => (
              <tr key={o.id}>
                <td className="px-3 py-2"><Link href={href(lang, `/seller/orders/live/${o.id}`)} className="font-semibold text-red-600 hover:underline">{o.orderNumber}</Link></td>
                <td className="px-3 py-2 tabular-nums">{tetri(o.goods)}</td>
                <td className="px-3 py-2 tabular-nums">−{tetri(o.commission)} <span className="text-xs text-muted">({formatBps(o.commissionBps)})</span></td>
                <td className="px-3 py-2 font-semibold tabular-nums">{o.status === "rejected" || o.status === "cancelled" ? "—" : tetri(o.payable)}</td>
                <td className="px-3 py-2">{o.status === "rejected" || o.status === "cancelled" ? <Status value={o.status} labels={mk.shipmentStatus} /> : <Status value={o.payout!.status} labels={mk.payoutStatus} />}</td>
                <td className="px-3 py-2 font-mono text-xs">{o.payout?.reference ?? "—"}</td>
                <td className="px-3 py-2">{o.payout?.status === "transfer_completed" ? o.payout.date : "—"}</td>
              </tr>
            ))}
          </Table>
        </div>
      </section>
    </div>
  );
}

export function LiveDashboard({ actor, lang }: { actor: Actor; lang: Lang }) {
  const m = getDict(lang).market.maker;
  const f = makerFinance(market(), actor);
  const orders = makerOrders(market(), actor);
  const to = (p: string) => href(lang, p);
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold">{m.dashTitle}</h2>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label={m.newOrders} value={String(orders.filter((o) => o.status === "new").length)} href={to("/seller/orders")} alert={orders.some((o) => o.status === "new")} />
        <Kpi label={m.inProgress} value={String(orders.filter((o) => ["accepted", "preparing"].includes(o.status)).length)} href={to("/seller/orders")} />
        <Kpi label={m.awaiting} value={tetri(f.awaiting)} href={to("/seller/finances")} />
        <Kpi label={m.transferred} value={tetri(f.transferred)} href={to("/seller/finances")} />
      </div>
      <ul className="space-y-3">{orders.slice(0, 3).map((o) => <li key={o.id}><MakerOrderCard o={o} lang={lang} /></li>)}</ul>
      <Link href={to("/seller/orders")} className="text-sm font-semibold text-red-600 hover:underline">{m.viewAll}</Link>
    </section>
  );
}
