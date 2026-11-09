import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, MailCheck } from "lucide-react";
import { getDict, href, isLang } from "@/i18n";
import { currentAccount } from "@/lib/market/auth";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").acc.verify.doneTitle, robots: { index: false } };
}

/** Result of opening the confirmation link. Offers the way back to the basket, which was kept in this browser. */
export default async function VerifiedPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const v = t.acc.verify;
  const ok = (await searchParams).ok === "1";
  const acct = await currentAccount();
  const seller = acct?.actor.role === "manufacturer";
  return (
    <div className="container-page max-w-lg py-8">
      <section className="card p-6 text-center">
        {ok ? <MailCheck className="mx-auto h-10 w-10 text-ok" aria-hidden="true" /> : <CircleAlert className="mx-auto h-10 w-10 text-red-600" aria-hidden="true" />}
        <h1 className="mt-3 text-xl font-bold">{ok ? v.doneTitle : v.failedTitle}</h1>
        <p className="mt-2 text-sm text-ink-2">{ok ? v.doneText : t.acc.errors.token_invalid}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {ok && seller && <Link href={href(lang, "/seller/application")} className="btn btn-primary">{v.toSeller}</Link>}
          {ok && !seller && <Link href={href(lang, "/cart")} className="btn btn-primary">{v.continueCheckout}</Link>}
          <Link href={href(lang, acct ? (seller ? "/seller" : "/account") : "/signin")} className="btn btn-ghost border border-line-strong">{acct ? v.toAccount : t.acc.signin.submit}</Link>
        </div>
      </section>
    </div>
  );
}
