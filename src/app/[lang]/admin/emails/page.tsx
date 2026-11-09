import type { Metadata } from "next";
import { Table, when } from "@/components/market/ui";
import { getDict, isLang } from "@/i18n";
import { adminEmails } from "@/lib/market/accounts";
import { adminOrNull } from "@/lib/market/auth";
import { emailProviderConfigured } from "@/lib/market/mailer";
import { market } from "@/lib/market/server";
import { isTestMode } from "@/lib/market/settings";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").adm.emails.title };
}

/**
 * Admin: the email outbox. Shows honestly whether each email was really sent. Links (which contain
 * one-time tokens) are shown only in TEST mode, so testers can follow the flows without an email service.
 */
export default async function AdminEmails({ params }: { params: Params }) {
  const { lang, t } = await pageLang(params);
  const admin = await adminOrNull();
  if (!admin) return null;
  const e = t.adm.emails;
  const rows = adminEmails(market(), admin);
  const test = isTestMode();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold md:text-3xl">{e.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-2">{e.intro}</p>
      </div>
      <p className={`rounded-lg px-3 py-2 text-sm ${emailProviderConfigured() ? "bg-ok-50 text-ok" : "bg-warn-50 text-warn"}`}>{emailProviderConfigured() ? e.connected : e.notConnected}</p>
      {rows.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">{e.none}</p>
      ) : (
        <Table min="48rem" head={[e.colCreated, e.colTo, e.colSubject, e.colStatus, ""]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2 text-ink-2">{when(r.created_at, lang)}</td>
              <td className="px-3 py-2">{r.to_email}</td>
              <td className="px-3 py-2">{r.subject}</td>
              <td className="px-3 py-2">{e.status[r.status] ?? r.status}{r.error ? <span className="block text-xs text-red-700">{r.error}</span> : null}</td>
              <td className="px-3 py-2">{test && r.link ? <a href={r.link} className="font-semibold text-red-700 hover:underline">{e.open}</a> : null}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
