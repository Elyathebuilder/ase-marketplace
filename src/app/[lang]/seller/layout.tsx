import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ManufacturerLogo } from "@/components/ManufacturerLogo";
import { SellerNav } from "@/components/seller/SellerNav";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { demoSeller } from "@/lib/seller-demo";
import { getDict, href, isLang, locMaker } from "@/i18n";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  const title = getDict(isLang(lang) ? lang : "ka").meta.sellerTitle;
  return { title: { default: title, template: `%s · ${title} · ASE` }, robots: { index: false } };
}

export default async function SellerLayout({ children, params }: { children: React.ReactNode; params: Params }) {
  const { lang, t } = await pageLang(params);
  const s = t.seller;
  const raw = demoSeller();
  const m = locMaker(raw, lang);
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <div className="bg-red-600 text-center text-xs text-white">
        <p className="container-page py-1.5">
          <span className="font-bold">{s.banner}</span> {s.bannerText}
        </p>
      </div>
      <header className="border-b border-line bg-surface">
        <div className="container-page flex items-center gap-3 py-3">
          <Logo lang={lang} />
          <span className="rounded-md bg-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white">{s.badge}</span>
          <div className="ml-auto flex items-center gap-3">
            <LanguageSwitcher className="hidden sm:flex" />
            <Link href={href(lang, `/manufacturers/${m.slug}`)} className="hidden items-center gap-1 text-sm font-semibold text-ink-2 hover:text-red-600 sm:inline-flex">
              {s.publicPage} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <div className="flex items-center gap-2">
              <ManufacturerLogo m={raw} size="sm" />
              <div className="hidden leading-tight md:block">
                <p className="text-sm font-semibold text-ink">{m.name}</p>
                <p className="text-xs text-muted">{s.demoAccount}</p>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="container-page grid flex-1 gap-6 py-4 lg:grid-cols-[14rem_1fr] lg:py-8">
        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <LanguageSwitcher className="mb-3 sm:hidden" />
          <SellerNav />
          <div className="mt-6 hidden rounded-xl border border-line bg-surface p-3 lg:block">
            <VerifiedBadge status={m.verification} lang={lang} />
            <p className="mt-2 text-xs text-muted">{s.verifiedHint}</p>
          </div>
        </aside>
        <main id="main" className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
