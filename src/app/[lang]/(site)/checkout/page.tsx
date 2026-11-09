import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CheckoutForm } from "@/components/market/CheckoutForm";
import { FormNotice, SignInRequired } from "@/components/market/ui";
import { getDict, href, isLang } from "@/i18n";
import { currentActor } from "@/lib/market/auth";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").market.checkout.title, robots: { index: false } };
}

export default async function CheckoutPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const sp = await searchParams;
  const actor = await currentActor();
  const m = t.market;
  return (
    <div className="container-page py-6 md:py-8">
      <Breadcrumbs label={t.common.breadcrumb} items={[{ label: t.common.home, href: href(lang, "/") }, { label: t.cart.title, href: href(lang, "/cart") }, { label: m.checkout.title }]} />
      <h1 className="mt-2 text-2xl font-extrabold md:text-3xl">{m.checkout.title}</h1>
      {actor?.role !== "customer" ? (
        <div className="mt-6">
          <SignInRequired lang={lang} text={m.signin.needCustomer} next={href(lang, "/checkout")} />
        </div>
      ) : (
        <>
          <p className="mt-1 mb-6 max-w-3xl text-sm text-ink-2">{m.checkout.intro}</p>
          <div className="mb-4"><FormNotice lang={lang} sp={sp} /></div>
          <CheckoutForm defaultName={actor.name} defaultCity={typeof sp.city === "string" ? sp.city : "Tbilisi"} />
        </>
      )}
    </div>
  );
}
