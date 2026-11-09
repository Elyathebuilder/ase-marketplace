import type { Metadata } from "next";
import { ActionForm, FormNotice, Table, when } from "@/components/market/ui";
import { getDict, href, isLang, locMaker } from "@/i18n";
import { getManufacturer } from "@/lib/catalog";
import { adminOrNull } from "@/lib/market/auth";
import { manufacturerBankAccounts } from "@/lib/market/queries";
import { market } from "@/lib/market/server";
import { getSettings, settingsHistory } from "@/lib/market/settings";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").market.admin.settings.title };
}

export default async function AdminSettings({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const admin = await adminOrNull();
  if (!admin) return null;
  const sp = await searchParams;
  const m = t.market;
  const s = m.admin.settings;
  const ctx = market();
  const cur = getSettings(ctx);
  const hist = settingsHistory(ctx, admin);
  const accounts = manufacturerBankAccounts(ctx, admin);
  const field = (name: string, label: string, value: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={`set-${name}`}>{label}</label>
      <input id={`set-${name}`} name={name} defaultValue={value} required className="input" {...extra} />
    </div>
  );
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold md:text-3xl">{s.title}</h1>
        <p className="mt-1 text-sm text-ink-2">{s.intro}</p>
      </div>
      <FormNotice lang={lang} sp={sp} />
      <ActionForm op="settings" id="settings" back={href(lang, "/admin/settings")} className="space-y-6">
        <section className="card space-y-4 p-4">
          <h2 className="text-base font-bold">{s.commission}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {field("commissionPercent", s.rate, String(cur.commissionBps / 100), { inputMode: "decimal", pattern: "[0-9]+([.][0-9]{1,2})?" })}
            <div>
              <label className="label" htmlFor="set-base">{s.base}</label>
              <select id="set-base" name="commissionBase" defaultValue={cur.commissionBase} className="input">
                <option value="products">{m.commissionBase.products}</option>
                <option value="products_and_delivery">{m.commissionBase.products_and_delivery}</option>
              </select>
            </div>
            {field("paymentDeadlineHours", s.deadline, String(cur.paymentDeadlineHours), { type: "number", min: 0, max: 720 })}
          </div>
        </section>
        <section className="card space-y-4 p-4">
          <h2 className="text-base font-bold">{s.bank}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("bankAccountHolder", s.holder, cur.bankAccountHolder, { maxLength: 120 })}
            {field("bankName", s.bankName, cur.bankName, { maxLength: 120 })}
            {field("bankIban", s.iban, cur.bankIban, { maxLength: 120 })}
            {field("bankSwift", s.swift, cur.bankSwift, { maxLength: 120 })}
          </div>
        </section>
        <button type="submit" className="btn btn-primary">{s.save}</button>
      </ActionForm>

      <section>
        <h2 className="text-lg font-bold">{s.history}</h2>
        <div className="mt-3">
          <Table min="36rem" head={[m.admin.order.at, s.key, s.old, s.new, m.admin.order.by]}>
            {hist.map((h) => (
              <tr key={h.id}>
                <td className="px-3 py-2 text-ink-2">{when(h.changed_at, lang)}</td>
                <td className="px-3 py-2 font-mono text-xs">{h.key}</td>
                <td className="px-3 py-2">{h.old_value}</td>
                <td className="px-3 py-2 font-semibold">{h.new_value}</td>
                <td className="px-3 py-2">{h.changed_by}</td>
              </tr>
            ))}
          </Table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold">{s.makerAccounts}</h2>
        <div className="mt-3">
          <Table min="36rem" head={[m.admin.settlements.manufacturer, s.holder, s.bankName, s.iban]}>
            {accounts.map((a) => (
              <tr key={a.manufacturer_slug}>
                <td className="px-3 py-2 font-semibold">{locMaker(getManufacturer(a.manufacturer_slug)!, lang).name}</td>
                <td className="px-3 py-2">{a.account_holder}</td>
                <td className="px-3 py-2">{a.bank_name}</td>
                <td className="px-3 py-2 font-mono text-xs">{a.iban}</td>
              </tr>
            ))}
          </Table>
        </div>
      </section>
    </div>
  );
}
