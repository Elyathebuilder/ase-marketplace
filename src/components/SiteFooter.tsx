import Link from "next/link";
import { getCategories } from "@/lib/catalog";
import { getDict, href, locCategory, type Lang } from "@/i18n";
import { Logo } from "./Logo";

export function SiteFooter({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  const f = t.footer;
  const cats = getCategories().slice(0, 7).map((c) => locCategory(c, lang));
  const to = (p: string) => href(lang, p);
  return (
    <footer className="mt-16 bg-ink text-white/75">
      <div className="h-1 bg-red-600" />
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo inverted lang={lang} />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">{f.about}</p>
          <p className="mt-4 font-[family-name:var(--font-display)] text-lg font-bold text-white">{f.slogan}</p>
        </div>
        <FooterCol title={f.shop}>
          <FooterLink href={to("/products")}>{f.allProducts}</FooterLink>
          {cats.map((c) => (
            <FooterLink key={c.slug} href={to(`/categories/${c.slug}`)}>{c.name}</FooterLink>
          ))}
        </FooterCol>
        <FooterCol title={f.business}>
          <FooterLink href={to("/b2b")}>{f.b2b}</FooterLink>
          <FooterLink href={to("/b2b#rfq")}>{f.rfq}</FooterLink>
          <FooterLink href={to("/manufacturers")}>{f.directory}</FooterLink>
          <FooterLink href={to("/about#sell")}>{f.sell}</FooterLink>
          <FooterLink href={to("/seller")}>{f.sellerPortal}</FooterLink>
          <FooterLink href={to("/about#verification")}>{f.verification}</FooterLink>
        </FooterCol>
        <FooterCol title={f.company}>
          <FooterLink href={to("/about")}>{f.aboutUs}</FooterLink>
          <FooterLink href={to("/about#delivery")}>{f.delivery}</FooterLink>
          <FooterLink href={to("/about#policies")}>{f.policies}</FooterLink>
          <li className="pt-2 text-sm">{f.city}</li>
          <li className="text-sm">hello@bazari.demo</li>
        </FooterCol>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Bazari. {f.rights}</p>
          <p>{f.currency}</p>
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
