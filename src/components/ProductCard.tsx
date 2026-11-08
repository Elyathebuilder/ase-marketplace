import Link from "next/link";
import { MapPin } from "lucide-react";
import { availabilityOf, manufacturerOf } from "@/lib/catalog";
import { getDict, href, locMaker, locProduct, type Lang } from "@/i18n";
import type { Product } from "@/lib/types";
import { CardPrice } from "./Price";
import { ProductImage } from "./ProductImage";
import { VerifiedBadge } from "./VerifiedBadge";

export function ProductCard({ product: raw, lang }: { product: Product; lang: Lang }) {
  const t = getDict(lang);
  const product = locProduct(raw, lang);
  const m = locMaker(manufacturerOf(raw), lang);
  const availability = availabilityOf(raw);
  return (
    <article className="card group relative flex h-full flex-col overflow-hidden transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="relative">
        <ProductImage product={product} className="aspect-[4/3]" sampleLabel={t.common.sampleImage} />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {product.buyNow && product.retailPrice != null && <span className="chip bg-white/95 text-ink shadow-sm">{t.card.buyNow}</span>}
          {product.requestQuote && <span className="chip bg-ink text-white">{t.card.wholesaleQuote}</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <h3 className="line-clamp-2 text-[0.95rem] font-semibold leading-snug text-ink">
          <Link href={href(lang, `/products/${product.slug}`)} className="after:absolute after:inset-0 group-hover:underline decoration-red-600 underline-offset-2">
            {product.name}
          </Link>
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <span className="truncate">{m.name}</span>
          {m.verification === "verified" && <VerifiedBadge status="verified" compact lang={lang} />}
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <CardPrice product={product} lang={lang} />
        </div>
        <div className="flex items-center justify-between border-t border-line pt-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {m.city}
          </span>
          <span className={availability === "made_to_order" ? "text-warn" : availability === "low_stock" ? "text-red-700" : "text-ok"}>
            {t.availability[availability]}
          </span>
        </div>
      </div>
    </article>
  );
}
