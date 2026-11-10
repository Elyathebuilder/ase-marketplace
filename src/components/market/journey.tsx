"use client";

/**
 * Customer purchase journey: the parts shared by the real site (data from the server) and the
 * static preview (a TEST order kept in the browser). They only display data; saving happens elsewhere.
 */
import { useRef } from "react";
import { AlertTriangle, Check, FlaskConical, Info, Landmark, MapPin } from "lucide-react";
import { formatDate, getDict, type Lang } from "@/i18n";
import { formatTetri } from "@/lib/money";

const money = (t: number, lang: Lang) => formatTetri(t, lang);

export function CheckoutSteps({ lang, step }: { lang: Lang; step: 1 | 2 | 3 | 4 }) {
  const j = getDict(lang).market.journey;
  return (
    <nav aria-label={j.stepsLabel} className="mb-6">
      <ol className="flex items-center gap-1 text-xs font-semibold sm:gap-2 sm:text-sm">
        {j.steps.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const current = n === step;
          return (
            <li key={label} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2" aria-current={current ? "step" : undefined}>
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs ${done || current ? "bg-red-600 text-white" : "border-2 border-line bg-surface text-muted"}`}>
                {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : n}
              </span>
              <span className={`truncate ${current ? "text-ink" : done ? "text-ink-2" : "text-muted"} ${current ? "" : "hidden sm:inline"}`}>{label}</span>
              {n < 4 && <span className={`h-0.5 flex-1 ${done ? "bg-red-600" : "bg-line"}`} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Shown on every TEST order page, so nobody mistakes it for a real payment request. */
export function TestBanner({ lang, extra }: { lang: Lang; extra?: string }) {
  const t = getDict(lang).market.test;
  return (
    <div role="note" className="flex items-start gap-3 rounded-xl border-2 border-dashed border-[#d9a520] bg-warn-50 p-4 text-warn" data-test-banner>
      <FlaskConical className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-extrabold tracking-wide">{t.title}</p>
        <p className="text-sm">{t.text}</p>
        {extra && <p className="mt-1 text-xs">{extra}</p>}
      </div>
    </div>
  );
}

export function TestTag({ lang }: { lang: Lang }) {
  return <span className="chip bg-warn-50 font-extrabold tracking-wide text-warn ring-1 ring-inset ring-[#ecd9ad]">{getDict(lang).market.test.short}</span>;
}

export interface SummaryShipment {
  id: string;
  maker: string;
  city: string;
  items: { key: string; name: string; qty: number; line: number }[];
  delivery: number;
  status?: string;
}

/** Products per manufacturer, delivery per shipment, commission note and the total. */
export function OrderSummary({
  lang,
  shipments,
  goods,
  delivery,
  total,
  received,
  due,
  refunded,
  showCommission = true,
}: {
  lang: Lang;
  shipments: SummaryShipment[];
  goods: number;
  delivery: number;
  total: number;
  received?: number;
  due?: number;
  refunded?: number;
  showCommission?: boolean;
}) {
  const m = getDict(lang).market;
  return (
    <section className="card p-4">
      <h2 className="text-base font-bold">{m.checkout.summary}</h2>
      <ul className="mt-3 space-y-3 text-sm">
        {shipments.map((s) => (
          <li key={s.id} className="rounded-lg border border-line p-2.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-red-600" aria-hidden="true" /> {m.order.shipmentFrom(s.maker, s.city)}
              {s.status && <span className="ml-auto font-normal text-muted">{m.shipmentStatus[s.status] ?? s.status}</span>}
            </p>
            <ul className="mt-1.5 space-y-1">
              {s.items.map((i) => (
                <li key={i.key} className="flex justify-between gap-2">
                  <span className="text-ink-2">{i.qty} × {i.name}</span>
                  <span className="shrink-0 tabular-nums">{money(i.line, lang)}</span>
                </li>
              ))}
              <li className="flex justify-between gap-2 text-muted">
                <span>{m.order.delivery}</span>
                <span className="tabular-nums">{money(s.delivery, lang)}</span>
              </li>
            </ul>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between gap-3 text-ink-2"><dt>{m.order.subtotal}</dt><dd className="tabular-nums">{money(goods, lang)}</dd></div>
        <div className="flex justify-between gap-3 text-ink-2"><dt>{m.order.delivery}</dt><dd className="tabular-nums">{money(delivery, lang)}</dd></div>
        {showCommission && (
          <div className="flex justify-between gap-3 text-ink-2">
            <dt>{m.checkout.commission}<span className="block text-xs text-muted">{m.checkout.commissionNote}</span></dt>
            <dd className="tabular-nums">{money(0, lang)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3 border-t border-line pt-2 text-base font-bold"><dt>{m.order.total}</dt><dd className="tabular-nums">{money(total, lang)}</dd></div>
        {received !== undefined && <div className="flex justify-between gap-3 text-ink-2"><dt>{m.order.received}</dt><dd className="tabular-nums">{money(received, lang)}</dd></div>}
        {!!refunded && <div className="flex justify-between gap-3 text-ink-2"><dt>{m.order.refunded}</dt><dd className="tabular-nums">{money(refunded, lang)}</dd></div>}
        {!!due && <div className="flex justify-between gap-3 font-semibold text-red-700"><dt>{m.order.due}</dt><dd className="tabular-nums">{money(due, lang)}</dd></div>}
      </dl>
    </section>
  );
}

export interface Bank {
  holder: string;
  bank: string;
  iban: string;
  swift: string;
}

/** Amount, bank details and the payment reference (the order number). */
export function PaymentInstructions({ lang, orderId, due, bank, deadline, isTest }: { lang: Lang; orderId: string; due: number; bank: Bank; deadline: string | null; isTest: boolean }) {
  const o = getDict(lang).market.order;
  return (
    <section className={`card overflow-hidden ${isTest ? "border-[#ecd9ad]" : "border-red-200"}`} aria-labelledby="pay-h">
      <div className={`${isTest ? "bg-warn-50" : "bg-red-50"} px-4 py-3`}>
        <h2 id="pay-h" className="flex items-center gap-2 text-lg font-bold text-ink">
          <Landmark className="h-5 w-5 text-red-600" aria-hidden="true" /> {o.payTitle}
          {isTest && <TestTag lang={lang} />}
        </h2>
        <p className="mt-1 text-sm text-ink-2">{o.payIntro}</p>
      </div>
      <dl className="grid gap-x-6 gap-y-3 p-4 text-sm sm:grid-cols-2" data-bank-details>
        <div className="sm:col-span-2">
          <dt className="text-muted">{o.amountToPay}</dt>
          <dd className="text-2xl font-extrabold tabular-nums text-ink">{money(due, lang)}</dd>
        </div>
        <div><dt className="text-muted">{o.holder}</dt><dd className="font-semibold">{bank.holder}</dd></div>
        <div><dt className="text-muted">{o.bank}</dt><dd className="font-semibold">{bank.bank}</dd></div>
        <div><dt className="text-muted">{o.iban}</dt><dd className="break-all font-mono font-semibold">{bank.iban}</dd></div>
        <div><dt className="text-muted">{o.swift}</dt><dd className="font-mono font-semibold">{bank.swift}</dd></div>
        <div><dt className="text-muted">{o.reference}</dt><dd className="font-mono text-base font-bold text-red-700">{orderId}</dd></div>
        {deadline && <div><dt className="text-muted">{o.deadline}</dt><dd className="font-semibold">{formatDate(deadline, lang, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</dd></div>}
      </dl>
    </section>
  );
}

/** The "I have made the payment" fields. The caller wraps them in its own form. */
export function PaymentFields({ lang, due, isTest, orderId, withReceipt = true }: { lang: Lang; due: number; isTest: boolean; orderId: string; withReceipt?: boolean }) {
  const m = getDict(lang).market;
  const o = m.order;
  const ref = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-3">
      <h3 className="font-bold">{o.formTitle}</h3>
      <p className="flex gap-2 text-sm text-ink-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />{o.formIntro}</p>
      {isTest && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-warn-50 px-3 py-2 text-xs text-warn">
          <button
            type="button"
            className="btn btn-ghost border border-[#ecd9ad] bg-surface px-3 py-1 text-xs"
            onClick={() => {
              if (ref.current) ref.current.value = `TEST-${orderId.replace(/\D/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
            }}
          >
            {m.test.fill}
          </button>
          <span>{m.test.fillNote}</span>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="pay-amount">{o.amount}</label>
          <input id="pay-amount" name="amount" required inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" defaultValue={(due / 100).toFixed(2)} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="pay-date">{o.date}</label>
          <input id="pay-date" name="date" type="date" required max={today} defaultValue={today} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="pay-ref">{o.bankRef}</label>
          <input ref={ref} id="pay-ref" name="reference" required maxLength={100} className="input" />
        </div>
      </div>
      {withReceipt && (
        <div>
          <label className="label" htmlFor="pay-receipt">{o.receipt}</label>
          <input id="pay-receipt" name="receipt" type="file" accept="application/pdf,image/png,image/jpeg" className="input" />
        </div>
      )}
      <button type="submit" className="btn btn-primary w-full sm:w-auto">{o.submit}</button>
    </div>
  );
}

const FLOW = ["placed", "awaiting_payment", "payment_submitted", "payment_confirmed", "preparing", "ready", "collected", "in_delivery", "delivered", "completed"];

/** The customer's one order timeline; exceptions (rejected, cancelled …) appear below it. */
export function OrderTimeline({ lang, status, history, exceptionNote }: { lang: Lang; status: string; history: { to: string; at: string }[]; exceptionNote?: string | null }) {
  const m = getDict(lang).market;
  const flowIndex = FLOW.indexOf(status);
  const reached = Math.max(flowIndex, ...history.map((h) => FLOW.indexOf(h.to)));
  const isException = flowIndex < 0;
  return (
    <section className="card p-4 md:p-5">
      <h2 className="text-base font-bold">{m.order.timeline}</h2>
      <ol className="mt-4">
        {FLOW.map((step, i) => {
          const done = i <= reached;
          const current = !isException && i === flowIndex;
          const at = [...history].reverse().find((h) => h.to === step)?.at;
          return (
            <li key={step} className="relative flex gap-3 pb-4 last:pb-0">
              {i < FLOW.length - 1 && <span className={`absolute left-[11px] top-6 h-full w-0.5 ${i < reached ? "bg-red-600" : "bg-line"}`} aria-hidden="true" />}
              <span className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? "bg-red-600 text-white" : "border-2 border-line bg-surface text-muted"} ${current ? "ring-4 ring-red-100" : ""}`}>
                {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
              </span>
              <div className="min-w-0">
                <p className={`text-sm ${done ? "font-semibold text-ink" : "text-muted"}`}>{m.orderStatus[step]}</p>
                {at && done && <p className="text-xs text-muted">{formatDate(at, lang, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      {isException && (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-warn-50 px-3 py-2 text-sm text-warn">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span><strong>{m.orderStatus[status]}</strong>{exceptionNote ? `: ${exceptionNote}` : ""}</span>
        </p>
      )}
    </section>
  );
}

/** After "I have made the payment": what was received and what happens next. */
export function Confirmation({ lang, orderId, report, email, isTest }: { lang: Lang; orderId: string; report: { amount: number; date: string; reference: string } | null; email: string | null; isTest: boolean }) {
  const m = getDict(lang).market;
  const c = m.confirm;
  return (
    <section className="card overflow-hidden" data-confirmation>
      <div className="flex items-start gap-3 bg-ok-50 px-4 py-4 text-ok">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ok text-white"><Check className="h-5 w-5" aria-hidden="true" /></span>
        <div>
          <h1 className="text-xl font-extrabold text-ink md:text-2xl">{c.title}</h1>
          <p className="text-sm text-ink-2">{c.text(orderId)} {isTest && <TestTag lang={lang} />}</p>
        </div>
      </div>
      <div className="grid gap-5 p-4 md:grid-cols-2">
        {report && (
          <div>
            <h2 className="text-sm font-bold">{c.yourReport}</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted">{m.order.amount}</dt><dd className="font-semibold tabular-nums">{money(report.amount, lang)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">{m.order.date}</dt><dd>{report.date}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">{m.order.bankRef}</dt><dd className="break-all font-mono">{report.reference}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">{m.admin.payments.status}</dt><dd className="font-semibold text-[#24476b]">{m.order.pendingTitle}</dd></div>
            </dl>
          </div>
        )}
        <div>
          <h2 className="text-sm font-bold">{c.next}</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-2">
            {c.steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
          {email && <p className="mt-3 text-xs text-muted">{c.email(email)}</p>}
        </div>
      </div>
    </section>
  );
}
