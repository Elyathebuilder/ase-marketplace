import type { Metadata } from "next";
import Link from "next/link";
import { Table, when } from "@/components/market/ui";
import { StatusChip } from "@/components/seller/kit";
import { getDict, href, isLang, place } from "@/i18n";
import { adminOrNull } from "@/lib/market/auth";
import { adminBadgeQueue } from "@/lib/market/badge";
import { market } from "@/lib/market/server";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").adm.badge.title };
}

/** Admin: open Verified Manufacturer requests. */
export default async function AdminBadges({ params }: { params: Params }) {
  const { lang, t } = await pageLang(params);
  const admin = await adminOrNull();
  if (!admin) return null;
  const b = t.adm.badge;
  const s = t.sell;
  const rows = adminBadgeQueue(market(), admin);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold md:text-3xl">{b.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-2">{b.intro}</p>
      </div>
      {rows.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">{b.none}</p>
      ) : (
        <Table min="44rem" head={[t.adm.sellers.colName, b.colRequest, b.colReason, t.adm.sellers.colStatus, t.adm.sellers.colCity, t.adm.sellers.colSubmitted]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2">
                <Link href={href(lang, `/admin/sellers/${r.manufacturer_slug}/verification`)} className="font-semibold text-red-700 hover:underline">{r.maker_name}</Link>
                <span className="block text-xs text-muted">{s.type[r.seller_type as "company"]}</span>
              </td>
              <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
              <td className="px-3 py-2">{b.reason[r.reason]}</td>
              <td className="px-3 py-2"><StatusChip status={r.status} label={s.badgeStatus[r.status] ?? r.status} /></td>
              <td className="px-3 py-2">{r.city ? place(r.city, lang) : "—"}</td>
              <td className="px-3 py-2 text-ink-2">{r.submitted_at ? when(r.submitted_at, lang) : "—"}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
