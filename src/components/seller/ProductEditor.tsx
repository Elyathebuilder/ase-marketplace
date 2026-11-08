"use client";

import { useState } from "react";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { DEFAULT_DELIVERY_SETTINGS, quoteShipment } from "@/lib/delivery";
import type { Category, PriceTier, Product } from "@/lib/types";
import { useI18n } from "@/i18n/client";

interface Props {
  product: Product | null;
  categories: Category[];
}

/** Product form for manufacturers. Preview only: "Save" shows what would happen. */
export function ProductEditor({ product, categories }: Props) {
  const { t } = useI18n();
  const e = t.seller.editor;
  const p = product;
  const [buyNow, setBuyNow] = useState(p?.buyNow ?? true);
  const [quote, setQuote] = useState(p?.requestQuote ?? true);
  const [tiers, setTiers] = useState<PriceTier[]>(p?.wholesale?.tiers ?? [{ minQty: 10, unitPrice: 0 }]);
  const [dims, setDims] = useState({ l: p?.lengthCm ?? 0, w: p?.widthCm ?? 0, h: p?.heightCm ?? 0, kg: p?.weightKg ?? 0 });
  const [fragile, setFragile] = useState(p?.fragile ?? false);
  const [special, setSpecial] = useState(p?.specialHandling ?? false);
  const [saved, setSaved] = useState(false);

  const oneUnit = quoteShipment([{ quantity: 1, weightKg: dims.kg, lengthCm: dims.l, widthCm: dims.w, heightCm: dims.h, fragile, specialHandling: special }], 10, DEFAULT_DELIVERY_SETTINGS);

  return (
    <form
      className="space-y-5"
      onSubmit={(ev) => {
        ev.preventDefault();
        setSaved(true);
      }}
    >
      <Section title={e.basics}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pe-name" label={e.name} className="sm:col-span-2"><input id="pe-name" className="input" defaultValue={p?.name} placeholder={e.namePlaceholder} /></Field>
          <Field id="pe-cat" label={e.category}>
            <select id="pe-cat" className="input" defaultValue={p?.category ?? ""}>
              <option value="" disabled>{e.choose}</option>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </Field>
          <Field id="pe-unit" label={e.soldPer}><input id="pe-unit" className="input" defaultValue={p?.unit ?? "piece"} /></Field>
          <Field id="pe-desc" label={e.description} className="sm:col-span-2"><textarea id="pe-desc" rows={4} className="input" defaultValue={p?.description} /></Field>
          <Field id="pe-mat" label={e.materials} className="sm:col-span-2"><input id="pe-mat" className="input" defaultValue={p?.materials.join(", ")} placeholder={e.materialsPlaceholder} /></Field>
        </div>
      </Section>

      <Section title={e.photos}>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          <button type="button" className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line-strong text-xs font-semibold text-muted hover:border-red-600 hover:text-red-600">
            <ImagePlus className="h-6 w-6" aria-hidden="true" /> {e.addPhotos}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">{e.photosNote}</p>
      </Section>

      <Section title={e.howBuy}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle checked={buyNow} onChange={setBuyNow} title={e.buyNowTitle} text={e.buyNowText} />
          <Toggle checked={quote} onChange={setQuote} title={e.quoteTitle} text={e.quoteText} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field id="pe-price" label={e.retailPrice}><input id="pe-price" inputMode="decimal" className="input" defaultValue={p?.retailPrice ?? ""} disabled={!buyNow} /></Field>
          <Field id="pe-stock" label={e.stock}><input id="pe-stock" type="number" min={0} className="input" defaultValue={p?.stock ?? 0} /></Field>
          <Field id="pe-moq" label={e.moq}><input id="pe-moq" type="number" min={1} className="input" defaultValue={p?.moq ?? 1} /></Field>
          <Field id="pe-days" label={e.days}><input id="pe-days" type="number" min={0} className="input" defaultValue={p?.productionDays ?? 7} /></Field>
        </div>

        {quote && (
          <div className="mt-5">
            <p className="label">{e.tiers}</p>
            <ul className="space-y-2">
              {tiers.map((tier, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted">{e.tierFrom}</span>
                  <input aria-label={e.tierMinAria(i + 1)} type="number" min={1} className="input w-24" value={tier.minQty} onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, minQty: Number(e.target.value) } : x)))} />
                  <span className="text-muted">{e.tierUnitsAt}</span>
                  <input aria-label={e.tierPriceAria(i + 1)} inputMode="decimal" className="input w-28" value={tier.unitPrice || ""} onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, unitPrice: Number(e.target.value) } : x)))} />
                  <span className="text-muted">{e.tierEach}</span>
                  <button type="button" aria-label={e.tierRemove(i + 1)} className="btn btn-ghost p-2" onClick={() => setTiers(tiers.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn-ghost mt-2 px-2 text-sm" onClick={() => setTiers([...tiers, { minQty: (tiers.at(-1)?.minQty ?? 0) * 5 || 10, unitPrice: 0 }])}>
              <Plus className="h-4 w-4" aria-hidden="true" /> {e.addTier}
            </button>
          </div>
        )}
      </Section>

      <Section title={e.shipping}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Num id="pe-l" label={e.length} value={dims.l} onChange={(v) => setDims({ ...dims, l: v })} />
          <Num id="pe-w" label={e.width} value={dims.w} onChange={(v) => setDims({ ...dims, w: v })} />
          <Num id="pe-h" label={e.height} value={dims.h} onChange={(v) => setDims({ ...dims, h: v })} />
          <Num id="pe-kg" label={e.weightKg} value={dims.kg} onChange={(v) => setDims({ ...dims, kg: v })} />
        </div>
        <div className="mt-3 flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={fragile} onChange={(e) => setFragile(e.target.checked)} className="h-4 w-4 accent-red-600" />{e.fragile}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={special} onChange={(e) => setSpecial(e.target.checked)} className="h-4 w-4 accent-red-600" />{e.special}</label>
        </div>
        <p className="mt-3 rounded-lg bg-paper-2/70 px-3 py-2 text-xs text-ink-2">
          {oneUnit.status === "quoted" ? e.shippingOk : e.shippingMissing}
        </p>
      </Section>

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-paper/95 px-1 py-3 backdrop-blur">
        {saved && <span role="status" className="mr-auto text-sm text-muted">{e.savedPreview}</span>}
        <button type="button" className="btn btn-outline">{e.saveDraft}</button>
        <button type="submit" className="btn btn-primary">{p ? e.save : e.submit}</button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4 md:p-5">
      <h2 className="mb-4 text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ id, label, children, className = "" }: { id: string; label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      {children}
    </div>
  );
}

function Num({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Field id={id} label={label}>
      <input id={id} type="number" min={0} className="input" value={value || ""} onChange={(e) => onChange(Number(e.target.value))} />
    </Field>
  );
}

function Toggle({ checked, onChange, title, text }: { checked: boolean; onChange: (v: boolean) => void; title: string; text: string }) {
  return (
    <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${checked ? "border-ink bg-surface" : "border-line bg-paper"}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 accent-red-600" />
      <span>
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block text-xs text-muted">{text}</span>
      </span>
    </label>
  );
}
