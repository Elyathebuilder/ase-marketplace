import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ManufacturerLogo } from "@/components/ManufacturerLogo";
import { SellerNav } from "@/components/seller/SellerNav";
import { StatusChip } from "@/components/seller/kit";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { VerifyBanner } from "@/components/account/VerifyBanner";
import { signOutAction } from "@/lib/market/account-actions";
import { currentActor } from "@/lib/market/auth";
import { fileUrl, isApproved } from "@/lib/market/catalog-store";
import { sellerSession } from "@/lib/market/seller-page";
import { market } from "@/lib/market/server";
import { getDict, href, isLang } from "@/i18n";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  const title = getDict(isLang(lang) ? lang : "ka").meta.sellerTitle;
  return { title: { default: title, template: `%s · ${title} · Bazari` }, robots: { index: false } };
}

/**
 * The seller portal. Only a signed-in seller sees it, and only its own store: everything shown
 * comes from the database through services that check the seller again on every request.
 */
export default async function SellerLayout({ children, params }: { children: React.ReactNode; params: Params }) {
  const { lang, t } = await pageLang(params);
  const s = t.sell;
  const session = await sellerSession();

  if (!session) {
    const other = await currentActor();
    return (
      <div className="flex min-h-dvh flex-col bg-paper">
        <header className="border-b border-line bg-surface">
          <div className="container-page flex items-center gap-3 py-3">
            <Logo lang={lang} />
            <LanguageSwitcher className="ml-auto" />
          </div>
        </header>
        <main id="main" className="container-page flex-1 py-10">
          <section className="card mx-auto max-w-lg p-6" data-seller-gate>
            <h1 className="text-xl font-extrabold">{s.gate.title}</h1>
            <p className="mt-1 text-sm text-ink-2">{other ? s.gate.notSeller : s.gate.text}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`${href(lang, "/signin")}?next=${encodeURIComponent(href(lang, "/seller"))}`} className="btn btn-primary">{t.acc.signin.submit}</Link>
              <Link href={href(lang, "/register/seller")} className="btn btn-dark">{s.gate.register}</Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const { store } = session;
  const approved = isApproved(store.account_status);
  const newOrders = (
    market().db.prepare("SELECT COUNT(*) AS n FROM fulfillments WHERE manufacturer_slug = ? AND status = 'new'").get(store.slug) as { n: number }
  ).n;
  const logo = { monogram: store.monogram || store.name.slice(0, 2).toUpperCase(), logoUrl: store.logo_file ? fileUrl(store.logo_file) : null };

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="container-page flex items-center gap-3 py-3">
          <Logo lang={lang} />
          <span className="hidden rounded-md bg-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white sm:inline">{t.seller.badge}</span>
          <div className="ml-auto flex items-center gap-3">
            <LanguageSwitcher className="hidden sm:flex" />
            {approved && (
              <Link href={href(lang, `/manufacturers/${store.slug}`)} className="hidden items-center gap-1 text-sm font-semibold text-ink-2 hover:text-red-600 md:inline-flex">
                {s.nav.publicPage} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
            <div className="flex items-center gap-2">
              <ManufacturerLogo m={logo} size="sm" />
              <div className="leading-tight">
                <p className="max-w-[10rem] truncate text-sm font-semibold text-ink">{store.name}</p>
                <form action={signOutAction}>
                  <input type="hidden" name="back" value={href(lang, "/")} />
                  <button type="submit" className="text-xs text-muted hover:text-red-600 hover:underline">{t.market.account.signOut}</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="container-page grid flex-1 gap-6 py-4 lg:grid-cols-[14rem_1fr] lg:py-8">
        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <LanguageSwitcher className="mb-3 sm:hidden" />
          <SellerNav newOrders={newOrders} />
          <div className="mt-6 hidden space-y-2 rounded-xl border border-line bg-surface p-3 lg:block">
            <StatusChip wrap status={store.account_status} label={s.accountStatus[store.account_status] ?? store.account_status} />
            {store.badge_status === "verified" && <VerifiedBadge status="verified" lang={lang} />}
          </div>
        </aside>
        <main id="main" className="min-w-0 space-y-4">
          {!session.verified && <VerifyBanner lang={lang} back={href(lang, "/seller")} seller />}
          {children}
        </main>
      </div>
    </div>
  );
}
