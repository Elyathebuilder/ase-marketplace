import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, MapPin, MessageSquare, Truck, Zap } from "lucide-react";
import { OrderWorkflow } from "@/components/seller/OrderWorkflow";
import { ProductImage } from "@/components/ProductImage";
import { getProduct } from "@/lib/catalog";
import { formatGel } from "@/lib/format";
import { DEMO_COMMISSION_RATE, demoOrder, demoOrders, demoSeller, orderTotals } from "@/lib/seller-demo";
import { formatDate, getDict, href, isLang, locMaker, locProduct, place } from "@/i18n";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string; id: string }>;

/** Unknown addresses show the site's 404 page. */
export const dynamicParams = false;

export function generateStaticParams() {
  return demoOrders().map((o) => ({ id: o.id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, id } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").seller.order.title(id) };
}

export default async function OrderPage({ params }: { params: Params }) {
  const { lang, t: dict } = await pageLang(params);
  const s = dict.seller.order;
  const o = demoOrder((await params).id);
  if (!o) notFound();
  const t = orderTotals(o);
  const m = locMaker(demoSeller(), lang);

  return (
    <div className="space-y-5">
      <Link href={href(lang, "/seller/orders")} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-2 hover:text-red-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {s.back}
      </Link>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h1 className="text-2xl font-extrabold">{s.title(o.id)}</h1>
        <span className="text-sm text-muted">
          {s.placed(formatDate(o.placedAt, lang, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }))}
          {o.type === "quote" && s.fromQuote}
        </span>
      </div>

      <OrderWorkflow initial={o.status} />

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section className="card overflow-hidden">
          <h2 className="p-4 text-base font-bold md:px-5">{s.items}</h2>
          <ul className="divide-y divide-line border-t border-line">
            {o.items.map((i) => {
              const p = locProduct(getProduct(i.slug)!, lang);
              return (
                <li key={i.slug} className="flex items-center gap-3 px-4 py-3 md:px-5">
                  <ProductImage product={p} size="sm" className="h-14 w-14 shrink-0 rounded-lg" sampleLabel={dict.common.sampleImage} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{p.name}</p>
                    <p className="text-xs text-muted">{i.qty} × {formatGel(i.unitPrice)} · {s.each(`${p.lengthCm}×${p.widthCm}×${p.heightCm}`, p.weightKg)}</p>
                  </div>
                  <span className="font-semibold tabular-nums text-ink">{formatGel(i.qty * i.unitPrice)}</span>
                </li>
              );
            })}
          </ul>
          <dl className="space-y-1.5 border-t border-line bg-paper/60 px-4 py-3 text-sm md:px-5">
            <Row k={s.goodsTotal} v={formatGel(t.goods)} />
            <Row k={s.commission(Math.round(DEMO_COMMISSION_RATE * 100))} v={`−${formatGel(t.commission)}`} />
            <Row k={s.payout} v={formatGel(t.payout)} strong />
            <p className="pt-1 text-xs text-muted">{s.payoutNote}</p>
          </dl>
          {o.note && <p className="border-t border-line px-4 py-3 text-sm text-ink-2 md:px-5"><span className="font-semibold">{s.note}:</span> {o.note}</p>}
        </section>

        <div className="space-y-5">
          <section className="card p-4 md:p-5">
            <h2 className="text-base font-bold">{s.delivery}</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-ink-2">
              <li className="flex gap-2.5">
                {o.delivery.mode === "asap" ? <Zap className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" /> : <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />}
                <span>
                  <span className="block font-semibold text-ink">{o.delivery.mode === "asap" ? s.asap : s.scheduled}</span>
                  {o.delivery.mode === "scheduled" && (
                    <span>{formatDate(o.delivery.date, lang, { weekday: "long", day: "numeric", month: "long" })}, {o.delivery.window}</span>
                  )}
                </span>
              </li>
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                <span>{s.route(m.city, place(o.buyer.city, lang))}</span>
              </li>
              <li className="flex gap-2.5">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                {t.delivery.status === "quoted" ? (
                  <span>{s.courier(t.delivery.distanceKm)}</span>
                ) : (
                  <span>{dict.manual[t.delivery.reason]}</span>
                )}
              </li>
            </ul>
          </section>

          <section className="card p-4 md:p-5">
            <h2 className="text-base font-bold">{s.buyer}</h2>
            <p className="mt-2 font-semibold text-ink">{o.buyer.business ?? o.buyer.name}</p>
            {o.buyer.business && <p className="text-sm text-muted">{s.contact(o.buyer.name)}</p>}
            <p className="text-sm text-muted">{place(o.buyer.city, lang)}</p>
            <p className="mt-3 text-xs text-muted">{s.buyerNote}</p>
            <button type="button" className="btn btn-outline mt-3 w-full text-sm" aria-disabled="true">
              <MessageSquare className="h-4 w-4" aria-hidden="true" /> {s.message}
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
