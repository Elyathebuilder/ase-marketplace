import { redirect } from "next/navigation";
import { href, isLang } from "@/i18n";

/** Old address of a seller's order page: kept so earlier links and notifications still work. */
export default async function OldMakerOrderPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  redirect(href(isLang(lang) ? lang : "ka", `/seller/orders/${encodeURIComponent(id)}`));
}
