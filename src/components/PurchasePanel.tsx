"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, FileText, Minus, Plus, ShoppingCart } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { href, units } from "@/i18n";
import { addToCart } from "@/lib/cart";
import { formatGel } from "@/lib/format";
import { COLOUR } from "@/lib/cart-delivery";
import type { PriceTier, ProductVariant } from "@/lib/types";

interface Props {
  slug: string;
  /** Unit name in English (from the catalog); translated here. */
  unit: string;
  retailPrice: number | null;
  buyNow: boolean;
  requestQuote: boolean;
  moq: number;
  stock: number;
  tiers: PriceTier[];
  /** Wholesale prices are agreed by quotation only (not applied in the basket). */
  quoteOnly?: boolean;
  variants?: ProductVariant[];
  colors?: string[];
  /** False when the seller paused sales. */
  available?: boolean;
}

/** Best wholesale tier this quantity reaches, if any. */
function tierFor(qty: number, tiers: PriceTier[]) {
  return [...tiers].sort((a, b) => b.minQty - a.minQty).find((t) => qty >= t.minQty) ?? null;
}

export function PurchasePanel({ slug, unit, retailPrice, buyNow, requestQuote, moq, stock, tiers, quoteOnly = true, variants = [], colors = [], available = true }: Props) {
  const { lang, t } = useI18n();
  const p = t.purchase;
  const [qty, setQty] = useState(Math.max(1, moq));
  const [added, setAdded] = useState(false);
  const choices: ProductVariant[] = [...variants, ...(colors.length ? [{ name: COLOUR, options: colors }] : [])];
  const [options, setOptions] = useState<Record<string, string>>({});
  const canBuy = buyNow && retailPrice != null && available;
  const tier = tierFor(qty, tiers);
  // Same rule as the server (unitPriceFor): a quantity price applies in the basket unless it is quotation-only.
  const applied = !quoteOnly && tier && retailPrice != null && tier.unitPrice < retailPrice ? tier.unitPrice : null;
  const unitPrice = applied ?? retailPrice;
  const overStock = stock > 0 && qty > stock;
  const missingChoice = choices.some((c) => !options[c.name]);

  return (
    <div className="space-y-3" data-island="purchase">
      {canBuy && (
        <div className="flex items-center gap-3">
          <span className="label mb-0">{p.quantity}</span>
          <div className="inline-flex items-center rounded-full border border-line-strong bg-surface">
            <button type="button" aria-label={p.decrease} className="p-2.5 text-ink disabled:opacity-40" disabled={qty <= Math.max(1, moq)} onClick={() => setQty((q) => q - 1)}>
              <Minus className="h-4 w-4" />
            </button>
            <input
              aria-label={p.quantity}
              inputMode="numeric"
              className="w-14 bg-transparent text-center font-semibold text-ink focus:outline-none"
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
            />
            <button type="button" aria-label={p.increase} className="p-2.5 text-ink" onClick={() => setQty((q) => q + 1)}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {unitPrice != null && <span className="ml-auto text-sm font-bold text-ink">{formatGel(unitPrice * qty)}</span>}
        </div>
      )}
      {canBuy && choices.map((c) => (
        <div key={c.name}>
          <label className="label" htmlFor={`opt-${c.name}`}>{c.name === COLOUR ? p.colour : c.name}</label>
          <select id={`opt-${c.name}`} className="input" value={options[c.name] ?? ""} onChange={(e) => { setOptions((o) => ({ ...o, [c.name]: e.target.value })); setAdded(false); }}>
            <option value="">{p.choose}…</option>
            {c.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      ))}
      {canBuy && applied != null && <p className="rounded-lg bg-ok-50 px-3 py-2 text-xs text-ok">{p.tierApplied(unit, formatGel(applied))}</p>}
      {canBuy && quoteOnly && tier && requestQuote && (
        <p className="rounded-lg bg-ok-50 px-3 py-2 text-xs text-ok">{p.tierHint(qty, units(unit, lang, qty), formatGel(tier.unitPrice))}</p>
      )}
      {!quoteOnly && tiers.length > 0 && retailPrice != null && (
        <div className="rounded-lg border border-line px-3 py-2 text-xs">
          <p className="font-semibold text-ink">{p.tiersTitle}</p>
          <ul className="mt-1 space-y-0.5 text-ink-2">
            {[...tiers].sort((a, b) => a.minQty - b.minQty).map((x) => (
              <li key={x.minQty} className="flex justify-between gap-3"><span>{p.tierRow(x.minQty, units(unit, lang, x.minQty))}</span><span className="tabular-nums">{formatGel(x.unitPrice)}</span></li>
            ))}
          </ul>
        </div>
      )}
      {!available && <p className="rounded-lg bg-paper-2 px-3 py-2 text-sm text-ink-2">{p.unavailable}</p>}
      {overStock && <p className="text-xs text-warn">{p.overStock(stock)}</p>}

      <div className="grid gap-2 sm:grid-cols-2">
        {canBuy && (
          <button
            type="button"
            className="btn btn-primary py-3"
            disabled={missingChoice}
            onClick={() => {
              addToCart(slug, qty, options);
              setAdded(true);
            }}
          >
            {added ? <Check className="h-4 w-4" aria-hidden="true" /> : <ShoppingCart className="h-4 w-4" aria-hidden="true" />}
            {added ? p.added : p.addToCart}
          </button>
        )}
        {requestQuote && (
          <Link href={href(lang, `/b2b?product=${slug}&qty=${qty}#rfq`)} className={`btn py-3 ${canBuy ? "btn-outline" : "btn-primary sm:col-span-2"}`}>
            <FileText className="h-4 w-4" aria-hidden="true" /> {p.requestQuote}
          </Link>
        )}
      </div>
      {added && (
        <p className="text-sm" role="status">
          <Link href={href(lang, "/cart")} className="font-semibold text-red-700 underline underline-offset-4">{p.viewCart} →</Link>
        </p>
      )}
      {!canBuy && available && <p className="text-xs text-muted">{p.quoteOnly}</p>}
      {moq > 1 && <p className="text-xs text-muted">{p.minOrder(moq, units(unit, lang, moq))}</p>}
    </div>
  );
}
