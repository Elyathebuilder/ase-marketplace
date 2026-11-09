import type { Metadata } from "next";
import Link from "next/link";
import { FlaskConical, MailCheck } from "lucide-react";
import { Hidden } from "@/components/forms/Field";
import { FormNotice, SignInRequired } from "@/components/market/ui";
import { getDict, href, isLang } from "@/i18n";
import { accountAction } from "@/lib/market/account-actions";
import { latestEmail } from "@/lib/market/accounts";
import { currentAccount } from "@/lib/market/auth";
import { market } from "@/lib/market/server";
import { isTestMode } from "@/lib/market/settings";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").acc.verify.sentTitle, robots: { index: false } };
}

/** "Check your email". In TEST mode, when no email provider is set up, the link is shown here instead. */
export default async function VerifyPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const v = t.acc.verify;
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "";
  const self = href(lang, "/account/verify") + (next ? `?next=${encodeURIComponent(next)}` : "");
  const acct = await currentAccount();
  if (!acct)
    return (
      <div className="container-page py-8">
        <SignInRequired lang={lang} text={t.acc.signin.intro} next={self} />
      </div>
    );
  if (acct.verified)
    return (
      <div className="container-page max-w-lg py-8">
        <section className="card p-6 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-ok" aria-hidden="true" />
          <h1 className="mt-3 text-xl font-bold">{v.doneTitle}</h1>
          <Link href={next || href(lang, acct.actor.role === "manufacturer" ? "/seller" : "/account")} className="btn btn-primary mt-4">{next ? v.continueCheckout : v.toAccount}</Link>
        </section>
      </div>
    );
  const mail = latestEmail(market(), acct.actor.id, "verify_email");
  const showLink = isTestMode() && mail && mail.status !== "sent" && mail.link;
  return (
    <div className="container-page max-w-lg py-8">
      <section className="card p-6">
        <MailCheck className="h-10 w-10 text-red-600" aria-hidden="true" />
        <h1 className="mt-3 text-xl font-bold">{v.sentTitle}</h1>
        <p className="mt-2 text-sm text-ink-2">{v.sentText(acct.email)}</p>
        <div className="mt-3"><FormNotice lang={lang} sp={sp} /></div>
        {showLink && (
          <div className="mt-4 rounded-xl border-2 border-dashed border-[#d9a520] bg-[#fdf6e3] p-3 text-sm text-[#7a5300]" data-test-banner>
            <p className="flex items-start gap-2"><FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{v.notSentTest}</p>
            <a href={`${mail.link}${lang === "en" ? "&lang=en" : ""}`} className="btn btn-dark mt-2 px-3 py-1.5 text-sm" data-verify-link>{v.openLink}</a>
          </div>
        )}
        <form action={accountAction} className="mt-4">
          <Hidden values={{ op: "resend", back: self }} />
          <button type="submit" className="btn btn-ghost border border-line-strong px-3 py-1.5 text-sm">{v.resend}</button>
        </form>
      </section>
    </div>
  );
}
