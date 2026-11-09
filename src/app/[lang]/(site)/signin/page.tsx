import type { Metadata } from "next";
import { Factory, ShieldCheck, User } from "lucide-react";
import { getDict, href, isLang, locMaker } from "@/i18n";
import { getManufacturer } from "@/lib/catalog";
import { signInAs, signOut } from "@/lib/market/actions";
import { currentActor, demoAccounts } from "@/lib/market/auth";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").market.signin.title, robots: { index: false } };
}

/** Demo sign-in: pick an account. Replaced by real Supabase sign-in in Phase 2. */
export default async function SignInPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const s = t.market.signin;
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";
  const actor = await currentActor();
  const accounts = demoAccounts();
  const groups = [
    { role: "customer", title: s.customers, icon: User },
    { role: "manufacturer", title: s.manufacturers, icon: Factory },
    { role: "admin", title: s.admins, icon: ShieldCheck },
  ] as const;

  return (
    <div className="container-page max-w-4xl py-8">
      <h1 className="text-2xl font-extrabold md:text-3xl">{s.title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">{s.intro}</p>
      {actor && (
        <form action={signOut} className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-paper-2 px-3 py-2 text-sm">
          <input type="hidden" name="back" value={href(lang, "/signin")} />
          <span>{s.signedInAs(actor.name)}</span>
          <button type="submit" className="btn btn-ghost border border-line-strong px-3 py-1 text-sm">{t.market.account.signOut}</button>
        </form>
      )}
      <div className="mt-6 grid gap-5 md:grid-cols-3">
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
  );
}
