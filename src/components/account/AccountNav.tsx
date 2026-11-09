import Link from "next/link";
import { Bell, KeyRound, LayoutGrid, MapPin, Package, UserRound } from "lucide-react";
import { getDict, href, type Lang } from "@/i18n";
import { signOutAction } from "@/lib/market/account-actions";

const ITEMS = [
  { path: "/account", key: "overview", icon: LayoutGrid },
  { path: "/account/orders", key: "orders", icon: Package },
  { path: "/account/notifications", key: "notifications", icon: Bell },
  { path: "/account/profile", key: "profile", icon: UserRound },
  { path: "/account/addresses", key: "addresses", icon: MapPin },
  { path: "/account/security", key: "security", icon: KeyRound },
] as const;

/** Customer account navigation. */
export function AccountNav({ lang, active }: { lang: Lang; active: (typeof ITEMS)[number]["key"] }) {
  const a = getDict(lang).acc.account;
  return (
    <nav aria-label={a.title} className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <ul className="flex gap-1 lg:flex-col">
        {ITEMS.map(({ path, key, icon: Icon }) => (
          <li key={key}>
            <Link
              href={href(lang, path)}
              aria-current={active === key ? "page" : undefined}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${active === key ? "bg-red-50 text-red-700" : "text-ink-2 hover:bg-paper-2"}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {a[key]}
            </Link>
          </li>
        ))}
        <li>
          <form action={signOutAction}>
            <input type="hidden" name="back" value={href(lang, "/")} />
            <button type="submit" className="flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-paper-2 hover:text-red-700">
              {a.signOut}
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}

/** Two-column account page: navigation on the left (top on phones). */
export function AccountShell({ lang, active, children }: { lang: Lang; active: (typeof ITEMS)[number]["key"]; children: React.ReactNode }) {
  return (
    <div className="container-page grid gap-6 py-6 md:py-8 lg:grid-cols-[13rem_1fr]">
      <aside className="min-w-0 lg:sticky lg:top-32 lg:self-start">
        <AccountNav lang={lang} active={active} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
