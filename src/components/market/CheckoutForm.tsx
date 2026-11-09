"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Info, Landmark, MapPin } from "lucide-react";
import { href, locMaker, locProduct, place } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { useCart } from "@/lib/cart";
import { quoteCartDelivery } from "@/lib/cart-delivery";
import { getManufacturer } from "@/lib/catalog";
import { formatGel } from "@/lib/format";
import { placeOrderAction } from "@/lib/market/actions";
import { PLACES } from "@/lib/places";

function Submit() {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary mt-4 w-full py-3">
      {pending ? t.market.checkout.placing : t.market.checkout.place}
    </button>
  );
}

/**
 * Checkout. The totals shown here are an estimate for the customer; the server recalculates
 * every price and delivery charge from the catalog when the order is placed.
 */
export function CheckoutForm({ defaultName, defaultCity }: { defaultName: string; defaultCity: string }) {
  const { lang, t } = useI18n();
  const c = t.market.checkout;
  const lines = useCart();
  const [city, setCity] = useState(PLACES[defaultCity] ? defaultCity : "Tbilisi");
  const quote = quoteCartDelivery(lines, city);

  if (quote.groups.length === 0)
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-muted">{c.empty}</p>
        <Link href={href(lang, "/cart")} className="btn btn-dark mt-4">{c.goCart}</Link>
      </div>
    );

  return (
    <form action={placeOrderAction} className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="lines" value={JSON.stringify(lines.map((l) => ({ slug: l.slug, qty: l.qty })))} />
      <section className="card space-y-4 p-4 md:p-5">
        <h2 className="text-base font-bold">{c.contact}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="co-name">{c.name}</label>
            <input id="co-name" name="name" required maxLength={120} defaultValue={defaultName} autoComplete="name" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="co-phone">{c.phone}</label>
            <input id="co-phone" name="phone" required maxLength={40} type="tel" autoComplete="tel" className="input" placeholder="+995 5__ __ __ __" />
          </div>
          <div>
            <label className="label" htmlFor="co-city">{c.city}</label>
            <select id="co-city" name="city" value={city} onChange={(e) => setCity(e.target.value)} className="input">
              {Object.keys(PLACES).map((p) => (
                <option key={p} value={p}>{place(p, lang)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="co-address">{c.address}</label>
            <input id="co-address" name="address" required maxLength={300} autoComplete="street-address" className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="co-note">{c.note}</label>
          <textarea id="co-note" name="note" maxLength={500} rows={2} className="input" />
        </div>
        <p className="flex items-start gap-2 rounded-lg bg-paper-2 px-3 py-2 text-sm text-ink-2">
          <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          {c.payNote}
        </p>
      </section>

      <aside className="card h-fit p-4 lg:sticky lg:top-32">
        <h2 className="text-base font-bold">{c.summary}</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {quote.groups.map((g) => {
            const m = locMaker(getManufacturer(g.manufacturer)!, lang);
            const s = quote.delivery.shipments.find((x) => x.originId === g.manufacturer);
            return (
              <li key={g.manufacturer} className="rounded-lg border border-line p-2.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-2">
                  <MapPin className="h-3.5 w-3.5 text-red-600" aria-hidden="true" /> {t.cart.shipmentFrom(m.name, m.city)}
                </p>
                <ul className="mt-1.5 space-y-1">
                  {g.lines.map(({ product, qty, lineTotal }) => (
                    <li key={product.slug} className="flex justify-between gap-2">
                      <span className="text-ink-2">{qty} × {locProduct(product, lang).name}</span>
                      <span className="tabular-nums">{formatGel(lineTotal)}</span>
                    </li>
                  ))}
                  <li className="flex justify-between gap-2 text-muted">
                    <span>{t.cart.shipmentDelivery}</span>
                    <span className="tabular-nums">{s?.status === "quoted" ? formatGel(s.price.total) : t.cart.toConfirm}</span>
                  </li>
                </ul>
              </li>
            );
          })}
        </ul>
        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-ink-2"><dt>{t.cart.goods}</dt><dd className="tabular-nums">{formatGel(quote.goods)}</dd></div>
          <div className="flex justify-between text-ink-2"><dt>{t.cart.delivery}</dt><dd className="tabular-nums">{formatGel(quote.delivery.quotedTotal)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>{t.cart.total}</dt><dd className="tabular-nums">{formatGel(quote.total)}</dd></div>
        </dl>
        {quote.delivery.requiresManualQuote ? (
          <p className="mt-4 rounded-lg bg-warn-50 px-3 py-2 text-sm text-warn">{c.manual}</p>
        ) : (
          <Submit />
        )}
        <p className="mt-2 flex gap-1.5 text-xs text-muted">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {c.serverCheck}
        </p>
      </aside>
    </form>
  );
}
