"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { LANGS, LANG_COOKIE, LANG_NAMES, href, stripLang, type Lang } from "@/i18n/config";

/** Remember the choice for later visits, and in the profile when someone is signed in. */
function remember(l: Lang) {
  try {
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    navigator.sendBeacon?.("/api/account/language", new Blob([JSON.stringify({ lang: l })], { type: "application/json" }));
  } catch {
    // The link still works without the cookie.
  }
}

/** ქართული | English | Русский | Türkçe | Հայերեն. Keeps the visitor on the same page. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, t } = useI18n();
  const path = stripLang(usePathname());
  return (
    <nav aria-label={t.common.language} className={`flex flex-wrap items-center justify-end gap-y-1 text-xs font-semibold ${className}`}>
      {LANGS.map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && <span className="px-1.5 text-line-strong" aria-hidden="true">|</span>}
          {/* A full page load, so every server-rendered text switches language. */}
          <a
            href={href(l, path)}
            hrefLang={l}
            lang={l}
            onClick={() => remember(l)}
            aria-current={l === lang ? "true" : undefined}
            className={l === lang ? "text-ink underline decoration-red-600 decoration-2 underline-offset-4" : "text-muted hover:text-ink"}
          >
            {LANG_NAMES[l]}
          </a>
        </span>
      ))}
    </nav>
  );
}
