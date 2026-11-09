"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { href as langHref, stripLang } from "@/i18n/config";

const ITEMS = [
  ["/admin", "overview"],
  ["/admin/orders", "orders"],
  ["/admin/payments", "payments"],
  ["/admin/settlements", "settlements"],
  ["/admin/refunds", "refunds"],
  ["/admin/settings", "settings"],
  ["/admin/delivery", "delivery"],
] as const;

export function AdminNav() {
  const { lang, t } = useI18n();
  const path = stripLang(usePathname());
  return (
    <nav aria-label="Admin" className="border-b border-line bg-surface">
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
                {t.market.admin.nav[key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
