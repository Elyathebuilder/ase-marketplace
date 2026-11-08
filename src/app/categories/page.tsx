import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CategoryIcon } from "@/components/CategoryIcon";
import { countInCategory, getCategories, getManufacturers } from "@/lib/catalog";

export const metadata: Metadata = { title: "Categories" };

export default function CategoriesPage() {
  const makers = getManufacturers();
  return (
    <div className="container-page py-6 md:py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Categories" }]} />
      <h1 className="mt-2 text-2xl font-extrabold md:text-3xl">All categories</h1>
      <p className="mt-2 max-w-2xl text-ink-2">Every product on ASE is physically manufactured in Georgia. Browse by what it is.</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {getCategories().map((c) => {
          const makerCount = makers.filter((m) => m.categories.includes(c.slug)).length;
          return (
            <li key={c.slug}>
              <Link href={`/categories/${c.slug}`} className="card group flex h-full gap-4 p-4 transition hover:border-red-200 hover:shadow-[var(--shadow-lift)]">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <CategoryIcon name={c.icon} className="h-6 w-6" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-ink group-hover:text-red-600">{c.name}</span>
                  <span className="mt-0.5 block text-sm text-muted">{c.description}</span>
                  <span className="mt-2 block text-xs font-medium text-ink-2">
                    {countInCategory(c.slug)} products · {makerCount} manufacturer{makerCount === 1 ? "" : "s"}
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
