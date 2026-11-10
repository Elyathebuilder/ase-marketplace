import type { Metadata } from "next";
import Link from "next/link";
import { StatusPill } from "@/components/seller/StatusPill";
import { formatGel, formatNumber } from "@/lib/format";
import { QUOTE_STATUS, demoQuotes, quoteTitle } from "@/lib/seller-demo";
import { formatDate, getDict, href, isLang, place, units } from "@/i18n";
import { pageLang } from "@/lib/page-lang";
import { sellerSession } from "@/lib/market/seller-page";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").seller.quotes.title };
}

export default async function QuotesPage({ params }: { params: Params }) {
  const { lang, t } = await pageLang(params);
  if (!(await sellerSession())) return null;
  const s = t.seller.quotes;
  return (
    <div>
      <h1 className="text-2xl font-extrabold">{s.title}</h1>
      <p className="mt-1 text-sm text-muted">{s.intro}</p>
      <p className="mt-3 rounded-lg bg-warn-50 px-3 py-2 text-sm text-warn"><strong>{t.seller.banner}</strong> {t.seller.bannerText}</p>
      <div className="card mt-5 overflow-x-auto">
        <table className="w-full min-w-[42rem] text-sm">
          <thead className="bg-paper-2 text-left text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-2.5 font-semibold">{s.request}</th>
              <th className="px-4 py-2.5 font-semibold">{s.business}</th>
              <th className="px-4 py-2.5 font-semibold">{s.quantity}</th>
              <th className="px-4 py-2.5 font-semibold">{s.offer}</th>
              <th className="px-4 py-2.5 font-semibold">{s.status}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {demoQuotes().map((q) => (
              <tr key={q.id} className="hover:bg-paper">
                <td className="px-4 py-3">
                  <Link href={href(lang, `/seller/quotes/${q.id}`)} className="font-semibold text-ink hover:text-red-600 hover:underline">{quoteTitle(q, lang)}</Link>
                  <div className="text-xs text-muted">{q.id} · {formatDate(q.receivedAt, lang, { day: "numeric", month: "short" })}</div>
                </td>
                <td className="px-4 py-3 text-ink-2">{q.company}<div className="text-xs text-muted">{place(q.city, lang)}</div></td>
                <td className="px-4 py-3 tabular-nums text-ink-2">{formatNumber(q.qty, lang)} {units(q.unit, lang, q.qty)}</td>
                <td className="px-4 py-3 tabular-nums text-ink-2">{q.offer ? `${formatGel(q.offer.unitPrice, lang)} / ${units(q.unit, lang, 1)}` : "—"}</td>
                <td className="px-4 py-3"><StatusPill tone={QUOTE_STATUS[q.status].tone} label={t.seller.quoteStatus[q.status]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
