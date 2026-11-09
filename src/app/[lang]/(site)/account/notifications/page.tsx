import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { ActionButton, SignInRequired, notificationText, when } from "@/components/market/ui";
import { getDict, href, isLang } from "@/i18n";
import { currentActor } from "@/lib/market/auth";
import { notificationsFor } from "@/lib/market/queries";
import { market } from "@/lib/market/server";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").market.notifications.title, robots: { index: false } };
}

export default async function NotificationsPage({ params }: { params: Params }) {
  const { lang, t } = await pageLang(params);
  const n = t.market.notifications;
  const actor = await currentActor();
  const self = href(lang, "/account/notifications");
  if (!actor)
    return (
      <div className="container-page py-8">
        <SignInRequired lang={lang} text={t.market.signin.intro} next={self} />
      </div>
    );
  const list = notificationsFor(market(), actor);
  // Seller and badge notifications carry their own in-app path; it is only followed when it is a local path.
  const own = (p: Record<string, unknown>) => (typeof p.link === "string" && /^\/[a-z0-9/_-]*$/i.test(p.link) ? href(lang, p.link) : null);
  const link = (orderId: string | null, fid: string | null) =>
    !orderId ? null : actor.role === "customer" ? href(lang, `/account/orders/${orderId}`) : actor.role === "admin" ? href(lang, `/admin/orders/${orderId}`) : fid ? href(lang, `/seller/orders/${fid}`) : null;

  return (
    <div className="container-page max-w-3xl py-6 md:py-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold md:text-3xl">{n.title}</h1>
        {list.some((x) => !x.read_at) && <div className="ml-auto"><ActionButton op="markRead" id="all" back={self} label={n.markAll} tone="ghost" /></div>}
      </div>
      <p className="mt-1 text-xs text-muted">{n.inAppOnly}</p>
      {list.length === 0 ? (
        <p className="card mt-6 p-8 text-center text-sm text-muted">{n.none}</p>
      ) : (
        <ul className="card mt-6 divide-y divide-line">
          {list.map((x) => {
            const to = own(x.params) ?? link(x.order_id, x.fulfillment_id);
            return (
              <li key={x.id} className={`flex gap-3 px-4 py-3 ${x.read_at ? "" : "bg-red-50/50"}`}>
                <Bell className={`mt-0.5 h-4 w-4 shrink-0 ${x.read_at ? "text-subtle" : "text-red-600"}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${x.read_at ? "text-ink-2" : "font-semibold text-ink"}`}>{notificationText(lang, x.kind, x.order_id, x.params)}</p>
                  <p className="mt-0.5 text-xs text-muted">{when(x.created_at, lang)}</p>
                </div>
                {to && <Link href={to} className="self-center text-sm font-semibold text-red-600 hover:underline">{n.open}</Link>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
