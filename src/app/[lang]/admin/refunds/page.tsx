import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, FormNotice, Status, Table, tetri } from "@/components/market/ui";
import { getDict, href, isLang } from "@/i18n";
import { adminOrNull } from "@/lib/market/auth";
import { adminRefunds } from "@/lib/market/queries";
import { market } from "@/lib/market/server";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").market.admin.refunds.title };
}

export default async function AdminRefunds({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const admin = await adminOrNull();
  if (!admin) return null;
  const sp = await searchParams;
  const m = t.market;
  const r = m.admin.refunds;
  const rows = adminRefunds(market(), admin);
  const self = href(lang, "/admin/refunds");
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold md:text-3xl">{r.title}</h1>
      <p className="max-w-4xl text-sm text-ink-2">{r.intro}</p>
      <FormNotice lang={lang} sp={sp} />
      {rows.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">{r.none}</p>
      ) : (
        <Table min="64rem" head={[r.id, r.order, r.customer, r.amount, r.reason, r.status, r.reference, r.date, ""]}>
          {rows.map((x) => (
            <tr key={x.id}>
              <td className="px-3 py-2 font-semibold">{x.id}</td>
              <td className="px-3 py-2"><Link href={href(lang, `/admin/orders/${x.order_id}`)} className="text-red-600 hover:underline">{x.order_id}</Link></td>
              <td className="px-3 py-2">{x.customer_name}</td>
              <td className="px-3 py-2 font-semibold tabular-nums">{tetri(x.amount_tetri)}</td>
              <td className="px-3 py-2 text-ink-2">{x.reason}</td>
              <td className="px-3 py-2"><Status value={x.status} labels={m.refundStatus} /></td>
              <td className="px-3 py-2 font-mono text-xs">{x.reference ?? "—"}</td>
              <td className="px-3 py-2">{x.transfer_date ?? "—"}</td>
              <td className="w-64 px-3 py-2">
                {x.status === "pending" && (
                  <details className="rounded-lg border border-line">
                    <summary className="cursor-pointer list-none px-3 py-1.5 text-sm font-semibold hover:bg-paper-2">{r.complete}</summary>
                    <ActionForm op="completeRefund" id={x.id} back={self} className="space-y-2 border-t border-line p-3">
                      <label className="label" htmlFor={`rr-${x.id}`}>{r.reference}</label>
                      <input id={`rr-${x.id}`} name="reference" required maxLength={100} className="input" />
                      <label className="label" htmlFor={`rd-${x.id}`}>{r.date}</label>
                      <input id={`rd-${x.id}`} name="date" type="date" required defaultValue={today} className="input" />
                      <button type="submit" className="btn btn-dark px-3 py-1.5 text-sm">{r.complete}</button>
                    </ActionForm>
                  </details>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
