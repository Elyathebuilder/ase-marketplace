"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useI18n } from "@/i18n/client";

interface Option { value: string; label: string }

interface Props {
  products: (Option & { manufacturer: string; unit: string; moq: number })[];
  manufacturers: Option[];
  defaults: { product?: string; manufacturer?: string; qty?: number };
}

type Errors = Partial<Record<"company" | "email" | "target" | "quantity" | "requirements", string>>;

/**
 * Request for quotation. In this preview the form is validated but NOT sent anywhere:
 * storing requests and notifying manufacturers is built in Phase 4 (B2B).
 */
export function RfqForm({ products, manufacturers, defaults }: Props) {
  const { t } = useI18n();
  const r = t.rfq;
  const [product, setProduct] = useState(defaults.product ?? "");
  const selected = products.find((p) => p.value === product);
  const [manufacturer, setManufacturer] = useState(selected?.manufacturer ?? defaults.manufacturer ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const next: Errors = {};
    const qty = Number(data.get("quantity"));
    if (!String(data.get("company") ?? "").trim()) next.company = r.errCompany;
    if (!/^\S+@\S+\.\S+$/.test(String(data.get("email") ?? ""))) next.email = r.errEmail;
    if (!product && !manufacturer) next.target = r.errTarget;
    if (!Number.isInteger(qty) || qty <= 0) next.quantity = r.errQty;
    else if (selected && qty < selected.moq) next.quantity = r.errMoq(selected.moq);
    if (String(data.get("requirements") ?? "").trim().length < 10) next.requirements = r.errReq;
    setErrors(next);
    if (Object.keys(next).length === 0) setDone(true);
  }

  if (done)
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-ok" aria-hidden="true" />
        <h3 className="text-lg font-bold">{r.doneTitle}</h3>
        <p className="max-w-md text-sm text-ink-2">
          {r.doneText}
        </p>
        <button type="button" className="btn btn-outline text-sm" onClick={() => setDone(false)}>{r.edit}</button>
      </div>
    );

  const err = (k: keyof Errors) =>
    errors[k] ? <p id={`rfq-${k}-err`} className="mt-1 text-xs font-medium text-red-700">{errors[k]}</p> : null;

  return (
    <form noValidate onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="rfq-company" className="label">{r.company}</label>
        <input id="rfq-company" name="company" className="input" autoComplete="organization" aria-invalid={!!errors.company} aria-describedby="rfq-company-err" />
        {err("company")}
      </div>
      <div>
        <label htmlFor="rfq-email" className="label">{r.email}</label>
        <input id="rfq-email" name="email" type="email" className="input" autoComplete="email" aria-invalid={!!errors.email} aria-describedby="rfq-email-err" />
        {err("email")}
      </div>
      <div>
        <label htmlFor="rfq-product" className="label">{r.product}</label>
        <select
          id="rfq-product"
          value={product}
          onChange={(e) => {
            setProduct(e.target.value);
            const p = products.find((x) => x.value === e.target.value);
            if (p) setManufacturer(p.manufacturer);
          }}
          className="input"
        >
          <option value="">{r.custom}</option>
          {products.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="rfq-manufacturer" className="label">{r.manufacturer}</label>
        <select id="rfq-manufacturer" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} disabled={!!selected} className="input disabled:bg-paper-2" aria-invalid={!!errors.target} aria-describedby="rfq-target-err">
          <option value="">{r.letAse}</option>
          {manufacturers.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        {err("target")}
      </div>
      <div>
        <label htmlFor="rfq-quantity" className="label">{r.quantity}{selected ? ` (${selected.unit})` : ""}</label>
        <input id="rfq-quantity" name="quantity" type="number" min={1} inputMode="numeric" defaultValue={defaults.qty ?? (selected?.moq || "")} className="input" aria-invalid={!!errors.quantity} aria-describedby="rfq-quantity-err" />
        {err("quantity")}
      </div>
      <div>
        <label htmlFor="rfq-date" className="label">{r.neededBy}</label>
        <input id="rfq-date" name="neededBy" type="date" className="input" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="rfq-req" className="label">{r.requirements}</label>
        <textarea id="rfq-req" name="requirements" rows={4} className="input" placeholder={r.reqPlaceholder} aria-invalid={!!errors.requirements} aria-describedby="rfq-requirements-err" />
        {err("requirements")}
      </div>
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">{r.previewNote}</p>
        <button type="submit" className="btn btn-primary px-6 py-3">{r.send}</button>
      </div>
    </form>
  );
}
