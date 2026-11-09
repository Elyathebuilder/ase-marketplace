import type { Metadata } from "next";
import { Field, Hidden } from "@/components/forms/Field";
import { Submit } from "@/components/forms/Submit";
import { getDict, isLang } from "@/i18n";
import { forgotPasswordAction } from "@/lib/market/account-actions";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").acc.forgot.title, robots: { index: false } };
}

export default async function ForgotPasswordPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const f = t.acc.forgot;
  const sent = (await searchParams).sent === "1";
  return (
    <div className="container-page max-w-md py-8">
      <section className="card p-5 md:p-6">
        <h1 className="text-2xl font-extrabold">{f.title}</h1>
        {sent ? (
          <p role="status" className="mt-4 rounded-lg bg-ok-50 px-3 py-2 text-sm text-ok">{f.sent}</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-2">{f.intro}</p>
            <form action={forgotPasswordAction} className="mt-4 space-y-4">
              <Hidden values={{ lang }} />
              <Field id="fp-email" name="email" type="email" label={t.acc.signin.email} required maxLength={200} autoComplete="email" />
              <Submit className="btn btn-primary w-full">{f.submit}</Submit>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
