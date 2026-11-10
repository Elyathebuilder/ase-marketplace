import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { ClearCart } from "@/components/market/ClearCart";
import { CheckoutSteps, OrderSummary, PaymentFields, PaymentInstructions, TestBanner } from "@/components/market/journey";
import { ActionForm, FormNotice, SignInRequired, tetri } from "@/components/market/ui";
import { getDict, href, isLang } from "@/i18n";
import { currentActor } from "@/lib/market/auth";
import { loadCustomerOrder } from "@/lib/market/customer-view";
import { market } from "@/lib/market/server";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string; id: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").market.pay.title, robots: { index: false } };
}

/** Step 3: bank transfer instructions and the "I have made the payment" form. */
export default async function PaymentPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const { id } = await params;
  const sp = await searchParams;
  const m = t.market;
  const self = href(lang, `/account/orders/${id}/payment`);
  const actor = await currentActor();
  if (actor?.role !== "customer")
    return (
      <div className="container-page py-8">
        <SignInRequired lang={lang} text={m.signin.needCustomer} next={self} />
      </div>
    );
  const v = loadCustomerOrder(market(), actor, id, lang);
  if (!v) notFound();
  const { order } = v;
  const canPay = ["awaiting_payment", "payment_rejected"].includes(order.status) && v.due > 0;
  // Already paid or reported: show the order instead of a payment form.
  if (!canPay) redirect(href(lang, `/account/orders/${id}`));
  const isTest = order.is_test === 1;
  const rejection = [...v.history].reverse().find((h) => h.entity === "order" && h.to_status === "payment_rejected");

  return (
    <div className="container-page max-w-5xl py-6 md:py-8">
      {sp.placed === "1" && <ClearCart />}
      {sp.placed === "1" && <p className="mb-3 rounded-lg border border-[#c4e0cf] bg-ok-50 px-3 py-2 text-sm text-ok">{m.order.placedThanks}</p>}
      <Link href={href(lang, `/account/orders/${id}`)} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-2 hover:text-red-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {m.orders.order(id)}
      </Link>
      <h1 className="mb-4 text-2xl font-extrabold md:text-3xl">{m.pay.title}</h1>
      <CheckoutSteps lang={lang} step={3} />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-5">
          {isTest && <TestBanner lang={lang} />}
          <FormNotice lang={lang} sp={sp} />
          {order.status === "payment_rejected" && (
            <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span><strong>{m.order.rejectedTitle}.</strong> {rejection?.note ? `${m.order.reason}: ${rejection.note}. ` : ""}{m.order.rejectedText}</span>
            </p>
          )}
          {order.status === "awaiting_payment" && v.received > 0 && (
            <p className="rounded-lg bg-warn-50 px-3 py-2 text-sm text-warn"><strong>{m.order.partialTitle}.</strong> {m.order.partialText(tetri(v.due, lang))}</p>
          )}
          <PaymentInstructions lang={lang} orderId={order.id} due={v.due} bank={v.bank} deadline={order.payment_deadline} isTest={isTest} />
          <ActionForm op="submitPayment" id={order.id} back={self} files className="card p-4 md:p-5">
            <input type="hidden" name="next" value={href(lang, `/account/orders/${id}/confirmation`)} />
            <PaymentFields lang={lang} due={v.due} isTest={isTest} orderId={order.id} />
          </ActionForm>
        </div>
        <aside className="h-fit lg:sticky lg:top-32">
          <OrderSummary lang={lang} shipments={v.summary} goods={order.goods_tetri} delivery={order.delivery_tetri} total={order.total_tetri} received={v.received || undefined} due={v.due} />
        </aside>
      </div>
    </div>
  );
}
