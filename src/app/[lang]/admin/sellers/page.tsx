import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { FormNotice, Table, when } from "@/components/market/ui";
import { StatusChip } from "@/components/seller/kit";
import { getDict, href, isLang, place } from "@/i18n";
import { adminOrNull } from "@/lib/market/auth";
import { adminSellerList } from "@/lib/market/sellers";
import { market } from "@/lib/market/server";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").adm.sellers.title };
}

const FILTERS = ["open", "all", "approved", "draft", "rejected", "suspended"] as const;

export default async function AdminSellers({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const admin = await adminOrNull();
  if (!admin) return null;
  const sp = await searchParams;
  const a = t.adm.sellers;
  const s = t.sell;
  const filter = typeof sp.filter === "string" && (FILTERS as readonly string[]).includes(sp.filter) ? sp.filter : "open";
  const rows = adminSellerList(market(), admin, filter);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold md:text-3xl">{a.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-2">{a.intro}</p>
      </div>
      <FormNotice lang={lang} sp={sp} />
      <nav className="flex flex-wrap gap-2" aria-label={a.title}>
        {FILTERS.map((f) => (
          <Link key={f} href={`${href(lang, "/admin/sellers")}?filter=${f}`} aria-current={f === filter ? "page" : undefined} className={`rounded-full border px-3 py-1 text-sm font-semibold ${f === filter ? "border-ink bg-ink text-white" : "border-line-strong text-ink-2 hover:bg-paper-2"}`}>
            {a.filters[f]}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">{a.none}</p>
      ) : (
        <Table min="56rem" head={[a.colName, a.colType, a.colStatus, a.colBadge, a.colCity, a.colSubmitted, a.colProducts]}>
          {rows.map((r) => (
            <tr key={r.slug} data-seller={r.slug}>
              <td className="px-3 py-2">
                <Link href={href(lang, `/admin/sellers/${r.slug}`)} className="font-semibold text-red-700 hover:underline">{r.name}</Link>
                {r.is_demo === 1 && <span className="ml-1 text-xs text-muted">({a.demo})</span>}
                {r.needs_reassessment === 1 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-warn"><AlertTriangle className="h-3 w-3" aria-hidden="true" />{a.changed}</span>
                )}
                <span className="block text-xs text-muted">{r.owner_email ?? r.contact_email}</span>
              </td>
              <td className="px-3 py-2">{s.type[r.seller_type]}</td>
              <td className="px-3 py-2"><StatusChip status={r.account_status} label={s.accountStatus[r.account_status] ?? r.account_status} /></td>
              <td className="px-3 py-2"><StatusChip status={r.badge_status} label={s.badgeStatus[r.badge_status] ?? r.badge_status} /></td>
              <td className="px-3 py-2">{r.city ? place(r.city, lang) : "—"}</td>
              <td className="px-3 py-2 text-ink-2">{r.submitted_at ? when(r.submitted_at, lang, false) : "—"}</td>
              <td className="px-3 py-2 tabular-nums">{r.published}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
