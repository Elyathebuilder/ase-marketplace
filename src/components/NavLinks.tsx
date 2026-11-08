"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { href, stripLang } from "@/i18n/config";
import { NAV } from "./nav";

export function NavLinks() {
  const { lang, t } = useI18n();
  const pathname = stripLang(usePathname());
  return (
    <ul className="flex items-center gap-1">
      {NAV.map((item) => {
        const active = item.path === "/" ? pathname === "/" : pathname.startsWith(item.path);
        return (
          <li key={item.path}>
            <Link
              href={href(lang, item.path)}
              aria-current={active ? "page" : undefined}
              className={`relative inline-block whitespace-nowrap px-3 py-2.5 text-sm font-semibold transition-colors ${
                active ? "text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-red-600" : "text-ink-2 hover:text-red-600"
              }`}
            >
              {t.nav[item.key]}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
