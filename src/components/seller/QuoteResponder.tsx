"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { formatGel } from "@/lib/format";
import { useI18n } from "@/i18n/client";

/** Quotation form. In the preview it calculates the total but sends nothing. */
export function QuoteResponder({ qty, unit, unitPlural, suggested }: { qty: number; unit: string; unitPlural: string; suggested?: number }) {
  const { t } = useI18n();
  const f = t.seller.quote.form;
  const [price, setPrice] = useState(suggested ? String(suggested) : "");
  const [sent, setSent] = useState(false);
  const unitPrice = Number(price);
  const valid = Number.isFinite(unitPrice) && unitPrice > 0;

  if (sent)
    return (
      <div className="flex flex-col items-start gap-2 rounded-xl bg-ok-50 p-4 text-sm text-ok">
        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        <p>{f.sentPreview(formatGel(unitPrice * qty))}</p>
        <button type="button" className="font-semibold underline" onClick={() => setSent(false)}>{f.edit}</button>
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
        <label htmlFor="q-price" className="label">{f.unitPrice(unit)}</label>
        <input id="q-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="input" placeholder="0.00" />
      </div>
      <div>
        <label htmlFor="q-lead" className="label">{f.lead}</label>
        <input id="q-lead" type="number" min={1} defaultValue={30} className="input" />
      </div>
      <div>
        <label htmlFor="q-valid" className="label">{f.valid}</label>
        <input id="q-valid" type="date" defaultValue="2026-12-08" className="input" />
      </div>
      <div>
        <label htmlFor="q-pay" className="label">{f.payment}</label>
        <select id="q-pay" className="input" defaultValue="full">
          <option value="full">{f.full}</option>
          <option value="split">{f.split}</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="q-msg" className="label">{f.message}</label>
        <textarea id="q-msg" rows={3} className="input" defaultValue={f.defaultMessage} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
        <p className="text-sm text-ink-2">
          {f.totalFor(qty, unitPlural)} <span className="font-bold tabular-nums text-ink">{valid ? formatGel(unitPrice * qty) : "—"}</span>
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-outline" onClick={() => setSent(false)}>{f.decline}</button>
          <button type="submit" className="btn btn-primary" disabled={!valid}>{f.send}</button>
        </div>
      </div>
    </form>
  );
}
