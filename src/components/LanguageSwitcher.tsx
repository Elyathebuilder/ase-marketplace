"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { href, stripLang, type Lang } from "@/i18n/config";

const LABEL: Record<Lang, string> = { ka: "ქართული", en: "English" };

/** ქართული | English. Keeps the visitor on the same page. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, t } = useI18n();
  const path = stripLang(usePathname());
  return (
    <nav aria-label={t.common.language} className={`flex items-center text-xs font-semibold ${className}`}>
      {(["ka", "en"] as const).map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && <span className="px-1.5 text-line-strong" aria-hidden="true">|</span>}
          {/* A full page load, so every server-rendered text switches language. */}
          <a
            href={href(l, path)}
            hrefLang={l}
            lang={l}
            aria-current={l === lang ? "true" : undefined}
            className={l === lang ? "text-ink underline decoration-red-600 decoration-2 underline-offset-4" : "text-muted hover:text-ink"}
          >
            {LABEL[l]}
          </a>
        </span>
      ))}
    </nav>
  );
}
