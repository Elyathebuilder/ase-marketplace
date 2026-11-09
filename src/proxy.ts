import { NextResponse, type NextRequest } from "next/server";

/**
 * Georgian is the default language and lives at the plain URLs (/, /products …).
 * English lives under /en (/en, /en/products …).
 * Internally every page sits under /[lang], so plain URLs are rewritten to /ka/….
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/en" || pathname.startsWith("/en/")) return NextResponse.next({ request: { headers: withLang(request, "en") } });

  // /ka/… is the internal path; show visitors the clean URL instead.
  if (pathname === "/ka" || pathname.startsWith("/ka/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url);
  }

  const url = request.nextUrl.clone();
  url.pathname = `/ka${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url, { request: { headers: withLang(request, "ka") } });
}

/** Tells pages without route params (the 404 page) which language to use, and which path was asked for. */
function withLang(request: NextRequest, lang: "ka" | "en") {
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
