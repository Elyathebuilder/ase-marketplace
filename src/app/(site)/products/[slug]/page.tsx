import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowRight, Check, Clock, Factory, MapPin, Package, Wrench } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DeliveryEstimator } from "@/components/DeliveryEstimator";
import { ManufacturerLogo } from "@/components/ManufacturerLogo";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { PurchasePanel } from "@/components/PurchasePanel";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import {
  AVAILABILITY_LABEL,
  availabilityOf,
  getAllProducts,
  getCategory,
  getProduct,
  lowestWholesalePrice,
  manufacturerOf,
  relatedProducts,
} from "@/lib/catalog";
import { formatGel, formatNumber } from "@/lib/format";

export function generateStaticParams() {
  return getAllProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = getProduct((await params).slug);
  return { title: p?.name ?? "Product", description: p?.description };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = getProduct((await params).slug);
  if (!product) notFound();
  const m = manufacturerOf(product);
  const category = getCategory(product.category);
  const availability = availabilityOf(product);
  const wholesaleFrom = lowestWholesalePrice(product);
  const related = relatedProducts(product);

  const details: [string, string][] = [
    ["Package size", `${product.lengthCm} × ${product.widthCm} × ${product.heightCm} cm`],
    ["Weight", `${product.weightKg} kg`],
    ["Materials", product.materials.join(", ") || "—"],
    ...Object.entries(product.specs),
    ["Available stock", product.stock > 0 ? `${formatNumber(product.stock)} ${product.unit}s` : "Made to order"],
    ["Minimum order (MOQ)", `${formatNumber(product.moq)} ${product.unit}${product.moq === 1 ? "" : "s"}`],
    ["Production time", `${product.productionDays} working days`],
    ["Customization", product.customizable ? product.customizationOptions.join(", ") || "Available" : "Not available"],
  ];

  return (
    <div className="container-page py-6 md:py-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: category?.name ?? "Products", href: category ? `/categories/${category.slug}` : "/products" },
          { label: product.name },
        ]}
      />

      <div className="mt-4 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        {/* Gallery */}
        <div>
          <ProductImage product={product} size="lg" className="aspect-[4/3] rounded-2xl border border-line" />
          <p className="mt-2 text-xs text-muted">Sample image. Manufacturers upload real product photos in the seller portal.</p>
        </div>

        {/* Buy box */}
        <div>
          <div className="flex flex-wrap gap-1.5">
            {product.buyNow && product.retailPrice != null && <span className="chip bg-red-50 text-red-700">Buy now</span>}
            {product.requestQuote && <span className="chip bg-ink text-white">Request quote</span>}
            {product.customizable && <span className="chip bg-paper-2 text-ink-2">Customizable</span>}
          </div>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight md:text-3xl">{product.name}</h1>
          <Link href={`/manufacturers/${m.slug}`} className="mt-2 inline-flex flex-wrap items-center gap-2 text-sm text-ink-2 hover:text-red-600">
            by <span className="font-semibold underline decoration-line-strong underline-offset-2">{m.name}</span>
            <VerifiedBadge status={m.verification} compact />
          </Link>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className={availability === "made_to_order" ? "font-semibold text-warn" : availability === "low_stock" ? "font-semibold text-red-700" : "font-semibold text-ok"}>
              {AVAILABILITY_LABEL[availability]}
              {availability !== "made_to_order" && ` · ${formatNumber(product.stock)} available`}
            </span>
            <span className="inline-flex items-center gap-1 text-muted"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />Ships from {m.city}</span>
          </div>

          {/* Retail vs wholesale */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border-2 border-ink bg-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Retail price</p>
              {product.retailPrice != null ? (
                <p className="mt-1 text-3xl font-extrabold text-ink">
                  {formatGel(product.retailPrice)}
                  <span className="text-sm font-medium text-muted"> / {product.unit}</span>
                </p>
              ) : (
                <p className="mt-1 text-lg font-bold text-ink">Not sold at retail</p>
              )}
              <p className="mt-1 text-xs text-muted">Incl. VAT. Delivery calculated separately.</p>
            </div>
            <div className="rounded-xl border border-line bg-paper-2/60 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Wholesale price</p>
              {wholesaleFrom != null ? (
                <>
                  <p className="mt-1 text-2xl font-extrabold text-ink">
                    from {formatGel(wholesaleFrom)}
                    <span className="text-sm font-medium text-muted"> / {product.unit}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted">From {formatNumber(product.wholesale!.minQty)} {product.unit}s. Via quotation.</p>
                </>
              ) : product.requestQuote ? (
                <p className="mt-1 text-lg font-bold text-ink">On request</p>
              ) : (
                <p className="mt-1 text-lg font-bold text-subtle">Not available</p>
              )}
            </div>
          </div>

          <div className="mt-5">
            <PurchasePanel
              slug={product.slug}
              unit={product.unit}
              retailPrice={product.retailPrice}
              buyNow={product.buyNow}
              requestQuote={product.requestQuote}
              moq={product.moq}
              stock={product.stock}
              tiers={product.wholesale?.tiers ?? []}
            />
          </div>

          <div className="mt-5">
            <DeliveryEstimator
              origin={m.city}
              defaultQty={Math.max(1, product.moq)}
              unit={product.unit}
              item={{
                weightKg: product.weightKg,
                lengthCm: product.lengthCm,
                widthCm: product.widthCm,
                heightCm: product.heightCm,
                fragile: product.fragile,
                specialHandling: product.specialHandling,
              }}
            />
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="mt-12 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-bold">About this product</h2>
            <p className="mt-3 leading-relaxed text-ink-2">{product.description}</p>
            {product.highlights.length > 0 && (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {product.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm text-ink-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                    {h}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-xl font-bold">Specifications</h2>
            <dl className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {details.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[minmax(8rem,40%)_1fr] gap-4 px-4 py-2.5 text-sm">
                  <dt className="font-medium text-muted">{k}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {product.wholesale && product.wholesale.tiers.length > 0 && (
            <section id="wholesale">
              <h2 className="text-xl font-bold">Wholesale & bulk pricing</h2>
              <p className="mt-1 text-sm text-muted">For businesses. Final price and terms are confirmed in the manufacturer&apos;s quotation.</p>
              <div className="mt-3 overflow-hidden rounded-xl border border-line bg-surface">
                <table className="w-full text-sm">
                  <thead className="bg-paper-2 text-left text-xs uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Quantity</th>
                      <th className="px-4 py-2.5 font-semibold">Unit price</th>
                      <th className="px-4 py-2.5 font-semibold">vs. retail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {product.wholesale.tiers.map((t, i, arr) => (
                      <tr key={t.minQty}>
                        <td className="px-4 py-2.5 text-ink">
                          {formatNumber(t.minQty)}
                          {arr[i + 1] ? `–${formatNumber(arr[i + 1].minQty - 1)}` : "+"} {product.unit}s
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-ink">{formatGel(t.unitPrice)}</td>
                        <td className="px-4 py-2.5 text-ok">
                          {product.retailPrice ? `−${Math.round((1 - t.unitPrice / product.retailPrice) * 100)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xl font-bold">Shipping</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              <Fact icon={<Package className="h-4 w-4" />} title="Packed size" text={`${product.lengthCm} × ${product.widthCm} × ${product.heightCm} cm, ${product.weightKg} kg per ${product.unit}`} />
              <Fact icon={<MapPin className="h-4 w-4" />} title="Pickup location" text={`${m.city}, ${m.region}. Ships separately from other manufacturers.`} />
              <Fact icon={<Clock className="h-4 w-4" />} title="Dispatch" text={product.stock > 0 ? "In stock items are prepared in 1–3 working days." : `Made to order: about ${product.productionDays} working days.`} />
              {(product.fragile || product.specialHandling) && (
                <Fact
                  icon={<AlertTriangle className="h-4 w-4" />}
                  title={product.specialHandling ? "Special handling" : "Fragile"}
                  text={product.specialHandling ? "Needs a larger vehicle or our team's confirmation." : "Packed and carried as fragile; not sent by scooter."}
                />
              )}
            </ul>
            <p className="mt-3 text-sm text-muted">
              We choose the vehicle automatically from the size and weight of your order. You never pay for a bigger vehicle than you need.
            </p>
          </section>
        </div>

        {/* Manufacturer */}
        <aside>
          <div className="card sticky top-32 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Manufacturer</p>
            <div className="mt-3 flex items-center gap-3">
              <ManufacturerLogo m={m} />
              <div>
                <p className="font-semibold text-ink">{m.name}</p>
                <p className="text-xs text-muted">{m.city} · Est. {m.yearEstablished}</p>
              </div>
            </div>
            <div className="mt-3"><VerifiedBadge status={m.verification} /></div>
            <p className="mt-3 text-sm text-ink-2">{m.tagline}</p>
            <ul className="mt-3 space-y-1.5 text-sm text-ink-2">
              {m.capabilities.slice(0, 3).map((c) => (
                <li key={c} className="flex gap-2"><Factory className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />{c}</li>
              ))}
              {product.customizable && (
                <li className="flex gap-2"><Wrench className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />Custom versions available</li>
              )}
            </ul>
            <Link href={`/manufacturers/${m.slug}`} className="btn btn-outline mt-4 w-full">
              View profile & products <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <p className="mt-3 text-xs text-muted">Questions about price, size or shipping go through ASE, so every agreement is on record.</p>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-xl font-bold">Related products</h2>
          <ul className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            {related.map((p) => (
              <li key={p.slug}><ProductCard product={p} /></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Fact({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <li className="flex gap-3 rounded-xl border border-line bg-surface p-3.5">
      <span className="mt-0.5 text-red-600" aria-hidden="true">{icon}</span>
      <span>
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block text-sm text-ink-2">{text}</span>
      </span>
    </li>
  );
}
