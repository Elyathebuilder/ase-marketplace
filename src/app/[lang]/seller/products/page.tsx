import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { StatusPill } from "@/components/seller/StatusPill";
import { lowestWholesalePrice } from "@/lib/catalog";
import { formatGel, formatNumber } from "@/lib/format";
import { demoSellerProducts } from "@/lib/seller-demo";
import { getDict, href, isLang, locProduct } from "@/i18n";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").seller.products.title };
}

export default async function SellerProductsPage({ params }: { params: Params }) {
  const { lang, t } = await pageLang(params);
  const s = t.seller.products;
  const products = demoSellerProducts().map((p) => locProduct(p, lang));
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{s.title}</h1>
          <p className="mt-1 text-sm text-muted">{s.intro}</p>
        </div>
        <Link href={href(lang, "/seller/products/new")} className="btn btn-primary"><Plus className="h-4 w-4" aria-hidden="true" />{s.add}</Link>
      </div>

      <div className="card mt-5 overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="bg-paper-2 text-left text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-2.5 font-semibold">{s.product}</th>
              <th className="px-4 py-2.5 font-semibold">{s.retail}</th>
              <th className="px-4 py-2.5 font-semibold">{s.wholesaleFrom}</th>
              <th className="px-4 py-2.5 font-semibold">{s.stock}</th>
              <th className="px-4 py-2.5 font-semibold">{s.selling}</th>
              <th className="px-4 py-2.5 font-semibold">{s.status}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p, i) => {
              const w = lowestWholesalePrice(p);
              return (
                <tr key={p.slug} className="hover:bg-paper">
                  <td className="px-4 py-3">
                    <Link href={href(lang, `/seller/products/${p.slug}`)} className="flex items-center gap-3">
                      <ProductImage product={p} size="sm" className="h-11 w-11 shrink-0 rounded-lg" sampleLabel={t.common.sampleImage} />
                      <span className="font-semibold text-ink hover:text-red-600 hover:underline">{p.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink-2">{p.retailPrice != null ? formatGel(p.retailPrice) : "—"}</td>
                  <td className="px-4 py-3 tabular-nums text-ink-2">{w != null ? formatGel(w) : "—"}</td>
                  <td className={`px-4 py-3 tabular-nums ${p.stock === 0 ? "text-muted" : p.stock < 20 ? "font-semibold text-red-700" : "text-ink-2"}`}>
                    {p.stock === 0 ? s.madeToOrder : formatNumber(p.stock)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.buyNow && <span className="chip bg-red-50 text-red-700">{s.buyNow}</span>}
                      {p.requestQuote && <span className="chip bg-ink text-white">{s.quote}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">{i === 2 ? <StatusPill label={s.inReview} tone="amber" /> : <StatusPill label={s.live} tone="green" />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
