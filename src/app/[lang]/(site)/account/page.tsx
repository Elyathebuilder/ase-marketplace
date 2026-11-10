import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/AccountNav";
import { VerifyBanner } from "@/components/account/VerifyBanner";
import { TestTag } from "@/components/market/journey";
import { SignInRequired, Status, notificationText, tetri, when } from "@/components/market/ui";
import { getDict, href, isLang } from "@/i18n";
import { addressesOf, getUser } from "@/lib/market/accounts";
import { currentAccount } from "@/lib/market/auth";
import { customerOrders, notificationsFor } from "@/lib/market/queries";
import { market } from "@/lib/market/server";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").acc.account.title, robots: { index: false } };
}

const FINAL = ["completed", "cancelled", "refunded"];

export default async function AccountPage({ params }: { params: Params }) {
  const { lang, t } = await pageLang(params);
  const a = t.acc.account;
  const self = href(lang, "/account");
  const acct = await currentAccount();
  if (!acct)
    return (
      <div className="container-page py-8">
        <SignInRequired lang={lang} text={t.acc.signin.intro} next={self} />
      </div>
    );
  if (acct.actor.role === "manufacturer") redirect(href(lang, "/seller"));
  if (acct.actor.role === "admin") redirect(href(lang, "/admin"));
  const ctx = market();
  const user = getUser(ctx, acct.actor.id)!;
  const orders = customerOrders(ctx, acct.actor);
  const current = orders.filter((o) => !FINAL.includes(o.status));
  const notes = notificationsFor(ctx, acct.actor, 5);
  const addresses = addressesOf(ctx, acct.actor);
  const m = t.market;

  return (
    <AccountShell lang={lang} active="overview">
      <h1 className="text-2xl font-extrabold md:text-3xl">{a.title}</h1>
      <p className="mt-1 text-sm text-muted">{user.name} · {user.email}</p>
      {!acct.verified && <div className="mt-4"><VerifyBanner lang={lang} back={self} /></div>}

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section className="card p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold">{a.currentOrders}</h2>
            <Link href={href(lang, "/account/orders")} className="text-sm font-semibold text-red-700 hover:underline">{a.seeAll}</Link>
          </div>
          {current.length === 0 ? (
            <div className="mt-3 rounded-lg bg-paper-2 p-4 text-sm text-ink-2">
              {a.noOrders} <Link href={href(lang, "/products")} className="font-semibold text-red-700 hover:underline">{a.shop}</Link>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {current.slice(0, 5).map((o) => (
                <li key={o.id}>
                  <Link href={href(lang, `/account/orders/${o.id}`)} className="flex flex-wrap items-center gap-2 py-2.5 hover:text-red-700">
                    <span className="font-semibold">{m.orders.order(o.id)}</span>
                    <Status value={o.status} labels={m.orderStatus} />
                    {o.is_test === 1 && <TestTag lang={lang} />}
                    <span className="ml-auto text-sm font-semibold tabular-nums">{tetri(o.total_tetri, lang)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold">{a.notifications}</h2>
            <Link href={href(lang, "/account/notifications")} className="text-sm font-semibold text-red-700 hover:underline">{a.seeAll}</Link>
          </div>
          {notes.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{m.notifications.none}</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {notes.map((n) => (
                <li key={n.id} className={n.read_at ? "text-ink-2" : "font-semibold text-ink"}>
                  {notificationText(lang, n.kind, n.order_id, n.params)}
                  <span className="block text-xs font-normal text-muted">{when(n.created_at, lang)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4 md:p-5">
          <h2 className="text-base font-bold">{a.profile}</h2>
          <p className="mt-2 text-sm">{user.name}</p>
          <p className="text-sm text-ink-2">{user.email} · {acct.verified ? a.verified : a.unverified}</p>
          {user.phone && <p className="text-sm text-ink-2">{user.phone}</p>}
          <Link href={href(lang, "/account/profile")} className="btn btn-ghost mt-3 border border-line-strong px-3 py-1.5 text-sm">{t.acc.addresses.edit}</Link>
        </section>

        <section className="card p-4 md:p-5">
          <h2 className="text-base font-bold">{a.addresses}</h2>
          {addresses.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t.acc.addresses.none}</p>
          ) : (
            <p className="mt-2 text-sm text-ink-2">{[addresses[0].label, addresses[0].address].filter(Boolean).join(" · ")}</p>
          )}
          <Link href={href(lang, "/account/addresses")} className="btn btn-ghost mt-3 border border-line-strong px-3 py-1.5 text-sm">{a.addresses}</Link>
        </section>
      </div>
      <p className="mt-6 text-xs text-muted">{a.memberSince(when(user.created_at, lang, false))}</p>
    </AccountShell>
  );
}
