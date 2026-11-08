import Link from "next/link";
import { headers } from "next/headers";
import { getDict, href } from "@/i18n";

export default async function NotFound() {
  const lang = (await headers()).get("x-ase-lang") === "en" ? "en" : "ka";
  const t = getDict(lang);
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-3xl font-extrabold">{t.notFound.title}</h1>
      <p className="mt-2 text-ink-2">{t.notFound.text}</p>
      <div className="mt-6 flex gap-3">
        <Link href={href(lang, "/")} className="btn btn-dark">{t.common.home}</Link>
        <Link href={href(lang, "/products")} className="btn btn-outline">{t.notFound.browse}</Link>
      </div>
    </div>
  );
}
