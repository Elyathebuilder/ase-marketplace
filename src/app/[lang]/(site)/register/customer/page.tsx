import type { Metadata } from "next";
import Link from "next/link";
import { Field, Hidden } from "@/components/forms/Field";
import { Submit } from "@/components/forms/Submit";
import { FormNotice } from "@/components/market/ui";
import { getDict, href, isLang } from "@/i18n";
import { registerCustomerAction } from "@/lib/market/account-actions";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").acc.register.customerFormTitle };
}

export default async function RegisterCustomerPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const r = t.acc.register;
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";
  const self = href(lang, "/register/customer") + (next ? `?next=${encodeURIComponent(next)}` : "");
  return (
    <div className="container-page max-w-xl py-8">
      <section className="card p-5 md:p-6">
        <h1 className="text-2xl font-extrabold">{r.customerFormTitle}</h1>
        <p className="mt-1 text-sm text-ink-2">{r.customerFormIntro}</p>
        {next && <p className="mt-3 rounded-lg bg-paper-2 px-3 py-2 text-sm text-ink-2">{r.basketKept}</p>}
        <div className="mt-4"><FormNotice lang={lang} sp={sp} /></div>
        <form action={registerCustomerAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Hidden values={{ lang, next, back: self }} />
          <Field id="rc-first" name="firstName" label={r.firstName} required maxLength={80} autoComplete="given-name" />
          <Field id="rc-last" name="lastName" label={r.lastName} required maxLength={80} autoComplete="family-name" />
          <Field id="rc-email" name="email" type="email" label={r.email} required maxLength={200} autoComplete="email" className="sm:col-span-2" />
          <Field id="rc-pw" name="password" type="password" label={r.password} hint={r.passwordHint} required minLength={8} maxLength={200} autoComplete="new-password" />
          <Field id="rc-pw2" name="confirm" type="password" label={r.confirm} required minLength={8} maxLength={200} autoComplete="new-password" />
          <p className="text-xs text-muted sm:col-span-2">{r.terms}</p>
          <Submit className="btn btn-primary py-3 sm:col-span-2">{r.submit}</Submit>
        </form>
      </section>
      <p className="mt-4 text-sm text-ink-2">
        {r.haveAccount} <Link href={`${href(lang, "/signin")}${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-red-700 hover:underline">{t.acc.signin.submit}</Link>
      </p>
    </div>
  );
}
