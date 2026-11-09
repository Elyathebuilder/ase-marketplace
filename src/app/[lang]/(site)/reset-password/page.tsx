import type { Metadata } from "next";
import { Field, Hidden } from "@/components/forms/Field";
import { Submit } from "@/components/forms/Submit";
import { FormNotice } from "@/components/market/ui";
import { getDict, isLang } from "@/i18n";
import { resetPasswordAction } from "@/lib/market/account-actions";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").acc.forgot.newTitle, robots: { index: false } };
}

export default async function ResetPasswordPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const f = t.acc.forgot;
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  return (
    <div className="container-page max-w-md py-8">
      <section className="card p-5 md:p-6">
        <h1 className="text-2xl font-extrabold">{f.newTitle}</h1>
        <div className="mt-4"><FormNotice lang={lang} sp={sp} /></div>
        <form action={resetPasswordAction} className="mt-4 space-y-4">
          <Hidden values={{ lang, token }} />
          <Field id="rp-pw" name="password" type="password" label={f.newPassword} hint={t.acc.register.passwordHint} required minLength={8} maxLength={200} autoComplete="new-password" />
          <Field id="rp-pw2" name="confirm" type="password" label={t.acc.register.confirm} required minLength={8} maxLength={200} autoComplete="new-password" />
          <Submit className="btn btn-primary w-full">{f.save}</Submit>
        </form>
      </section>
    </div>
  );
}
