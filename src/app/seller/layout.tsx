import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ManufacturerLogo } from "@/components/ManufacturerLogo";
import { SellerNav } from "@/components/seller/SellerNav";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { demoSeller } from "@/lib/seller-demo";

export const metadata: Metadata = { title: { default: "Seller portal", template: "%s · Seller portal · ASE" }, robots: { index: false } };

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const m = demoSeller();
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <div className="bg-red-600 text-center text-xs text-white">
        <p className="container-page py-1.5">
          <span className="font-bold">Seller portal preview.</span> This shows the design with demo data. Buttons don&apos;t save anything yet.
        </p>
      </div>
      <header className="border-b border-line bg-surface">
        <div className="container-page flex items-center gap-3 py-3">
          <Logo />
          <span className="rounded-md bg-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white">Seller</span>
          <div className="ml-auto flex items-center gap-3">
            <Link href={`/manufacturers/${m.slug}`} className="hidden items-center gap-1 text-sm font-semibold text-ink-2 hover:text-red-600 sm:inline-flex">
              View my public page <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <div className="flex items-center gap-2">
              <ManufacturerLogo m={m} size="sm" />
              <div className="hidden leading-tight md:block">
                <p className="text-sm font-semibold text-ink">{m.name}</p>
                <p className="text-xs text-muted">Demo account</p>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="container-page grid flex-1 gap-6 py-4 lg:grid-cols-[14rem_1fr] lg:py-8">
        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <SellerNav />
          <div className="mt-6 hidden rounded-xl border border-line bg-surface p-3 lg:block">
            <VerifiedBadge status={m.verification} />
            <p className="mt-2 text-xs text-muted">Your products show the verified badge to buyers.</p>
          </div>
        </aside>
        <main id="main" className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
