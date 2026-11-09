import type { Metadata } from "next";
import Link from "next/link";
import { MakerOrderCard, ORDER_FILTERS, filterOf } from "@/components/market/maker";
import { getDict, href, isLang } from "@/i18n";
import { makerOrders } from "@/lib/market/queries";
import { sellerSession } from "@/lib/market/seller-page";
import { market } from "@/lib/market/server";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").sell.orders.title };
}

/** Portal B: the seller's own part of each order, with filters. */
export default async function OrdersPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const session = await sellerSession();
  if (!session) return null;
  const s = t.sell.orders;
  const raw = (await searchParams).status;
  const key = typeof raw === "string" && (ORDER_FILTERS as readonly string[]).includes(raw) ? raw : "all";
  const all = makerOrders(market(), session.actor);
  const list = key === "all" ? all : all.filter((o) => filterOf(o) === key);

  return (
    <div>
      <h1 className="text-2xl font-extrabold">{s.title}</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">{s.intro}</p>

      <nav aria-label={s.title} className="mt-5 border-b border-line">
        <ul className="scroll-row auto-cols-max gap-0">
          {ORDER_FILTERS.map((f) => {
            const count = f === "all" ? all.length : all.filter((o) => filterOf(o) === f).length;
            return (
              <li key={f}>
                <Link
                  href={`${href(lang, "/seller/orders")}${f === "all" ? "" : `?status=${f}`}`}
                  aria-current={f === key ? "page" : undefined}
                  className={`relative inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold ${f === key ? "text-ink after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-red-600" : "text-muted hover:text-ink"}`}
                >
                  {s.filters[f]} <span className="rounded-full bg-paper-2 px-1.5 text-xs tabular-nums text-ink-2">{count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {list.length === 0 ? (
        <p className="card mt-4 p-8 text-center text-sm text-muted">{s.none}</p>
      ) : (
        <ul className="mt-4 space-y-3">{list.map((o) => <li key={o.id}><MakerOrderCard o={o} lang={lang} /></li>)}</ul>
      )}
    </div>
  );
}
