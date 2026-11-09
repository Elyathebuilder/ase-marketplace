import type { Metadata } from "next";
import Link from "next/link";
import { Paperclip } from "lucide-react";
import { TestTag } from "@/components/market/journey";
import { ActionButton, ActionForm, FormNotice, ReasonAction, Status, Table, tetri, when } from "@/components/market/ui";
import { getDict, href, isLang } from "@/i18n";
import { adminOrNull } from "@/lib/market/auth";
import { adminPayments } from "@/lib/market/queries";
import { market } from "@/lib/market/server";
import { PAYMENT_STATUSES } from "@/lib/market/types";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").market.admin.payments.title };
}

export default async function AdminPayments({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const admin = await adminOrNull();
  if (!admin) return null;
  const sp = await searchParams;
  const m = t.market;
  const p = m.admin.payments;
  const status = typeof sp.status === "string" && (PAYMENT_STATUSES as readonly string[]).includes(sp.status) ? sp.status : undefined;
  const rows = adminPayments(market(), admin, status);
  const base = href(lang, "/admin/payments");
  const self = status ? `${base}?status=${status}` : base;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold md:text-3xl">{p.title}</h1>
      <p className="max-w-4xl text-sm text-ink-2">{p.intro}</p>
      <FormNotice lang={lang} sp={sp} />
      <nav className="flex flex-wrap gap-1.5 text-sm">
        {[undefined, ...PAYMENT_STATUSES].map((s) => (
          <Link key={s ?? "all"} href={s ? `${base}?status=${s}` : base} aria-current={s === status ? "page" : undefined} className={`rounded-full border px-3 py-1 ${s === status ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-2 hover:border-ink"}`}>
            {s ? m.paymentStatus[s] : p.all}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">{p.none}</p>
      ) : (
        <Table min="80rem" head={[p.id, p.order, p.customer, p.expected, p.reported, p.method, p.reference, p.receipt, p.submitted, p.status, p.verified, p.verifiedBy, ""]}>
          {rows.map((r) => {
            const open = ["awaiting_payment", "submitted", "verification_pending"].includes(r.status);
            return (
              <tr key={r.id}>
                <td className="px-3 py-2 font-semibold">{r.id}</td>
                <td className="px-3 py-2"><Link href={href(lang, `/admin/orders/${r.order_id}`)} className="text-red-600 hover:underline">{r.order_id}</Link> {r.is_test === 1 && <TestTag lang={lang} />}</td>
                <td className="px-3 py-2">{r.customer_name}</td>
                <td className="px-3 py-2 tabular-nums">{tetri(r.expected_tetri)}</td>
                <td className={`px-3 py-2 tabular-nums ${r.reported_tetri != null && r.reported_tetri !== r.expected_tetri ? "font-semibold text-warn" : ""}`}>
                  {tetri(r.reported_tetri)}
                  {r.received_tetri != null && <span className="block text-xs text-muted">{m.order.receivedAmount}: {tetri(r.received_tetri)}</span>}
                </td>
                <td className="px-3 py-2">{p.bankTransfer}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.reference ?? "—"}{r.reported_date ? <span className="block text-muted">{r.reported_date}</span> : null}</td>
                <td className="px-3 py-2">
                  {r.receipt_file ? (
                    <a href={`/api/files/${r.receipt_file}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-red-600 hover:underline">
                      <Paperclip className="h-3.5 w-3.5" aria-hidden="true" /> <span className="max-w-[8rem] truncate">{r.receipt_name}</span>
                    </a>
                  ) : "—"}
                </td>
                <td className="px-3 py-2 text-ink-2">{when(r.submitted_at, lang)}</td>
                <td className="px-3 py-2"><Status value={r.status} labels={m.paymentStatus} /></td>
                <td className="px-3 py-2 text-ink-2">{when(r.verified_at, lang)}</td>
                <td className="px-3 py-2">{r.verified_by_name ?? "—"}</td>
                <td className="w-72 space-y-1.5 px-3 py-2">
                  {r.status === "submitted" && <ActionButton op="startVerification" id={r.id} back={self} label={p.startVerification} tone="ghost" />}
                  {open && (
                    <details className="rounded-lg border border-line">
                      <summary className="cursor-pointer list-none px-3 py-1.5 text-sm font-semibold hover:bg-paper-2">{p.record}</summary>
                      <ActionForm op="recordPayment" id={r.id} back={self} className="space-y-2 border-t border-line p-3">
                        <label className="label" htmlFor={`rcv-${r.id}`}>{p.received}</label>
                        <input id={`rcv-${r.id}`} name="received" required inputMode="decimal" defaultValue={r.reported_tetri != null ? (r.reported_tetri / 100).toFixed(2) : ""} className="input" />
                        <label className="label" htmlFor={`ref-${r.id}`}>{p.incomingRef}</label>
                        <input id={`ref-${r.id}`} name="bankReference" required maxLength={100} className="input" />
                        <p className="text-xs text-muted">{p.recordHint}</p>
                        <button type="submit" className="btn btn-dark px-3 py-1.5 text-sm">{p.record}</button>
                      </ActionForm>
                    </details>
                  )}
                  {(r.status === "submitted" || r.status === "verification_pending") && <ReasonAction op="rejectPayment" id={r.id} back={self} label={p.reject} fieldLabel={p.rejectReason} danger />}
                  {r.status === "partial" && <ActionButton op="requestMore" id={r.order_id} back={self} label={p.requestMore} tone="ghost" />}
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
