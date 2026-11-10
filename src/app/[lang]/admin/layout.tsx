import type { Metadata } from "next";
import { headers } from "next/headers";
import { AdminNav } from "@/components/market/AdminNav";
import { SignInRequired } from "@/components/market/ui";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { href } from "@/i18n";
import { signOut } from "@/lib/market/actions";
import { currentActor } from "@/lib/market/auth";
import { pageLang } from "@/lib/page-lang";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Every admin page requires a signed-in administrator. Each action checks the role again on the server. */
export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang, t } = await pageLang(params);
  const actor = await currentActor();
  const isAdmin = actor?.role === "admin";
  const path = (await headers()).get("x-ase-path") ?? href(lang, "/admin");
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="container-page flex items-center gap-3 py-3">
          <Logo lang={lang} />
          <span className="rounded-md bg-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white">{t.acc.nav.admin}</span>
          <div className="ml-auto flex items-center gap-3">
            {isAdmin && (
              <form action={signOut} className="hidden items-center gap-2 text-sm text-ink-2 sm:flex">
                <input type="hidden" name="back" value={href(lang, "/signin")} />
                <span>{t.market.admin.signedIn(actor.name)}</span>
                <button type="submit" className="text-xs font-semibold text-muted hover:text-red-600 hover:underline">{t.market.account.signOut}</button>
              </form>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      </header>
      {isAdmin && <AdminNav />}
      <main id="main" className="container-page py-6 md:py-8">
        {isAdmin ? children : <SignInRequired lang={lang} text={t.market.signin.needAdmin} next={path} />}
      </main>
    </div>
  );
}
