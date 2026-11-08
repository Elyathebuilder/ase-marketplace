import Link from "next/link";
import { getCategories } from "@/lib/catalog";
import { Logo } from "./Logo";

export function SiteFooter() {
  const cats = getCategories().slice(0, 7);
  return (
    <footer className="mt-16 bg-ink text-white/75">
      <div className="h-1 bg-red-600" />
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo inverted />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            The marketplace for products physically manufactured in Georgia. Buy direct, source wholesale, and discover the companies that make them.
          </p>
          <p className="mt-4 font-[family-name:var(--font-display)] text-lg font-bold text-white">You manufacture. We sell.</p>
        </div>
        <FooterCol title="Shop">
          <FooterLink href="/products">All products</FooterLink>
          {cats.map((c) => (
            <FooterLink key={c.slug} href={`/categories/${c.slug}`}>{c.name}</FooterLink>
          ))}
        </FooterCol>
        <FooterCol title="Business">
          <FooterLink href="/b2b">B2B / Wholesale</FooterLink>
          <FooterLink href="/b2b#rfq">Request a quotation</FooterLink>
          <FooterLink href="/manufacturers">Manufacturer directory</FooterLink>
          <FooterLink href="/about#sell">Sell on ASE</FooterLink>
          <FooterLink href="/seller">Seller portal (preview)</FooterLink>
          <FooterLink href="/about#verification">How we verify manufacturers</FooterLink>
        </FooterCol>
        <FooterCol title="Company">
          <FooterLink href="/about">About us</FooterLink>
          <FooterLink href="/about#delivery">Delivery</FooterLink>
          <FooterLink href="/about#policies">Terms & policies</FooterLink>
          <li className="pt-2 text-sm">Tbilisi, Georgia</li>
          <li className="text-sm">hello@ase.demo</li>
        </FooterCol>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} ASE. Preview build with demo data.</p>
          <p>Prices in Georgian lari (₾).</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white">{title}</h2>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm hover:text-white hover:underline decoration-red-500 underline-offset-4">
        {children}
      </Link>
    </li>
  );
}
