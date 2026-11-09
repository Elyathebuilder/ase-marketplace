import type { Metadata } from "next";
import Link from "next/link";
import { Submit } from "@/components/forms/Submit";
import { FormNotice, Table, when } from "@/components/market/ui";
import { StatusChip } from "@/components/seller/kit";
import { getDict, href, isLang } from "@/i18n";
import { adminUsers } from "@/lib/market/accounts";
import { adminAccountAction } from "@/lib/market/account-actions";
import { adminOrNull } from "@/lib/market/auth";
import { market } from "@/lib/market/server";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").adm.accounts.title };
}

const FILTERS = ["all", "customer", "manufacturer", "admin"] as const;

/** Admin: every account, with suspend and reactivate. Passwords and tokens are never shown. */
export default async function AdminAccounts({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const admin = await adminOrNull();
  if (!admin) return null;
  const sp = await searchParams;
  const a = t.adm.accounts;
  const role = typeof sp.role === "string" && (FILTERS as readonly string[]).includes(sp.role) ? sp.role : "all";
  const self = `${href(lang, "/admin/accounts")}?role=${role}`;
  const rows = adminUsers(market(), admin, role);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold md:text-3xl">{a.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-2">{a.intro}</p>
      </div>
      <FormNotice lang={lang} sp={sp} />
      <nav className="flex flex-wrap gap-2" aria-label={a.title}>
        {FILTERS.map((f) => (
          <Link key={f} href={`${href(lang, "/admin/accounts")}?role=${f}`} aria-current={f === role ? "page" : undefined} className={`rounded-full border px-3 py-1 text-sm font-semibold ${f === role ? "border-ink bg-ink text-white" : "border-line-strong text-ink-2 hover:bg-paper-2"}`}>
            {a.filters[f]}
          </Link>
        ))}
      </nav>
      <Table min="52rem" head={[a.colName, a.colEmail, a.colRole, a.colStatus, a.colCreated, a.colOrders, ""]}>
        {rows.map((u) => (
          <tr key={u.id} data-user={u.id}>
            <td className="px-3 py-2 font-semibold">
              {u.manufacturer_slug ? <Link href={href(lang, `/admin/sellers/${u.manufacturer_slug}`)} className="text-red-700 hover:underline">{u.name}</Link> : u.name}
              {u.is_demo === 1 && <span className="ml-1 text-xs font-normal text-muted">({t.adm.sellers.demo})</span>}
            </td>
            <td className="px-3 py-2">
              {u.email}
              <span className={`block text-xs ${u.email_verified_at ? "text-ok" : "text-warn"}`}>{u.email_verified_at ? a.verified : a.notVerified}</span>
            </td>
            <td className="px-3 py-2">{t.market.roles[u.role as "admin"]}</td>
            <td className="px-3 py-2">
              <StatusChip status={u.status === "active" ? "approved_company" : "suspended"} label={u.status === "active" ? a.active : a.suspended} />
              {u.status_reason && <span className="block text-xs text-muted">{u.status_reason}</span>}
            </td>
            <td className="px-3 py-2 text-ink-2">{u.created_at ? when(u.created_at, lang, false) : "—"}</td>
            <td className="px-3 py-2 tabular-nums">{u.orders}</td>
            <td className="px-3 py-2">
              {u.id !== admin.id && (
                <details>
                  <summary className="cursor-pointer list-none text-sm font-semibold text-ink-2 hover:underline">{u.status === "active" ? a.suspend : a.reactivate}</summary>
                  <form action={adminAccountAction} className="mt-2 space-y-2">
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="status" value={u.status === "active" ? "suspended" : "active"} />
                    <input type="hidden" name="back" value={self} />
                    <label className="sr-only" htmlFor={`acc-${u.id}`}>{a.reason}</label>
                    <input id={`acc-${u.id}`} name="reason" required={u.status === "active"} maxLength={500} placeholder={a.reason} className="input" />
                    <Submit className={`btn ${u.status === "active" ? "btn-primary" : "btn-dark"} px-3 py-1 text-sm`}>{u.status === "active" ? a.suspend : a.reactivate}</Submit>
                  </form>
                </details>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
