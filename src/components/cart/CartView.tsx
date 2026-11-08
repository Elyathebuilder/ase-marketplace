"use client";

import Link from "next/link";
import { useState } from "react";
import { Info, MapPin, Minus, Plus, ShoppingCart, Trash2, Truck } from "lucide-react";
import { href, locMaker, locProduct, place } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { removeFromCart, setQty, useCart } from "@/lib/cart";
import { quoteCartDelivery } from "@/lib/cart-delivery";
import { getManufacturer } from "@/lib/catalog";
import { formatGel } from "@/lib/format";
import { PLACES } from "@/lib/places";
import { ProductImage } from "../ProductImage";

/**
 * The cart. Products are grouped by manufacturer because each one ships separately
 * from its own city. Each group shows its own delivery estimate; the summary adds them up.
 * How a delivery price is built is internal and never shown here.
 */
export function CartView() {
  const { lang, t } = useI18n();
  const c = t.cart;
  const lines = useCart();
  const [to, setTo] = useState("Tbilisi");
  const quote = quoteCartDelivery(lines, to);

  if (quote.groups.length === 0)
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center" data-island="cart">
        <ShoppingCart className="h-10 w-10 text-subtle" aria-hidden="true" />
        <h2 className="text-lg font-bold">{c.empty}</h2>
        <p className="max-w-md text-sm text-muted">{c.emptyText}</p>
        <Link href={href(lang, "/products?mode=retail")} className="btn btn-primary mt-2">{c.browse}</Link>
      </div>
    );

  const shipmentFor = (maker: string) => quote.delivery.shipments.find((s) => s.originId === maker);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]" data-island="cart">
      <div className="space-y-4">
        {quote.groups.map((g) => {
          const m = locMaker(getManufacturer(g.manufacturer)!, lang);
          const s = shipmentFor(g.manufacturer);
          return (
            <section key={g.manufacturer} className="card overflow-hidden" data-shipment={g.manufacturer}>
              <h2 className="flex items-center gap-2 border-b border-line bg-paper-2/60 px-4 py-2.5 text-sm font-semibold text-ink">
                <MapPin className="h-4 w-4 text-red-600" aria-hidden="true" />
                {c.shipmentFrom(m.name, m.city)}
              </h2>
              <ul className="divide-y divide-line">
                {g.lines.map(({ product: raw, qty, lineTotal }) => {
                  const p = locProduct(raw, lang);
                  return (
                    <li key={p.slug} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <ProductImage product={p} size="sm" className="h-14 w-14 shrink-0 rounded-lg" sampleLabel={t.common.sampleImage} />
                      <div className="min-w-0 flex-1">
                        <Link href={href(lang, `/products/${p.slug}`)} className="font-semibold text-ink hover:text-red-600 hover:underline">{p.name}</Link>
                        <p className="text-xs text-muted">{formatGel(raw.retailPrice!)} {t.common.perUnit(p.unit)}</p>
                      </div>
                      <div className="inline-flex items-center rounded-full border border-line-strong bg-surface" role="group" aria-label={c.qty}>
                        <button type="button" aria-label={t.purchase.decrease} className="p-2 text-ink disabled:opacity-40" disabled={qty <= 1} onClick={() => setQty(p.slug, qty - 1)}>
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">{qty}</span>
                        <button type="button" aria-label={t.purchase.increase} className="p-2 text-ink" onClick={() => setQty(p.slug, qty + 1)}>
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="w-24 text-right font-semibold tabular-nums text-ink">{formatGel(lineTotal)}</span>
                      <button type="button" className="btn btn-ghost p-2 text-muted hover:text-red-700" aria-label={`${c.remove}: ${p.name}`} onClick={() => removeFromCart(p.slug)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-sm">
                <span className="inline-flex items-center gap-2 text-ink-2">
                  <Truck className="h-4 w-4 text-muted" aria-hidden="true" /> {c.shipmentDelivery}
                </span>
                {s?.status === "quoted" ? (
                  <span className="font-semibold tabular-nums text-ink" data-shipment-price>{formatGel(s.price.total)}</span>
                ) : (
                  <span className="text-right text-warn">{s ? t.manual[s.reason] : c.toConfirm}</span>
                )}
              </p>
            </section>
          );
        })}
        <p className="flex gap-2 text-xs text-muted">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {c.separateNote}
        </p>
      </div>

      <aside className="card h-fit p-4 lg:sticky lg:top-32">
        <h2 className="text-base font-bold">{c.summary}</h2>
        <label htmlFor="cart-to" className="label mt-4">{c.deliverTo}</label>
        <select id="cart-to" value={to} onChange={(e) => setTo(e.target.value)} className="input">
          {Object.keys(PLACES).map((p) => (
            <option key={p} value={p}>{place(p, lang)}</option>
          ))}
        </select>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3 text-ink-2">
            <dt>{c.goods}</dt>
            <dd className="tabular-nums">{formatGel(quote.goods)}</dd>
          </div>
          <div className="flex justify-between gap-3 text-ink-2">
            <dt>
              {c.delivery}
              <span className="block text-xs text-muted">{c.deliveryPerShipment(quote.groups.length)}</span>
            </dt>
            <dd className="tabular-nums" data-delivery-total>
              {formatGel(quote.delivery.quotedTotal)}
              {quote.delivery.requiresManualQuote && <span className="block text-xs text-warn">+ {c.toConfirm}</span>}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-line pt-2 text-base font-bold text-ink">
            <dt>{c.total}</dt>
            <dd className="tabular-nums" data-cart-total>{formatGel(quote.total)}</dd>
          </div>
        </dl>
        <button type="button" className="btn btn-primary mt-4 w-full py-3" disabled aria-describedby="checkout-note">
          {c.checkout}
        </button>
        <p id="checkout-note" className="mt-2 text-xs text-muted">{c.checkoutNote}</p>
      </aside>
    </div>
  );
}
