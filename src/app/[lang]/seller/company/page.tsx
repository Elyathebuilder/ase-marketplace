import type { Metadata } from "next";
import { CheckCircle2, FileText, ImagePlus, Upload } from "lucide-react";
import { ManufacturerLogo } from "@/components/ManufacturerLogo";
import { PreviewAction } from "@/components/seller/PreviewAction";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { getCategories } from "@/lib/catalog";
import { demoSeller } from "@/lib/seller-demo";
import { getDict, isLang, locCategory, locMaker } from "@/i18n";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").seller.company.title };
}

export default async function CompanyPage({ params }: { params: Params }) {
  const { lang, t } = await pageLang(params);
  const c = t.seller.company;
  const raw = demoSeller();
  const m = locMaker(raw, lang);
  const cats = getCategories().map((x) => locCategory(x, lang));
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">{c.title}</h1>
        <p className="mt-1 text-sm text-muted">{c.intro}</p>
      </div>

      <section className="card p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold">{c.verification}</h2>
          <VerifiedBadge status={m.verification} lang={lang} />
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {c.docs.map((d) => (
            <li key={d} className="flex items-center gap-2 rounded-lg border border-line p-3 text-sm text-ink-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" aria-hidden="true" />{d}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">{c.approved}</p>
      </section>

      <section className="card p-4 md:p-5">
        <h2 className="mb-4 text-base font-bold">{c.logoCover}</h2>
        <div className="flex flex-wrap items-center gap-4">
          <ManufacturerLogo m={raw} size="lg" />
          <button type="button" className="btn btn-outline text-sm"><Upload className="h-4 w-4" aria-hidden="true" />{c.uploadLogo}</button>
          <button type="button" className="btn btn-outline text-sm"><ImagePlus className="h-4 w-4" aria-hidden="true" />{c.uploadCover}</button>
        </div>
      </section>

      <section className="card p-4 md:p-5">
        <h2 className="mb-4 text-base font-bold">{c.aboutCompany}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <F id="c-name" label={c.name}><input id="c-name" className="input" defaultValue={m.name} /></F>
          <F id="c-year" label={c.year}><input id="c-year" type="number" className="input" defaultValue={m.yearEstablished} /></F>
          <F id="c-tag" label={c.tagline} wide><input id="c-tag" className="input" defaultValue={m.tagline} /></F>
          <F id="c-desc" label={c.description} wide><textarea id="c-desc" rows={4} className="input" defaultValue={m.description} /></F>
          <F id="c-cap" label={c.capabilities} wide><textarea id="c-cap" rows={4} className="input" defaultValue={m.capabilities.join("\n")} /></F>
          <F id="c-whs" label={c.wholesale} wide><input id="c-whs" className="input" defaultValue={m.wholesale} /></F>
        </div>
        <fieldset className="mt-4">
          <legend className="label">{c.categories}</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {cats.map((x) => (
              <label key={x.slug} className="flex items-center gap-2 text-sm text-ink-2">
                <input type="checkbox" defaultChecked={m.categories.includes(x.slug)} className="h-4 w-4 accent-red-600" />{x.name}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="card p-4 md:p-5">
        <h2 className="mb-4 text-base font-bold">{c.location}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <F id="c-addr" label={c.address} wide><input id="c-addr" className="input" defaultValue={c.addressValue(m.city)} /></F>
          <F id="c-city" label={c.city}><input id="c-city" className="input" defaultValue={m.city} /></F>
          <F id="c-region" label={c.region}><input id="c-region" className="input" defaultValue={m.region} /></F>
          <F id="c-email" label={c.email}><input id="c-email" type="email" className="input" defaultValue={m.contact.email} /></F>
          <F id="c-phone" label={c.phone}><input id="c-phone" className="input" defaultValue={m.contact.phone} /></F>
          <F id="c-web" label={c.website}><input id="c-web" className="input" defaultValue={m.website} /></F>
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs text-muted">
          <FileText className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {c.addressNote}
        </p>
      </section>

      <div className="flex justify-end">
        <PreviewAction label={c.save} done={c.saveDone} />
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
