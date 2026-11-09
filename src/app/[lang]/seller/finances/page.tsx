import type { Metadata } from "next";
import Link from "next/link";
import { Info } from "lucide-react";
import { Kpi } from "@/components/seller/Kpi";
import { StatusPill } from "@/components/seller/StatusPill";
import { formatGel } from "@/lib/format";
import { DEMO_COMMISSION_RATE, DEMO_PAYOUTS, demoOrders, orderTotals } from "@/lib/seller-demo";
import { formatDate, getDict, href, isLang } from "@/i18n";
import { pageLang } from "@/lib/page-lang";
import { LiveFinance } from "@/components/market/maker";
import { currentActor } from "@/lib/market/auth";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").seller.finances.title };
}

export default async function FinancesPage({ params }: { params: Params }) {
  const { lang, t: dict } = await pageLang(params);
  const actor = await currentActor();
  if (actor?.role === "manufacturer") return <LiveFinance actor={actor} lang={lang} />;
  const f = dict.seller.finances;
  const sales = demoOrders()
    .filter((o) => ["delivered", "dispatched"].includes(o.status))
    .map((o) => ({ o, t: orderTotals(o) }));
  const completed = sales.filter((s) => s.o.status === "delivered");
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const paid = sum(DEMO_PAYOUTS.filter((p) => p.status === "Paid").map((p) => p.amount));
  const pending = sum(DEMO_PAYOUTS.filter((p) => p.status !== "Paid").map((p) => p.amount));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">{f.title}</h1>
        <p className="mt-1 text-sm text-muted">{f.intro}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label={f.completed} value={formatGel(sum(completed.map((s) => s.t.goods)))} hint={f.ordersN(completed.length)} />
        <Kpi label={f.commission} value={formatGel(sum(completed.map((s) => s.t.commission)))} hint={f.exampleRate(Math.round(DEMO_COMMISSION_RATE * 100))} />
        <Kpi label={f.paid} value={formatGel(paid)} hint={f.toBank} />
        <Kpi label={f.pending} value={formatGel(pending)} hint={f.released} />
      </div>

      <p className="flex gap-2 rounded-xl border border-line bg-surface p-3 text-xs text-ink-2">
        <Info className="mt-px h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        {f.note}
      </p>

      <section className="card overflow-x-auto">
        <h2 className="p-4 text-base font-bold md:px-5">{f.payouts}</h2>
        <table className="w-full min-w-[34rem] border-t border-line text-sm">
          <thead className="bg-paper-2 text-left text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-2.5 font-semibold">{f.payout}</th>
              <th className="px-4 py-2.5 font-semibold">{f.date}</th>
              <th className="px-4 py-2.5 font-semibold">{f.orders}</th>
              <th className="px-4 py-2.5 text-right font-semibold">{f.amount}</th>
              <th className="px-4 py-2.5 font-semibold">{f.status}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {DEMO_PAYOUTS.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-semibold text-ink">{p.id}</td>
                <td className="px-4 py-3 text-ink-2">{formatDate(p.date, lang, { day: "numeric", month: "short" })}</td>
                <td className="px-4 py-3">{p.orders.map((o) => <Link key={o} href={href(lang, `/seller/orders/${o}`)} className="text-ink-2 underline hover:text-red-600">{o}</Link>)}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">{formatGel(p.amount)}</td>
                <td className="px-4 py-3"><StatusPill label={p.status === "Paid" ? f.paidStatus : f.scheduledStatus} tone={p.status === "Paid" ? "green" : "amber"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="p-4 text-base font-bold md:px-5">{f.transactions}</h2>
        <table className="w-full min-w-[38rem] border-t border-line text-sm">
          <thead className="bg-paper-2 text-left text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-2.5 font-semibold">{f.order}</th>
              <th className="px-4 py-2.5 text-right font-semibold">{f.goods}</th>
              <th className="px-4 py-2.5 text-right font-semibold">{f.commission}</th>
              <th className="px-4 py-2.5 text-right font-semibold">{f.yourPayout}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line tabular-nums">
            {sales.map(({ o, t }) => (
              <tr key={o.id}>
                <td className="px-4 py-3"><Link href={href(lang, `/seller/orders/${o.id}`)} className="font-semibold text-ink hover:text-red-600">{o.id}</Link></td>
                <td className="px-4 py-3 text-right text-ink-2">{formatGel(t.goods)}</td>
                <td className="px-4 py-3 text-right text-ink-2">−{formatGel(t.commission)}</td>
                <td className="px-4 py-3 text-right font-semibold text-ink">{formatGel(t.payout)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
