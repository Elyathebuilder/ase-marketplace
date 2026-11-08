"use client";

import { useMemo, useState } from "react";
import { Info, Truck } from "lucide-react";
import { place } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { DEFAULT_DELIVERY_SETTINGS, quoteShipment } from "@/lib/delivery";
import { formatGel } from "@/lib/format";
import { PLACES, approxRoadKm } from "@/lib/places";

interface Props {
  origin: string;
  item: { weightKg: number; lengthCm: number; widthCm: number; heightCm: number; fragile: boolean; specialHandling: boolean };
  defaultQty: number;
}

/**
 * Delivery estimate on the product page. The engine recalculates every time the city or
 * quantity changes, using the distance from the manufacturer's city to the chosen city.
 * Customers only see the final amount: how it is built (vehicle, space, rates) is internal
 * and shown to ASE staff on the admin delivery page. Checkout recalculates on the server.
 */
export function DeliveryEstimator({ origin, item, defaultQty }: Props) {
  const { lang, t } = useI18n();
  const d = t.delivery;
  const [to, setTo] = useState("Tbilisi");
  const [qty, setQty] = useState(defaultQty);
  const distance = approxRoadKm(origin, to);

  const quote = useMemo(
    () => (distance == null ? null : quoteShipment([{ ...item, quantity: Math.max(1, Math.floor(qty) || 1) }], distance, DEFAULT_DELIVERY_SETTINGS)),
    [distance, item, qty],
  );

  return (
    <div className="rounded-xl border border-line bg-paper-2/50 p-4" data-island="delivery">
      <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
        <Truck className="h-4 w-4 text-red-600" aria-hidden="true" /> {d.title}
      </h3>
      <div className="mt-3 grid grid-cols-[1fr_6rem] gap-2">
        <div>
          <label htmlFor="est-to" className="label text-xs">{d.deliverTo}</label>
          <select id="est-to" value={to} onChange={(e) => setTo(e.target.value)} className="input py-1.5 text-sm">
            {Object.keys(PLACES).map((p) => (
              <option key={p} value={p}>{place(p, lang)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="est-qty" className="label text-xs">{d.quantity}</label>
          <input id="est-qty" type="number" min={1} inputMode="numeric" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="input py-1.5 text-sm" />
        </div>
      </div>

      {quote?.status === "quoted" && (
        <div className="mt-3" aria-live="polite">
          <p className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-ink-2">{d.estimated}:</span>
            <span className="text-lg font-bold text-ink" data-delivery-total>{formatGel(quote.price.total)}</span>
          </p>
          <p className="text-xs text-muted">{d.fromTo(place(origin, lang), place(to, lang))}</p>
        </div>
      )}
      {quote?.status === "manual" && (
        <p className="mt-3 text-sm text-warn" aria-live="polite">{t.manual[quote.reason]}</p>
      )}

      <p className="mt-3 flex gap-1.5 text-[0.7rem] leading-snug text-muted">
        <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {d.note}
      </p>
    </div>
  );
}
