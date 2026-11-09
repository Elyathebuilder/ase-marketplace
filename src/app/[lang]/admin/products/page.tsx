import type { Metadata } from "next";
import Link from "next/link";
import { Submit } from "@/components/forms/Submit";
import { FormNotice, tetri } from "@/components/market/ui";
import { AdminSellerForm, StatusChip } from "@/components/seller/kit";
import { getDict, href, isLang } from "@/i18n";
import { adminOrNull } from "@/lib/market/auth";
import { isApproved } from "@/lib/market/catalog-store";
import { adminProducts } from "@/lib/market/products";
import { market } from "@/lib/market/server";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").adm.products.title };
}

const FILTERS = ["pending_review", "published", "rejected", "draft", "archived", "all"] as const;
const TONE: Record<string, string> = { draft: "draft", pending_review: "pending_review", published: "approved_company", rejected: "rejected", archived: "not_requested" };

/** Admin: product moderation. Approve products waiting for a check, or take any product down with a reason. */
export default async function AdminProducts({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const admin = await adminOrNull();
  if (!admin) return null;
  const sp = await searchParams;
  const a = t.adm.products;
  const ps = t.sell.products;
  const status = typeof sp.status === "string" && (FILTERS as readonly string[]).includes(sp.status) ? sp.status : "pending_review";
  const self = `${href(lang, "/admin/products")}?status=${status}`;
  const rows = adminProducts(market(), admin, status);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold md:text-3xl">{a.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-2">{a.intro}</p>
      </div>
      <FormNotice lang={lang} sp={sp} />
      <nav className="flex flex-wrap gap-2" aria-label={a.title}>
        {FILTERS.map((f) => (
          <Link key={f} href={`${href(lang, "/admin/products")}?status=${f}`} aria-current={f === status ? "page" : undefined} className={`rounded-full border px-3 py-1 text-sm font-semibold ${f === status ? "border-ink bg-ink text-white" : "border-line-strong text-ink-2 hover:bg-paper-2"}`}>
            {a.filters[f]}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">{a.none}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ row, image }) => (
            <li key={row.slug} className="card flex flex-wrap gap-3 p-3" data-product={row.slug}>
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element -- uploads are served by our own permission-checked route
                <img src={`/api/files/${image}`} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="h-20 w-20 shrink-0 rounded-lg bg-paper-2" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{row.name}</p>
                <p className="text-sm text-ink-2">
                  <Link href={href(lang, `/admin/sellers/${row.manufacturer_slug}`)} className="hover:underline">{row.maker_name}</Link>
                  {!isApproved(row.account_status) && <span className="ml-2 text-xs font-semibold text-warn">{a.sellerNotApproved}</span>}
                </p>
                <p className="text-sm text-ink-2">{row.retail_price_tetri ? tetri(row.retail_price_tetri) : ps.noPrice}</p>
                <div className="mt-1"><StatusChip status={TONE[row.status]} label={ps.status[row.status]} /></div>
                {row.moderation_note && <p className="mt-1 text-xs text-red-700">{row.moderation_note}</p>}
                <p className="mt-1 line-clamp-2 text-xs text-muted">{row.description}</p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-64">
                {row.status === "pending_review" && (
                  <AdminSellerForm op="productModerate" slug={row.manufacturer_slug} back={self} values={{ product: row.slug, decision: "approve" }}>
                    <Submit className="btn btn-dark w-full px-3 py-1.5 text-sm">{a.approve}</Submit>
                  </AdminSellerForm>
                )}
                {(row.status === "pending_review" || row.status === "published") && (
                  <details className="rounded-lg border border-line">
                    <summary className="cursor-pointer list-none px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-paper-2">{row.status === "published" ? a.takeDown : a.reject}</summary>
                    <AdminSellerForm op="productModerate" slug={row.manufacturer_slug} back={self} values={{ product: row.slug, decision: "reject" }} className="space-y-2 border-t border-line p-2">
                      <label className="label" htmlFor={`mod-${row.slug}`}>{a.reason}</label>
                      <textarea id={`mod-${row.slug}`} name="reason" required maxLength={1000} rows={2} className="input" />
                      <Submit className="btn btn-primary px-3 py-1.5 text-sm">{row.status === "published" ? a.takeDown : a.reject}</Submit>
                    </AdminSellerForm>
                  </details>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
