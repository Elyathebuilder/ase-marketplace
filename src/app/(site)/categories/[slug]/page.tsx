import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Catalog } from "@/components/Catalog";
import { CategoryIcon } from "@/components/CategoryIcon";
import { getCategories, getCategory, parseFilters } from "@/lib/catalog";

export function generateStaticParams() {
  return getCategories().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = getCategory((await params).slug);
  return { title: c?.name ?? "Category", description: c?.description };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const category = getCategory((await params).slug);
  if (!category) notFound();
  const filters = parseFilters(await searchParams);
  return (
    <div className="container-page py-6 md:py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Categories", href: "/categories" }, { label: category.name }]} />
      <div className="mt-3 mb-6 flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <CategoryIcon name={category.icon} className="h-7 w-7" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold md:text-3xl">{category.name}</h1>
          <p className="text-sm text-muted">{category.description}</p>
        </div>
      </div>
      <Catalog filters={filters} lockedCategory={category.slug} />
    </div>
  );
}
