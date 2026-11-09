import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Field, Select, TextArea } from "@/components/forms/Field";
import { Submit } from "@/components/forms/Submit";
import { FormNotice } from "@/components/market/ui";
import { ACCEPT_IMAGES, SellerButton, SellerForm, StatusChip } from "@/components/seller/kit";
import { CATEGORIES } from "@/lib/categories";
import { categoryName, getDict, href, isLang } from "@/i18n";
import { isApproved, type ProductRow } from "@/lib/market/catalog-store";
import { MAX_IMAGES, UNITS, myProduct, publishProblems } from "@/lib/market/products";
import { sellerSession } from "@/lib/market/seller-page";
import { market } from "@/lib/market/server";
import { getSettings } from "@/lib/market/settings";
import { MarketError } from "@/lib/market/types";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string; slug: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").sell.products.editTitle };
}

const TONE: Record<string, string> = { draft: "draft", pending_review: "pending_review", published: "approved_company", rejected: "rejected", archived: "not_requested" };
const json = <T,>(v: string | null | undefined, fallback: T): T => {
  try {
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const lari = (t: number | null | undefined) => (t == null ? "" : String(t / 100));

/** Add or edit one product: a real form saved on the server, with photos, prices and wholesale tiers. */
export default async function EditProductPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const session = await sellerSession();
  if (!session) return null;
  const { slug } = await params;
  const sp = await searchParams;
  const s = t.sell.products;
  const ctx = market();
  let data: ReturnType<typeof myProduct> | null = null;
  if (slug !== "new") {
    try {
      data = myProduct(ctx, session.actor, slug);
    } catch (e) {
      if (e instanceof MarketError) notFound();
      throw e;
    }
  }
  const p: Partial<ProductRow> = data?.row ?? { buy_now: 1, request_quote: 1, available: 1, moq: 1, unit: "piece", wholesale_quote_only: 0 };
  const self = href(lang, `/seller/products/${slug}`);
  const approved = isApproved(session.store.account_status);
  const archived = p.status === "archived";
  const problems = data ? publishProblems(ctx, data.row) : [];
  const tiers = [...(data?.tiers ?? []).map((x) => ({ min: String(x.min_qty), price: lari(x.unit_price_tetri) })), ...Array.from({ length: 5 }, () => ({ min: "", price: "" }))].slice(0, Math.max(5, (data?.tiers.length ?? 0) + 2));
  const specs = Object.entries(json<Record<string, string>>(p.specs, {})).map(([k, v]) => `${k}: ${v}`).join("\n");
  const variants = json<{ name: string; options: string[] }[]>(p.variants, []).map((v) => `${v.name}: ${v.options.join(", ")}`).join("\n");
  const list = (v: string | null | undefined) => json<string[]>(v, []);
  const canPublish = data && approved && ["draft", "rejected"].includes(p.status ?? "");

  const check = (name: string, label: string, on: boolean | number | undefined, hint?: string) => (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" name={name} value="1" defaultChecked={!!on} className="mt-1" disabled={archived} />
      <span>
        {label}
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );

  return (
    <div className="space-y-5">
      <Link href={href(lang, "/seller/products")} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-2 hover:text-red-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {s.backToList}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">{data ? p.name : s.newTitle}</h1>
        {p.status && <StatusChip status={TONE[p.status]} label={s.status[p.status]} />}
        {p.status === "published" && (
          <Link href={href(lang, `/products/${slug}`)} className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-ink-2 hover:text-red-600">
            {s.viewInShop} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
      <FormNotice lang={lang} sp={sp} />
      {!approved && <p className="rounded-lg bg-warn-50 px-3 py-2 text-sm text-warn">{s.notApproved}</p>}
      {approved && getSettings(ctx).productModeration && <p className="text-sm text-muted">{s.moderationNote}</p>}
      {p.status === "rejected" && p.moderation_note && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{s.rejectedReason}: {p.moderation_note}</p>}

      {data && (
        <section className="card space-y-3 p-4 md:p-5">
          <h2 className="text-base font-bold">{s.photos}</h2>
          <p className="text-xs text-muted">{s.photosHint}</p>
          {data.images.length > 0 && (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {data.images.map((img, i) => (
                <li key={img.id} className="overflow-hidden rounded-lg border border-line bg-surface text-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploads are served by our own permission-checked route */}
                  <img src={`/api/files/${img.file}`} alt="" className="h-28 w-full object-cover" />
                  <div className="flex flex-wrap items-center gap-2 px-2 py-1.5">
                    {i === 0 ? (
                      <span className="font-semibold text-ok">{s.main}</span>
                    ) : (
                      <SellerForm op="productImageMain" back={self} lang={lang} values={{ slug, id: img.id }}>
                        <button type="submit" className="font-semibold text-ink hover:underline">{s.makeMain}</button>
                      </SellerForm>
                    )}
                    <SellerForm op="productImageRemove" back={self} lang={lang} values={{ slug, id: img.id }} className="ml-auto">
                      <button type="submit" className="text-red-700 hover:underline">{t.sell.app.remove}</button>
                    </SellerForm>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {data.images.length < MAX_IMAGES && !archived && (
            <SellerForm op="productImage" back={self} lang={lang} values={{ slug }} className="flex flex-wrap items-center gap-2">
              <label htmlFor="pi-up" className="sr-only">{s.photos}</label>
              <input id="pi-up" type="file" name="images" accept={ACCEPT_IMAGES} multiple required className="max-w-full text-sm file:mr-2 file:rounded-md file:border-0 file:bg-paper-2 file:px-3 file:py-1.5 file:text-sm file:font-semibold" />
              <Submit className="btn btn-dark px-3 py-1.5 text-sm">{t.sell.app.upload}</Submit>
            </SellerForm>
          )}
        </section>
      )}

      <SellerForm op="productSave" back={self} lang={lang} values={{ slug: data ? slug : "" }} className="space-y-5">
        <fieldset disabled={archived} className="space-y-5">
          <section className="card space-y-4 p-4 md:p-5">
            <h2 className="text-base font-bold">{s.basics}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="pe-name" name="name" label={s.name} defaultValue={p.name ?? ""} required maxLength={160} />
              <Field id="pe-name-ka" name="nameKa" label={s.nameKa} defaultValue={p.name_ka ?? ""} maxLength={160} lang="ka" />
            </div>
            <Select id="pe-cat" name="category" label={s.category} defaultValue={p.category ?? ""} required className="max-w-md">
              <option value="">—</option>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>{categoryName(c.slug, c.name, lang)}</option>
              ))}
            </Select>
            <div className="grid gap-4 md:grid-cols-2">
              <TextArea id="pe-desc" name="description" label={s.description} hint={s.descriptionHint} defaultValue={p.description ?? ""} maxLength={4000} rows={5} />
              <TextArea id="pe-desc-ka" name="descriptionKa" label={s.descriptionKa} defaultValue={p.description_ka ?? ""} maxLength={4000} rows={5} lang="ka" />
            </div>
            <TextArea id="pe-hl" name="highlights" label={s.highlights} hint={s.highlightsHint} defaultValue={list(p.highlights).join("\n")} rows={3} />
            {!data && (
              <div>
                <label className="label" htmlFor="pe-images">{s.photos}</label>
                <input id="pe-images" type="file" name="images" accept={ACCEPT_IMAGES} multiple className="max-w-full text-sm file:mr-2 file:rounded-md file:border-0 file:bg-paper-2 file:px-3 file:py-1.5 file:text-sm file:font-semibold" />
                <p className="mt-1 text-xs text-muted">{s.photosHint}</p>
              </div>
            )}
          </section>

          <section className="card space-y-4 p-4 md:p-5">
            <h2 className="text-base font-bold">{s.pricing}</h2>
            <div className="space-y-2">
              {check("buyNow", s.buyNow, p.buy_now)}
              {check("requestQuote", s.requestQuote, p.request_quote)}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="pe-price" name="retailPrice" label={s.retailPrice} defaultValue={lari(p.retail_price_tetri)} inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" />
              <Select id="pe-unit" name="unit" label={s.unit} defaultValue={p.unit ?? "piece"}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>{s.units[u] ?? u}</option>
                ))}
              </Select>
            </div>
            <fieldset className="space-y-2 rounded-lg border border-line p-3">
              <legend className="px-1 text-sm font-bold">{s.wholesale}</legend>
              <p className="text-xs text-muted">{s.wholesaleIntro}</p>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-muted">
                <span>{s.tierMin}</span>
                <span>{s.tierPrice}</span>
              </div>
              {tiers.map((tier, i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <input name="tierMin" defaultValue={tier.min} inputMode="numeric" pattern="[0-9]*" aria-label={`${s.tierMin} ${i + 1}`} className="input" />
                  <input name="tierPrice" defaultValue={tier.price} inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" aria-label={`${s.tierPrice} ${i + 1}`} className="input" />
                </div>
              ))}
              <Field id="pe-wmin" name="wholesaleMinQty" label={s.wholesaleMinQty} defaultValue={p.wholesale_min_qty ?? ""} inputMode="numeric" pattern="[0-9]*" className="max-w-xs" />
              {check("wholesaleQuoteOnly", s.wholesaleQuoteOnly, p.wholesale_quote_only)}
            </fieldset>
          </section>

          <section className="card space-y-4 p-4 md:p-5">
            <h2 className="text-base font-bold">{s.stockTitle}</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="pe-stock" name="stock" type="number" min={0} label={s.stock} defaultValue={p.stock ?? 0} />
              <Field id="pe-moq" name="moq" type="number" min={1} label={s.moq} defaultValue={p.moq ?? 1} />
              <Field id="pe-days" name="productionDays" type="number" min={0} max={365} label={s.productionDays} defaultValue={p.production_days ?? 0} />
            </div>
            {check("available", s.available, p.available, s.availableHint)}
            {check("customizable", s.customizable, p.customizable)}
            <TextArea id="pe-custom" name="customizationOptions" label={s.customizationOptions} hint={s.customizationHint} defaultValue={list(p.customization_options).join("\n")} rows={2} />
          </section>

          <section className="card space-y-4 p-4 md:p-5">
            <h2 className="text-base font-bold">{s.details}</h2>
            <TextArea id="pe-specs" name="specs" label={s.specs} hint={s.specsHint} defaultValue={specs} rows={4} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="pe-mat" name="materials" label={s.materials} hint={s.materialsHint} defaultValue={list(p.materials).join(", ")} maxLength={500} />
              <Field id="pe-col" name="colors" label={s.colors} hint={s.colorsHint} defaultValue={list(p.colors).join(", ")} maxLength={500} />
            </div>
            <TextArea id="pe-var" name="variants" label={s.variants} hint={s.variantsHint} defaultValue={variants} rows={3} />
            <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <legend className="label col-span-full">{s.shipping}</legend>
              <Field id="pe-l" name="lengthCm" label={s.lengthCm} defaultValue={p.length_cm ?? ""} inputMode="decimal" />
              <Field id="pe-w" name="widthCm" label={s.widthCm} defaultValue={p.width_cm ?? ""} inputMode="decimal" />
              <Field id="pe-h" name="heightCm" label={s.heightCm} defaultValue={p.height_cm ?? ""} inputMode="decimal" />
              <Field id="pe-kg" name="weightKg" label={s.weightKg} defaultValue={p.weight_kg ?? ""} inputMode="decimal" />
            </fieldset>
            {check("fragile", s.fragile, p.fragile)}
          </section>

          {!archived && (
            <div className="flex flex-wrap gap-2">
              <Submit className="btn btn-dark">{s.saveDraft}</Submit>
              {approved && (!p.status || ["draft", "rejected"].includes(p.status)) && (
                <Submit className="btn btn-primary" name="publish" value="1">{s.saveAndPublish}</Submit>
              )}
            </div>
          )}
        </fieldset>
      </SellerForm>

      {data && (
        <section className="card space-y-3 p-4 md:p-5">
          {canPublish && problems.length > 0 && (
            <p className="text-sm text-warn">{s.publishBlocked} {problems.map((x) => s.problems[x] ?? x).join(", ")}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {canPublish && problems.length === 0 && <SellerButton op="productPublish" back={self} lang={lang} values={{ slug }} label={s.publish} tone="primary" />}
            {(p.status === "published" || p.status === "pending_review") && <SellerButton op="productStatus" back={self} lang={lang} values={{ slug, action: "unpublish" }} label={s.unpublish} tone="ghost" />}
            {!archived && <SellerButton op="productStatus" back={self} lang={lang} values={{ slug, action: "archive" }} label={s.archive} tone="ghost" />}
            {archived && <SellerButton op="productStatus" back={self} lang={lang} values={{ slug, action: "restore" }} label={s.restore} tone="ghost" />}
            {data.ordered === 0 && p.status !== "published" && <SellerButton op="productStatus" back={self} lang={lang} values={{ slug, action: "delete" }} label={s.delete} tone="danger" />}
          </div>
          <p className="text-xs text-muted">{s.deleteHint}</p>
        </section>
      )}
    </div>
  );
}
