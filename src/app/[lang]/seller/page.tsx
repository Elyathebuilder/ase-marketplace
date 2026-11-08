import Link from "next/link";
import { AlertCircle, ArrowRight, FileText, Package } from "lucide-react";
import { Kpi } from "@/components/seller/Kpi";
import { StatusPill } from "@/components/seller/StatusPill";
import { formatGel } from "@/lib/format";
import {
  DEMO_MONTHLY_SALES,
  DEMO_PAYOUTS,
  ORDER_STATUS,
  demoOrders,
  demoQuotes,
  demoSeller,
  demoSellerProducts,
  orderTotals,
  quoteTitle,
} from "@/lib/seller-demo";
import { href, locMaker, locProduct, place } from "@/i18n";
import { pageLang } from "@/lib/page-lang";

export default async function SellerDashboard({ params }: { params: Promise<{ lang: string }> }) {
  const { lang, t } = await pageLang(params);
  const d = t.seller.dash;
  const to = (p: string) => href(lang, p);
  const m = locMaker(demoSeller(), lang);
  const orders = demoOrders();
  const newOrders = orders.filter((o) => o.status === "new");
  const newQuotes = demoQuotes().filter((q) => q.status === "new");
  const lowStock = demoSellerProducts().filter((p) => p.stock > 0 && p.stock < 20);
  const pending = DEMO_PAYOUTS.filter((x) => x.status !== "Paid").reduce((s, p) => s + p.amount, 0);
  const month = DEMO_MONTHLY_SALES.at(-1)!;
  const max = Math.max(...DEMO_MONTHLY_SALES.map((x) => x.value));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted">{d.hello}</p>
        <h1 className="text-2xl font-extrabold md:text-3xl">{m.name}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label={d.newOrders} value={String(newOrders.length)} hint={d.answer24} href={to("/seller/orders?status=new")} alert />
        <Kpi label={d.newQuotes} value={String(newQuotes.length)} hint={d.fromBusinesses} href={to("/seller/quotes")} alert />
        <Kpi label={d.salesMonth} value={formatGel(month.value)} hint={d.beforeCommission} href={to("/seller/finances")} />
        <Kpi label={d.pending} value={formatGel(pending)} hint={d.afterDelivery} href={to("/seller/finances")} />
      </div>

      <section className="card p-4 md:p-5">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <AlertCircle className="h-4 w-4 text-red-600" aria-hidden="true" /> {d.attention}
        </h2>
        <ul className="mt-3 divide-y divide-line">
          {newOrders.map((o) => (
            <Todo key={o.id} href={to(`/seller/orders/${o.id}`)} icon={<Package className="h-4 w-4" />} title={d.acceptOrder(o.id)} meta={`${o.buyer.name}, ${place(o.buyer.city, lang)} · ${formatGel(orderTotals(o).goods)}`} />
          ))}
          {newQuotes.map((q) => (
            <Todo key={q.id} href={to(`/seller/quotes/${q.id}`)} icon={<FileText className="h-4 w-4" />} title={d.sendQuote(q.company)} meta={`${q.qty} × ${quoteTitle(q, lang)}`} />
          ))}
          {lowStock.map((p) => (
            <Todo key={p.slug} href={to(`/seller/products/${p.slug}`)} icon={<Package className="h-4 w-4" />} title={d.lowStock(locProduct(p, lang).name)} meta={d.left(p.stock)} />
          ))}
        </ul>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
        <section className="card p-4 md:p-5">
          <h2 className="text-base font-bold">{d.chartTitle}</h2>
          <p className="text-xs text-muted">{d.chartSub}</p>
          <div className="mt-4 flex h-44 items-end gap-3" role="img" aria-label={d.chartAria}>
            {DEMO_MONTHLY_SALES.map((bar, i) => (
              <div key={bar.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[0.65rem] font-semibold tabular-nums text-ink-2">{Math.round(bar.value / 100) / 10}k</span>
                <div
                  className={`w-full max-w-10 rounded-t-md ${i === DEMO_MONTHLY_SALES.length - 1 ? "bg-red-600" : "bg-ink/80"}`}
                  style={{ height: `${(bar.value / max) * 100}%` }}
                />
                <span className="text-xs text-muted">{t.seller.dash.months[i]}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">{d.soFar}</p>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between p-4 md:p-5">
            <h2 className="text-base font-bold">{d.latest}</h2>
            <Link href={to("/seller/orders")} className="inline-flex items-center gap-1 text-sm font-semibold text-ink hover:text-red-600">{d.allOrders} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          <ul className="divide-y divide-line border-t border-line">
            {orders.slice(0, 5).map((o) => (
              <li key={o.id}>
                <Link href={to(`/seller/orders/${o.id}`)} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-paper md:px-5">
                  <span className="font-semibold text-ink">{o.id}</span>
                  <span className="text-sm text-muted">{o.buyer.business ?? o.buyer.name} · {place(o.buyer.city, lang)}</span>
                  <span className="ml-auto flex items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums text-ink">{formatGel(orderTotals(o).goods)}</span>
                    <StatusPill tone={ORDER_STATUS[o.status].tone} label={t.seller.status[o.status]} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Todo({ href, icon, title, meta }: { href: string; icon: React.ReactNode; title: string; meta: string }) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-3 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600" aria-hidden="true">{icon}</span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ink group-hover:text-red-600">{title}</span>
          <span className="block text-xs text-muted">{meta}</span>
        </span>
        <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-subtle group-hover:text-red-600" aria-hidden="true" />
      </Link>
    </li>
  );
}

