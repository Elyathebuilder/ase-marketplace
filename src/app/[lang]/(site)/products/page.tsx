import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Catalog } from "@/components/Catalog";
import { getDict, href, isLang, locCategory } from "@/i18n";
import { getCategory, parseFilters } from "@/lib/catalog";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").nav.products };
}

export default async function ProductsPage({ params, searchParams }: { params: Params; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { lang, t } = await pageLang(params);
  const filters = parseFilters(await searchParams);
  const raw = filters.category ? getCategory(filters.category) : undefined;
  const category = raw ? locCategory(raw, lang) : undefined;
  const title = filters.q ? t.catalog.resultsFor(filters.q) : category ? category.name : t.catalog.title;
  return (
    <div className="container-page py-6 md:py-8">
      <Breadcrumbs label={t.common.breadcrumb} items={[{ label: t.common.home, href: href(lang, "/") }, { label: t.nav.products }]} />
      <h1 className="mt-2 mb-6 text-2xl font-extrabold md:text-3xl">{title}</h1>
      <Catalog filters={filters} lang={lang} />
    </div>
  );
}
