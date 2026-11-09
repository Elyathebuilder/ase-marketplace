import type { Metadata } from "next";
import { LiveFinance } from "@/components/market/maker";
import { getDict, isLang } from "@/i18n";
import { sellerSession } from "@/lib/market/seller-page";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").seller.finances.title };
}

/** Portal B: the seller's own sales, commission and payouts. Read-only: only administrators change money records. */
export default async function FinancesPage({ params }: { params: Params }) {
  const { lang } = await pageLang(params);
  const session = await sellerSession();
  if (!session) return null;
  return <LiveFinance actor={session.actor} lang={lang} />;
}
