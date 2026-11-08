import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ProductEditor } from "@/components/seller/ProductEditor";
import { getCategories } from "@/lib/catalog";
import { demoSellerProducts } from "@/lib/seller-demo";

export function generateStaticParams() {
  return [...demoSellerProducts().map((p) => ({ slug: p.slug })), { slug: "new" }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;
  return { title: slug === "new" ? "Add product" : demoSellerProducts().find((p) => p.slug === slug)?.name ?? "Product" };
}

export default async function EditProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const product = slug === "new" ? null : demoSellerProducts().find((p) => p.slug === slug);
  if (product === undefined) notFound();
  return (
    <div className="space-y-5">
      <Link href="/seller/products" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-2 hover:text-red-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Products
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">{product ? product.name : "Add a product"}</h1>
        {product && (
          <Link href={`/products/${product.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-2 hover:text-red-600">
            View on site <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
      <ProductEditor product={product} categories={getCategories()} />
    </div>
  );
}
