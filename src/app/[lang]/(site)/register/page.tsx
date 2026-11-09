import type { Metadata } from "next";
import Link from "next/link";
import { Factory, ShoppingBag } from "lucide-react";
import { getDict, href, isLang } from "@/i18n";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").acc.register.title };
}

/** Step 0: customer or seller. The two kinds of account are separate from the start. */
export default async function RegisterPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const r = t.acc.register;
  const next = (await searchParams).next;
  const q = typeof next === "string" ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <div className="container-page max-w-4xl py-8">
      <h1 className="text-2xl font-extrabold md:text-3xl">{r.title}</h1>
      <p className="mt-2 text-sm text-ink-2">{r.intro}</p>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <section className="card flex flex-col p-5 md:p-6">
          <ShoppingBag className="h-8 w-8 text-red-600" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-bold">{r.customerTitle}</h2>
          <p className="mt-1 flex-1 text-sm text-ink-2">{r.customerText}</p>
          <Link href={`${href(lang, "/register/customer")}${q}`} className="btn btn-primary mt-4 w-fit">{r.customerCta}</Link>
        </section>
        <section className="card flex flex-col p-5 md:p-6">
          <Factory className="h-8 w-8 text-red-600" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-bold">{r.sellerTitle}</h2>
          <p className="mt-1 flex-1 text-sm text-ink-2">{r.sellerText}</p>
          <Link href={href(lang, "/register/seller")} className="btn btn-dark mt-4 w-fit">{r.sellerCta}</Link>
        </section>
      </div>
      <p className="mt-6 text-sm text-ink-2">
        {r.haveAccount} <Link href={`${href(lang, "/signin")}${q}`} className="font-semibold text-red-700 hover:underline">{t.acc.signin.submit}</Link>
      </p>
    </div>
  );
}
