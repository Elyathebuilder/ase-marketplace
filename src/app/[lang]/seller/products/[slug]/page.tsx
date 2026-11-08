import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ProductEditor } from "@/components/seller/ProductEditor";
import { getCategories } from "@/lib/catalog";
import { demoSellerProducts } from "@/lib/seller-demo";
import { getDict, href, isLang, locCategory, locProduct } from "@/i18n";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string; slug: string }>;

/** Unknown addresses show the site's 404 page. */
export const dynamicParams = false;

export function generateStaticParams() {
  return [...demoSellerProducts().map((p) => ({ slug: p.slug })), { slug: "new" }];
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang: l, slug } = await params;
  const lang = isLang(l) ? l : "ka";
  const p = demoSellerProducts().find((x) => x.slug === slug);
  return { title: slug === "new" ? getDict(lang).seller.editor.addTitle : p ? locProduct(p, lang).name : undefined };
}

export default async function EditProductPage({ params }: { params: Params }) {
  const { lang, t } = await pageLang(params);
  const e = t.seller.editor;
  const slug = (await params).slug;
  const raw = slug === "new" ? null : demoSellerProducts().find((p) => p.slug === slug);
  if (raw === undefined) notFound();
  const product = raw && locProduct(raw, lang);
  return (
    <div className="space-y-5">
      <Link href={href(lang, "/seller/products")} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-2 hover:text-red-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {e.back}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">{product ? product.name : e.addTitle}</h1>
        {product && (
          <Link href={href(lang, `/products/${product.slug}`)} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-2 hover:text-red-600">
            {e.viewOnSite} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
      <ProductEditor product={product} categories={getCategories().map((c) => locCategory(c, lang))} />
    </div>
  );
}
