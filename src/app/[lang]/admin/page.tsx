import type { Metadata } from "next";
import Link from "next/link";
import { Info } from "lucide-react";
import { Kpi } from "@/components/seller/Kpi";
import { tetri } from "@/components/market/ui";
import { getDict, href, isLang } from "@/i18n";
import { adminOrNull } from "@/lib/market/auth";
import { financialOverview } from "@/lib/market/queries";
import { market } from "@/lib/market/server";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").market.admin.overview.title };
}

export default async function AdminOverview({ params }: { params: Params }) {
  const { lang, t } = await pageLang(params);
  const admin = await adminOrNull();
  if (!admin) return null;
  const a = t.market.admin;
  const o = a.overview;
  const f = financialOverview(market(), admin);
  const to = (p: string) => href(lang, p);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold md:text-3xl">{o.title}</h1>
      <p className="flex max-w-4xl items-start gap-2 rounded-lg bg-warn-50 px-3 py-2 text-sm text-warn">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {a.ledgerNote}
      </p>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">{o.todo}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label={o.awaiting} value={tetri(f.awaitingVerification.s)} hint={o.count(f.awaitingVerification.n)} href={to("/admin/payments")} alert={f.awaitingVerification.n > 0} />
          <Kpi label={o.payoutsAwaiting} value={tetri(f.payoutsAwaitingAuthorization.s)} hint={o.count(f.payoutsAwaitingAuthorization.n)} href={to("/admin/settlements")} alert={f.payoutsAwaitingAuthorization.n > 0} />
          <Kpi label={o.payoutsInProgress} value={tetri(f.payoutsInProgress.s)} hint={o.count(f.payoutsInProgress.n)} href={to("/admin/settlements")} />
          <Kpi label={o.refundsPending} value={tetri(f.refundsPending.s)} hint={o.count(f.refundsPending.n)} href={to("/admin/refunds")} alert={f.refundsPending.n > 0} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="text-base font-bold">{o.received}</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label={o.received} value={f.received} strong />
            <Row label={o.verifiedToday} value={f.verifiedToday} />
            <Row label={o.allocated} value={f.allocatedToActiveOrders} />
          </dl>
          <h3 className="mt-5 text-sm font-bold">{o.breakdown}</h3>
          <dl className="mt-2 space-y-2 text-sm">
            <Row label={o.owed} value={f.owedToManufacturers} />
            <Row label={o.commission} value={f.commission} />
            <Row label={o.delivery} value={f.delivery} />
          </dl>
        </div>
        <div className="card p-4">
          <h2 className="text-base font-bold">{o.payoutsDone}</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label={o.payoutsDone} value={f.payoutsCompleted} />
            <Row label={o.refundsDone} value={f.refundsCompleted} />
            <Row label={o.net} value={f.ledgerNet} strong />
          </dl>
          <p className="mt-2 text-xs text-muted">{o.netHint}</p>
          <p className="mt-4 text-sm"><Link href={to("/admin/orders")} className="font-semibold text-red-600 hover:underline">{a.nav.orders} →</Link></p>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "border-t border-line pt-2 font-bold" : "text-ink-2"}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{tetri(value)}</dd>
    </div>
  );
}
