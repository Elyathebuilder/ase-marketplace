import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Factory, FileText, Globe, Mail, MapPin, Phone, Users } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ManufacturerLogo } from "@/components/ManufacturerLogo";
import { ProductCard } from "@/components/ProductCard";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { getCategory, getManufacturer, getManufacturers, productsBy } from "@/lib/catalog";

export function generateStaticParams() {
  return getManufacturers().map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const m = getManufacturer((await params).slug);
  return { title: m?.name ?? "Manufacturer", description: m?.tagline };
}

export default async function ManufacturerPage({ params }: { params: Promise<{ slug: string }> }) {
  const m = getManufacturer((await params).slug);
  if (!m) notFound();
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
            <div className="rounded-2xl bg-paper p-1.5"><ManufacturerLogo m={m} size="lg" /></div>
            <div className="pb-1">
              <h1 className="text-2xl font-extrabold md:text-3xl">{m.name}</h1>
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted"><MapPin className="h-4 w-4" aria-hidden="true" />{m.city}, {m.region}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:pb-1">
            <Link href={`/b2b?manufacturer=${m.slug}#rfq`} className="btn btn-primary"><FileText className="h-4 w-4" aria-hidden="true" />Request a quote</Link>
            <a href="#products" className="btn btn-outline">View products ({products.length})</a>
          </div>
        </div>
        <div className="mt-4"><Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Manufacturers", href: "/manufacturers" }, { label: m.name }]} /></div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-8">
            <section>
              <div className="flex flex-wrap items-center gap-2">
                <VerifiedBadge status={m.verification} />
                {m.categories.map((c) => (
                  <Link key={c} href={`/categories/${c}`} className="chip bg-paper-2 text-ink-2 hover:text-red-600">{getCategory(c)?.name}</Link>
                ))}
              </div>
              <p className="mt-4 text-lg font-semibold text-ink">{m.tagline}</p>
              <p className="mt-2 leading-relaxed text-ink-2">{m.description}</p>
            </section>
            <section>
              <h2 className="text-xl font-bold">Production capabilities</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {m.capabilities.map((c) => (
                  <li key={c} className="flex items-start gap-2 rounded-xl border border-line bg-surface p-3 text-sm text-ink-2">
                    <Factory className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />{c}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="text-xl font-bold">Wholesale</h2>
              <p className="mt-2 text-ink-2">{m.wholesale}</p>
            </section>
          </div>

          <aside className="card h-fit p-5">
            <h2 className="text-base font-bold">Company details</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <Row icon={<Calendar className="h-4 w-4" />} label="Established" value={m.yearEstablished ? String(m.yearEstablished) : "—"} />
              <Row icon={<Users className="h-4 w-4" />} label="Employees" value={m.employees} />
              <Row icon={<Mail className="h-4 w-4" />} label="Email" value={m.contact.email} />
              <Row icon={<Phone className="h-4 w-4" />} label="Phone" value={m.contact.phone} />
              {m.website && <Row icon={<Globe className="h-4 w-4" />} label="Website" value={m.website} />}
            </dl>
            {m.social && (
              <p className="mt-4 flex gap-3 text-sm font-semibold text-ink-2">
                {Object.keys(m.social).map((s) => (
                  <span key={s} className="capitalize">{s}</span>
                ))}
              </p>
            )}
            <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
              Demo contact details. On ASE, orders and quotations are handled through the platform so both sides are protected.
            </p>
          </aside>
        </div>

        <section id="products" className="mt-12 scroll-mt-32">
          <h2 className="mb-4 text-xl font-bold">Products by {m.name}</h2>
          {products.length ? (
            <ul className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
              {products.map((p) => (
                <li key={p.slug}><ProductCard product={p} /></li>
              ))}
            </ul>
          ) : (
            <p className="card p-6 text-sm text-muted">No products listed yet.</p>
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
