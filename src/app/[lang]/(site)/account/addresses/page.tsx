import type { Metadata } from "next";
import Link from "next/link";
import { AccountShell } from "@/components/account/AccountNav";
import { Field, Hidden, Select, TextArea } from "@/components/forms/Field";
import { Submit } from "@/components/forms/Submit";
import { FormNotice, SignInRequired } from "@/components/market/ui";
import { getDict, href, isLang, place } from "@/i18n";
import { accountAction } from "@/lib/market/account-actions";
import { addressesOf, getUser } from "@/lib/market/accounts";
import { currentAccount } from "@/lib/market/auth";
import { market } from "@/lib/market/server";
import { PLACES } from "@/lib/places";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").acc.addresses.title, robots: { index: false } };
}

export default async function AddressesPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const d = t.acc.addresses;
  const self = href(lang, "/account/addresses");
  const acct = await currentAccount();
  if (!acct)
    return (
      <div className="container-page py-8">
        <SignInRequired lang={lang} text={t.acc.signin.intro} next={self} />
      </div>
    );
  const sp = await searchParams;
  const ctx = market();
  const list = addressesOf(ctx, acct.actor);
  const editing = list.find((a) => String(a.id) === sp.edit);
  const showForm = !!editing || sp.add === "1" || list.length === 0;
  const user = getUser(ctx, acct.actor.id)!;

  return (
    <AccountShell lang={lang} active="addresses">
      <h1 className="text-2xl font-extrabold md:text-3xl">{d.title}</h1>
      <p className="mt-1 text-sm text-ink-2">{d.intro}</p>
      <div className="mt-4 max-w-2xl"><FormNotice lang={lang} sp={sp} /></div>

      {list.length > 0 && (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {list.map((a) => (
            <li key={a.id} className="card p-4 text-sm">
              <p className="flex items-center gap-2 font-bold">
                {a.label || a.recipient}
                {a.is_default === 1 && <span className="chip bg-red-50 text-red-700">{d.default}</span>}
              </p>
              <p className="mt-1 text-ink-2">{a.recipient} · {a.phone}</p>
              <p className="text-ink-2">{a.address}, {place(a.city, lang)}</p>
              {a.note && <p className="text-xs text-muted">{a.note}</p>}
              <div className="mt-3 flex gap-2">
                <Link href={`${self}?edit=${a.id}`} className="btn btn-ghost border border-line-strong px-3 py-1 text-sm">{d.edit}</Link>
                <form action={accountAction}>
                  <Hidden values={{ op: "deleteAddress", id: a.id, back: self }} />
                  <button type="submit" className="btn btn-ghost px-3 py-1 text-sm text-muted hover:text-red-700">{d.remove}</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <form action={accountAction} className="card mt-5 grid max-w-2xl gap-4 p-4 sm:grid-cols-2 md:p-5">
          <h2 className="text-base font-bold sm:col-span-2">{editing ? d.edit : d.add}</h2>
          <Hidden values={{ op: "saveAddress", id: editing?.id, back: self }} />
          <Field id="ad-label" name="label" label={d.label} hint={d.labelHint} defaultValue={editing?.label ?? ""} maxLength={60} className="sm:col-span-2" />
          <Field id="ad-rec" name="recipient" label={d.recipient} defaultValue={editing?.recipient ?? user.name} required maxLength={120} autoComplete="name" />
          <Field id="ad-phone" name="phone" type="tel" label={d.phone} defaultValue={editing?.phone ?? user.phone ?? ""} required maxLength={40} autoComplete="tel" />
          <Select id="ad-city" name="city" label={d.city} defaultValue={editing?.city ?? "Tbilisi"}>
            {Object.keys(PLACES).map((p) => (
              <option key={p} value={p}>{place(p, lang)}</option>
            ))}
          </Select>
          <Field id="ad-addr" name="address" label={d.address} defaultValue={editing?.address ?? ""} required maxLength={300} autoComplete="street-address" />
          <TextArea id="ad-note" name="note" label={d.note} defaultValue={editing?.note ?? ""} maxLength={500} rows={2} className="sm:col-span-2" />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="isDefault" value="1" defaultChecked={editing ? editing.is_default === 1 : list.length === 0} className="h-4 w-4 accent-red-600" />
            {d.makeDefault}
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <Submit className="btn btn-primary">{d.save}</Submit>
            {list.length > 0 && <Link href={self} className="btn btn-ghost">{d.cancel}</Link>}
          </div>
        </form>
      ) : (
        <Link href={`${self}?add=1`} className="btn btn-dark mt-5">{d.add}</Link>
      )}
    </AccountShell>
  );
}
