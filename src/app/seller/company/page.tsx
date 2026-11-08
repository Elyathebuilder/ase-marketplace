import type { Metadata } from "next";
import { CheckCircle2, FileText, ImagePlus, Upload } from "lucide-react";
import { ManufacturerLogo } from "@/components/ManufacturerLogo";
import { PreviewAction } from "@/components/seller/PreviewAction";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { getCategories } from "@/lib/catalog";
import { demoSeller } from "@/lib/seller-demo";

export const metadata: Metadata = { title: "Company profile" };

export default function CompanyPage() {
  const m = demoSeller();
  const cats = getCategories();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">Company profile</h1>
        <p className="mt-1 text-sm text-muted">This is what buyers see on your public page.</p>
      </div>

      <section className="card p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold">Verification</h2>
          <VerifiedBadge status={m.verification} />
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {["Company registration extract", "Proof of production site", "Photos of the workshop"].map((d) => (
            <li key={d} className="flex items-center gap-2 rounded-lg border border-line p-3 text-sm text-ink-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" aria-hidden="true" />{d}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">Approved by ASE. Only administrators can grant or remove the verified badge.</p>
      </section>

      <section className="card p-4 md:p-5">
        <h2 className="mb-4 text-base font-bold">Logo and cover</h2>
        <div className="flex flex-wrap items-center gap-4">
          <ManufacturerLogo m={m} size="lg" />
          <button type="button" className="btn btn-outline text-sm"><Upload className="h-4 w-4" aria-hidden="true" />Upload logo</button>
          <button type="button" className="btn btn-outline text-sm"><ImagePlus className="h-4 w-4" aria-hidden="true" />Upload cover image</button>
        </div>
      </section>

      <section className="card p-4 md:p-5">
        <h2 className="mb-4 text-base font-bold">About the company</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <F id="c-name" label="Company name"><input id="c-name" className="input" defaultValue={m.name} /></F>
          <F id="c-year" label="Year established"><input id="c-year" type="number" className="input" defaultValue={m.yearEstablished} /></F>
          <F id="c-tag" label="Short tagline" wide><input id="c-tag" className="input" defaultValue={m.tagline} /></F>
          <F id="c-desc" label="Description" wide><textarea id="c-desc" rows={4} className="input" defaultValue={m.description} /></F>
          <F id="c-cap" label="Production capabilities (one per line)" wide><textarea id="c-cap" rows={4} className="input" defaultValue={m.capabilities.join("\n")} /></F>
          <F id="c-whs" label="Wholesale terms" wide><input id="c-whs" className="input" defaultValue={m.wholesale} /></F>
        </div>
        <fieldset className="mt-4">
          <legend className="label">Manufacturing categories</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {cats.map((c) => (
              <label key={c.slug} className="flex items-center gap-2 text-sm text-ink-2">
                <input type="checkbox" defaultChecked={m.categories.includes(c.slug)} className="h-4 w-4 accent-red-600" />{c.name}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="card p-4 md:p-5">
        <h2 className="mb-4 text-base font-bold">Location and contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <F id="c-addr" label="Pickup address (for couriers)" wide><input id="c-addr" className="input" defaultValue={`Industrial zone, ${m.city}`} /></F>
          <F id="c-city" label="City"><input id="c-city" className="input" defaultValue={m.city} /></F>
          <F id="c-region" label="Region"><input id="c-region" className="input" defaultValue={m.region} /></F>
          <F id="c-email" label="Email for orders"><input id="c-email" type="email" className="input" defaultValue={m.contact.email} /></F>
          <F id="c-phone" label="Phone for SMS alerts"><input id="c-phone" className="input" defaultValue={m.contact.phone} /></F>
          <F id="c-web" label="Website"><input id="c-web" className="input" defaultValue={m.website} /></F>
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs text-muted">
          <FileText className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          The pickup address is only shared with ASE couriers, never with buyers.
        </p>
      </section>

      <div className="flex justify-end">
        <PreviewAction label="Save profile" done="changes would be published to your public page" />
      </div>
    </div>
  );
}

function F({ id, label, children, wide = false }: { id: string; label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className="label">{label}</label>
      {children}
    </div>
  );
}
