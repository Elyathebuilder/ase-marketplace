import Link from "next/link";
import { ArrowRight, Bell, Plus } from "lucide-react";
import { Kpi } from "@/components/seller/Kpi";
import { StatusBox } from "@/components/seller/kit";
import { MakerOrderCard, filterOf } from "@/components/market/maker";
import { notificationText, tetri, when } from "@/components/market/ui";
import { href } from "@/i18n";
import { isApproved } from "@/lib/market/catalog-store";
import { makerOrders, notificationsFor } from "@/lib/market/queries";
import { sellerSession } from "@/lib/market/seller-page";
import { market } from "@/lib/market/server";
import { pageLang } from "@/lib/page-lang";

/** Seller overview: the store (Portal A) and the orders (Portal B) at a glance. */
export default async function SellerDashboard({ params }: { params: Promise<{ lang: string }> }) {
  const { lang, t } = await pageLang(params);
  const session = await sellerSession();
  if (!session) return null;
  const { store, actor } = session;
  const s = t.sell;
  const d = s.dash;
  const ctx = market();
  const to = (p: string) => href(lang, p);
  const counts = Object.fromEntries(
    (ctx.db.prepare("SELECT status, COUNT(*) AS n FROM products WHERE manufacturer_slug = ? GROUP BY status").all(store.slug) as { status: string; n: number }[]).map((r) => [r.status, r.n]),
  ) as Record<string, number>;
  const orders = makerOrders(ctx, actor);
  const groups = orders.map(filterOf);
  const count = (f: string) => groups.filter((g) => g === f).length;
  const since = market().now().getTime() - 30 * 24 * 3600 * 1000;
  const sales30 = orders
    .filter((o) => o.paymentStage && !["awaiting_customer", "customer_submitted"].includes(o.paymentStage) && new Date(o.placedAt).getTime() >= since)
    .reduce((sum, o) => sum + o.goods, 0);
  const activity = notificationsFor(ctx, actor, 6);
  const approved = isApproved(store.account_status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-sm text-muted">{d.hello}</p>
          <h1 className="text-2xl font-extrabold md:text-3xl">{store.name}</h1>
        </div>
        <Link href={to("/seller/products/new")} className="btn btn-primary ml-auto"><Plus className="h-4 w-4" aria-hidden="true" />{d.addProduct}</Link>
      </div>

      {!approved && (
        <StatusBox status={store.account_status} label={s.accountStatus[store.account_status] ?? store.account_status} text={`${s.accountExplain[store.account_status] ?? ""} ${d.notApproved}`}>
          <Link href={to("/seller/application")} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold underline">
            {d.continueApplication} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </StatusBox>
      )}

      <section aria-labelledby="dash-store" className="space-y-3">
        <h2 id="dash-store" className="text-lg font-bold">{d.storeTitle}</h2>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Kpi label={d.published} value={String(counts.published ?? 0)} href={to("/seller/products?status=published")} />
          <Kpi label={d.drafts} value={String(counts.draft ?? 0)} href={to("/seller/products?status=draft")} />
          <Kpi label={d.pending} value={String(counts.pending_review ?? 0)} href={to("/seller/products?status=pending_review")} />
          <Kpi label={s.nav.badge} value={s.badgeStatus[store.badge_status] ?? store.badge_status} href={to("/seller/verification")} />
        </div>
      </section>

      <section aria-labelledby="dash-orders" className="space-y-3">
        <h2 id="dash-orders" className="text-lg font-bold">{d.ordersTitle}</h2>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Kpi label={d.newOrders} value={String(count("new"))} href={to("/seller/orders?status=new")} alert={count("new") > 0} />
          <Kpi label={d.inPreparation} value={String(count("paid") + count("preparing"))} href={to("/seller/orders?status=preparing")} />
          <Kpi label={d.totalOrders} value={String(orders.length)} hint={`${d.completed}: ${count("completed")}`} href={to("/seller/orders")} />
          <Kpi label={d.sales30} value={tetri(sales30, lang)} href={to("/seller/finances")} />
        </div>
        {orders.length > 0 && <ul className="space-y-3">{orders.slice(0, 3).map((o) => <li key={o.id}><MakerOrderCard o={o} lang={lang} /></li>)}</ul>}
      </section>

      <section className="card p-4 md:p-5">
        <h2 className="flex items-center gap-2 text-base font-bold"><Bell className="h-4 w-4 text-red-600" aria-hidden="true" />{d.recent}</h2>
        {activity.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{d.noActivity}</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {activity.map((n) => (
              <li key={n.id} className="flex flex-wrap gap-x-3 py-2 text-sm">
                <span className={n.read_at ? "text-ink-2" : "font-semibold text-ink"}>{notificationText(lang, n.kind, n.order_id, n.params)}</span>
                <span className="ml-auto text-xs text-muted">{when(n.created_at, lang)}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href={to("/account/notifications")} className="mt-2 inline-block text-sm font-semibold text-red-600 hover:underline">{t.market.notifications.title}</Link>
      </section>
    </div>
  );
}
