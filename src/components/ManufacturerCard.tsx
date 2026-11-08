import Link from "next/link";
import { MapPin } from "lucide-react";
import { getCategory, productsBy } from "@/lib/catalog";
import { categoryName, getDict, href, locMaker, type Lang } from "@/i18n";
import type { Manufacturer } from "@/lib/types";
import { ManufacturerLogo } from "./ManufacturerLogo";
import { VerifiedBadge } from "./VerifiedBadge";

export function ManufacturerCard({ m: raw, lang }: { m: Manufacturer; lang: Lang }) {
  const t = getDict(lang);
  const m = locMaker(raw, lang);
  const count = productsBy(m.slug).length;
  return (
    <article className="card group relative flex h-full flex-col gap-3 p-4 transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="flex items-start gap-3">
        <ManufacturerLogo m={raw} />
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug text-ink">
            <Link href={href(lang, `/manufacturers/${m.slug}`)} className="after:absolute after:inset-0 group-hover:underline decoration-red-600 underline-offset-2">
              {m.name}
            </Link>
          </h3>
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {m.city}, {m.region}
          </p>
        </div>
      </div>
      <p className="line-clamp-2 text-sm text-ink-2">{m.tagline}</p>
      <div className="mt-auto flex flex-wrap items-center gap-1.5">
        <VerifiedBadge status={m.verification} compact lang={lang} />
        {m.categories.slice(0, 2).map((c) => (
          <span key={c} className="chip bg-paper-2 text-ink-2">{categoryName(c, getCategory(c)?.name ?? c, lang)}</span>
        ))}
      </div>
      <p className="border-t border-line pt-2 text-xs text-muted">
        {t.common.productsCount(count)} · {t.common.est(m.yearEstablished ?? "—")}
      </p>
    </article>
  );
}
