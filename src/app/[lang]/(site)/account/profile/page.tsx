import type { Metadata } from "next";
import { AccountShell } from "@/components/account/AccountNav";
import { Field, Hidden } from "@/components/forms/Field";
import { Submit } from "@/components/forms/Submit";
import { FormNotice, SignInRequired } from "@/components/market/ui";
import { getDict, href, isLang } from "@/i18n";
import { accountAction } from "@/lib/market/account-actions";
import { getUser, userLang } from "@/lib/market/accounts";
import { LanguagePreference } from "@/components/account/LanguagePreference";
import { currentAccount } from "@/lib/market/auth";
import { market } from "@/lib/market/server";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").acc.account.profile, robots: { index: false } };
}

export default async function ProfilePage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const a = t.acc.account;
  const r = t.acc.register;
  const self = href(lang, "/account/profile");
  const acct = await currentAccount();
  if (!acct)
    return (
      <div className="container-page py-8">
        <SignInRequired lang={lang} text={t.acc.signin.intro} next={self} />
      </div>
    );
  const u = getUser(market(), acct.actor.id)!;
  return (
    <AccountShell lang={lang} active="profile">
      <h1 className="text-2xl font-extrabold md:text-3xl">{a.profile}</h1>
      <div className="mt-4 max-w-xl"><FormNotice lang={lang} sp={await searchParams} /></div>
      <form action={accountAction} className="card mt-4 grid max-w-xl gap-4 p-4 sm:grid-cols-2 md:p-5">
        <Hidden values={{ op: "profile", back: self }} />
        <Field id="pf-first" name="firstName" label={r.firstName} defaultValue={u.first_name ?? ""} required maxLength={80} autoComplete="given-name" />
        <Field id="pf-last" name="lastName" label={r.lastName} defaultValue={u.last_name ?? ""} required maxLength={80} autoComplete="family-name" />
        <Field id="pf-phone" name="phone" type="tel" label={a.phone} defaultValue={u.phone ?? ""} maxLength={40} autoComplete="tel" className="sm:col-span-2" />
        <Field id="pf-email" label={r.email} value={u.email} readOnly disabled hint={a.emailFixed} className="sm:col-span-2" />
        <Submit className="btn btn-primary w-fit">{a.save}</Submit>
      </form>
      <div className="mt-4"><LanguagePreference lang={lang} current={userLang(market(), u.id)} back={self} /></div>
    </AccountShell>
  );
}
