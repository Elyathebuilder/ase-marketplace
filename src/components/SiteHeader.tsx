import Link from "next/link";
import { Factory } from "lucide-react";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { NavLinks } from "./NavLinks";
import { SearchBar } from "./SearchBar";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/85">
      <div className="container-page flex items-center gap-3 py-3 md:gap-6">
        <MobileMenu />
        <Logo />
        <div className="hidden flex-1 md:block">
          <SearchBar />
        </div>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link href="/b2b#rfq" className="btn btn-ghost hidden text-sm xl:inline-flex">Request a quote</Link>
          <Link href="/about#sell" className="btn btn-dark px-3.5 text-sm">
            <Factory className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sell on ASE</span>
            <span className="sm:hidden">Sell</span>
          </Link>
        </div>
      </div>
      <div className="container-page pb-3 md:hidden">
        <SearchBar />
      </div>
      <nav aria-label="Main" className="hidden border-t border-line lg:block">
        <div className="container-page flex items-center justify-between">
          <NavLinks />
          <p className="text-xs font-medium text-muted">
            <span className="text-red-600">●</span> Made in Georgia · Direct from manufacturers
          </p>
        </div>
      </nav>
    </header>
  );
}
