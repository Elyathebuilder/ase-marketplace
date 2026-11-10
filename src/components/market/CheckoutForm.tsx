"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Info, Landmark, Truck } from "lucide-react";
import { href, locMaker, locProduct, place } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { useCart } from "@/lib/cart";
import { useCartCatalog } from "@/lib/cart-catalog";
import { quoteCartDelivery } from "@/lib/cart-delivery";
import { formatTetri } from "@/lib/money";
import { placeOrderAction } from "@/lib/market/actions";
import { toTetri } from "@/lib/money";
import { PLACES } from "@/lib/places";
import { OrderSummary, TestBanner, type SummaryShipment } from "./journey";

function Submit({ busy }: { busy?: boolean }) {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  return (
    <button type="submit" disabled={pending || busy} className="btn btn-primary mt-4 w-full py-3">
      {pending || busy ? t.market.checkout.placing : t.market.checkout.place}
    </button>
  );
}

export interface CheckoutDetails {
  name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  note: string;
  lines: { slug: string; qty: number; options?: Record<string, string> }[];
}

/** A saved delivery address (from the customer's account). */
export interface SavedAddress {
  id: number;
  label: string | null;
  recipient: string;
  phone: string;
  city: string;
  address: string;
  note: string | null;
  isDefault: boolean;
}

/**
 * Checkout: contact and delivery details, delivery per shipment, and the order summary.
 * The totals here are an estimate for the customer; the server recalculates every price and
 * delivery charge from the catalog when the order is placed. On the static preview site,
 * `onPlace` replaces the server and keeps a TEST order in the browser instead.
 */
export function CheckoutForm({
  defaultName,
  defaultEmail = "",
  defaultCity,
  testMode,
  onPlace,
  addresses = [],
}: {
  defaultName: string;
  defaultEmail?: string;
  defaultCity: string;
  testMode: boolean;
  onPlace?: (d: CheckoutDetails) => void;
  addresses?: SavedAddress[];
}) {
  const { lang, t } = useI18n();
  const c = t.market.checkout;
  const lines = useCart();
  const preset = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [saved, setSaved] = useState<SavedAddress | undefined>(preset);
  const [city, setCity] = useState(preset && PLACES[preset.city] ? preset.city : PLACES[defaultCity] ? defaultCity : "Tbilisi");
  const [busy, setBusy] = useState(false);
  const { lookup, loading } = useCartCatalog(lines.map((l) => l.slug));
  const quote = quoteCartDelivery(lines, city, lookup);
  // Re-key the address fields when a saved address is picked, so they show its values.
  const fill = saved ? `a${saved.id}` : "new";

  if (loading)
    return (
      <div className="card p-8 text-center text-sm text-muted" aria-busy="true">
        {t.common.loading}
      </div>
    );

  if (quote.groups.length === 0)
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-muted">{c.empty}</p>
        <Link href={href(lang, "/cart")} className="btn btn-dark mt-4">{c.goCart}</Link>
      </div>
    );

  const shipments: SummaryShipment[] = quote.groups.map((g) => {
    const m = locMaker(lookup.maker(g.manufacturer)!, lang);
    const s = quote.delivery.shipments.find((x) => x.originId === g.manufacturer);
    return {
      id: g.manufacturer,
      maker: m.name,
      city: m.city,
      items: g.lines.map(({ product, qty, unitPrice, options }) => {
        const chosen = Object.values(options);
        return { key: `${product.slug}|${chosen.join("|")}`, name: locProduct(product, lang).name + (chosen.length ? ` (${chosen.join(", ")})` : ""), qty, line: toTetri(unitPrice) * qty };
      }),
      delivery: s?.status === "quoted" ? toTetri(s.price.total) : 0,
    };
  });
  const goods = shipments.reduce((s, x) => s + x.items.reduce((a, i) => a + i.line, 0), 0);
  const delivery = shipments.reduce((s, x) => s + x.delivery, 0);
  const cartLines = lines.map((l) => ({ slug: l.slug, qty: l.qty, ...(l.options ? { options: l.options } : {}) }));

  const onSubmit = onPlace
    ? (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const get = (k: string) => String(f.get(k) ?? "").trim();
        setBusy(true);
        onPlace({ name: get("name"), phone: get("phone"), email: get("email"), city, address: get("address"), note: get("note"), lines: cartLines });
      }
    : undefined;

  return (
    <form action={onPlace ? undefined : placeOrderAction} onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_22rem]" data-checkout>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="lines" value={JSON.stringify(cartLines)} />
      <div className="min-w-0 space-y-5">
        {testMode && <TestBanner lang={lang} extra={t.market.test.modeNote} />}
        <section className="card space-y-4 p-4 md:p-5">
          <h2 className="text-base font-bold">{c.contact}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="co-name">{c.name}</label>
              <input key={`n-${fill}`} id="co-name" name="name" required maxLength={120} defaultValue={saved?.recipient ?? defaultName} autoComplete="name" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="co-phone">{c.phone}</label>
              <input key={`p-${fill}`} id="co-phone" name="phone" required maxLength={40} type="tel" autoComplete="tel" defaultValue={saved?.phone ?? ""} className="input" placeholder="+995 5__ __ __ __" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="co-email">{c.email}</label>
              <input id="co-email" name="email" required maxLength={200} type="email" autoComplete="email" defaultValue={defaultEmail} className="input" />
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-4 md:p-5">
          <h2 className="flex items-center gap-2 text-base font-bold"><Truck className="h-4 w-4 text-red-600" aria-hidden="true" />{c.delivery}</h2>
          <p className="text-sm text-ink-2">{c.deliveryText}</p>
          {addresses.length > 0 && (
            <div>
              <label className="label" htmlFor="co-saved">{c.savedAddress}</label>
              <select
                id="co-saved"
                className="input"
                value={saved ? String(saved.id) : ""}
                onChange={(e) => {
                  const a = addresses.find((x) => String(x.id) === e.target.value);
                  setSaved(a);
                  if (a && PLACES[a.city]) setCity(a.city);
                }}
              >
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>{[a.label, a.address, place(a.city, lang)].filter(Boolean).join(" · ")}</option>
                ))}
                <option value="">{c.newAddress}</option>
              </select>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
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
              <input key={`a-${fill}`} id="co-address" name="address" required maxLength={300} autoComplete="street-address" defaultValue={saved?.address ?? ""} className="input" />
            </div>
          </div>
          <ul className="divide-y divide-line rounded-lg border border-line text-sm">
            {shipments.map((s) => (
              <li key={s.id} className="flex justify-between gap-3 px-3 py-2">
                <span className="text-ink-2">{t.cart.shipmentFrom(s.maker, s.city)}</span>
                <span className="shrink-0 font-semibold tabular-nums">{s.delivery ? formatTetri(s.delivery, lang) : t.cart.toConfirm}</span>
              </li>
            ))}
          </ul>
          <div>
            <label className="label" htmlFor="co-note">{c.note}</label>
            <textarea key={`o-${fill}`} id="co-note" name="note" maxLength={500} rows={2} defaultValue={saved?.note ?? ""} className="input" />
          </div>
        </section>

        <p className="flex items-start gap-2 rounded-lg bg-paper-2 px-3 py-2 text-sm text-ink-2">
          <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          {c.payNote}
        </p>
      </div>

      <aside className="h-fit lg:sticky lg:top-32">
        <OrderSummary lang={lang} shipments={shipments} goods={goods} delivery={delivery} total={goods + delivery} />
        {quote.delivery.requiresManualQuote ? (
          <p className="mt-4 rounded-lg bg-warn-50 px-3 py-2 text-sm text-warn">{c.manual}</p>
        ) : (
          <Submit busy={busy} />
        )}
        <p className="mt-2 flex gap-1.5 text-xs text-muted">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {onPlace ? t.market.test.previewNote : c.serverCheck}
        </p>
      </aside>
    </form>
  );
}
