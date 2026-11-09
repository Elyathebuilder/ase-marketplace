import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { StatusPill } from "@/components/seller/StatusPill";
import { formatDate, getDict, href, type Lang } from "@/i18n";
import { marketAction } from "@/lib/market/actions";
import { formatTetri } from "@/lib/money";

type Tone = "red" | "amber" | "blue" | "green" | "grey";

const TONE: Record<string, Tone> = {
  // order
  placed: "grey",
  awaiting_payment: "amber",
  payment_submitted: "blue",
  payment_confirmed: "blue",
  preparing: "blue",
  ready: "blue",
  collected: "blue",
  in_delivery: "blue",
  delivered: "green",
  completed: "green",
  payment_rejected: "red",
  manufacturer_rejected: "red",
  preparation_delayed: "amber",
  cancelled: "grey",
  refund_processing: "amber",
  refunded: "grey",
  delivery_issue: "red",
  // shipment
  new: "red",
  accepted: "blue",
  rejected: "red",
  // payment
  submitted: "blue",
  verification_pending: "amber",
  confirmed: "green",
  partial: "amber",
  incorrect_amount: "amber",
  refund_pending: "amber",
  // payout
  not_eligible: "grey",
  eligible: "red",
  authorized: "blue",
  transfer_initiated: "blue",
  transfer_completed: "green",
  transfer_failed: "red",
  on_hold: "amber",
  // refund
  pending: "amber",
};

export function Status({ value, labels }: { value: string; labels: Record<string, string> }) {
  return <StatusPill tone={TONE[value] ?? "grey"} label={labels[value] ?? value} />;
}

export const tetri = (t: number | null | undefined) => (t == null ? "—" : formatTetri(t));

export const when = (d: string | null | undefined, lang: Lang, withTime = true) =>
  d ? formatDate(d, lang, withTime ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short", year: "numeric" }) : "—";

/** "Saved." or a translated error, from ?ok=1 / ?error=code after a form action. */
export function FormNotice({ lang, sp }: { lang: Lang; sp: Record<string, string | string[] | undefined> }) {
  const m = getDict(lang).market;
  const err = typeof sp.error === "string" ? sp.error : null;
  if (err)
    return (
      <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {(m.errors as Record<string, string>)[err] ?? getDict(lang).acc.errors[err] ?? m.errors.invalid_input}
      </p>
    );
  if (sp.ok === "1")
    return (
      <p role="status" className="flex items-center gap-2 rounded-lg border border-[#c4e0cf] bg-ok-50 px-3 py-2 text-sm text-ok">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        {m.saved}
      </p>
    );
  return null;
}

/** A form that runs one workflow action and comes back to this page. */
export function ActionForm({
  op,
  id,
  back,
  children,
  className,
  files = false,
}: {
  op: string;
  id: string;
  back: string;
  children: React.ReactNode;
  className?: string;
  files?: boolean;
}) {
  return (
    // With a function as the action, React sends the form as multipart data, so file inputs just work.
    <form action={marketAction} className={className} data-files={files || undefined}>
      <input type="hidden" name="op" value={op} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="back" value={back} />
      {children}
    </form>
  );
}

/** One button that runs an action. */
export function ActionButton({ op, id, back, label, extra, tone = "dark" }: { op: string; id: string; back: string; label: string; extra?: Record<string, string>; tone?: "dark" | "primary" | "ghost" }) {
  return (
    <ActionForm op={op} id={id} back={back} className="inline">
      {Object.entries(extra ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className={`btn ${tone === "primary" ? "btn-primary" : tone === "ghost" ? "btn-ghost border border-line-strong" : "btn-dark"} px-3 py-1.5 text-sm`}>
        {label}
      </button>
    </ActionForm>
  );
}

/** A small action that needs a reason or other text, folded away until opened. */
export function ReasonAction({
  op,
  id,
  back,
  label,
  field = "reason",
  fieldLabel,
  extra,
  danger = false,
  required = true,
}: {
  op: string;
  id: string;
  back: string;
  label: string;
  field?: string;
  fieldLabel: string;
  extra?: Record<string, string>;
  danger?: boolean;
  required?: boolean;
}) {
  return (
    <details className="group rounded-lg border border-line bg-surface">
      <summary className={`cursor-pointer list-none px-3 py-1.5 text-sm font-semibold ${danger ? "text-red-700" : "text-ink"} hover:bg-paper-2`}>{label}</summary>
      <ActionForm op={op} id={id} back={back} className="space-y-2 border-t border-line p-3">
        {Object.entries(extra ?? {}).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <label className="label" htmlFor={`${op}-${id}-${field}`}>{fieldLabel}</label>
        <textarea id={`${op}-${id}-${field}`} name={field} required={required} maxLength={500} rows={2} className="input" />
        <button type="submit" className={`btn ${danger ? "btn-primary" : "btn-dark"} px-3 py-1.5 text-sm`}>{label}</button>
      </ActionForm>
    </details>
  );
}

export function Table({ head, children, min = "48rem" }: { head: React.ReactNode[]; children: React.ReactNode; min?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full text-sm" style={{ minWidth: min }}>
        <thead className="bg-paper-2 text-left text-xs uppercase tracking-wider text-muted">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-3 py-2 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line align-top">{children}</tbody>
      </table>
    </div>
  );
}

export function SignInRequired({ lang, text, next }: { lang: Lang; text: string; next: string }) {
  const m = getDict(lang).market;
  return (
    <div className="card mx-auto max-w-lg p-6 text-center">
      <h1 className="text-xl font-bold">{m.signin.forbiddenTitle}</h1>
      <p className="mt-2 text-sm text-ink-2">{text}</p>
      <Link href={`${href(lang, "/signin")}?next=${encodeURIComponent(next)}`} className="btn btn-primary mt-4">{m.account.signIn}</Link>
    </div>
  );
}

export { notificationText } from "@/lib/market/notification-text";
