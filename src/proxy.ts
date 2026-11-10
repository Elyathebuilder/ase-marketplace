import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LANG, LANG_COOKIE, href, isLang, langOfPath, stripLang, type Lang } from "@/i18n/config";

/**
 * Georgian is the default language and lives at the plain URLs (/, /products …).
 * The other languages live under a prefix: /en, /ru, /tr, /hy (/ru/products …).
 * Internally every page sits under /[lang], so plain URLs are rewritten to /ka/….
 *
 * The chosen language is remembered in a cookie (set by the language switcher and at sign-in).
 * A visitor who chose, say, Russian and opens a plain (Georgian) address is sent to the Russian page.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const lang = langOfPath(pathname);

  if (lang !== DEFAULT_LANG) return NextResponse.next({ request: { headers: withLang(request, lang) } });

  // /ka/… is the internal path; show visitors the clean URL instead.
  if (pathname === `/${DEFAULT_LANG}` || pathname.startsWith(`/${DEFAULT_LANG}/`)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(DEFAULT_LANG.length + 1) || "/";
    return NextResponse.redirect(url);
  }

  const saved = request.cookies.get(LANG_COOKIE)?.value;
  if (isLang(saved) && saved !== DEFAULT_LANG && isPageVisit(request)) {
    const url = request.nextUrl.clone();
    url.pathname = href(saved, stripLang(pathname));
    return NextResponse.redirect(url, 307);
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LANG}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url, { request: { headers: withLang(request, DEFAULT_LANG) } });
}

/** A plain page load: not a form post, server action or in-app (RSC) navigation. */
function isPageVisit(request: NextRequest) {
  return (request.method === "GET" || request.method === "HEAD") && !request.headers.has("rsc") && !request.headers.has("next-action");
}

/** Tells pages without route params (the 404 page) which language to use, and which path was asked for. */
function withLang(request: NextRequest, lang: Lang) {
  const headers = new Headers(request.headers);
  headers.set("x-ase-lang", lang);
  // The visitor's own path, so a sign-in page can send them back to it.
  headers.set("x-ase-path", request.nextUrl.pathname);
  return headers;
}

export const config = {
  // Skip Next.js internals and files with an extension (images, fonts, icons).
  matcher: ["/((?!_next/|api/|.*\\.[a-zA-Z0-9]+$).*)"],
};
