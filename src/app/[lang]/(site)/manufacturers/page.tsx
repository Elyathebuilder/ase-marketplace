import type { Metadata } from "next";
import Link from "next/link";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ManufacturerCard } from "@/components/ManufacturerCard";
import { getCategories, getManufacturers } from "@/lib/catalog";
import { getDict, href, isLang, locCategory, makerSearchText, place } from "@/i18n";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").nav.manufacturers };
}

type SP = Record<string, string | string[] | undefined>;
const one = (v: SP[string]) => (Array.isArray(v) ? v[0] : v) || "";

export default async function ManufacturersPage({ params, searchParams }: { params: Params; searchParams: Promise<SP> }) {
  const { lang, t } = await pageLang(params);
  const k = t.makers;
  const action = href(lang, "/manufacturers");
  const sp = await searchParams;
  const q = one(sp.q).toLowerCase();
  const category = one(sp.category);
  const region = one(sp.region);
  const verified = one(sp.verified) === "1";

  const all = getManufacturers();
  const regions = [...new Set(all.map((m) => m.region))].sort();
  const list = all
    .filter((m) => !q || makerSearchText(m).toLowerCase().includes(q))
    .filter((m) => !category || m.categories.includes(category))
    .filter((m) => !region || m.region === region)
    .filter((m) => !verified || m.verification === "verified")
    .sort((a, b) => Number(b.verification === "verified") - Number(a.verification === "verified") || a.name.localeCompare(b.name));

  return (
    <div className="container-page py-6 md:py-8">
      <Breadcrumbs label={t.common.breadcrumb} items={[{ label: t.common.home, href: href(lang, "/") }, { label: t.nav.manufacturers }]} />
      <h1 className="mt-2 text-2xl font-extrabold md:text-3xl">{k.title}</h1>
      <p className="mt-2 max-w-2xl text-ink-2">
        {k.intro}
      </p>

      <AutoSubmitForm action={action} className="card mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto_auto] lg:items-end">
        <div>
          <label htmlFor="m-q" className="label">{k.search}</label>
          <input id="m-q" name="q" defaultValue={one(sp.q)} placeholder={k.searchPlaceholder} className="input" />
        </div>
        <div>
          <label htmlFor="m-category" className="label">{k.category}</label>
          <select id="m-category" name="category" defaultValue={category} className="input">
            <option value="">{k.all}</option>
            {getCategories().map((c) => locCategory(c, lang)).map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="m-region" className="label">{k.region}</label>
          <select id="m-region" name="region" defaultValue={region} className="input">
            <option value="">{k.allGeorgia}</option>
            {regions.map((r) => (
              <option key={r} value={r}>{place(r, lang)}</option>
            ))}
          </select>
        </div>
        <label className="flex cursor-pointer items-center gap-2 py-2 text-sm font-medium text-ink">
          <input type="checkbox" name="verified" value="1" defaultChecked={verified} className="h-4 w-4 accent-red-600" />
          {k.verifiedOnly}
        </label>
        <button type="submit" className="btn btn-dark">{t.search.button}</button>
      </AutoSubmitForm>

      <p className="mt-6 mb-3 text-sm text-muted">{k.count(list.length)}</p>
      {list.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((m) => (
            <li key={m.slug}><ManufacturerCard m={m} lang={lang} /></li>
          ))}
        </ul>
      ) : (
        <div className="card px-6 py-14 text-center">
          <h2 className="text-lg font-bold">{k.none}</h2>
          <Link href={action} className="btn btn-outline mt-4 text-sm">{t.common.clearFilters}</Link>
        </div>
      )}
    </div>
  );
}
