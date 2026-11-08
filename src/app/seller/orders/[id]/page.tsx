import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, MapPin, MessageSquare, Truck, Zap } from "lucide-react";
import { OrderWorkflow } from "@/components/seller/OrderWorkflow";
import { ProductImage } from "@/components/ProductImage";
import { getProduct } from "@/lib/catalog";
import { formatGel } from "@/lib/format";
import { DEMO_COMMISSION_RATE, demoOrder, demoOrders, demoSeller, orderTotals } from "@/lib/seller-demo";

export function generateStaticParams() {
  return demoOrders().map((o) => ({ id: o.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: `Order ${(await params).id}` };
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const o = demoOrder((await params).id);
  if (!o) notFound();
  const t = orderTotals(o);
  const m = demoSeller();

  return (
    <div className="space-y-5">
      <Link href="/seller/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-2 hover:text-red-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Orders
      </Link>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h1 className="text-2xl font-extrabold">Order {o.id}</h1>
        <span className="text-sm text-muted">
          Placed {new Date(o.placedAt).toLocaleString("en-GB", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
          {o.type === "quote" && " · from a B2B quotation"}
        </span>
      </div>

      <OrderWorkflow initial={o.status} />

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section className="card overflow-hidden">
          <h2 className="p-4 text-base font-bold md:px-5">Items</h2>
          <ul className="divide-y divide-line border-t border-line">
            {o.items.map((i) => {
              const p = getProduct(i.slug)!;
              return (
                <li key={i.slug} className="flex items-center gap-3 px-4 py-3 md:px-5">
                  <ProductImage product={p} size="sm" className="h-14 w-14 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{p.name}</p>
                    <p className="text-xs text-muted">{i.qty} × {formatGel(i.unitPrice)} · {p.lengthCm}×{p.widthCm}×{p.heightCm} cm, {p.weightKg} kg each</p>
                  </div>
                  <span className="font-semibold tabular-nums text-ink">{formatGel(i.qty * i.unitPrice)}</span>
                </li>
              );
            })}
          </ul>
          <dl className="space-y-1.5 border-t border-line bg-paper/60 px-4 py-3 text-sm md:px-5">
            <Row k="Goods total" v={formatGel(t.goods)} />
            <Row k={`ASE commission (${Math.round(DEMO_COMMISSION_RATE * 100)}%, example rate)`} v={`−${formatGel(t.commission)}`} />
            <Row k="Your payout" v={formatGel(t.payout)} strong />
            <p className="pt-1 text-xs text-muted">Paid to you after delivery. Delivery is paid by the buyer to ASE and isn&apos;t part of your payout.</p>
          </dl>
          {o.note && <p className="border-t border-line px-4 py-3 text-sm text-ink-2 md:px-5"><span className="font-semibold">Note:</span> {o.note}</p>}
        </section>

        <div className="space-y-5">
          <section className="card p-4 md:p-5">
            <h2 className="text-base font-bold">Delivery</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-ink-2">
              <li className="flex gap-2.5">
                {o.delivery.mode === "asap" ? <Zap className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" /> : <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />}
                <span>
                  <span className="block font-semibold text-ink">{o.delivery.mode === "asap" ? "As soon as possible" : "Scheduled by buyer"}</span>
                  {o.delivery.mode === "scheduled" && (
                    <span>{new Date(o.delivery.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}, {o.delivery.window}</span>
                  )}
                </span>
              </li>
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                <span>Pickup from your workshop in {m.city} → buyer in {o.buyer.city}</span>
              </li>
              <li className="flex gap-2.5">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                {t.delivery.status === "quoted" ? (
                  <span>{t.delivery.vehicle.name}, about {t.delivery.distanceKm} km, {Math.round(t.delivery.overallUtilization * 100)}% of the vehicle. Buyer pays {formatGel(t.delivery.price.total)}.</span>
                ) : (
                  <span>{t.delivery.message}</span>
                )}
              </li>
            </ul>
          </section>

          <section className="card p-4 md:p-5">
            <h2 className="text-base font-bold">Buyer</h2>
            <p className="mt-2 font-semibold text-ink">{o.buyer.business ?? o.buyer.name}</p>
            {o.buyer.business && <p className="text-sm text-muted">Contact: {o.buyer.name}</p>}
            <p className="text-sm text-muted">{o.buyer.city}</p>
            <p className="mt-3 text-xs text-muted">Buyer contact details stay with ASE. Questions about this order go through the message thread below.</p>
            <button type="button" className="btn btn-outline mt-3 w-full text-sm" aria-disabled="true">
              <MessageSquare className="h-4 w-4" aria-hidden="true" /> Message about this order
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, strong = false }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "border-t border-line pt-1.5 font-bold text-ink" : "text-ink-2"}`}>
      <dt>{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}
