import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { Kpi } from "@/components/seller/Kpi";
import { formatBps } from "@/lib/money";
import { getDict, href, place, type Lang } from "@/i18n";
import type { Actor } from "@/lib/market/types";
import { itemSnapshot, makerFinance, type MakerOrder } from "@/lib/market/queries";
import { market } from "@/lib/market/server";
import { TestTag } from "./journey";
import { Status, Table, tetri, when } from "./ui";

/** The name of an ordered item as it was when ordered, in the reader's language when the seller gave one. */
export const itemName = (i: MakerOrder["items"][number], lang: Lang) => {
  const snap = itemSnapshot(i);
  return (lang === "ka" && snap.nameKa) || i.product_name;
};

const itemsText = (o: MakerOrder, lang: Lang) => o.items.map((i) => `${i.qty} × ${itemName(i, lang)}`).join(", ");

/** Seller order filters (Portal B). Each order is in exactly one, except "all". */
export const ORDER_FILTERS = ["all", "new", "awaiting_payment", "paid", "preparing", "ready", "collected", "completed", "closed"] as const;
export type OrderFilter = (typeof ORDER_FILTERS)[number];

export function filterOf(o: MakerOrder): Exclude<OrderFilter, "all"> {
  if (o.status === "rejected" || o.status === "cancelled" || o.orderCancelled || o.disputed || o.orderStatus === "refund_processing") return "closed";
  if (o.status === "awaiting_payment") return "awaiting_payment";
  if (o.status === "new") return "new";
  if (o.status === "accepted") return "paid";
  if (o.status === "preparing" || o.status === "in_progress") return "preparing";
  if (o.status === "ready") return "ready";
  if (o.orderStatus === "completed") return "completed";
  return "collected";
}

function PaymentFlag({ o, lang }: { o: MakerOrder; lang: Lang }) {
  const s = getDict(lang).sell.orders;
  if (!o.paymentStage) return null;
  const ok = !["awaiting_customer", "customer_submitted"].includes(o.paymentStage);
  return ok ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-ok"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />{s.paymentStage[o.paymentStage]}</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-warn"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{s.paymentStage[o.paymentStage]}</span>
  );
}

export function MakerOrderCard({ o, lang }: { o: MakerOrder; lang: Lang }) {
  const m = getDict(lang).market;
  return (
    <Link href={href(lang, `/seller/orders/${o.id}`)} className={`card block p-4 transition hover:shadow-[var(--shadow-lift)] ${o.status === "new" ? "border-red-200" : ""}`} data-fulfillment={o.id}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-ink">{o.orderNumber}</span>
        {o.isTest && <TestTag lang={lang} />}
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
          <span className="block font-bold tabular-nums text-ink">{tetri(o.payable, lang)}</span>
          <span className="block text-xs text-muted">{m.maker.payout}</span>
        </span>
      </div>
    </Link>
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
        <p className="mt-1 max-w-3xl text-xs text-muted">{getDict(lang).sell.orders.paymentOnlyAdmin}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label={m.sales} value={tetri(f.sales, lang)} />
        <Kpi label={m.commissionTotal} value={tetri(f.commission, lang)} />
        <Kpi label={m.awaiting} value={tetri(f.awaiting, lang)} hint={`${m.notYet}: ${tetri(f.notYetEligible, lang)}${f.onHold ? ` · ${m.onHold}: ${tetri(f.onHold, lang)}` : ""}`} />
        <Kpi label={m.transferred} value={tetri(f.transferred, lang)} />
      </div>
      {f.bank && (
        <p className="text-sm text-ink-2">{m.bankAccount}: <strong>{f.bank.account_holder}</strong>, {f.bank.bank_name}, <span className="font-mono">{f.bank.iban}</span></p>
      )}
      <section>
        <h2 className="text-lg font-bold">{m.payouts}</h2>
        <div className="mt-3">
          {f.orders.length === 0 ? (
            <p className="card p-6 text-center text-sm text-muted">{m.none}</p>
          ) : (
            <Table head={[m.order, m.goods, m.commissionTotal, m.payout, m.status, m.transferRef, m.transferDate]}>
              {f.orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-3 py-2"><Link href={href(lang, `/seller/orders/${o.id}`)} className="font-semibold text-red-600 hover:underline">{o.orderNumber}</Link></td>
                  <td className="px-3 py-2 tabular-nums">{tetri(o.goods, lang)}</td>
                  <td className="px-3 py-2 tabular-nums">−{tetri(o.commission, lang)} <span className="text-xs text-muted">({formatBps(o.commissionBps, lang)})</span></td>
                  <td className="px-3 py-2 font-semibold tabular-nums">{o.status === "rejected" || o.status === "cancelled" ? "—" : tetri(o.payable, lang)}</td>
                  <td className="px-3 py-2">{o.status === "rejected" || o.status === "cancelled" ? <Status value={o.status} labels={mk.shipmentStatus} /> : <Status value={o.payout!.status} labels={mk.payoutStatus} />}</td>
                  <td className="px-3 py-2 font-mono text-xs">{o.payout?.reference ?? "—"}</td>
                  <td className="px-3 py-2">{o.payout?.status === "transfer_completed" ? o.payout.date : "—"}</td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </section>
    </div>
  );
}
