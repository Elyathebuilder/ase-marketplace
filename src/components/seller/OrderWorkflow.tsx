"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { ORDER_FLOW, ORDER_STATUS, type OrderStatus } from "@/lib/seller-demo";
import { StatusPill } from "./StatusPill";

const NEXT_ACTION: Partial<Record<OrderStatus, { label: string; next: OrderStatus; help: string }>> = {
  new: { label: "Accept order", next: "accepted", help: "Confirm you can make and ship this order. The buyer is told straight away." },
  accepted: { label: "Start preparing", next: "preparing", help: "Let the buyer know production or packing has started." },
  preparing: { label: "Mark ready for pickup", next: "ready", help: "Our courier gets a pickup request for your location." },
};

const STEP_LABEL: Record<OrderStatus, string> = {
  new: "Order received",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready for pickup",
  dispatched: "Picked up by ASE courier",
  delivered: "Delivered to buyer",
  cancelled: "Cancelled",
};

/** Status timeline with the seller's next step. In the preview it changes only on screen. */
export function OrderWorkflow({ initial }: { initial: OrderStatus }) {
  const [status, setStatus] = useState<OrderStatus>(initial);
  const [rejected, setRejected] = useState(false);
  const changed = status !== initial || rejected;
  const current = rejected ? "cancelled" : status;
  const idx = ORDER_FLOW.indexOf(status);
  const action = rejected ? undefined : NEXT_ACTION[status];

  return (
    <section className="card p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold">Status</h2>
        <StatusPill {...ORDER_STATUS[current]} />
      </div>

      {current === "cancelled" ? (
        <p className="mt-3 text-sm text-ink-2">This order is cancelled. The buyer is refunded in full.</p>
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
                <span className={`py-1.5 text-xs font-semibold sm:py-0 ${done ? "text-ink" : "text-muted"}`}>{STEP_LABEL[s]}</span>
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
              <button type="button" className="btn btn-outline" onClick={() => setRejected(true)}>Reject</button>
            )}
          </div>
        </div>
      )}
      {!action && current !== "cancelled" && idx >= ORDER_FLOW.indexOf("ready") && idx < ORDER_FLOW.length - 1 && (
        <p className="mt-4 text-sm text-muted">Nothing to do. ASE updates this order from here on.</p>
      )}
      {changed && (
        <p role="status" className="mt-3 text-xs text-muted">
          Preview only: the change shows here but isn&apos;t saved.{" "}
          <button type="button" className="font-semibold text-red-700 underline" onClick={() => { setStatus(initial); setRejected(false); }}>Reset</button>
        </p>
      )}
    </section>
  );
}
