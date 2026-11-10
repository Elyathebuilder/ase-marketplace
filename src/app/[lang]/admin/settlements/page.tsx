import type { Metadata } from "next";
import { makerLabel } from "@/lib/market/sellers";
import Link from "next/link";
import { Paperclip } from "lucide-react";
import { TestTag } from "@/components/market/journey";
import { ActionButton, ActionForm, FormNotice, ReasonAction, Status, Table, tetri } from "@/components/market/ui";
import { getDict, href, isLang } from "@/i18n";
import { adminOrNull } from "@/lib/market/auth";
import { adminSettlements } from "@/lib/market/queries";
import { market } from "@/lib/market/server";
import { formatBps } from "@/lib/money";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").market.admin.settlements.title };
}

export default async function AdminSettlements({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const admin = await adminOrNull();
  if (!admin) return null;
  const sp = await searchParams;
  const m = t.market;
  const s = m.admin.settlements;
  const rows = adminSettlements(market(), admin);
  const self = href(lang, "/admin/settlements");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold md:text-3xl">{s.title}</h1>
      <p className="max-w-4xl text-sm text-ink-2">{s.intro}</p>
      <p className="max-w-4xl rounded-lg bg-warn-50 px-3 py-2 text-xs text-warn">{m.admin.ledgerNote}</p>
      <FormNotice lang={lang} sp={sp} />
      {rows.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">{s.none}</p>
      ) : (
        <Table min="84rem" head={[s.manufacturer, s.order, s.subtotal, s.commission, s.payable, s.account, s.status, s.reference, s.date, ""]}>
          {rows.map((r) => {
            const maker = makerLabel(market(), r.manufacturer_slug, lang);
            const inactive = r.fulfillment_status === "rejected" || r.fulfillment_status === "cancelled";
            return (
              <tr key={r.id} className={inactive ? "opacity-60" : ""}>
                <td className="px-3 py-2 font-semibold">{maker.name}<span className="block text-xs font-normal text-muted">{r.id}</span></td>
                <td className="px-3 py-2">
                  <Link href={href(lang, `/admin/orders/${r.order_id}`)} className="text-red-600 hover:underline">{r.fulfillment_id}</Link> {r.is_test === 1 && <TestTag lang={lang} />}
                  <span className="block text-xs text-muted">{m.shipmentStatus[r.fulfillment_status]}</span>
                  {r.order_hold && <span className="chip mt-1 bg-warn-50 text-warn">{s.orderHeld}</span>}
                </td>
                <td className="px-3 py-2 tabular-nums">{tetri(r.goods_tetri, lang)}</td>
                <td className="px-3 py-2 tabular-nums">{tetri(r.commission_tetri, lang)}<span className="block text-xs text-muted">{formatBps(r.commission_bps, lang)} · {m.commissionBase[r.commission_base]}</span></td>
                <td className="px-3 py-2 font-semibold tabular-nums">{tetri(r.payable_tetri, lang)}</td>
                <td className="px-3 py-2 text-xs">{r.account_holder}<span className="block text-muted">{r.bank_name}</span><span className="block font-mono">{r.iban}</span></td>
                <td className="px-3 py-2">
                  <Status value={r.status} labels={m.payoutStatus} />
                  {r.hold_reason && (r.status === "on_hold" || r.status === "not_eligible") && <span className="mt-1 block text-xs text-muted">{r.hold_reason}</span>}
                  {r.authorized_by_name && <span className="mt-1 block text-xs text-muted">{s.authorizedBy}: {r.authorized_by_name}</span>}
                  {r.completed_by_name && <span className="block text-xs text-muted">{s.completedBy}: {r.completed_by_name}</span>}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {r.transfer_reference ?? "—"}
                  {r.confirmation_file && (
                    <a href={`/api/files/${r.confirmation_file}`} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 font-sans text-red-600 hover:underline">
                      <Paperclip className="h-3.5 w-3.5" aria-hidden="true" /> {r.confirmation_name}
                    </a>
                  )}
                </td>
                <td className="px-3 py-2">{r.transfer_date ?? "—"}</td>
                <td className="w-72 space-y-1.5 px-3 py-2">
                  {r.status === "eligible" && !r.order_hold && <ActionButton op="authorizePayout" id={r.id} back={self} label={s.authorize} tone="primary" />}
                  {(r.status === "authorized" || r.status === "transfer_failed") && !r.order_hold && (
                    <details className="rounded-lg border border-line">
                      <summary className="cursor-pointer list-none px-3 py-1.5 text-sm font-semibold hover:bg-paper-2">{s.recordTransfer}</summary>
                      <ActionForm op="recordTransfer" id={r.id} back={self} files className="space-y-2 border-t border-line p-3">
                        <label className="label" htmlFor={`tr-${r.id}`}>{s.reference}</label>
                        <input id={`tr-${r.id}`} name="reference" required maxLength={100} className="input" />
                        <label className="label" htmlFor={`td-${r.id}`}>{s.date}</label>
                        <input id={`td-${r.id}`} name="date" type="date" required defaultValue={today} className="input" />
                        <label className="label" htmlFor={`tc-${r.id}`}>{s.confirmation}</label>
                        <input id={`tc-${r.id}`} name="confirmation" type="file" accept="application/pdf,image/png,image/jpeg" className="input" />
                        <button type="submit" className="btn btn-dark px-3 py-1.5 text-sm">{s.recordTransfer}</button>
                      </ActionForm>
                    </details>
                  )}
                  {r.status === "transfer_initiated" && (
                    <>
                      <ActionButton op="confirmPayout" id={r.id} back={self} label={s.confirm} tone="primary" />
                      <ReasonAction op="failPayout" id={r.id} back={self} label={s.failed} fieldLabel={s.reason} danger />
                    </>
                  )}
                  {["not_eligible", "eligible", "authorized", "transfer_failed"].includes(r.status) && !inactive && <ReasonAction op="holdPayout" id={r.id} back={self} label={s.hold} fieldLabel={s.reason} />}
                  {r.status === "on_hold" && !r.order_hold && <ActionButton op="releasePayout" id={r.id} back={self} label={s.release} tone="ghost" />}
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
