"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ClipboardList, FileText, LayoutDashboard, Package, Wallet } from "lucide-react";

const ITEMS = [
  { href: "/seller", label: "Dashboard", icon: LayoutDashboard },
  { href: "/seller/orders", label: "Orders", icon: ClipboardList, badge: 2 },
  { href: "/seller/quotes", label: "Quotations", icon: FileText, badge: 2 },
  { href: "/seller/products", label: "Products", icon: Package },
  { href: "/seller/finances", label: "Finances", icon: Wallet },
  { href: "/seller/company", label: "Company profile", icon: Building2 },
];

export function SellerNav() {
  const path = usePathname();
  return (
    <nav aria-label="Seller portal">
      <ul className="scroll-row auto-cols-max gap-1 lg:grid-flow-row lg:auto-cols-auto lg:overflow-visible">
        {ITEMS.map(({ href, label, icon: Icon, badge }) => {
          const active = href === "/seller" ? path === href : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
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
