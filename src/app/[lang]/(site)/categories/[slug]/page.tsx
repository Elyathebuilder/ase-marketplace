import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Catalog } from "@/components/Catalog";
import { CategoryIcon } from "@/components/CategoryIcon";
import { href, isLang, locCategory } from "@/i18n";
import { getCategories, getCategory, parseFilters } from "@/lib/catalog";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string; slug: string }>;

/** Unknown addresses show the site's 404 page. */
export const dynamicParams = false;

export function generateStaticParams() {
  return getCategories().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, slug } = await params;
  const raw = getCategory(slug);
  const c = raw ? locCategory(raw, isLang(lang) ? lang : "ka") : undefined;
  return { title: c?.name, description: c?.description };
}

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { lang, t } = await pageLang(params);
  const raw = getCategory((await params).slug);
  if (!raw) notFound();
  const category = locCategory(raw, lang);
  const filters = parseFilters(await searchParams);
  return (
    <div className="container-page py-6 md:py-8">
      <Breadcrumbs
        label={t.common.breadcrumb}
        items={[{ label: t.common.home, href: href(lang, "/") }, { label: t.nav.categories, href: href(lang, "/categories") }, { label: category.name }]}
      />
      <div className="mt-3 mb-6 flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <CategoryIcon name={category.icon} className="h-7 w-7" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold md:text-3xl">{category.name}</h1>
          <p className="text-sm text-muted">{category.description}</p>
        </div>
      </div>
      <Catalog filters={filters} lockedCategory={category.slug} lang={lang} />
    </div>
  );
}
