"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, UserRound } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { href } from "@/i18n/config";

type Me = { user: { name: string; role: "customer" | "manufacturer" | "admin" } | null; unread: number };

/** Sign-in link, or the signed-in user's account link and notification bell. Loaded after the page, so pages stay fast. */
export function AccountMenu() {
  const { lang, t } = useI18n();
  const a = t.market.account;
  const path = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Me | null) => live && setMe(d))
      .catch(() => live && setMe(null));
    return () => {
      live = false;
    };
  }, [path]);

  if (!me?.user)
    return (
      <div className="flex items-center gap-1" data-island="account">
        <Link href={href(lang, "/signin")} className="btn btn-ghost px-2 text-sm sm:px-3" aria-label={a.signIn}>
          <UserRound className="h-5 w-5" aria-hidden="true" />
          <span className="hidden sm:inline">{a.signIn}</span>
        </Link>
        <Link href={href(lang, "/register")} className="btn btn-primary px-2 py-1.5 text-[0.8125rem] min-[400px]:px-2.5 min-[400px]:text-sm sm:px-3">
          {a.register}
        </Link>
      </div>
    );

  const home = me.user.role === "customer" ? "/account" : me.user.role === "manufacturer" ? "/seller/orders" : "/admin";
  const homeLabel = me.user.role === "customer" ? a.myOrders : me.user.role === "manufacturer" ? a.sellerPortal : a.admin;
  return (
    <div className="flex items-center" data-island="account">
      <Link href={href(lang, "/account/notifications")} className="btn btn-ghost relative px-2.5" aria-label={`${a.notifications}${me.unread ? `, ${a.unread(me.unread)}` : ""}`}>
        <Bell className="h-5 w-5" aria-hidden="true" />
        {me.unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white">{me.unread > 99 ? "99+" : me.unread}</span>
        )}
      </Link>
      <Link href={href(lang, home)} className="btn btn-ghost px-3 text-sm" title={me.user.name}>
        <UserRound className="h-5 w-5" aria-hidden="true" />
        <span className="hidden max-w-[9rem] truncate lg:inline">{homeLabel}</span>
      </Link>
    </div>
  );
}
