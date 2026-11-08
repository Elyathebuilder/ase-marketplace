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
import { AutoSubmitForm } from "./AutoSubmitForm";
import { ProductCard } from "./ProductCard";

const SORTS = [
  { value: "popular", label: "Most popular" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

/**
 * Product listing with filters. All state lives in the URL (?category=…&min=…),
 * so a filtered view can be bookmarked or shared and works without JavaScript.
 */
export function Catalog({ filters, lockedCategory }: { filters: CatalogFilters; lockedCategory?: string }) {
  const f = lockedCategory ? { ...filters, category: lockedCategory } : filters;
  const results = filterProducts(f);
  const action = lockedCategory ? `/categories/${lockedCategory}` : "/products";
  const hrefFor = (patch: Parameters<typeof catalogHref>[1]) =>
    catalogHref(lockedCategory ? { ...f, category: undefined } : f, patch, action);

  const active: { label: string; href: string }[] = [];
  if (f.q) active.push({ label: `“${f.q}”`, href: hrefFor({ q: undefined }) });
  if (f.category && !lockedCategory) active.push({ label: getCategory(f.category)?.name ?? f.category, href: hrefFor({ category: undefined }) });
  if (f.manufacturer) active.push({ label: getManufacturer(f.manufacturer)?.name ?? f.manufacturer, href: hrefFor({ manufacturer: undefined }) });
  if (f.min != null) active.push({ label: `From ${formatGel(f.min)}`, href: hrefFor({ min: undefined }) });
  if (f.max != null) active.push({ label: `Up to ${formatGel(f.max)}`, href: hrefFor({ max: undefined }) });
  if (f.availability) active.push({ label: f.availability === "made_to_order" ? "Made to order" : "In stock", href: hrefFor({ availability: undefined }) });
  if (f.city) active.push({ label: f.city, href: hrefFor({ city: undefined }) });
  if (f.tag) active.push({ label: f.tag, href: hrefFor({ tag: undefined }) });
  if (f.verified) active.push({ label: "Verified only", href: hrefFor({ verified: undefined }) });
  if (f.mode) active.push({ label: f.mode === "retail" ? "Buy now" : "Wholesale / quote", href: hrefFor({ mode: undefined }) });

  const filtersForm = (id: string) => (
    <AutoSubmitForm action={action} className="space-y-5">
      {f.q && <input type="hidden" name="q" value={f.q} />}
      {f.sort && f.sort !== "popular" && <input type="hidden" name="sort" value={f.sort} />}

      <fieldset>
        <legend className="label">Buying option</legend>
        <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-line-strong text-center text-xs font-semibold">
          {[
            { v: "", l: "All" },
            { v: "retail", l: "Buy now" },
            { v: "wholesale", l: "Wholesale" },
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
          <label htmlFor={`${id}-f-category`} className="label">Category</label>
          <select id={`${id}-f-category`} name="category" defaultValue={f.category ?? ""} className="input">
            <option value="">All categories</option>
            {getCategories().map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor={`${id}-f-manufacturer`} className="label">Manufacturer</label>
        <select id={`${id}-f-manufacturer`} name="manufacturer" defaultValue={f.manufacturer ?? ""} className="input">
          <option value="">All manufacturers</option>
          {getManufacturers().map((m) => (
            <option key={m.slug} value={m.slug}>{m.name}</option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="label">Price (₾)</legend>
        <div className="flex items-center gap-2">
          <input aria-label="Minimum price" type="number" name="min" min={0} inputMode="numeric" placeholder="Min" defaultValue={f.min ?? ""} className="input" />
          <span className="text-muted">–</span>
          <input aria-label="Maximum price" type="number" name="max" min={0} inputMode="numeric" placeholder="Max" defaultValue={f.max ?? ""} className="input" />
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${id}-f-availability`} className="label">Availability</label>
        <select id={`${id}-f-availability`} name="availability" defaultValue={f.availability ?? ""} className="input">
          <option value="">Any</option>
          <option value="in_stock_any">In stock</option>
          <option value="made_to_order">Made to order</option>
        </select>
      </div>

      <div>
        <label htmlFor={`${id}-f-city`} className="label">Location</label>
        <select id={`${id}-f-city`} name="city" defaultValue={f.city ?? ""} className="input">
          <option value="">All of Georgia</option>
          {cities().map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${id}-f-tag`} className="label">Characteristics</label>
        <select id={`${id}-f-tag`} name="tag" defaultValue={f.tag ?? ""} className="input">
          <option value="">Any</option>
          {allTags().map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
        <input type="checkbox" name="verified" value="1" defaultChecked={f.verified} className="h-4 w-4 accent-red-600" />
        Verified manufacturers only
      </label>

      <button type="submit" className="btn btn-dark w-full">Apply filters</button>
    </AutoSubmitForm>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-32 card p-4">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filters
          </h2>
          {filtersForm("d")}
        </div>
      </aside>

      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            <span className="font-semibold text-ink">{results.length}</span> product{results.length === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            <details className="relative lg:hidden">
              <summary className="btn btn-outline cursor-pointer list-none px-3.5 py-2 text-sm [&::-webkit-details-marker]:hidden">
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filters{active.length ? ` (${active.length})` : ""}
              </summary>
              <div className="card fixed inset-x-4 top-40 z-40 max-h-[70dvh] overflow-y-auto p-4 shadow-[var(--shadow-lift)]">{filtersForm("m")}</div>
            </details>
            <AutoSubmitForm action={action} className="flex items-center gap-2">
              {Object.entries({ ...f, sort: undefined, category: lockedCategory ? undefined : f.category }).map(([k, v]) =>
                v === undefined || v === false || v === "" ? null : <input key={k} type="hidden" name={k} value={v === true ? "1" : String(v)} />,
              )}
              <label htmlFor="sort" className="sr-only">Sort by</label>
              <select id="sort" name="sort" defaultValue={f.sort ?? "popular"} className="input w-auto py-2 text-sm">
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <noscript>
                <button type="submit" className="btn btn-outline py-2 text-sm">Sort</button>
              </noscript>
            </AutoSubmitForm>
          </div>
        </div>

        {active.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {active.map((a) => (
              <Link key={a.label} href={a.href} className="chip border border-line-strong bg-surface py-1 text-ink hover:border-red-600">
                {a.label} <X className="h-3.5 w-3.5" aria-label="remove" />
              </Link>
            ))}
            <Link href={action} className="text-xs font-semibold text-red-700 hover:underline">Clear all</Link>
          </div>
        )}

        {results.length ? (
          <ul className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-3">
            {results.map((p) => (
              <li key={p.slug}><ProductCard product={p} /></li>
            ))}
          </ul>
        ) : (
          <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
            <h2 className="text-lg font-bold">No products match these filters</h2>
            <p className="max-w-md text-sm text-muted">
              Try removing a filter. If you need something specific that isn&apos;t listed, Georgian manufacturers can often make it for you.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href={action} className="btn btn-outline text-sm">Clear filters</Link>
              <Link href="/b2b#rfq" className="btn btn-primary text-sm">Request custom production</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
