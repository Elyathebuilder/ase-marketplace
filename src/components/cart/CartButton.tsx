"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { href } from "@/i18n/config";
import { useCart } from "@/lib/cart";

export function CartButton() {
  const { lang, t } = useI18n();
  const count = useCart().reduce((s, l) => s + l.qty, 0);
  return (
    <Link href={href(lang, "/cart")} data-island="cart-button" className="btn btn-ghost relative px-2 text-sm min-[400px]:px-3" aria-label={`${t.header.cart}${count ? ` (${count})` : ""}`}>
      <ShoppingCart className="h-5 w-5" aria-hidden="true" />
      <span className="hidden sm:inline">{t.header.cart}</span>
      {count > 0 && (
        <span data-cart-count className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
