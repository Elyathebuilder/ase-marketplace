import { DemoNotice } from "@/components/DemoNotice";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { pageLang } from "@/lib/page-lang";

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await pageLang(params);
  return (
    <>
      <DemoNotice lang={lang} />
      <SiteHeader lang={lang} />
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter lang={lang} />
    </>
  );
}
