import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CheckoutForm } from "@/components/market/CheckoutForm";
import { CheckoutSteps } from "@/components/market/journey";
import { FormNotice } from "@/components/market/ui";
import { getDict, href, isLang } from "@/i18n";
import { signInAs } from "@/lib/market/actions";
import { currentActor, demoAccounts } from "@/lib/market/auth";
import { isTestMode } from "@/lib/market/settings";
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
  const city = typeof sp.city === "string" ? sp.city : "Tbilisi";
  const self = `${href(lang, "/checkout")}?city=${encodeURIComponent(city)}`;
  return (
    <div className="container-page py-6 md:py-8">
      <Breadcrumbs label={t.common.breadcrumb} items={[{ label: t.common.home, href: href(lang, "/") }, { label: t.cart.title, href: href(lang, "/cart") }, { label: m.checkout.title }]} />
      <h1 className="mt-2 mb-4 text-2xl font-extrabold md:text-3xl">{m.checkout.title}</h1>
      <CheckoutSteps lang={lang} step={2} />
      {actor?.role !== "customer" ? (
        // Orders belong to a customer account, so checkout asks for one. In the demo, one click signs in.
        <div className="card mx-auto max-w-lg p-6">
          <h2 className="text-lg font-bold">{m.account.signIn}</h2>
          <p className="mt-1 text-sm text-ink-2">{m.signin.needCustomer}</p>
          <ul className="mt-4 space-y-2">
            {demoAccounts()
              .filter((a) => a.role === "customer")
              .map((a) => (
                <li key={a.id}>
                  <form action={signInAs}>
                    <input type="hidden" name="user" value={a.id} />
                    <input type="hidden" name="lang" value={lang} />
                    <input type="hidden" name="next" value={self} />
                    <button type="submit" className="btn btn-primary w-full">{m.signin.as}: {a.name}</button>
                  </form>
                </li>
              ))}
          </ul>
        </div>
      ) : (
        <>
          <p className="mb-6 max-w-3xl text-sm text-ink-2">{m.checkout.intro}</p>
          <div className="mb-4"><FormNotice lang={lang} sp={sp} /></div>
          <CheckoutForm defaultName={actor.name} defaultEmail={`${actor.id}@demo.ase.ge`} defaultCity={city} testMode={isTestMode()} />
        </>
      )}
    </div>
  );
}
