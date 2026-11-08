import { notFound } from "next/navigation";
import { getDict, isLang, type Lang } from "@/i18n";

/** Read and validate the [lang] route param in a server component. */
export async function pageLang(params: Promise<{ lang: string }>): Promise<{ lang: Lang; t: ReturnType<typeof getDict> }> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return { lang, t: getDict(lang) };
}
