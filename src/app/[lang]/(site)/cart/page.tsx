import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CartView } from "@/components/cart/CartView";
import { getDict, href, isLang } from "@/i18n";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").cart.title, robots: { index: false } };
}

export default async function CartPage({ params }: { params: Params }) {
  const { lang, t } = await pageLang(params);
  return (
    <div className="container-page py-6 md:py-8">
      <Breadcrumbs label={t.common.breadcrumb} items={[{ label: t.common.home, href: href(lang, "/") }, { label: t.cart.title }]} />
      <h1 className="mt-2 mb-6 text-2xl font-extrabold md:text-3xl">{t.cart.title}</h1>
      <CartView />
    </div>
  );
}
