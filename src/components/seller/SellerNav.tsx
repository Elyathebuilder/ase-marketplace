"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, Building2, ClipboardList, FileCheck2, FileText, LayoutDashboard, Package, Wallet } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { href as langHref, stripLang } from "@/i18n/config";

type Key = "overview" | "products" | "profile" | "badge" | "application" | "orderList" | "finances" | "quotes";
type Item = { href: string; key: Key; icon: typeof Package };

/** Portal A (the store) and Portal B (orders and money) are kept apart, as two groups. */
const GROUPS: { key: "store" | "orders"; items: Item[] }[] = [
  {
    key: "store",
    items: [
      { href: "/seller", key: "overview", icon: LayoutDashboard },
      { href: "/seller/products", key: "products", icon: Package },
      { href: "/seller/company", key: "profile", icon: Building2 },
      { href: "/seller/verification", key: "badge", icon: BadgeCheck },
      { href: "/seller/application", key: "application", icon: FileCheck2 },
    ],
  },
  {
    key: "orders",
    items: [
      { href: "/seller/orders", key: "orderList", icon: ClipboardList },
      { href: "/seller/finances", key: "finances", icon: Wallet },
      { href: "/seller/quotes", key: "quotes", icon: FileText },
    ],
  },
];

export function SellerNav({ newOrders = 0 }: { newOrders?: number }) {
  const { lang, t } = useI18n();
  const n = t.sell.nav;
  const path = stripLang(usePathname());
  return (
    <nav aria-label={n.label}>
      {/* Phones: one scrolling row per portal, so both the store and the orders are visible at once. */}
      <div className="space-y-2 lg:space-y-4">
        {GROUPS.map((g) => (
          <div key={g.key}>
            <p className="px-1 pb-1 text-xs font-bold uppercase tracking-wider text-muted lg:px-3">{n[g.key]}</p>
            <ul className="scroll-row auto-cols-max gap-1 lg:block lg:space-y-0.5 lg:overflow-visible">
              {g.items.map(({ href, key, icon: Icon }) => {
                const active = href === "/seller" ? path === href : path.startsWith(href);
                const badge = key === "orderList" ? newOrders : 0;
                return (
                  <li key={href}>
                    <Link
                      href={langHref(lang, href)}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${active ? "bg-ink text-white" : "text-ink-2 hover:bg-paper-2 hover:text-ink"}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="whitespace-nowrap">{n[key]}</span>
                      {badge ? <span className="ml-auto rounded-full bg-red-600 px-1.5 text-xs text-white">{badge}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
