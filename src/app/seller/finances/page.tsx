import type { Metadata } from "next";
import Link from "next/link";
import { Info } from "lucide-react";
import { Kpi } from "@/components/seller/Kpi";
import { StatusPill } from "@/components/seller/StatusPill";
import { formatGel } from "@/lib/format";
import { DEMO_COMMISSION_RATE, DEMO_PAYOUTS, demoOrders, orderTotals } from "@/lib/seller-demo";

export const metadata: Metadata = { title: "Finances" };

export default function FinancesPage() {
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
        <h1 className="text-2xl font-extrabold">Finances</h1>
        <p className="mt-1 text-sm text-muted">You are paid for each order after it is delivered, minus the ASE commission.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Completed sales" value={formatGel(sum(completed.map((s) => s.t.goods)))} hint={`${completed.length} orders`} />
        <Kpi label="Commission" value={formatGel(sum(completed.map((s) => s.t.commission)))} hint={`${Math.round(DEMO_COMMISSION_RATE * 100)}% example rate`} />
        <Kpi label="Paid to you" value={formatGel(paid)} hint="To your bank account" />
        <Kpi label="Pending payouts" value={formatGel(pending)} hint="Released after delivery" />
      </div>

      <p className="flex gap-2 rounded-xl border border-line bg-surface p-3 text-xs text-ink-2">
        <Info className="mt-px h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        Payments will run through a licensed payment provider. The commission rate and payout schedule are still to be decided; the numbers here are examples.
      </p>

      <section className="card overflow-x-auto">
        <h2 className="p-4 text-base font-bold md:px-5">Payouts</h2>
        <table className="w-full min-w-[34rem] border-t border-line text-sm">
          <thead className="bg-paper-2 text-left text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Payout</th>
              <th className="px-4 py-2.5 font-semibold">Date</th>
              <th className="px-4 py-2.5 font-semibold">Orders</th>
              <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {DEMO_PAYOUTS.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-semibold text-ink">{p.id}</td>
                <td className="px-4 py-3 text-ink-2">{new Date(p.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</td>
                <td className="px-4 py-3">{p.orders.map((o) => <Link key={o} href={`/seller/orders/${o}`} className="text-ink-2 underline hover:text-red-600">{o}</Link>)}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">{formatGel(p.amount)}</td>
                <td className="px-4 py-3"><StatusPill label={p.status} tone={p.status === "Paid" ? "green" : "amber"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="p-4 text-base font-bold md:px-5">Transactions</h2>
        <table className="w-full min-w-[38rem] border-t border-line text-sm">
          <thead className="bg-paper-2 text-left text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Order</th>
              <th className="px-4 py-2.5 text-right font-semibold">Goods</th>
              <th className="px-4 py-2.5 text-right font-semibold">Commission</th>
              <th className="px-4 py-2.5 text-right font-semibold">Your payout</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line tabular-nums">
            {sales.map(({ o, t }) => (
              <tr key={o.id}>
                <td className="px-4 py-3"><Link href={`/seller/orders/${o.id}`} className="font-semibold text-ink hover:text-red-600">{o.id}</Link></td>
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
