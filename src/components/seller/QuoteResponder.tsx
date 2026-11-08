"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { formatGel } from "@/lib/format";

/** Quotation form. In the preview it calculates the total but sends nothing. */
export function QuoteResponder({ qty, unit, suggested }: { qty: number; unit: string; suggested?: number }) {
  const [price, setPrice] = useState(suggested ? String(suggested) : "");
  const [sent, setSent] = useState(false);
  const unitPrice = Number(price);
  const valid = Number.isFinite(unitPrice) && unitPrice > 0;

  if (sent)
    return (
      <div className="flex flex-col items-start gap-2 rounded-xl bg-ok-50 p-4 text-sm text-ok">
        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        <p><strong>Preview:</strong> this is where your quotation of {formatGel(unitPrice * qty)} would go to the buyer. Nothing was sent.</p>
        <button type="button" className="font-semibold underline" onClick={() => setSent(false)}>Edit quotation</button>
      </div>
    );

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) setSent(true);
      }}
    >
      <div>
        <label htmlFor="q-price" className="label">Unit price (₾ per {unit})</label>
        <input id="q-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="input" placeholder="0.00" />
      </div>
      <div>
        <label htmlFor="q-lead" className="label">Production time (working days)</label>
        <input id="q-lead" type="number" min={1} defaultValue={30} className="input" />
      </div>
      <div>
        <label htmlFor="q-valid" className="label">Quote valid until</label>
        <input id="q-valid" type="date" defaultValue="2026-12-08" className="input" />
      </div>
      <div>
        <label htmlFor="q-pay" className="label">Payment terms</label>
        <select id="q-pay" className="input" defaultValue="full">
          <option value="full">Full payment on order</option>
          <option value="split">50% on order, 50% before dispatch</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="q-msg" className="label">Message to buyer</label>
        <textarea id="q-msg" rows={3} className="input" defaultValue="Thank you for your request. Price includes packing. Sample of the finish available on request." />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
        <p className="text-sm text-ink-2">
          Total for {qty} {unit}s: <span className="font-bold tabular-nums text-ink">{valid ? formatGel(unitPrice * qty) : "—"}</span>
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-outline" onClick={() => setSent(false)}>Decline request</button>
          <button type="submit" className="btn btn-primary" disabled={!valid}>Send quotation</button>
        </div>
      </div>
    </form>
  );
}
