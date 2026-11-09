import type { Metadata } from "next";
import Link from "next/link";
import { TestTag } from "@/components/market/journey";
import { Status, Table, tetri, when } from "@/components/market/ui";
import { getDict, href, isLang } from "@/i18n";
import { adminOrNull } from "@/lib/market/auth";
import { adminOrders } from "@/lib/market/queries";
import { market } from "@/lib/market/server";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").market.admin.orders.title };
}

export default async function AdminOrders({ params }: { params: Params }) {
  const { lang, t } = await pageLang(params);
  const admin = await adminOrNull();
  if (!admin) return null;
  const m = t.market;
  const a = m.admin.orders;
  const rows = adminOrders(market(), admin);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold md:text-3xl">{a.title}</h1>
      <Table head={[a.number, a.customer, a.placed, a.total, a.received, a.shipments, a.status]}>
        {rows.map((o) => (
          <tr key={o.id}>
            <td className="px-3 py-2"><Link href={href(lang, `/admin/orders/${o.id}`)} className="font-semibold text-red-600 hover:underline">{o.id}</Link> {o.is_test === 1 && <TestTag lang={lang} />}</td>
            <td className="px-3 py-2">{o.customer_name}</td>
            <td className="px-3 py-2 text-ink-2">{when(o.created_at, lang)}</td>
            <td className="px-3 py-2 tabular-nums">{tetri(o.total_tetri)}</td>
            <td className="px-3 py-2 tabular-nums">{tetri(o.received_tetri)}</td>
            <td className="px-3 py-2 tabular-nums">{o.shipments}</td>
            <td className="space-x-1 px-3 py-2">
              <Status value={o.status} labels={m.orderStatus} />
              {o.hold_kind && <span className="chip bg-warn-50 text-warn">{o.hold_kind === "dispute" ? a.dispute : a.hold}</span>}
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
