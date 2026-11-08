import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Boxes, ClipboardList, Factory, FileText, Handshake, Layers, Truck } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ManufacturerCard } from "@/components/ManufacturerCard";
import { ProductCard } from "@/components/ProductCard";
import { RfqForm } from "@/components/RfqForm";
import { SectionHeader } from "@/components/SectionHeader";
import { filterProducts, getAllProducts, getManufacturers, verifiedManufacturers } from "@/lib/catalog";

export const metadata: Metadata = { title: "B2B / Wholesale" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: SP[string]) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function B2BPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const qty = Number(one(sp.qty));
  const wholesale = filterProducts({ mode: "wholesale", sort: "popular" }).slice(0, 8);

  return (
    <>
      <section className="bg-ink text-white">
        <div className="container-page py-10 md:py-14">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "B2B / Wholesale" }]} />
          <div className="mt-4 grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
            <div>
              <p className="eyebrow text-red-200">For businesses</p>
              <h1 className="mt-2 text-3xl font-extrabold text-white md:text-5xl">Source from Georgian manufacturers.</h1>
              <p className="mt-4 max-w-2xl text-white/75 md:text-lg">
                Wholesale prices, bulk quantities and custom production for retailers, hotels, restaurants, builders and producers. Request a quotation, compare terms, and order when you&apos;re ready.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#rfq" className="btn btn-primary px-6 py-3"><FileText className="h-4 w-4" aria-hidden="true" />Request a quotation</a>
                <Link href="/products?mode=wholesale" className="btn border-[1.5px] border-white/80 px-6 py-3 text-white hover:bg-white hover:text-ink">Wholesale catalog</Link>
              </div>
            </div>
            <ul className="grid grid-cols-2 gap-3 text-sm">
              {[
                { icon: Layers, t: "Bulk tier pricing" },
                { icon: Boxes, t: "Clear minimum order quantities" },
                { icon: Factory, t: "Custom & private label" },
                { icon: BadgeCheck, t: "Verified manufacturers" },
              ].map(({ icon: Icon, t }) => (
                <li key={t} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-white/85">
                  <Icon className="h-4 w-4 shrink-0 text-red-200" aria-hidden="true" />{t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <SectionHeader eyebrow="How it works" title="From request to delivery" />
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { icon: ClipboardList, t: "Submit a request", d: "Product or custom item, quantity and requirements." },
            { icon: Factory, t: "Manufacturer reviews", d: "They check capacity, materials and timing." },
            { icon: FileText, t: "Quotation", d: "Unit price, lead time, delivery and payment terms." },
            { icon: Handshake, t: "Accept or decline", d: "No obligation until you accept." },
            { icon: Truck, t: "Order & delivery", d: "The accepted quote becomes a tracked order." },
          ].map(({ icon: Icon, t, d }, i) => (
            <li key={t} className="card relative p-4">
              <span className="absolute right-4 top-3 font-[family-name:var(--font-display)] text-3xl font-extrabold text-line">{i + 1}</span>
              <Icon className="h-5 w-5 text-red-600" aria-hidden="true" />
              <h3 className="mt-3 font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-ink-2">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-page py-4">
        <SectionHeader eyebrow="Wholesale catalog" title="Products with bulk pricing" href="/products?mode=wholesale" />
        <ul className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          {wholesale.map((p) => (
            <li key={p.slug}><ProductCard product={p} /></li>
          ))}
        </ul>
      </section>

      <section className="container-page py-12">
        <SectionHeader eyebrow="Directory" title="Verified suppliers" href="/manufacturers?verified=1" linkLabel="Full directory" />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {verifiedManufacturers().slice(0, 4).map((m) => (
            <li key={m.slug}><ManufacturerCard m={m} /></li>
          ))}
        </ul>
      </section>

      <section id="rfq" className="container-page scroll-mt-32 py-4">
        <div className="card grid gap-8 p-5 md:p-8 lg:grid-cols-[1fr_2fr]">
          <div>
            <p className="eyebrow">Request for quotation</p>
            <h2 className="mt-1 text-2xl font-extrabold md:text-3xl">Tell us what you need</h2>
            <p className="mt-3 text-ink-2">
              Pick a listed product, or describe a custom item and we&apos;ll route it to suitable manufacturers. You can request a quote without buying.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-ink-2">
              <li>• Typical reply within 2 working days</li>
              <li>• All messages and quotes stay on ASE</li>
              <li>• Delivery is quoted with the order</li>
            </ul>
          </div>
          <RfqForm
            key={`${one(sp.product)}-${one(sp.manufacturer)}-${one(sp.qty)}`}
            defaults={{ product: one(sp.product), manufacturer: one(sp.manufacturer), qty: Number.isFinite(qty) && qty > 0 ? qty : undefined }}
            manufacturers={getManufacturers().map((m) => ({ value: m.slug, label: m.name }))}
            products={getAllProducts()
              .filter((p) => p.requestQuote)
              .map((p) => ({ value: p.slug, label: p.name, manufacturer: p.manufacturer, unit: p.unit, moq: p.wholesale?.minQty ?? p.moq }))}
          />
        </div>
      </section>
    </>
  );
}
