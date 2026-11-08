"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ClipboardList, FileText, LayoutDashboard, Package, Wallet } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { href as langHref, stripLang } from "@/i18n/config";

const ITEMS: { href: string; key: "dashboard" | "orders" | "quotes" | "products" | "finances" | "company"; icon: typeof Package; badge?: number }[] = [
  { href: "/seller", key: "dashboard", icon: LayoutDashboard },
  { href: "/seller/orders", key: "orders", icon: ClipboardList, badge: 2 },
  { href: "/seller/quotes", key: "quotes", icon: FileText, badge: 2 },
  { href: "/seller/products", key: "products", icon: Package },
  { href: "/seller/finances", key: "finances", icon: Wallet },
  { href: "/seller/company", key: "company", icon: Building2 },
];

export function SellerNav() {
  const { lang, t } = useI18n();
  const path = stripLang(usePathname());
  return (
    <nav aria-label={t.seller.navLabel}>
      <ul className="scroll-row auto-cols-max gap-1 lg:grid-flow-row lg:auto-cols-auto lg:overflow-visible">
        {ITEMS.map(({ href, key, icon: Icon, badge }) => {
          const label = t.seller.nav[key];
          const active = href === "/seller" ? path === href : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={langHref(lang, href)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  active ? "bg-ink text-white" : "text-ink-2 hover:bg-paper-2 hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{label}</span>
                {badge ? (
                  <span className={`ml-auto rounded-full px-1.5 text-xs ${active ? "bg-red-600 text-white" : "bg-red-600 text-white"}`}>{badge}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
