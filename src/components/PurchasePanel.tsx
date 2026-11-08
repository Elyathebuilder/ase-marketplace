"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, FileText, Minus, Plus, ShoppingCart } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { href, units } from "@/i18n";
import { addToCart } from "@/lib/cart";
import { formatGel } from "@/lib/format";
import type { PriceTier } from "@/lib/types";

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
}

/** Best wholesale tier this quantity reaches, if any. */
function tierFor(qty: number, tiers: PriceTier[]) {
  return [...tiers].sort((a, b) => b.minQty - a.minQty).find((t) => qty >= t.minQty) ?? null;
}

export function PurchasePanel({ slug, unit, retailPrice, buyNow, requestQuote, moq, stock, tiers }: Props) {
  const { lang, t } = useI18n();
  const p = t.purchase;
  const [qty, setQty] = useState(Math.max(1, moq));
  const [added, setAdded] = useState(false);
  const canBuy = buyNow && retailPrice != null;
  const tier = tierFor(qty, tiers);
  const overStock = stock > 0 && qty > stock;

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
          {retailPrice != null && <span className="ml-auto text-sm font-bold text-ink">{formatGel(retailPrice * qty)}</span>}
        </div>
      )}
      {canBuy && tier && requestQuote && (
        <p className="rounded-lg bg-ok-50 px-3 py-2 text-xs text-ok">{p.tierHint(qty, units(unit, lang, qty), formatGel(tier.unitPrice))}</p>
      )}
      {overStock && <p className="text-xs text-warn">{p.overStock(stock)}</p>}

      <div className="grid gap-2 sm:grid-cols-2">
        {canBuy && (
          <button
            type="button"
            className="btn btn-primary py-3"
            onClick={() => {
              addToCart(slug, qty);
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
      {!canBuy && <p className="text-xs text-muted">{p.quoteOnly}</p>}
      {moq > 1 && <p className="text-xs text-muted">{p.minOrder(moq, units(unit, lang, moq))}</p>}
    </div>
  );
}
