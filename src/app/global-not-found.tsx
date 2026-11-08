import type { Metadata } from "next";
import { headers } from "next/headers";
import { DemoNotice } from "@/components/DemoNotice";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getDict, href } from "@/i18n";
import { I18nProvider } from "@/i18n/client";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = { title: "404 · ASE", robots: { index: false } };

/** The site's own "page not found", in the visitor's language, with the normal header and footer. */
export default async function GlobalNotFound() {
  const lang = (await headers()).get("x-ase-lang") === "en" ? "en" : "ka";
  const t = getDict(lang);
  return (
    <html lang={lang} className={fontVariables}>
      <body className="flex min-h-dvh flex-col">
        <I18nProvider lang={lang}>
          <DemoNotice lang={lang} />
          <SiteHeader lang={lang} />
          <main id="main" className="flex-1">
            <div className="container-page flex flex-col items-center py-24 text-center">
              <p className="eyebrow">404</p>
              <h1 className="mt-2 text-3xl font-extrabold">{t.notFound.title}</h1>
              <p className="mt-2 text-ink-2">{t.notFound.text}</p>
              <div className="mt-6 flex gap-3">
                <a href={href(lang, "/")} className="btn btn-dark">{t.common.home}</a>
                <a href={href(lang, "/products")} className="btn btn-outline">{t.notFound.browse}</a>
              </div>
            </div>
          </main>
          <SiteFooter lang={lang} />
        </I18nProvider>
      </body>
    </html>
  );
}
