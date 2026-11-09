import type { Metadata } from "next";
import { AccountShell } from "@/components/account/AccountNav";
import { Field, Hidden } from "@/components/forms/Field";
import { Submit } from "@/components/forms/Submit";
import { FormNotice, SignInRequired } from "@/components/market/ui";
import { getDict, href, isLang } from "@/i18n";
import { accountAction } from "@/lib/market/account-actions";
import { currentAccount } from "@/lib/market/auth";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").acc.account.security, robots: { index: false } };
}

export default async function SecurityPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const a = t.acc.account;
  const self = href(lang, "/account/security");
  const acct = await currentAccount();
  if (!acct)
    return (
      <div className="container-page py-8">
        <SignInRequired lang={lang} text={t.acc.signin.intro} next={self} />
      </div>
    );
  const sp = await searchParams;
  return (
    <AccountShell lang={lang} active="security">
      <h1 className="text-2xl font-extrabold md:text-3xl">{a.changePassword}</h1>
      <div className="mt-4 max-w-md">
        {sp.ok === "1" ? <p role="status" className="rounded-lg bg-ok-50 px-3 py-2 text-sm text-ok">{a.passwordChanged}</p> : <FormNotice lang={lang} sp={sp} />}
      </div>
      <form action={accountAction} className="card mt-4 max-w-md space-y-4 p-4 md:p-5">
        <Hidden values={{ op: "password", back: self }} />
        <Field id="sc-cur" name="current" type="password" label={a.currentPassword} required maxLength={200} autoComplete="current-password" />
        <Field id="sc-new" name="password" type="password" label={t.acc.forgot.newPassword} hint={t.acc.register.passwordHint} required minLength={8} maxLength={200} autoComplete="new-password" />
        <Field id="sc-new2" name="confirm" type="password" label={t.acc.register.confirm} required minLength={8} maxLength={200} autoComplete="new-password" />
        <Submit className="btn btn-primary">{a.changePassword}</Submit>
      </form>
    </AccountShell>
  );
}
