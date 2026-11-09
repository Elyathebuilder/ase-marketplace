import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckoutSteps, Confirmation, OrderSummary, TestBanner } from "@/components/market/journey";
import { SignInRequired } from "@/components/market/ui";
import { getDict, href, isLang } from "@/i18n";
import { currentActor } from "@/lib/market/auth";
import { loadCustomerOrder } from "@/lib/market/customer-view";
import { market } from "@/lib/market/server";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").market.journey.steps[3], robots: { index: false } };
}

/** Step 4: the customer has told us about their transfer. */
export default async function ConfirmationPage({ params }: { params: Params }) {
  const { lang, t } = await pageLang(params);
  const { id } = await params;
  const m = t.market;
  const actor = await currentActor();
  if (actor?.role !== "customer")
    return (
      <div className="container-page py-8">
        <SignInRequired lang={lang} text={m.signin.needCustomer} next={href(lang, `/account/orders/${id}/confirmation`)} />
      </div>
    );
  const v = loadCustomerOrder(market(), actor, id, lang);
  if (!v) notFound();
  const { order } = v;
  const last = v.payments.filter((p) => p.submittedAt).at(-1);
  const isTest = order.is_test === 1;
  return (
    <div className="container-page max-w-5xl py-6 md:py-8">
      <CheckoutSteps lang={lang} step={4} />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-5">
          {isTest && <TestBanner lang={lang} />}
          <Confirmation
            lang={lang}
            orderId={order.id}
            isTest={isTest}
            email={order.delivery_email}
            report={last ? { amount: last.reported ?? 0, date: last.reportedDate ?? "", reference: last.reference ?? "" } : null}
          />
          <div className="flex flex-wrap gap-3">
            <Link href={href(lang, `/account/orders/${id}`)} className="btn btn-primary">{m.confirm.track}</Link>
            <Link href={href(lang, "/products")} className="btn btn-ghost border border-line-strong">{m.confirm.continue}</Link>
          </div>
        </div>
        <aside className="h-fit">
          <OrderSummary lang={lang} shipments={v.summary} goods={order.goods_tetri} delivery={order.delivery_tetri} total={order.total_tetri} />
        </aside>
      </div>
    </div>
  );
}
