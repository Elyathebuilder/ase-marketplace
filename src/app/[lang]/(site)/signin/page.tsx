import type { Metadata } from "next";
import Link from "next/link";
import { Factory, FlaskConical, ShieldCheck, User } from "lucide-react";
import { Field, Hidden } from "@/components/forms/Field";
import { Submit } from "@/components/forms/Submit";
import { FormNotice } from "@/components/market/ui";
import { getDict, href, isLang, locMaker } from "@/i18n";
import { getManufacturer } from "@/lib/catalog";
import { signInWithPassword } from "@/lib/market/account-actions";
import { signInAs, signOut } from "@/lib/market/actions";
import { currentActor, demoAccounts } from "@/lib/market/auth";
import { isTestMode } from "@/lib/market/settings";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").market.signin.title, robots: { index: false } };
}

/** Sign in with email and password. In TEST mode, the demo accounts can also be used with one click. */
export default async function SignInPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const s = t.market.signin;
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";
  const actor = await currentActor();
  const accounts = isTestMode() ? demoAccounts() : [];
  const a = t.acc.signin;
  const self = href(lang, "/signin") + (next ? `?next=${encodeURIComponent(next)}` : "");
  const groups = [
    { role: "customer", title: s.customers, icon: User },
    { role: "manufacturer", title: s.manufacturers, icon: Factory },
    { role: "admin", title: s.admins, icon: ShieldCheck },
  ] as const;

  return (
    <div className="container-page max-w-4xl py-8">
      <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
        <section className="card p-5 md:p-6">
          <h1 className="text-2xl font-extrabold">{a.title}</h1>
          <p className="mt-1 text-sm text-ink-2">{a.intro}</p>
          <div className="mt-4 space-y-3">
            <FormNotice lang={lang} sp={sp} />
            {sp.reset === "1" && <p role="status" className="rounded-lg bg-ok-50 px-3 py-2 text-sm text-ok">{t.acc.forgot.done}</p>}
          </div>
          <form action={signInWithPassword} className="mt-4 space-y-4">
            <Hidden values={{ lang, next, back: self }} />
            <Field id="si-email" name="email" type="email" label={a.email} required autoComplete="email" maxLength={200} />
            <Field id="si-password" name="password" type="password" label={a.password} required autoComplete="current-password" maxLength={200} />
            <Submit className="btn btn-primary w-full py-3">{a.submit}</Submit>
          </form>
          <p className="mt-3 text-sm">
            <Link href={href(lang, "/forgot-password")} className="font-semibold text-red-700 hover:underline">{a.forgot}</Link>
          </p>
        </section>
        <section className="card flex flex-col justify-center gap-3 bg-paper-2/60 p-5 md:p-6">
          <h2 className="text-lg font-bold">{a.noAccount}</h2>
          <p className="text-sm text-ink-2">{t.acc.register.intro}</p>
          <Link href={`${href(lang, "/register")}${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="btn btn-dark w-fit">{a.register}</Link>
        </section>
      </div>
      {actor && (
        <form action={signOut} className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-paper-2 px-3 py-2 text-sm">
          <input type="hidden" name="back" value={href(lang, "/signin")} />
          <span>{s.signedInAs(actor.name)}</span>
          <button type="submit" className="btn btn-ghost border border-line-strong px-3 py-1 text-sm">{t.market.account.signOut}</button>
        </form>
      )}
      {accounts.length > 0 && (
        <div className="mt-8 rounded-xl border-2 border-dashed border-[#d9a520] bg-[#fdf6e3] p-4" data-test-banner>
          <h2 className="flex items-center gap-2 text-base font-bold text-[#7a5300]"><FlaskConical className="h-4 w-4" aria-hidden="true" />{a.demoTitle}</h2>
          <p className="mt-1 text-sm text-[#7a5300]">{a.demoText}</p>
      <div className="mt-4 grid gap-5 md:grid-cols-3">
        {groups.map(({ role, title, icon: Icon }) => (
          <section key={role} className="card p-4">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Icon className="h-4 w-4 text-red-600" aria-hidden="true" /> {title}
            </h2>
            <ul className="mt-3 space-y-2">
              {accounts
                .filter((a) => a.role === role)
                .map((a) => {
                  const name = a.manufacturer_slug ? locMaker(getManufacturer(a.manufacturer_slug)!, lang).name : a.name;
                  return (
                    <li key={a.id}>
                      <form action={signInAs}>
                        <input type="hidden" name="user" value={a.id} />
                        <input type="hidden" name="lang" value={lang} />
                        <input type="hidden" name="next" value={next} />
                        <input type="hidden" name="back" value={href(lang, "/signin")} />
                        <button type="submit" className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition hover:border-red-300 hover:bg-red-50 ${actor?.id === a.id ? "border-red-400 bg-red-50" : "border-line"}`}>
                          <span className="font-semibold text-ink">{name}</span>
                          <span className="block text-xs text-muted">{s.as}</span>
                        </button>
                      </form>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>
        </div>
      )}
    </div>
  );
}
