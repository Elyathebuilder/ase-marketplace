import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CategoryIcon } from "@/components/CategoryIcon";
import { getDict, href, isLang, locCategory } from "@/i18n";
import { countInCategory, getCategories, getManufacturers } from "@/lib/catalog";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").nav.categories };
}

export default async function CategoriesPage({ params }: { params: Params }) {
  const { lang, t } = await pageLang(params);
  const makers = getManufacturers();
  return (
    <div className="container-page py-6 md:py-8">
      <Breadcrumbs label={t.common.breadcrumb} items={[{ label: t.common.home, href: href(lang, "/") }, { label: t.nav.categories }]} />
      <h1 className="mt-2 text-2xl font-extrabold md:text-3xl">{t.categoriesPage.title}</h1>
      <p className="mt-2 max-w-2xl text-ink-2">{t.categoriesPage.intro}</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {getCategories().map((raw) => {
          const c = locCategory(raw, lang);
          const makerCount = makers.filter((m) => m.categories.includes(c.slug)).length;
          return (
            <li key={c.slug}>
              <Link href={href(lang, `/categories/${c.slug}`)} className="card group flex h-full gap-4 p-4 transition hover:border-red-200 hover:shadow-[var(--shadow-lift)]">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <CategoryIcon name={c.icon} className="h-6 w-6" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-ink group-hover:text-red-600">{c.name}</span>
                  <span className="mt-0.5 block text-sm text-muted">{c.description}</span>
                  <span className="mt-2 block text-xs font-medium text-ink-2">
                    {t.common.productsCount(countInCategory(c.slug))} · {t.common.makersCount(makerCount)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
