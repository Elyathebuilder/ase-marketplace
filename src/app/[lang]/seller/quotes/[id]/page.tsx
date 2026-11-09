import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { QuoteResponder } from "@/components/seller/QuoteResponder";
import { StatusPill } from "@/components/seller/StatusPill";
import { getProduct, lowestWholesalePrice } from "@/lib/catalog";
import { formatGel, formatNumber } from "@/lib/format";
import { QUOTE_STATUS, demoQuote, demoQuotes, quoteTitle } from "@/lib/seller-demo";
import { formatDate, getDict, href, isLang, place, units } from "@/i18n";
import { pageLang } from "@/lib/page-lang";
import { sellerSession } from "@/lib/market/seller-page";

type Params = Promise<{ lang: string; id: string }>;

/** Unknown addresses show the site's 404 page. */
export const dynamicParams = false;

export function generateStaticParams() {
  return demoQuotes().map((q) => ({ id: q.id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, id } = await params;
  return { title: `${getDict(isLang(lang) ? lang : "ka").seller.quotes.title} ${id}` };
}

export default async function QuotePage({ params }: { params: Params }) {
  const { lang, t } = await pageLang(params);
  if (!(await sellerSession())) return null;
  const s = t.seller.quote;
  const q = demoQuote((await params).id);
  if (!q) notFound();
  const p = q.product ? getProduct(q.product) : undefined;
  const listWholesale = p ? lowestWholesalePrice(p) : null;

  return (
    <div className="space-y-5">
      <p className="rounded-lg bg-warn-50 px-3 py-2 text-sm text-warn"><strong>{t.seller.banner}</strong> {t.seller.bannerText}</p>
      <Link href={href(lang, "/seller/quotes")} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-2 hover:text-red-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {s.back}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">{quoteTitle(q, lang)}</h1>
        <StatusPill tone={QUOTE_STATUS[q.status].tone} label={t.seller.quoteStatus[q.status]} />
      </div>

      <section className="card p-4 md:p-5">
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Item k={s.from} v={`${q.company}, ${place(q.city, lang)}`} />
          <Item k={s.quantity} v={`${formatNumber(q.qty)} ${units(q.unit, lang, q.qty)}`} />
          <Item k={s.neededBy} v={q.neededBy ? formatDate(q.neededBy, lang, { day: "numeric", month: "long", year: "numeric" }) : s.flexible} />
          <Item k={s.listed} v={p ? quoteTitle(q, lang) : s.customItem} />
        </dl>
        <h2 className="mt-5 text-sm font-bold text-ink">{s.requirements}</h2>
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-2">{q.requirements}</p>
        {listWholesale != null && (
          <p className="mt-3 text-xs text-muted">{s.listedWholesale(formatGel(listWholesale), units(q.unit, lang, 1))}</p>
        )}
      </section>

      <section className="card p-4 md:p-5">
        <h2 className="mb-4 text-base font-bold">{q.offer ? s.yours : s.send}</h2>
        {q.offer ? (
          <dl className="grid gap-4 text-sm sm:grid-cols-4">
            <Item k={s.unitPrice} v={formatGel(q.offer.unitPrice)} />
            <Item k={s.total} v={formatGel(q.offer.unitPrice * q.qty)} />
            <Item k={s.production} v={t.product.workingDays(q.offer.leadDays)} />
            <Item k={s.validUntil} v={formatDate(q.offer.validUntil, lang, { day: "numeric", month: "short" })} />
          </dl>
        ) : (
          <QuoteResponder qty={q.qty} unit={units(q.unit, lang, 1)} unitPlural={units(q.unit, lang, q.qty)} suggested={listWholesale ?? undefined} />
        )}
        {q.status === "accepted" && <p className="mt-4 text-sm text-ok">{s.acceptedOrder} <Link href={href(lang, "/seller/orders/ASE-10466")} className="font-semibold underline">ASE-10466</Link>.</p>}
      </section>
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{k}</dt>
      <dd className="mt-0.5 font-semibold text-ink">{v}</dd>
    </div>
  );
}
