"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { ORDER_FLOW, ORDER_STATUS, type OrderStatus } from "@/lib/seller-demo";
import { useI18n } from "@/i18n/client";
import { StatusPill } from "./StatusPill";

const NEXT_ACTION: Partial<Record<OrderStatus, { key: "accept" | "prepare" | "ready"; next: OrderStatus }>> = {
  new: { key: "accept", next: "accepted" },
  accepted: { key: "prepare", next: "preparing" },
  preparing: { key: "ready", next: "ready" },
};

/** Status timeline with the seller's next step. In the preview it changes only on screen. */
export function OrderWorkflow({ initial }: { initial: OrderStatus }) {
  const { t } = useI18n();
  const o = t.seller.order;
  const [status, setStatus] = useState<OrderStatus>(initial);
  const [rejected, setRejected] = useState(false);
  const changed = status !== initial || rejected;
  const current = rejected ? "cancelled" : status;
  const idx = ORDER_FLOW.indexOf(status);
  const next = rejected ? undefined : NEXT_ACTION[status];
  const action = next && { ...o.actions[next.key], next: next.next };

  return (
    <section className="card p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold">{o.status}</h2>
        <StatusPill tone={ORDER_STATUS[current].tone} label={t.seller.status[current]} />
      </div>

      {current === "cancelled" ? (
        <p className="mt-3 text-sm text-ink-2">{o.cancelled}</p>
      ) : (
        <ol className="mt-4 grid gap-0 sm:grid-cols-6">
          {ORDER_FLOW.map((s, i) => {
            const done = i <= idx;
            return (
              <li key={s} className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
                <div className="flex items-center sm:w-full">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? (i === idx ? "bg-red-600 text-white" : "bg-ink text-white") : "border-2 border-line-strong bg-surface text-subtle"}`}>
                    {done && i < idx ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
                  </span>
                  {i < ORDER_FLOW.length - 1 && <span className={`hidden h-0.5 flex-1 sm:block ${i < idx ? "bg-ink" : "bg-line"}`} />}
                </div>
                <span className={`py-1.5 text-xs font-semibold sm:py-0 ${done ? "text-ink" : "text-muted"}`}>{t.seller.steps[s]}</span>
              </li>
            );
          })}
        </ol>
      )}

      {action && (
        <div className="mt-5 rounded-xl bg-paper-2/70 p-4">
          <p className="text-sm text-ink-2">{action.help}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={() => setStatus(action.next)}>{action.label}</button>
            {status === "new" && (
              <button type="button" className="btn btn-outline" onClick={() => setRejected(true)}>{o.reject}</button>
            )}
          </div>
        </div>
      )}
      {!action && current !== "cancelled" && idx >= ORDER_FLOW.indexOf("ready") && idx < ORDER_FLOW.length - 1 && (
        <p className="mt-4 text-sm text-muted">{o.nothing}</p>
      )}
      {changed && (
        <p role="status" className="mt-3 text-xs text-muted">
          {o.previewNote}{" "}
          <button type="button" className="font-semibold text-red-700 underline" onClick={() => { setStatus(initial); setRejected(false); }}>{o.reset}</button>
        </p>
      )}
    </section>
  );
}
