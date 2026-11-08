"use client";

import Link from "next/link";
import { useState } from "react";
import { FileText, Minus, Plus, ShoppingCart } from "lucide-react";
import { formatGel } from "@/lib/format";
import type { PriceTier } from "@/lib/types";

interface Props {
  slug: string;
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
  const [qty, setQty] = useState(Math.max(1, moq));
  const canBuy = buyNow && retailPrice != null;
  const tier = tierFor(qty, tiers);
  const overStock = stock > 0 && qty > stock;

  return (
    <div className="space-y-3">
      {canBuy && (
        <div className="flex items-center gap-3">
          <span className="label mb-0">Quantity</span>
          <div className="inline-flex items-center rounded-full border border-line-strong bg-surface">
            <button type="button" aria-label="Decrease quantity" className="p-2.5 text-ink disabled:opacity-40" disabled={qty <= Math.max(1, moq)} onClick={() => setQty((q) => q - 1)}>
              <Minus className="h-4 w-4" />
            </button>
            <input
              aria-label="Quantity"
              inputMode="numeric"
              className="w-14 bg-transparent text-center font-semibold text-ink focus:outline-none"
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
            />
            <button type="button" aria-label="Increase quantity" className="p-2.5 text-ink" onClick={() => setQty((q) => q + 1)}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {retailPrice != null && <span className="ml-auto text-sm font-bold text-ink">{formatGel(retailPrice * qty)}</span>}
        </div>
      )}
      {canBuy && tier && requestQuote && (
        <p className="rounded-lg bg-ok-50 px-3 py-2 text-xs text-ok">
          At {qty} {unit}s you qualify for the wholesale price of {formatGel(tier.unitPrice)} / {unit}. Request a quote to get it.
        </p>
      )}
      {overStock && <p className="text-xs text-warn">Only {stock} in stock. The rest will be made to order.</p>}

      <div className="grid gap-2 sm:grid-cols-2">
        {canBuy && (
          <button type="button" className="btn btn-primary py-3" aria-disabled="true" title="Online ordering opens in a later phase">
            <ShoppingCart className="h-4 w-4" aria-hidden="true" /> Add to cart
          </button>
        )}
        {requestQuote && (
          <Link href={`/b2b?product=${slug}&qty=${qty}#rfq`} className={`btn py-3 ${canBuy ? "btn-outline" : "btn-primary sm:col-span-2"}`}>
            <FileText className="h-4 w-4" aria-hidden="true" /> Request a quote
          </Link>
        )}
      </div>
      {canBuy && <p className="text-xs text-muted">Online ordering isn&apos;t open yet in this preview, so the cart is switched off.</p>}
      {!canBuy && <p className="text-xs text-muted">This product is sold through quotations only: price depends on quantity and specifications.</p>}
      {unit && moq > 1 && <p className="text-xs text-muted">Minimum order: {moq} {unit}s.</p>}
    </div>
  );
}
