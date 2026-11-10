"use client";

import { useState } from "react";
import { locMaker, locProduct, place, type Lang } from "@/i18n";
import { useI18n } from "@/i18n/client";
import type { Manufacturer, Product } from "@/lib/types";
import { DEFAULT_DELIVERY_SETTINGS, quoteShipment } from "@/lib/delivery";
import { formatGel, formatNumber, numberFormat } from "@/lib/format";
import { PLACES, approxRoadKm } from "@/lib/places";

const pct = (n: number, lang: Lang) => `${numberFormat(lang, 0, 1).format(Math.round(n * 1000) / 10)}%`;

/** Internal delivery calculator: shows every step the engine takes. Never shown to customers. */
export function DeliveryCalculator({ products, makers }: { products: Product[]; makers: Record<string, Manufacturer> }) {
  const { lang, t } = useI18n();
  const a = t.admin;
  const u = t.common.measure;
  const [slug, setSlug] = useState(products.some((p) => p.slug === "oak-dining-table-180") ? "oak-dining-table-180" : (products[0]?.slug ?? ""));
  const [qty, setQty] = useState(1);
  const [to, setTo] = useState("Batumi");
  const product = products.find((p) => p.slug === slug);
  if (!product) return null;
  const maker = makers[product.manufacturer];
  const distance = approxRoadKm(maker.city, to) ?? 0;
  const vName = (id: string, fallback: string) => a.vehicleNames[id] ?? fallback;

  const q = quoteShipment(
        [{ quantity: Math.max(1, Math.floor(qty) || 1), weightKg: product.weightKg, lengthCm: product.lengthCm, widthCm: product.widthCm, heightCm: product.heightCm, fragile: product.fragile, specialHandling: product.specialHandling }],
        distance,
        DEFAULT_DELIVERY_SETTINGS,
      );

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]" data-island="admin-delivery">
      <section className="card space-y-4 p-4 md:p-5">
        <div>
          <label htmlFor="ad-product" className="label">{a.product}</label>
          <select id="ad-product" className="input" value={slug} onChange={(e) => setSlug(e.target.value)}>
            {products.map((p) => (
              <option key={p.slug} value={p.slug}>{locProduct(p, lang).name}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            {product.lengthCm} × {product.widthCm} × {product.heightCm} {u.cm} · {formatNumber(product.weightKg, lang)} {u.kg}
            {product.fragile ? ` · ${t.product.fragile}` : ""}
            {product.specialHandling ? ` · ${t.product.special}` : ""}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ad-qty" className="label">{a.quantity}</label>
            <input id="ad-qty" type="number" min={1} className="input" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
          </div>
          <div>
            <label htmlFor="ad-to" className="label">{a.destination}</label>
            <select id="ad-to" className="input" value={to} onChange={(e) => setTo(e.target.value)}>
              {Object.keys(PLACES).map((p) => (
                <option key={p} value={p}>{place(p, lang)}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-sm text-ink-2">
          {a.origin}: <strong>{locMaker(maker, lang).city}</strong> ({locMaker(maker, lang).name})
        </p>
      </section>

      <section className="card p-4 md:p-5" aria-live="polite">
        {q.status === "quoted" ? (
          <dl className="space-y-1.5 text-sm">
            <Row k={a.vehicle} v={vName(q.vehicle.id, q.vehicle.name)} strong />
            <Row k={a.distance} v={`${formatNumber(q.distanceKm, lang)} ${u.km}`} />
            <Row k={a.totals} v={`${numberFormat(lang, 1, 1).format(q.totals.totalWeightKg)} ${u.kg} / ${numberFormat(lang, 3, 3).format(q.totals.totalVolumeM3)} ${u.m3}`} />
            <Row k={a.weightUtil} v={pct(q.weightUtilization, lang)} />
            <Row k={a.volumeUtil} v={pct(q.volumeUtilization, lang)} />
            <Row k={a.overallUtil} v={pct(q.overallUtilization, lang)} />
            <div className="my-2 border-t border-line" />
            <Row k={a.baseFee} v={formatGel(q.price.baseFee, lang)} />
            <Row k={`${a.distanceFee} (${formatNumber(q.distanceKm, lang)} ${u.km})`} v={formatGel(q.price.distanceFee, lang)} />
            <Row k={`${a.spaceFee} (${pct(q.overallUtilization, lang)})`} v={formatGel(q.price.spaceFee, lang)} />
            {q.price.minimumTopUp > 0 && <Row k={a.minTopUp} v={formatGel(q.price.minimumTopUp, lang)} />}
            <Row k={a.total} v={formatGel(q.price.total, lang)} strong />
            <p className="pt-2 text-xs text-muted">
              {a.customerSees}: “{t.delivery.estimated}: {formatGel(q.price.total, lang)}”
            </p>
          </dl>
        ) : (
          <p className="text-sm text-warn">
            <strong>{a.manual}.</strong> {t.manual[q.reason]}
          </p>
        )}
      </section>
    </div>
  );
}

function Row({ k, v, strong = false }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-bold text-ink" : "text-ink-2"}`}>
      <dt>{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}
