import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Zap } from "lucide-react";
import { StatusPill } from "@/components/seller/StatusPill";
import { getProduct } from "@/lib/catalog";
import { formatGel } from "@/lib/format";
import { ORDER_STATUS, demoOrders, orderTotals, type OrderStatus } from "@/lib/seller-demo";
import { formatDate, getDict, href, isLang, locProduct, place } from "@/i18n";
import { pageLang } from "@/lib/page-lang";
import { LiveOrders } from "@/components/market/maker";
import { currentActor } from "@/lib/market/auth";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").seller.orders.title };
}

type TabKey = "all" | "new" | "active" | "completed" | "cancelled";

const TABS: { key: TabKey; match: (s: OrderStatus) => boolean }[] = [
  { key: "all", match: () => true },
  { key: "new", match: (s) => s === "new" },
  { key: "active", match: (s) => ["accepted", "preparing", "ready", "dispatched"].includes(s) },
  { key: "completed", match: (s) => s === "delivered" },
  { key: "cancelled", match: (s) => s === "cancelled" },
];

export default async function OrdersPage({ params, searchParams }: { params: Params; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { lang, t: dict } = await pageLang(params);
  const actor = await currentActor();
  if (actor?.role === "manufacturer") return <LiveOrders actor={actor} lang={lang} />;
  const s = dict.seller.orders;
  const raw = (await searchParams).status;
  const key = typeof raw === "string" && TABS.some((x) => x.key === raw) ? raw : "all";
  const tab = TABS.find((x) => x.key === key)!;
  const all = demoOrders();
  const list = all.filter((o) => tab.match(o.status));

  return (
    <div>
      <h1 className="text-2xl font-extrabold">{s.title}</h1>
      <p className="mt-1 text-sm text-muted">{s.intro}</p>
      <p className="mt-3 rounded-lg bg-warn-50 px-3 py-2 text-sm text-warn">
        {dict.market.maker.demoHint}{" "}
        <Link href={href(lang, "/signin")} className="font-semibold underline">{dict.market.account.signIn}</Link>
      </p>

      <nav aria-label={s.tabsLabel} className="mt-5 border-b border-line">
        <ul className="scroll-row auto-cols-max gap-0">
          {TABS.map((t) => {
            const count = all.filter((o) => t.match(o.status)).length;
            const active = t.key === key;
            return (
              <li key={t.key}>
                <Link
                  href={href(lang, t.key === "all" ? "/seller/orders" : `/seller/orders?status=${t.key}`)}
                  aria-current={active ? "page" : undefined}
                  className={`relative inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold ${active ? "text-ink after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-red-600" : "text-muted hover:text-ink"}`}
                >
                  {s.tabs[t.key]} <span className="rounded-full bg-paper-2 px-1.5 text-xs tabular-nums text-ink-2">{count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {list.length === 0 ? (
        <p className="card mt-4 p-8 text-center text-sm text-muted">{s.none}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {list.map((o) => {
            const t = orderTotals(o);
            return (
              <li key={o.id}>
                <Link href={href(lang, `/seller/orders/${o.id}`)} className={`card block p-4 transition hover:shadow-[var(--shadow-lift)] ${o.status === "new" ? "border-red-200" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-ink">{o.id}</span>
                    {o.type === "quote" && <span className="chip bg-ink text-white">{s.b2bQuote}</span>}
                    <StatusPill tone={ORDER_STATUS[o.status].tone} label={dict.seller.status[o.status]} />
                    <span className="ml-auto text-xs text-muted">{formatDate(o.placedAt, lang, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="mt-2 text-sm text-ink-2">
                    {o.items.map((i) => { const p = getProduct(i.slug); return `${i.qty} × ${p ? locProduct(p, lang).name : i.slug}`; }).join(", ")}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted">{o.buyer.business ?? o.buyer.name} · {place(o.buyer.city, lang)}</span>
                    <span className="inline-flex items-center gap-1 text-muted">
                      {o.delivery.mode === "asap" ? (
                        <><Zap className="h-3.5 w-3.5" aria-hidden="true" />{s.asap}</>
                      ) : (
                        <><CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />{formatDate(o.delivery.date, lang, { day: "numeric", month: "short" })}, {o.delivery.window}</>
                      )}
                    </span>
                    <span className="ml-auto font-bold tabular-nums text-ink">{formatGel(t.goods)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
