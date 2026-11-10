import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";
import {
  allTags,
  catalogHref,
  cities,
  filterProducts,
  getCategories,
  getCategory,
  getManufacturer,
  getManufacturers,
  type CatalogFilters,
} from "@/lib/catalog";
import { formatGel } from "@/lib/format";
import { categoryName, getDict, href, locCategory, locMaker, place, tag as tagName, type Lang } from "@/i18n";
import { AutoSubmitForm } from "./AutoSubmitForm";
import { ProductCard } from "./ProductCard";

const SORTS = ["popular", "newest", "price_asc", "price_desc"] as const;

/**
 * Product listing with filters. All state lives in the URL (?category=…&min=…),
 * so a filtered view can be bookmarked or shared and works without JavaScript.
 */
export function Catalog({ filters, lockedCategory, lang }: { filters: CatalogFilters; lockedCategory?: string; lang: Lang }) {
  const t = getDict(lang);
  const c = t.catalog;
  const f = lockedCategory ? { ...filters, category: lockedCategory } : filters;
  const results = filterProducts(f);
  const action = href(lang, lockedCategory ? `/categories/${lockedCategory}` : "/products");
  const hrefFor = (patch: Parameters<typeof catalogHref>[1]) =>
    catalogHref(lockedCategory ? { ...f, category: undefined } : f, patch, action);

  const active: { label: string; href: string }[] = [];
  if (f.q) active.push({ label: `“${f.q}”`, href: hrefFor({ q: undefined }) });
  if (f.category && !lockedCategory) active.push({ label: categoryName(f.category, getCategory(f.category)?.name ?? f.category, lang), href: hrefFor({ category: undefined }) });
  if (f.manufacturer) active.push({ label: (() => { const m = getManufacturer(f.manufacturer!); return m ? locMaker(m, lang).name : f.manufacturer!; })(), href: hrefFor({ manufacturer: undefined }) });
  if (f.min != null) active.push({ label: c.from(formatGel(f.min, lang)), href: hrefFor({ min: undefined }) });
  if (f.max != null) active.push({ label: c.upTo(formatGel(f.max, lang)), href: hrefFor({ max: undefined }) });
  if (f.availability) active.push({ label: f.availability === "made_to_order" ? c.madeToOrder : c.inStock, href: hrefFor({ availability: undefined }) });
  if (f.city) active.push({ label: place(f.city, lang), href: hrefFor({ city: undefined }) });
  if (f.tag) active.push({ label: tagName(f.tag, lang), href: hrefFor({ tag: undefined }) });
  if (f.verified) active.push({ label: c.verifiedChip, href: hrefFor({ verified: undefined }) });
  if (f.mode) active.push({ label: f.mode === "retail" ? c.buyNow : c.wholesaleQuote, href: hrefFor({ mode: undefined }) });

  const filtersForm = (id: string) => (
    <AutoSubmitForm action={action} className="space-y-5">
      {f.q && <input type="hidden" name="q" value={f.q} />}
      {f.sort && f.sort !== "popular" && <input type="hidden" name="sort" value={f.sort} />}

      <fieldset>
        <legend className="label">{c.buyingOption}</legend>
        <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-line-strong text-center text-xs font-semibold">
          {[
            { v: "", l: c.all },
            { v: "retail", l: c.buyNow },
            { v: "wholesale", l: c.wholesale },
          ].map((o) => (
            <label key={o.v} className="cursor-pointer border-r border-line-strong py-2 last:border-r-0 has-[:checked]:bg-ink has-[:checked]:text-white">
              <input type="radio" name="mode" value={o.v} defaultChecked={(f.mode ?? "") === o.v} className="sr-only" />
              {o.l}
            </label>
          ))}
        </div>
      </fieldset>

      {!lockedCategory && (
        <div>
          <label htmlFor={`${id}-f-category`} className="label">{t.search.category}</label>
          <select id={`${id}-f-category`} name="category" defaultValue={f.category ?? ""} className="input">
            <option value="">{t.search.allCategories}</option>
            {getCategories().map((x) => locCategory(x, lang)).map((x) => (
              <option key={x.slug} value={x.slug}>{x.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor={`${id}-f-manufacturer`} className="label">{c.manufacturer}</label>
        <select id={`${id}-f-manufacturer`} name="manufacturer" defaultValue={f.manufacturer ?? ""} className="input">
          <option value="">{c.allManufacturers}</option>
          {getManufacturers().map((m) => locMaker(m, lang)).map((m) => (
            <option key={m.slug} value={m.slug}>{m.name}</option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="label">{c.price}</legend>
        <div className="flex items-center gap-2">
          <input aria-label={c.minAria} type="number" name="min" min={0} inputMode="numeric" placeholder={c.min} defaultValue={f.min ?? ""} className="input" />
          <span className="text-muted">–</span>
          <input aria-label={c.maxAria} type="number" name="max" min={0} inputMode="numeric" placeholder={c.max} defaultValue={f.max ?? ""} className="input" />
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${id}-f-availability`} className="label">{c.availability}</label>
        <select id={`${id}-f-availability`} name="availability" defaultValue={f.availability ?? ""} className="input">
          <option value="">{c.any}</option>
          <option value="in_stock_any">{c.inStock}</option>
          <option value="made_to_order">{c.madeToOrder}</option>
        </select>
      </div>

      <div>
        <label htmlFor={`${id}-f-city`} className="label">{c.location}</label>
        <select id={`${id}-f-city`} name="city" defaultValue={f.city ?? ""} className="input">
          <option value="">{c.allGeorgia}</option>
          {cities().map((x) => (
            <option key={x} value={x}>{place(x, lang)}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${id}-f-tag`} className="label">{c.characteristics}</label>
        <select id={`${id}-f-tag`} name="tag" defaultValue={f.tag ?? ""} className="input">
          <option value="">{c.any}</option>
          {allTags().map((x) => (
            <option key={x} value={x}>{tagName(x, lang)}</option>
          ))}
        </select>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
        <input type="checkbox" name="verified" value="1" defaultChecked={f.verified} className="h-4 w-4 accent-red-600" />
        {c.verifiedOnly}
      </label>

      <button type="submit" className="btn btn-dark w-full">{c.apply}</button>
    </AutoSubmitForm>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-32 card p-4">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> {c.filters}
          </h2>
          {filtersForm("d")}
        </div>
      </aside>

      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {t.common.productsCount(results.length)}
          </p>
          <div className="flex items-center gap-2">
            <details className="relative lg:hidden">
              <summary className="btn btn-outline cursor-pointer list-none px-3.5 py-2 text-sm [&::-webkit-details-marker]:hidden">
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> {c.filters}{active.length ? ` (${active.length})` : ""}
              </summary>
              <div className="card fixed inset-x-4 top-40 z-40 max-h-[70dvh] overflow-y-auto p-4 shadow-[var(--shadow-lift)]">{filtersForm("m")}</div>
            </details>
            <AutoSubmitForm action={action} className="flex items-center gap-2">
              {Object.entries({ ...f, sort: undefined, category: lockedCategory ? undefined : f.category }).map(([k, v]) =>
                v === undefined || v === false || v === "" ? null : <input key={k} type="hidden" name={k} value={v === true ? "1" : String(v)} />,
              )}
              <label htmlFor="sort" className="sr-only">{c.sortBy}</label>
              <select id="sort" name="sort" defaultValue={f.sort ?? "popular"} className="input w-auto py-2 text-sm">
                {SORTS.map((s) => (
                  <option key={s} value={s}>{c.sorts[s]}</option>
                ))}
              </select>
              <noscript>
                <button type="submit" className="btn btn-outline py-2 text-sm">{c.sort}</button>
              </noscript>
            </AutoSubmitForm>
          </div>
        </div>

        {active.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {active.map((a) => (
              <Link key={a.label} href={a.href} className="chip border border-line-strong bg-surface py-1 text-ink hover:border-red-600">
                {a.label} <X className="h-3.5 w-3.5" aria-label={t.common.remove} />
              </Link>
            ))}
            <Link href={action} className="text-xs font-semibold text-red-700 hover:underline">{t.common.clearAll}</Link>
          </div>
        )}

        {results.length ? (
          <ul className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-3">
            {results.map((p) => (
              <li key={p.slug}><ProductCard product={p} lang={lang} /></li>
            ))}
          </ul>
        ) : (
          <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
            <h2 className="text-lg font-bold">{c.emptyTitle}</h2>
            <p className="max-w-md text-sm text-muted">
              {c.emptyText}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href={action} className="btn btn-outline text-sm">{t.common.clearFilters}</Link>
              <Link href={href(lang, "/b2b#rfq")} className="btn btn-primary text-sm">{c.custom}</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
