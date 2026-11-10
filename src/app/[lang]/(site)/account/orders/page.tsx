import type { Metadata } from "next";
import Link from "next/link";
import { AccountShell } from "@/components/account/AccountNav";
import { TestTag } from "@/components/market/journey";
import { Status, SignInRequired, tetri, when } from "@/components/market/ui";
import { getDict, href, isLang } from "@/i18n";
import { currentActor } from "@/lib/market/auth";
import { customerOrders } from "@/lib/market/queries";
import { market } from "@/lib/market/server";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").market.orders.title, robots: { index: false } };
}

export default async function MyOrdersPage({ params }: { params: Params }) {
  const { lang, t } = await pageLang(params);
  const m = t.market;
  const actor = await currentActor();
  if (actor?.role !== "customer")
    return (
      <div className="container-page py-8">
        <SignInRequired lang={lang} text={m.signin.needCustomer} next={href(lang, "/account/orders")} />
      </div>
    );
  const orders = customerOrders(market(), actor);
  const FINAL = ["completed", "cancelled", "refunded"];
  const groups = [
    { title: t.acc.account.currentOrders, list: orders.filter((o) => !FINAL.includes(o.status)) },
    { title: t.acc.account.pastOrders, list: orders.filter((o) => FINAL.includes(o.status)) },
  ].filter((g) => g.list.length > 0);
  return (
    <AccountShell lang={lang} active="orders">
      <h1 className="text-2xl font-extrabold md:text-3xl">{m.orders.title}</h1>
      {orders.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-sm text-muted">
          {m.orders.none} <Link href={href(lang, "/products")} className="font-semibold text-red-700 hover:underline">{t.acc.account.shop}</Link>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.title} className="mt-6">
            <h2 className="text-base font-bold">{g.title}</h2>
            <ul className="mt-3 space-y-3">
              {g.list.map((o) => (
                <li key={o.id}>
                  <Link href={href(lang, `/account/orders/${o.id}`)} className="card flex flex-wrap items-center gap-3 p-4 transition hover:shadow-[var(--shadow-lift)]">
                    <span className="font-bold text-ink">{m.orders.order(o.id)}</span>
                    <Status value={o.status} labels={m.orderStatus} />
                    {o.is_test === 1 && <TestTag lang={lang} />}
                    <span className="text-xs text-muted">{m.orders.placedOn(when(o.created_at, lang, false))}</span>
                    <span className="ml-auto font-bold tabular-nums">{tetri(o.total_tetri, lang)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </AccountShell>
  );
}
