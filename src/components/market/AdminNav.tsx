"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { href as langHref, stripLang } from "@/i18n/config";

const ITEMS = [
  ["/admin", "overview"],
  ["/admin/sellers", "sellers"],
  ["/admin/badges", "badges"],
  ["/admin/products", "products"],
  ["/admin/orders", "orders"],
  ["/admin/payments", "payments"],
  ["/admin/settlements", "settlements"],
  ["/admin/refunds", "refunds"],
  ["/admin/settings", "settings"],
  ["/admin/delivery", "delivery"],
  ["/admin/accounts", "accounts"],
  ["/admin/emails", "emails"],
] as const;

export function AdminNav() {
  const { lang, t } = useI18n();
  const path = stripLang(usePathname());
  return (
    <nav aria-label="Admin" className="border-b border-line bg-surface" data-island="admin-nav">
      <ul className="container-page scroll-row auto-cols-max gap-1 py-1.5">
        {ITEMS.map(([href, key]) => {
          const active = href === "/admin" ? path === href : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={langHref(lang, href)}
                aria-current={active ? "page" : undefined}
                className={`inline-flex rounded-lg px-3 py-1.5 text-sm font-semibold ${active ? "bg-ink text-white" : "text-ink-2 hover:bg-paper-2 hover:text-ink"}`}
              >
                {key in t.adm.nav ? t.adm.nav[key as keyof typeof t.adm.nav] : t.market.admin.nav[key as keyof typeof t.market.admin.nav]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
