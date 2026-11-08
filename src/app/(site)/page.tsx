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

export default function HomePage() {
  const categories = getCategories();
  const regions = new Set(getManufacturers().map((m) => m.region)).size;

  return (
    <>
      {/* Hero */}
      <section className="border-b border-line bg-gradient-to-b from-paper-2/60 to-paper">
        <div className="container-page grid gap-8 py-10 md:py-14 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <p className="eyebrow">Georgian manufacturers marketplace</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] md:text-5xl lg:text-[3.5rem]">
              Made in Georgia.
              <br />
              <span className="text-red-600">Direct from the maker.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-2 md:text-lg">
              Buy products straight from the companies that manufacture them, or source wholesale and custom orders for your business. One marketplace for Georgian manufacturing.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/products" className="btn btn-primary px-6 py-3">
                <ShoppingBag className="h-4 w-4" aria-hidden="true" /> Shop products
              </Link>
              <Link href="/b2b" className="btn btn-outline px-6 py-3">
                <Handshake className="h-4 w-4" aria-hidden="true" /> Source wholesale
              </Link>
            </div>
            <dl className="mt-9 grid max-w-lg grid-cols-4 gap-4 border-t border-line pt-5">
              <Stat value={getManufacturers().length} label="Manufacturers" />
              <Stat value={getAllProducts().length} label="Products" />
              <Stat value={categories.length} label="Categories" />
              <Stat value={regions} label="Regions" />
            </dl>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ModeCard
              tone="light"
              icon={<ShoppingBag className="h-5 w-5" />}
              kicker="For customers · B2C"
              title="Buy now"
              points={["Retail prices from the maker", "Add items from many manufacturers", "Delivery price calculated for you", "Track every order"]}
              href="/products?mode=retail"
              cta="Browse retail"
            />
            <ModeCard
              tone="dark"
              icon={<Handshake className="h-5 w-5" />}
              kicker="For businesses · B2B"
              title="Request a quote"
              points={["Wholesale and bulk tier prices", "Custom production and private label", "Talk to the manufacturer", "Accept a quote, then order"]}
              href="/b2b"
              cta="Start sourcing"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-page py-10">
        <SectionHeader title="Shop by category" href="/categories" linkLabel="All categories" />
        <ul className="scroll-row auto-cols-[8.5rem] sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-4 sm:overflow-visible md:grid-cols-5 lg:grid-cols-7">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/categories/${c.slug}`}
                className="card flex h-full flex-col items-center gap-2 px-2 py-4 text-center transition hover:border-red-200 hover:shadow-[var(--shadow-lift)]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <CategoryIcon name={c.icon} className="h-6 w-6" />
                </span>
                <span className="text-[0.8rem] font-semibold leading-tight text-ink">{c.name}</span>
                <span className="text-[0.7rem] text-muted">{countInCategory(c.slug)} items</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Featured products */}
      <section className="container-page py-6">
        <SectionHeader eyebrow="Hand-picked" title="Featured products" href="/products" />
        <ProductGrid products={featuredProducts()} />
      </section>

      {/* B2B band */}
      <section className="my-12 bg-ink text-white">
        <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div>
            <p className="eyebrow text-red-200">B2B sourcing</p>
            <h2 className="mt-2 text-3xl font-extrabold text-white md:text-4xl">Source directly from Georgian factories and workshops.</h2>
            <p className="mt-4 text-white/75">
              Hotels, restaurants, retailers and builders can request wholesale prices, bulk quantities and custom production. You can ask for a quote without committing to buy.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/b2b#rfq" className="btn btn-primary px-6 py-3">Request a quotation</Link>
              <Link href="/products?mode=wholesale" className="btn border-[1.5px] border-white/80 px-6 py-3 text-white hover:bg-white hover:text-ink">
                Wholesale catalog
              </Link>
            </div>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: ClipboardList, title: "1. Describe what you need", text: "Product, quantity, specifications and delivery date." },
              { icon: Factory, title: "2. Manufacturer reviews", text: "The maker checks capacity and asks questions if needed." },
              { icon: FileText, title: "3. Receive a quotation", text: "Unit price, lead time and terms, in writing." },
              { icon: Truck, title: "4. Accept and order", text: "An accepted quote becomes an order with tracked delivery." },
            ].map(({ icon: Icon, title, text }) => (
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
        <SectionHeader eyebrow="Trending" title="Popular right now" href="/products?sort=popular" />
        <ul className="scroll-row auto-cols-[15rem] md:auto-cols-[17rem]">
          {popularProducts(10).map((p) => (
            <li key={p.slug}><ProductCard product={p} /></li>
          ))}
        </ul>
      </section>

      {/* Featured manufacturers */}
      <section className="container-page py-10">
        <SectionHeader eyebrow="Meet the makers" title="Featured Georgian manufacturers" href="/manufacturers" linkLabel="Directory" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featuredManufacturers().slice(0, 4).map((m) => (
            <ManufacturerCard key={m.slug} m={m} />
          ))}
        </div>
      </section>

      {/* Promotions */}
      <section className="container-page grid gap-4 py-4 md:grid-cols-2">
        <Promo
          kicker="For restaurants & hotels"
          title="Equip your venue with Georgian-made goods"
          text="Tableware, furniture, packaging and amenities, with wholesale pricing."
          href="/products?tag=HoReCa"
          dark
        />
        <Promo kicker="Gifts" title="Gifts with a story, made by hand" text="Churchkhela, felt, pottery, natural soaps and more." href="/products?tag=Gift" />
      </section>

      {/* Recently added */}
      <section className="container-page py-10">
        <SectionHeader eyebrow="New on ASE" title="Recently added" href="/products?sort=newest" />
        <ProductGrid products={recentProducts(4)} />
      </section>

      {/* Verified */}
      <section className="container-page py-6">
        <div className="card grid gap-8 p-6 md:p-8 lg:grid-cols-[1fr_1.3fr] lg:items-center">
          <div>
            <p className="eyebrow">Trust</p>
            <h2 className="mt-1 text-2xl font-bold md:text-3xl">Verified manufacturers only make what they sell</h2>
            <p className="mt-3 text-ink-2">
              A <BadgeCheck className="inline h-4 w-4 text-ok" aria-label="verified" /> badge means our team checked the company&apos;s registration and production site in Georgia. Resellers and service-only businesses are not listed as manufacturers.
            </p>
            <Link href="/about#verification" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-ink hover:text-red-600">
              How verification works <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {verifiedManufacturers().slice(0, 6).map((m) => (
              <li key={m.slug}>
                <Link href={`/manufacturers/${m.slug}`} className="flex items-center gap-2.5 rounded-xl border border-line p-2.5 hover:border-red-200">
                  <ManufacturerLogo m={m} size="sm" />
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
          <p className="text-sm font-bold uppercase tracking-widest text-white/80">For manufacturers</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-extrabold text-white md:text-4xl">You manufacture. We sell.</h2>
          <p className="mt-3 max-w-2xl text-white/90">
            Reach customers and businesses across Georgia. We handle the storefront, orders and delivery coordination, so you can focus on production.
          </p>
          <Link href="/about#sell" className="btn mt-6 bg-white px-6 py-3 text-red-700 hover:bg-paper">Become a seller</Link>
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

function Promo({ kicker, title, text, href, dark = false }: { kicker: string; title: string; text: string; href: string; dark?: boolean }) {
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
        Explore <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

function ProductGrid({ products }: { products: ReturnType<typeof featuredProducts> }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      {products.map((p) => (
        <li key={p.slug}><ProductCard product={p} /></li>
      ))}
    </ul>
  );
}
