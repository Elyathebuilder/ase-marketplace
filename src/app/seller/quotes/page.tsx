import type { Metadata } from "next";
import Link from "next/link";
import { StatusPill } from "@/components/seller/StatusPill";
import { formatGel, formatNumber } from "@/lib/format";
import { QUOTE_STATUS, demoQuotes } from "@/lib/seller-demo";

export const metadata: Metadata = { title: "Quotations" };

export default function QuotesPage() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Quotations</h1>
      <p className="mt-1 text-sm text-muted">Businesses ask for wholesale prices, bulk quantities or custom products. Reply with a quotation; if they accept, it becomes an order.</p>
      <div className="card mt-5 overflow-x-auto">
        <table className="w-full min-w-[42rem] text-sm">
          <thead className="bg-paper-2 text-left text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Request</th>
              <th className="px-4 py-2.5 font-semibold">Business</th>
              <th className="px-4 py-2.5 font-semibold">Quantity</th>
              <th className="px-4 py-2.5 font-semibold">Your offer</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {demoQuotes().map((q) => (
              <tr key={q.id} className="hover:bg-paper">
                <td className="px-4 py-3">
                  <Link href={`/seller/quotes/${q.id}`} className="font-semibold text-ink hover:text-red-600 hover:underline">{q.title}</Link>
                  <div className="text-xs text-muted">{q.id} · {new Date(q.receivedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                </td>
                <td className="px-4 py-3 text-ink-2">{q.company}<div className="text-xs text-muted">{q.city}</div></td>
                <td className="px-4 py-3 tabular-nums text-ink-2">{formatNumber(q.qty)} {q.unit}s</td>
                <td className="px-4 py-3 tabular-nums text-ink-2">{q.offer ? `${formatGel(q.offer.unitPrice)} / ${q.unit}` : "—"}</td>
                <td className="px-4 py-3"><StatusPill {...QUOTE_STATUS[q.status]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
