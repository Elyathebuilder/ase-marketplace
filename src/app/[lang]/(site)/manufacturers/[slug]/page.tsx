import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Factory, FileText, Globe, Mail, MapPin, Phone, Users } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ManufacturerLogo } from "@/components/ManufacturerLogo";
import { ProductCard } from "@/components/ProductCard";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { getCategory, getManufacturer, getManufacturers, productsBy } from "@/lib/catalog";
import { categoryName, href, isLang, locMaker } from "@/i18n";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string; slug: string }>;

/** Unknown addresses show the site's 404 page. */
export const dynamicParams = false;

export function generateStaticParams() {
  return getManufacturers().map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, slug } = await params;
  const raw = getManufacturer(slug);
  const m = raw ? locMaker(raw, isLang(lang) ? lang : "ka") : undefined;
  return { title: m?.name, description: m?.tagline };
}

export default async function ManufacturerPage({ params }: { params: Params }) {
  const { lang, t } = await pageLang(params);
  const k = t.maker;
  const to = (p: string) => href(lang, p);
  const raw = getManufacturer((await params).slug);
  if (!raw) notFound();
  const m = locMaker(raw, lang);
  const products = productsBy(m.slug);

  return (
    <div>
      {/* Cover */}
      <div className="relative h-40 overflow-hidden bg-ink md:h-56">
        <svg className="absolute inset-0 h-full w-full opacity-[0.08]" aria-hidden="true">
          <defs>
            <pattern id="cover" width="44" height="44" patternUnits="userSpaceOnUse">
              <path d="M22 12v20M12 22h20" stroke="white" strokeWidth="2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cover)" />
        </svg>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-red-600" />
      </div>

      <div className="container-page">
        <div className="-mt-10 flex flex-col gap-4 md:-mt-12 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <div className="rounded-2xl bg-paper p-1.5"><ManufacturerLogo m={raw} size="lg" /></div>
            <div className="pb-1">
              <h1 className="text-2xl font-extrabold md:text-3xl">{m.name}</h1>
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted"><MapPin className="h-4 w-4" aria-hidden="true" />{m.city}, {m.region}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:pb-1">
            <Link href={to(`/b2b?manufacturer=${m.slug}#rfq`)} className="btn btn-primary"><FileText className="h-4 w-4" aria-hidden="true" />{k.requestQuote}</Link>
            <a href="#products" className="btn btn-outline">{k.viewProducts(products.length)}</a>
          </div>
        </div>
        <div className="mt-4"><Breadcrumbs label={t.common.breadcrumb} items={[{ label: t.common.home, href: to("/") }, { label: t.nav.manufacturers, href: to("/manufacturers") }, { label: m.name }]} /></div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-8">
            <section>
              <div className="flex flex-wrap items-center gap-2">
                <VerifiedBadge status={m.verification} lang={lang} />
                {m.categories.map((c) => (
                  <Link key={c} href={to(`/categories/${c}`)} className="chip bg-paper-2 text-ink-2 hover:text-red-600">{categoryName(c, getCategory(c)?.name ?? c, lang)}</Link>
                ))}
              </div>
              <p className="mt-4 text-lg font-semibold text-ink">{m.tagline}</p>
              <p className="mt-2 leading-relaxed text-ink-2">{m.description}</p>
            </section>
            <section>
              <h2 className="text-xl font-bold">{k.capabilities}</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {m.capabilities.map((c) => (
                  <li key={c} className="flex items-start gap-2 rounded-xl border border-line bg-surface p-3 text-sm text-ink-2">
                    <Factory className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />{c}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="text-xl font-bold">{k.wholesale}</h2>
              <p className="mt-2 text-ink-2">{m.wholesale}</p>
            </section>
          </div>

          <aside className="card h-fit p-5">
            <h2 className="text-base font-bold">{k.details}</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <Row icon={<Calendar className="h-4 w-4" />} label={k.established} value={m.yearEstablished ? String(m.yearEstablished) : "—"} />
              <Row icon={<Users className="h-4 w-4" />} label={k.employees} value={m.employees} />
              <Row icon={<Mail className="h-4 w-4" />} label={k.email} value={m.contact.email} />
              <Row icon={<Phone className="h-4 w-4" />} label={k.phone} value={m.contact.phone} />
              {m.website && <Row icon={<Globe className="h-4 w-4" />} label={k.website} value={m.website} />}
            </dl>
            {m.social && (
              <p className="mt-4 flex gap-3 text-sm font-semibold text-ink-2">
                {Object.keys(m.social).map((s) => (
                  <span key={s} className="capitalize">{s}</span>
                ))}
              </p>
            )}
            <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
              {k.contactNote}
            </p>
          </aside>
        </div>

        <section id="products" className="mt-12 scroll-mt-32">
          <h2 className="mb-4 text-xl font-bold">{k.productsBy(m.name)}</h2>
          {products.length ? (
            <ul className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
              {products.map((p) => (
                <li key={p.slug}><ProductCard product={p} lang={lang} /></li>
              ))}
            </ul>
          ) : (
            <p className="card p-6 text-sm text-muted">{k.noProducts}</p>
          )}
        </section>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-muted" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="break-words font-medium text-ink">{value}</dd>
      </div>
    </div>
  );
}
