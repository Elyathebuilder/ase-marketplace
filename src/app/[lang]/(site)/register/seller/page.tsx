import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Hammer } from "lucide-react";
import { Field, Hidden } from "@/components/forms/Field";
import { Submit } from "@/components/forms/Submit";
import { FormNotice } from "@/components/market/ui";
import { StepProgress } from "@/components/seller/kit";
import { getDict, href, isLang } from "@/i18n";
import { registerSellerAction } from "@/lib/market/account-actions";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").sell.register.title };
}

/** Step 1 of seller sign-up: the kind of seller and the account. The rest is the application wizard. */
export default async function RegisterSellerPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const s = t.sell;
  const r = t.acc.register;
  const sp = await searchParams;
  const type = sp.type === "independent" ? "independent" : "company";
  const self = href(lang, "/register/seller");
  return (
    <div className="container-page max-w-2xl py-8">
      <StepProgress lang={lang} current={1} done={[]} linkFrom={99} />
      <section className="card p-5 md:p-6">
        <h1 className="text-2xl font-extrabold">{s.register.title}</h1>
        <p className="mt-1 text-sm text-ink-2">{s.register.intro}</p>
        <div className="mt-4"><FormNotice lang={lang} sp={sp} /></div>
        <form action={registerSellerAction} className="mt-4 space-y-5">
          <Hidden values={{ lang, back: self }} />
          <fieldset>
            <legend className="label">{s.register.typeTitle}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["company", "independent"] as const).map((k) => (
                <label key={k} className="flex cursor-pointer gap-3 rounded-xl border border-line p-4 has-[:checked]:border-ink has-[:checked]:bg-paper-2">
                  <input type="radio" name="sellerType" value={k} defaultChecked={type === k} required className="mt-1" />
                  <span>
                    <span className="flex items-center gap-2 font-bold text-ink">
                      {k === "company" ? <Building2 className="h-4 w-4" aria-hidden="true" /> : <Hammer className="h-4 w-4" aria-hidden="true" />}
                      {s.type[k]}
                    </span>
                    <span className="mt-1 block text-sm text-ink-2">{k === "company" ? s.register.companyText : s.register.independentText}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field id="rs-store" name="storeName" label={s.register.storeName} hint={s.register.storeNameHint} required maxLength={120} autoComplete="organization" />
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="label sm:col-span-2">{s.register.contactTitle}</legend>
            <Field id="rs-first" name="firstName" label={r.firstName} required maxLength={80} autoComplete="given-name" />
            <Field id="rs-last" name="lastName" label={r.lastName} required maxLength={80} autoComplete="family-name" />
            <Field id="rs-email" name="email" type="email" label={r.email} required maxLength={200} autoComplete="email" />
            <Field id="rs-phone" name="phone" type="tel" label={s.register.phone} required maxLength={40} autoComplete="tel" pattern="[+0-9][0-9 ()-]{5,}" />
            <Field id="rs-pw" name="password" type="password" label={r.password} hint={r.passwordHint} required minLength={8} maxLength={200} autoComplete="new-password" />
            <Field id="rs-pw2" name="confirm" type="password" label={r.confirm} required minLength={8} maxLength={200} autoComplete="new-password" />
          </fieldset>
          <p className="text-xs text-muted">{r.terms}</p>
          <Submit className="btn btn-primary w-full py-3">{s.register.submit}</Submit>
        </form>
      </section>
      <p className="mt-4 text-sm text-ink-2">
        {r.haveAccount} <Link href={href(lang, "/signin")} className="font-semibold text-red-700 hover:underline">{t.acc.signin.submit}</Link>
      </p>
    </div>
  );
}
