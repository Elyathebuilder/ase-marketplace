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
  availabilityOf,
  getAllProducts,
  getCategory,
  getProduct,
  lowestWholesalePrice,
  manufacturerOf,
  relatedProducts,
} from "@/lib/catalog";
import { formatGel, formatNumber } from "@/lib/format";
import { href, isLang, locCategory, locMaker, locProduct, units } from "@/i18n";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string; slug: string }>;

/** Unknown addresses show the site's 404 page. */
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, slug } = await params;
  const raw = getProduct(slug);
  const p = raw ? locProduct(raw, isLang(lang) ? lang : "ka") : undefined;
  return { title: p?.name, description: p?.description };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { lang, t } = await pageLang(params);
  const pt = t.product;
  const to = (p: string) => href(lang, p);
  const raw = getProduct((await params).slug);
  if (!raw) notFound();
  const product = locProduct(raw, lang);
  const rawMaker = manufacturerOf(raw);
  const m = locMaker(rawMaker, lang);
  const rawCategory = getCategory(product.category);
  const category = rawCategory ? locCategory(rawCategory, lang) : undefined;
  const u = (n: number) => units(raw.unit, lang, n);
  const availability = availabilityOf(product);
  const wholesaleFrom = lowestWholesalePrice(product);
  const related = relatedProducts(product);

  const details: [string, string][] = [
    [pt.packageSize, `${product.lengthCm} × ${product.widthCm} × ${product.heightCm} ${t.common.measure.cm}`],
    [pt.weight, `${formatNumber(product.weightKg, lang)} ${t.common.measure.kg}`],
    [pt.materials, product.materials.join(", ") || "—"],
    ...Object.entries(product.specs),
    [pt.stock, product.stock > 0 ? `${formatNumber(product.stock, lang)} ${u(product.stock)}` : t.availability.made_to_order],
    [pt.moq, `${formatNumber(product.moq, lang)} ${u(product.moq)}`],
    [pt.productionTime, pt.workingDays(product.productionDays)],
    [pt.customization, product.customizable ? product.customizationOptions.join(", ") || pt.available2 : pt.notAvailable2],
  ];

  return (
    <div className="container-page py-6 md:py-8">
      <Breadcrumbs
        label={t.common.breadcrumb}
        items={[
          { label: t.common.home, href: to("/") },
          { label: category?.name ?? t.nav.products, href: to(category ? `/categories/${category.slug}` : "/products") },
          { label: product.name },
        ]}
      />

      <div className="mt-4 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        {/* Gallery */}
        <div>
          <ProductImage product={product} size="lg" className="aspect-[4/3] rounded-2xl border border-line" sampleLabel={t.common.sampleImage} />
          <p className="mt-2 text-xs text-muted">{pt.sampleNote}</p>
        </div>

        {/* Buy box */}
        <div>
          <div className="flex flex-wrap gap-1.5">
            {product.buyNow && product.retailPrice != null && <span className="chip bg-red-50 text-red-700">{pt.buyNow}</span>}
            {product.requestQuote && <span className="chip bg-ink text-white">{pt.requestQuote}</span>}
            {product.customizable && <span className="chip bg-paper-2 text-ink-2">{pt.customizable}</span>}
          </div>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight md:text-3xl">{product.name}</h1>
          <Link href={to(`/manufacturers/${m.slug}`)} className="mt-2 inline-flex flex-wrap items-center gap-2 text-sm text-ink-2 hover:text-red-600">
            {pt.by} <span className="font-semibold underline decoration-line-strong underline-offset-2">{m.name}</span>
            <VerifiedBadge status={m.verification} compact lang={lang} />
          </Link>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className={availability === "made_to_order" ? "font-semibold text-warn" : availability === "low_stock" ? "font-semibold text-red-700" : "font-semibold text-ok"}>
              {t.availability[availability]}
              {availability !== "made_to_order" && ` · ${pt.available(formatNumber(product.stock, lang))}`}
            </span>
            <span className="inline-flex items-center gap-1 text-muted"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{pt.shipsFrom(m.city)}</span>
          </div>

          {/* Retail vs wholesale */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border-2 border-ink bg-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">{pt.retailPrice}</p>
              {product.retailPrice != null ? (
                <p className="mt-1 text-3xl font-extrabold text-ink">
                  {formatGel(product.retailPrice, lang)}
                  <span className="text-sm font-medium text-muted"> / {product.unit}</span>
                </p>
              ) : (
                <p className="mt-1 text-lg font-bold text-ink">{pt.notRetail}</p>
              )}
              <p className="mt-1 text-xs text-muted">{pt.vatNote}</p>
            </div>
            <div className="rounded-xl border border-line bg-paper-2/60 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">{pt.wholesalePrice}</p>
              {wholesaleFrom != null ? (
                <>
                  <p className="mt-1 text-2xl font-extrabold text-ink">
                    {pt.fromPrice(formatGel(wholesaleFrom, lang))}
                    <span className="text-sm font-medium text-muted"> / {product.unit}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted">{pt.wholesaleMin(formatNumber(product.wholesale!.minQty, lang), u(product.wholesale!.minQty))}</p>
                </>
              ) : product.requestQuote ? (
                <p className="mt-1 text-lg font-bold text-ink">{pt.onRequest}</p>
              ) : (
                <p className="mt-1 text-lg font-bold text-subtle">{pt.notAvailable}</p>
              )}
            </div>
          </div>

          <div className="mt-5">
            <PurchasePanel
              slug={product.slug}
              unit={raw.unit}
              retailPrice={product.retailPrice}
              buyNow={product.buyNow}
              requestQuote={product.requestQuote}
              moq={product.moq}
              stock={product.stock}
              tiers={product.wholesale?.tiers ?? []}
              quoteOnly={product.wholesale?.quoteOnly ?? true}
              variants={product.variants}
              colors={product.colors}
              available={product.available !== false}
            />
          </div>

          <div className="mt-5">
            <DeliveryEstimator
              origin={rawMaker.city}
              defaultQty={Math.max(1, product.moq)}
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
            <h2 className="text-xl font-bold">{pt.about}</h2>
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
            <h2 className="text-xl font-bold">{pt.specs}</h2>
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
              <h2 className="text-xl font-bold">{pt.wholesaleTitle}</h2>
              <p className="mt-1 text-sm text-muted">{pt.wholesaleNote}</p>
              <div className="mt-3 overflow-hidden rounded-xl border border-line bg-surface">
                <table className="w-full text-sm">
                  <thead className="bg-paper-2 text-left text-xs uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">{pt.qty}</th>
                      <th className="px-4 py-2.5 font-semibold">{pt.unitPrice}</th>
                      <th className="px-4 py-2.5 font-semibold">{pt.vsRetail}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {product.wholesale.tiers.map((tier, i, arr) => (
                      <tr key={tier.minQty}>
                        <td className="px-4 py-2.5 text-ink">
                          {formatNumber(tier.minQty, lang)}
                          {arr[i + 1] ? `–${formatNumber(arr[i + 1].minQty - 1, lang)}` : "+"} {u(2)}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-ink">{formatGel(tier.unitPrice, lang)}</td>
                        <td className="px-4 py-2.5 text-ok">
                          {product.retailPrice ? `−${Math.round((1 - tier.unitPrice / product.retailPrice) * 100)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xl font-bold">{pt.shipping}</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              <Fact icon={<Package className="h-4 w-4" />} title={pt.packed} text={pt.packedText(`${product.lengthCm} × ${product.widthCm} × ${product.heightCm} ${t.common.measure.cm}`, product.weightKg, product.unit)} />
              <Fact icon={<MapPin className="h-4 w-4" />} title={pt.pickup} text={pt.pickupText(m.city, m.region)} />
              <Fact icon={<Clock className="h-4 w-4" />} title={pt.dispatch} text={product.stock > 0 ? pt.dispatchStock : pt.dispatchMade(product.productionDays)} />
              {(product.fragile || product.specialHandling) && (
                <Fact
                  icon={<AlertTriangle className="h-4 w-4" />}
                  title={product.specialHandling ? pt.special : pt.fragile}
                  text={product.specialHandling ? pt.specialText : pt.fragileText}
                />
              )}
            </ul>
            <p className="mt-3 text-sm text-muted">
              {pt.shippingNote}
            </p>
          </section>
        </div>

        {/* Manufacturer */}
        <aside>
          <div className="card sticky top-32 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">{pt.manufacturer}</p>
            <div className="mt-3 flex items-center gap-3">
              <ManufacturerLogo m={rawMaker} />
              <div>
                <p className="font-semibold text-ink">{m.name}</p>
                <p className="text-xs text-muted">{m.city} · {t.common.est(m.yearEstablished ?? "—")}</p>
              </div>
            </div>
            <div className="mt-3"><VerifiedBadge status={m.verification} lang={lang} /></div>
            <p className="mt-3 text-sm text-ink-2">{m.tagline}</p>
            <ul className="mt-3 space-y-1.5 text-sm text-ink-2">
              {m.capabilities.slice(0, 3).map((c) => (
                <li key={c} className="flex gap-2"><Factory className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />{c}</li>
              ))}
              {product.customizable && (
                <li className="flex gap-2"><Wrench className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />{pt.customVersions}</li>
              )}
            </ul>
            <Link href={to(`/manufacturers/${m.slug}`)} className="btn btn-outline mt-4 w-full">
              {pt.viewProfile} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <p className="mt-3 text-xs text-muted">{pt.questionsNote}</p>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-xl font-bold">{pt.related}</h2>
          <ul className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            {related.map((p) => (
              <li key={p.slug}><ProductCard product={p} lang={lang} /></li>
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
