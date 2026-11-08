import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { QuoteResponder } from "@/components/seller/QuoteResponder";
import { StatusPill } from "@/components/seller/StatusPill";
import { getProduct, lowestWholesalePrice } from "@/lib/catalog";
import { formatGel, formatNumber } from "@/lib/format";
import { QUOTE_STATUS, demoQuote, demoQuotes } from "@/lib/seller-demo";

export function generateStaticParams() {
  return demoQuotes().map((q) => ({ id: q.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: `Quotation ${(await params).id}` };
}

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const q = demoQuote((await params).id);
  if (!q) notFound();
  const p = q.product ? getProduct(q.product) : undefined;
  const listWholesale = p ? lowestWholesalePrice(p) : null;

  return (
    <div className="space-y-5">
      <Link href="/seller/quotes" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-2 hover:text-red-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Quotations
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">{q.title}</h1>
        <StatusPill {...QUOTE_STATUS[q.status]} />
      </div>

      <section className="card p-4 md:p-5">
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Item k="From" v={`${q.company}, ${q.city}`} />
          <Item k="Quantity" v={`${formatNumber(q.qty)} ${q.unit}s`} />
          <Item k="Needed by" v={q.neededBy ? new Date(q.neededBy).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Flexible"} />
          <Item k="Listed product" v={p ? p.name : "Custom item (not listed)"} />
        </dl>
        <h2 className="mt-5 text-sm font-bold text-ink">Requirements</h2>
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-2">{q.requirements}</p>
        {listWholesale != null && (
          <p className="mt-3 text-xs text-muted">Your listed wholesale price for this product starts at {formatGel(listWholesale)} / {q.unit}.</p>
        )}
      </section>

      <section className="card p-4 md:p-5">
        <h2 className="mb-4 text-base font-bold">{q.offer ? "Your quotation" : "Send a quotation"}</h2>
        {q.offer ? (
          <dl className="grid gap-4 text-sm sm:grid-cols-4">
            <Item k="Unit price" v={formatGel(q.offer.unitPrice)} />
            <Item k="Total" v={formatGel(q.offer.unitPrice * q.qty)} />
            <Item k="Production time" v={`${q.offer.leadDays} working days`} />
            <Item k="Valid until" v={new Date(q.offer.validUntil).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} />
          </dl>
        ) : (
          <QuoteResponder qty={q.qty} unit={q.unit} suggested={listWholesale ?? undefined} />
        )}
        {q.status === "accepted" && <p className="mt-4 text-sm text-ok">Accepted by the buyer. It became order <Link href="/seller/orders/ASE-10466" className="font-semibold underline">ASE-10466</Link>.</p>}
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
