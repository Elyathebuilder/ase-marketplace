import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { I18nProvider } from "@/i18n/client";
import { LANGS, getDict, isLang } from "@/i18n";
import { fontVariables } from "../fonts";
import "../globals.css";

/** Unknown addresses show the site's 404 page. */
export const dynamicParams = false;

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = getDict(isLang(lang) ? lang : "ka");
  return {
    title: { default: t.meta.title, template: "%s · ASE" },
    description: t.meta.description,
    alternates: { languages: { ka: "/", en: "/en" } },
  };
}

export const viewport: Viewport = { themeColor: "#faf8f4" };

export default async function RootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = getDict(lang);
  return (
    <html lang={lang} className={fontVariables}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 btn btn-dark">{t.common.skip}</a>
        <I18nProvider lang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
