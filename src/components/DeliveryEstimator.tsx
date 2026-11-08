"use client";

import { useMemo, useState } from "react";
import { Info, Truck } from "lucide-react";
import { DEFAULT_DELIVERY_SETTINGS, quoteShipment } from "@/lib/delivery";
import { formatGel } from "@/lib/format";
import { PLACES, approxRoadKm } from "@/lib/places";

interface Props {
  origin: string;
  item: { weightKg: number; lengthCm: number; widthCm: number; heightCm: number; fragile: boolean; specialHandling: boolean };
  defaultQty: number;
  unit: string;
}

/**
 * Delivery preview on the product page. Uses the same engine the server will use at checkout,
 * with an approximate city-to-city distance. The checkout price is always recalculated on the server.
 */
export function DeliveryEstimator({ origin, item, defaultQty, unit }: Props) {
  const [to, setTo] = useState("Tbilisi");
  const [qty, setQty] = useState(defaultQty);
  const distance = approxRoadKm(origin, to);

  const quote = useMemo(
    () => (distance == null ? null : quoteShipment([{ ...item, quantity: Math.max(1, Math.floor(qty) || 1) }], distance, DEFAULT_DELIVERY_SETTINGS)),
    [distance, item, qty],
  );

  return (
    <div className="rounded-xl border border-line bg-paper-2/50 p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
        <Truck className="h-4 w-4 text-red-600" aria-hidden="true" /> Delivery estimate
      </h3>
      <div className="mt-3 grid grid-cols-[1fr_6rem] gap-2">
        <div>
          <label htmlFor="est-to" className="label text-xs">Deliver to</label>
          <select id="est-to" value={to} onChange={(e) => setTo(e.target.value)} className="input py-1.5 text-sm">
            {Object.keys(PLACES).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="est-qty" className="label text-xs">Quantity</label>
          <input id="est-qty" type="number" min={1} inputMode="numeric" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="input py-1.5 text-sm" />
        </div>
      </div>

      {quote?.status === "quoted" && (
        <div className="mt-3">
          <p className="flex items-baseline justify-between">
            <span className="text-sm text-ink-2">
              From {origin} · ~{quote.distanceKm} km · {quote.vehicle.name.toLowerCase()}
            </span>
            <span className="text-lg font-bold text-ink">{formatGel(quote.price.total)}</span>
          </p>
          <details className="mt-1 text-xs text-muted">
            <summary className="cursor-pointer font-medium text-ink-2">How this is calculated</summary>
            <ul className="mt-2 space-y-1">
              <li className="flex justify-between"><span>Base fee ({quote.vehicle.name})</span><span>{formatGel(quote.price.baseFee)}</span></li>
              <li className="flex justify-between"><span>Distance ({quote.distanceKm} km)</span><span>{formatGel(quote.price.distanceFee)}</span></li>
              <li className="flex justify-between">
                <span>Space used ({Math.round(quote.overallUtilization * 100)}% of vehicle)</span>
                <span>{formatGel(quote.price.spaceFee)}</span>
              </li>
              {quote.price.minimumTopUp > 0 && (
                <li className="flex justify-between"><span>Minimum charge top-up</span><span>{formatGel(quote.price.minimumTopUp)}</span></li>
              )}
              <li className="pt-1">
                {qty} {unit}
                {qty === 1 ? "" : "s"}: {quote.totals.totalWeightKg.toFixed(1)} kg, {quote.totals.totalVolumeM3.toFixed(3)} m³
              </li>
            </ul>
          </details>
        </div>
      )}
      {quote?.status === "manual" && <p className="mt-3 text-sm text-warn">{quote.message}</p>}

      <p className="mt-3 flex gap-1.5 text-[0.7rem] leading-snug text-muted">
        <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Estimate using approximate road distance between cities. The exact price is calculated from your address at checkout.
      </p>
    </div>
  );
}
