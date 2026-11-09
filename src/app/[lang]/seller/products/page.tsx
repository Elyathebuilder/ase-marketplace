import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { FormNotice, tetri } from "@/components/market/ui";
import { StatusChip } from "@/components/seller/kit";
import { getDict, href, isLang, unit } from "@/i18n";
import { isApproved } from "@/lib/market/catalog-store";
import { myProducts } from "@/lib/market/products";
import { sellerSession } from "@/lib/market/seller-page";
import { market } from "@/lib/market/server";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").sell.products.title };
}

const FILTERS = ["all", "draft", "pending_review", "published", "rejected", "archived"] as const;
const TONE: Record<string, string> = { draft: "draft", pending_review: "pending_review", published: "approved_company", rejected: "rejected", archived: "not_requested" };

export default async function SellerProductsPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const session = await sellerSession();
  if (!session) return null;
  const sp = await searchParams;
  const s = t.sell.products;
  const all = myProducts(market(), session.actor);
  const status = typeof sp.status === "string" && (FILTERS as readonly string[]).includes(sp.status) ? sp.status : "all";
  const list = status === "all" ? all : all.filter((p) => p.row.status === status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{s.title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted">{s.intro}</p>
        </div>
        <Link href={href(lang, "/seller/products/new")} className="btn btn-primary"><Plus className="h-4 w-4" aria-hidden="true" />{s.add}</Link>
      </div>
      <FormNotice lang={lang} sp={sp} />
      {!isApproved(session.store.account_status) && <p className="rounded-lg bg-warn-50 px-3 py-2 text-sm text-warn">{s.notApproved}</p>}

      <nav aria-label={s.colStatus} className="border-b border-line">
        <ul className="scroll-row auto-cols-max gap-0">
          {FILTERS.map((f) => {
            const n = f === "all" ? all.length : all.filter((p) => p.row.status === f).length;
            return (
              <li key={f}>
                <Link
                  href={`${href(lang, "/seller/products")}${f === "all" ? "" : `?status=${f}`}`}
                  aria-current={f === status ? "page" : undefined}
                  className={`relative inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold ${f === status ? "text-ink after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-red-600" : "text-muted hover:text-ink"}`}
                >
                  {f === "all" ? s.filterAll : s.status[f]} <span className="rounded-full bg-paper-2 px-1.5 text-xs tabular-nums text-ink-2">{n}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {list.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          <p>{s.none}</p>
          <Link href={href(lang, "/seller/products/new")} className="btn btn-dark mt-4">{s.add}</Link>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map(({ row, product }) => (
            <li key={row.slug}>
              <Link href={href(lang, `/seller/products/${row.slug}`)} className="card flex gap-3 p-3 transition hover:shadow-[var(--shadow-lift)]" data-product={row.slug}>
                <ProductImage product={product} size="sm" className="h-20 w-20 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{(lang === "ka" && row.name_ka) || row.name}</p>
                  <p className="mt-0.5 text-sm text-ink-2">
                    {row.retail_price_tetri ? `${tetri(row.retail_price_tetri)} / ${unit(row.unit, lang)}` : s.noPrice}
                    <span className="text-muted"> · {s.colStock}: {row.stock}</span>
                  </p>
                  <div className="mt-1.5"><StatusChip status={TONE[row.status]} label={s.status[row.status]} /></div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
