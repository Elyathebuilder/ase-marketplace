import Link from "next/link";
import { ArrowRight, BadgeCheck, ClipboardList, Factory, FileText, Handshake, ShoppingBag, Truck } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ManufacturerCard } from "@/components/ManufacturerCard";
import { ManufacturerLogo } from "@/components/ManufacturerLogo";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeader } from "@/components/SectionHeader";
import {
  countInCategory,
  featuredManufacturers,
  featuredProducts,
  getAllProducts,
  getCategories,
  getManufacturers,
  popularProducts,
  recentProducts,
  verifiedManufacturers,
} from "@/lib/catalog";
import { href, locCategory, locMaker } from "@/i18n";
import { pageLang } from "@/lib/page-lang";
import type { Lang } from "@/i18n";

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang, t } = await pageLang(params);
  const h = t.home;
  const to = (p: string) => href(lang, p);
  const categories = getCategories().map((c) => locCategory(c, lang));
  const regions = new Set(getManufacturers().map((m) => m.region)).size;

  return (
    <>
      {/* Hero */}
      <section className="border-b border-line bg-gradient-to-b from-paper-2/60 to-paper">
        <div className="container-page grid gap-8 py-10 md:py-14 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <p className="eyebrow">{h.eyebrow}</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] md:text-5xl lg:text-[3.5rem]">
              {h.title1}
              <br />
              <span className="text-red-600">{h.title2}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-2 md:text-lg">
              {h.intro}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={to("/products")} className="btn btn-primary px-6 py-3">
                <ShoppingBag className="h-4 w-4" aria-hidden="true" /> {h.shop}
              </Link>
              <Link href={to("/b2b")} className="btn btn-outline px-6 py-3">
                <Handshake className="h-4 w-4" aria-hidden="true" /> {h.source}
              </Link>
            </div>
            <dl className="mt-9 grid max-w-lg grid-cols-4 gap-4 border-t border-line pt-5">
              <Stat value={getManufacturers().length} label={h.stats.makers} />
              <Stat value={getAllProducts().length} label={h.stats.products} />
              <Stat value={categories.length} label={h.stats.categories} />
              <Stat value={regions} label={h.stats.regions} />
            </dl>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ModeCard
              tone="light"
              icon={<ShoppingBag className="h-5 w-5" />}
              kicker={h.b2c.kicker}
              title={h.b2c.title}
              points={h.b2c.points}
              href={to("/products?mode=retail")}
              cta={h.b2c.cta}
            />
            <ModeCard
              tone="dark"
              icon={<Handshake className="h-5 w-5" />}
              kicker={h.b2bCard.kicker}
              title={h.b2bCard.title}
              points={h.b2bCard.points}
              href={to("/b2b")}
              cta={h.b2bCard.cta}
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-page py-10">
        <SectionHeader title={h.categories} href={to("/categories")} linkLabel={h.allCategories} />
        <ul className="scroll-row auto-cols-[8.5rem] sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-4 sm:overflow-visible md:grid-cols-5 lg:grid-cols-7">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={to(`/categories/${c.slug}`)}
                className="card flex h-full flex-col items-center gap-2 px-2 py-4 text-center transition hover:border-red-200 hover:shadow-[var(--shadow-lift)]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <CategoryIcon name={c.icon} className="h-6 w-6" />
                </span>
                <span className="text-[0.8rem] font-semibold leading-tight text-ink">{c.name}</span>
                <span className="text-[0.7rem] text-muted">{t.common.itemsCount(countInCategory(c.slug))}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Featured products */}
      <section className="container-page py-6">
        <SectionHeader eyebrow={h.featuredEyebrow} title={h.featured} href={to("/products")} linkLabel={t.common.seeAll} />
        <ProductGrid products={featuredProducts()} lang={lang} />
      </section>

      {/* B2B band */}
      <section className="my-12 bg-ink text-white">
        <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div>
            <p className="eyebrow text-red-200">{h.b2bEyebrow}</p>
            <h2 className="mt-2 text-3xl font-extrabold text-white md:text-4xl">{h.b2bTitle}</h2>
            <p className="mt-4 text-white/75">
              {h.b2bText}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={to("/b2b#rfq")} className="btn btn-primary px-6 py-3">{h.rfq}</Link>
              <Link href={to("/products?mode=wholesale")} className="btn border-[1.5px] border-white/80 px-6 py-3 text-white hover:bg-white hover:text-ink">
                {h.wholesaleCatalog}
              </Link>
            </div>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {[ClipboardList, Factory, FileText, Truck].map((icon, i) => ({ icon, ...h.steps[i] })).map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <Icon className="h-5 w-5 text-red-200" aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-white">{title}</h3>
                <p className="mt-1 text-sm text-white/70">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Popular */}
      <section className="container-page py-6">
        <SectionHeader eyebrow={h.trendingEyebrow} title={h.popular} href={to("/products?sort=popular")} linkLabel={t.common.seeAll} />
        <ul className="scroll-row auto-cols-[15rem] md:auto-cols-[17rem]">
          {popularProducts(10).map((p) => (
            <li key={p.slug}><ProductCard product={p} lang={lang} /></li>
          ))}
        </ul>
      </section>

      {/* Featured manufacturers */}
      <section className="container-page py-10">
        <SectionHeader eyebrow={h.makersEyebrow} title={h.makers} href={to("/manufacturers")} linkLabel={h.directory} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featuredManufacturers().slice(0, 4).map((m) => (
            <ManufacturerCard key={m.slug} m={m} lang={lang} />
          ))}
        </div>
      </section>

      {/* Promotions */}
      <section className="container-page grid gap-4 py-4 md:grid-cols-2">
        <Promo
          kicker={h.promo1.kicker}
          title={h.promo1.title}
          text={h.promo1.text}
          href={to("/products?tag=HoReCa")}
          explore={t.common.explore}
          dark
        />
        <Promo kicker={h.promo2.kicker} title={h.promo2.title} text={h.promo2.text} href={to("/products?tag=Gift")} explore={t.common.explore} />
      </section>

      {/* Recently added */}
      <section className="container-page py-10">
        <SectionHeader eyebrow={h.newEyebrow} title={h.recent} href={to("/products?sort=newest")} linkLabel={t.common.seeAll} />
        <ProductGrid products={recentProducts(4)} lang={lang} />
      </section>

      {/* Verified */}
      <section className="container-page py-6">
        <div className="card grid gap-8 p-6 md:p-8 lg:grid-cols-[1fr_1.3fr] lg:items-center">
          <div>
            <p className="eyebrow">{h.trustEyebrow}</p>
            <h2 className="mt-1 text-2xl font-bold md:text-3xl">{h.trustTitle}</h2>
            <p className="mt-3 text-ink-2">
              {h.trustText1} <BadgeCheck className="inline h-4 w-4 text-ok" aria-label={t.verification.verifiedShort} /> {h.trustText2}
            </p>
            <Link href={to("/about#verification")} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-ink hover:text-red-600">
              {h.trustLink} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {verifiedManufacturers().slice(0, 6).map((raw) => ({ raw, m: locMaker(raw, lang) })).map(({ raw, m }) => (
              <li key={m.slug}>
                <Link href={to(`/manufacturers/${m.slug}`)} className="flex items-center gap-2.5 rounded-xl border border-line p-2.5 hover:border-red-200">
                  <ManufacturerLogo m={raw} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{m.name}</span>
                    <span className="block text-xs text-muted">{m.city}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Sell */}
      <section className="container-page pt-10">
        <div className="relative overflow-hidden rounded-2xl bg-red-600 px-6 py-10 text-white md:px-12">
          <svg className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 opacity-15" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="13" y="0" width="6" height="32" fill="white" />
            <rect x="0" y="13" width="32" height="6" fill="white" />
          </svg>
          <p className="text-sm font-bold uppercase tracking-widest text-white/80">{h.sellEyebrow}</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-extrabold text-white md:text-4xl">{h.sellTitle}</h2>
          <p className="mt-3 max-w-2xl text-white/90">
            {h.sellText}
          </p>
          <Link href={to("/about#sell")} className="btn mt-6 bg-white px-6 py-3 text-red-700 hover:bg-paper">{h.sellCta}</Link>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-ink">{value}</dd>
      <dd className="text-xs text-muted">{label}</dd>
    </div>
  );
}

function ModeCard(props: { tone: "light" | "dark"; icon: React.ReactNode; kicker: string; title: string; points: string[]; href: string; cta: string }) {
  const dark = props.tone === "dark";
  return (
    <Link
      href={props.href}
      className={`group flex flex-col rounded-2xl p-5 transition-shadow hover:shadow-[var(--shadow-lift)] ${
        dark ? "bg-ink text-white" : "card"
      }`}
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${dark ? "bg-red-600 text-white" : "bg-red-50 text-red-600"}`}>{props.icon}</span>
      <p className={`mt-4 text-xs font-bold uppercase tracking-wider ${dark ? "text-white/60" : "text-muted"}`}>{props.kicker}</p>
      <h2 className={`mt-1 text-2xl font-extrabold ${dark ? "text-white" : ""}`}>{props.title}</h2>
      <ul className={`mt-3 space-y-1.5 text-sm ${dark ? "text-white/80" : "text-ink-2"}`}>
        {props.points.map((p) => (
          <li key={p} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" aria-hidden="true" />
            {p}
          </li>
        ))}
      </ul>
      <span className={`mt-5 inline-flex items-center gap-1 text-sm font-semibold ${dark ? "text-white" : "text-ink"} group-hover:text-red-600`}>
        {props.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

function Promo({ kicker, title, text, href, explore, dark = false }: { kicker: string; title: string; text: string; href: string; explore: string; dark?: boolean }) {
  return (
    <Link
      href={href}
      className={`group flex min-h-44 flex-col justify-between rounded-2xl p-6 transition-shadow hover:shadow-[var(--shadow-lift)] ${
        dark ? "bg-[#2a1216] text-white" : "border border-red-100 bg-red-50"
      }`}
    >
      <div>
        <p className={`text-xs font-bold uppercase tracking-wider ${dark ? "text-red-200" : "text-red-700"}`}>{kicker}</p>
        <h3 className={`mt-2 text-xl font-extrabold md:text-2xl ${dark ? "text-white" : ""}`}>{title}</h3>
        <p className={`mt-1 text-sm ${dark ? "text-white/75" : "text-ink-2"}`}>{text}</p>
      </div>
      <span className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${dark ? "text-white" : "text-ink"}`}>
        {explore} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

function ProductGrid({ products, lang }: { products: ReturnType<typeof featuredProducts>; lang: Lang }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      {products.map((p) => (
        <li key={p.slug}><ProductCard product={p} lang={lang} /></li>
      ))}
    </ul>
  );
}
