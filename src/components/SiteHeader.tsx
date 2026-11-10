import Link from "next/link";
import { Factory } from "lucide-react";
import { getDict, href, type Lang } from "@/i18n";
import { CartButton } from "./cart/CartButton";
import { AccountMenu } from "./market/AccountMenu";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { NavLinks } from "./NavLinks";
import { SearchBar } from "./SearchBar";

export function SiteHeader({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/85">
      <div className="container-page flex items-center gap-1 py-3 min-[400px]:gap-2 sm:gap-3 md:gap-6">
        <MobileMenu />
        <Logo lang={lang} />
        <div className="hidden min-w-0 flex-1 md:block">
          <SearchBar lang={lang} />
        </div>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link href={href(lang, "/b2b#rfq")} className="btn btn-ghost hidden text-sm xl:inline-flex">{t.header.requestQuote}</Link>
          <AccountMenu />
          <CartButton />
          {/* Below the lg breakpoint this link is in the menu, so the header row fits in every language. */}
          <Link href={href(lang, "/about#sell")} className="btn btn-dark hidden px-3.5 text-sm lg:inline-flex">
            <Factory className="h-4 w-4" aria-hidden="true" />
            {t.header.sell}
          </Link>
        </div>
      </div>
      <div className="container-page flex items-center gap-3 pb-3 md:hidden">
        <SearchBar lang={lang} id="site-search-m" />
      </div>
      <div className="container-page flex justify-end pb-2 lg:hidden">
        <LanguageSwitcher />
      </div>
      <nav aria-label={t.nav.main} className="hidden border-t border-line lg:block">
        <div className="container-page flex items-center justify-between gap-4">
          <NavLinks />
          <div className="flex items-center gap-5">
            <p className="hidden text-xs font-medium text-muted 2xl:block">
              <span className="text-red-600">●</span> {t.header.tagline}
            </p>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>
    </header>
  );
}
