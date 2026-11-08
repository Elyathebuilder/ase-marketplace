import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Catalog } from "@/components/Catalog";
import { getCategory, parseFilters } from "@/lib/catalog";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilters(await searchParams);
  const category = filters.category ? getCategory(filters.category) : undefined;
  const title = filters.q ? `Results for “${filters.q}”` : category ? category.name : "All products";
  return (
    <div className="container-page py-6 md:py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Products" }]} />
      <h1 className="mt-2 mb-6 text-2xl font-extrabold md:text-3xl">{title}</h1>
      <Catalog filters={filters} />
    </div>
  );
}
