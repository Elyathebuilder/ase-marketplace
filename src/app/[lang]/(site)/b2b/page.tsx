import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Boxes, ClipboardList, Factory, FileText, Handshake, Layers, Truck } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ManufacturerCard } from "@/components/ManufacturerCard";
import { ProductCard } from "@/components/ProductCard";
import { RfqForm } from "@/components/RfqForm";
import { SectionHeader } from "@/components/SectionHeader";
import { filterProducts, getAllProducts, getManufacturers, verifiedManufacturers } from "@/lib/catalog";
import { getDict, href, isLang, locMaker, locProduct, units } from "@/i18n";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").nav.b2b };
}

type SP = Record<string, string | string[] | undefined>;
const one = (v: SP[string]) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function B2BPage({ params, searchParams }: { params: Params; searchParams: Promise<SP> }) {
  const { lang, t } = await pageLang(params);
  const b = t.b2b;
  const to = (p: string) => href(lang, p);
  const sp = await searchParams;
  const qty = Number(one(sp.qty));
  const wholesale = filterProducts({ mode: "wholesale", sort: "popular" }).slice(0, 8);

  return (
    <>
      <section className="bg-ink text-white">
        <div className="container-page py-10 md:py-14">
          <Breadcrumbs label={t.common.breadcrumb} items={[{ label: t.common.home, href: to("/") }, { label: t.nav.b2b }]} />
          <div className="mt-4 grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
            <div>
              <p className="eyebrow text-red-200">{b.eyebrow}</p>
              <h1 className="mt-2 text-3xl font-extrabold text-white md:text-5xl">{b.title}</h1>
              <p className="mt-4 max-w-2xl text-white/75 md:text-lg">
                {b.intro}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#rfq" className="btn btn-primary px-6 py-3"><FileText className="h-4 w-4" aria-hidden="true" />{b.rfq}</a>
                <Link href={to("/products?mode=wholesale")} className="btn border-[1.5px] border-white/80 px-6 py-3 text-white hover:bg-white hover:text-ink">{b.catalog}</Link>
              </div>
            </div>
            <ul className="grid grid-cols-2 gap-3 text-sm">
              {[Layers, Boxes, Factory, BadgeCheck].map((icon, i) => ({ icon, label: b.features[i] })).map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-white/85">
                  <Icon className="h-4 w-4 shrink-0 text-red-200" aria-hidden="true" />{label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <SectionHeader eyebrow={b.howEyebrow} title={b.howTitle} />
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[ClipboardList, Factory, FileText, Handshake, Truck].map((icon, i) => ({ icon, ...b.steps[i] })).map(({ icon: Icon, t: title, d }, i) => (
            <li key={title} className="card relative p-4">
              <span className="absolute right-4 top-3 font-[family-name:var(--font-display)] text-3xl font-extrabold text-line">{i + 1}</span>
              <Icon className="h-5 w-5 text-red-600" aria-hidden="true" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-ink-2">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-page py-4">
        <SectionHeader eyebrow={b.catalogEyebrow} title={b.catalogTitle} href={to("/products?mode=wholesale")} linkLabel={t.common.seeAll} />
        <ul className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          {wholesale.map((p) => (
            <li key={p.slug}><ProductCard product={p} lang={lang} /></li>
          ))}
        </ul>
      </section>

      <section className="container-page py-12">
        <SectionHeader eyebrow={b.dirEyebrow} title={b.dirTitle} href={to("/manufacturers?verified=1")} linkLabel={b.dirLink} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {verifiedManufacturers().slice(0, 4).map((m) => (
            <li key={m.slug}><ManufacturerCard m={m} lang={lang} /></li>
          ))}
        </ul>
      </section>

      <section id="rfq" className="container-page scroll-mt-32 py-4">
        <div className="card grid gap-8 p-5 md:p-8 lg:grid-cols-[1fr_2fr]">
          <div>
            <p className="eyebrow">{b.rfqEyebrow}</p>
            <h2 className="mt-1 text-2xl font-extrabold md:text-3xl">{b.rfqTitle}</h2>
            <p className="mt-3 text-ink-2">
              {b.rfqText}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-ink-2">
              {b.rfqPoints.map((x) => <li key={x}>• {x}</li>)}
            </ul>
          </div>
          <RfqForm
            key={`${one(sp.product)}-${one(sp.manufacturer)}-${one(sp.qty)}`}
            defaults={{ product: one(sp.product), manufacturer: one(sp.manufacturer), qty: Number.isFinite(qty) && qty > 0 ? qty : undefined }}
            manufacturers={getManufacturers().map((m) => ({ value: m.slug, label: locMaker(m, lang).name }))}
            products={getAllProducts()
              .filter((p) => p.requestQuote)
              .map((p) => ({ value: p.slug, label: locProduct(p, lang).name, manufacturer: p.manufacturer, unit: units(p.unit, lang), moq: p.wholesale?.minQty ?? p.moq }))}
          />
        </div>
      </section>
    </>
  );
}
