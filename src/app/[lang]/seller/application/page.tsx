import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { TextArea } from "@/components/forms/Field";
import { Submit } from "@/components/forms/Submit";
import { FormNotice } from "@/components/market/ui";
import { BusinessStep, ContactStep } from "@/components/seller/application";
import { ACCEPT_DOCUMENTS, ACCEPT_IMAGES, FileList, HistoryList, MessageThread, SellerButton, SellerForm, StatusBox, StepProgress, UploadForm } from "@/components/seller/kit";
import { getDict, href, isLang } from "@/i18n";
import { isApproved } from "@/lib/market/catalog-store";
import { sellerSession } from "@/lib/market/seller-page";
import { missingForSubmit, sellerFiles, sellerHistory, sellerMessages } from "@/lib/market/sellers";
import { market } from "@/lib/market/server";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").sell.app.title };
}

const EDITABLE = ["draft", "pending_review", "info_required"];

/** Steps 2–5 of seller sign-up, the application's status, messages with Amartani and history. */
export default async function ApplicationPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const session = await sellerSession();
  if (!session) return null;
  const sp = await searchParams;
  const s = t.sell;
  const a = s.app;
  const ctx = market();
  const m = session.store;
  const editable = EDITABLE.includes(m.account_status);
  const missing = missingForSubmit(ctx, m);
  const requested = Number(sp.step);
  const step = editable ? (requested >= 2 && requested <= 5 ? requested : m.account_status === "draft" ? 2 : 5) : 0;
  const self = (n = step) => `${href(lang, "/seller/application")}${n ? `?step=${n}` : ""}`;
  const files = sellerFiles(ctx, m.slug);
  const company = m.seller_type === "company";
  const messages = sellerMessages(ctx, m.slug, "account", false);
  const done = [1, ...(m.description && m.categories !== "[]" ? [2] : []), ...(m.address && m.city ? [3] : []), ...(files.length ? [4] : [])];

  const fileSection = (kind: string, accept: string, multiple = true, hint = a.filesHint[kind]) => (
    <section key={kind} className="space-y-2">
      <h3 className="text-sm font-bold">{a.files[kind]}</h3>
      <p className="text-xs text-muted">{hint}</p>
      <FileList lang={lang} files={files.filter((f) => f.kind === kind)} removable={editable || kind !== "registration_document"} back={self()} privateKinds={["registration_document", "supporting_document"]} closedKinds={["registration_document"]} />
      <UploadForm lang={lang} kind={kind} back={self()} multiple={multiple} accept={accept} />
    </section>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold md:text-3xl">{a.title}</h1>
        <p className="mt-1 text-sm text-muted">{s.type[m.seller_type]}</p>
      </div>
      <FormNotice lang={lang} sp={sp} />
      <StatusBox status={m.account_status} label={s.accountStatus[m.account_status] ?? m.account_status} text={s.accountExplain[m.account_status]}>
        {isApproved(m.account_status) && (
          <Link href={href(lang, "/seller")} className="mt-3 inline-block text-sm font-semibold underline">{a.goToStore}</Link>
        )}
      </StatusBox>

      {editable && (
        <div className="card p-4 md:p-6">
          <StepProgress lang={lang} current={step} done={done} />
          {step === 2 && <BusinessStep lang={lang} m={m} back={self(2)} goto={3} submitLabel={a.saveContinue} />}
          {step === 3 && (
            <>
              <ContactStep lang={lang} m={m} back={self(3)} goto={4} submitLabel={a.saveContinue} />
              <Link href={self(2)} className="mt-3 inline-block text-sm font-semibold text-ink-2 hover:underline">← {a.back}</Link>
            </>
          )}
          {step === 4 && (
            <div className="space-y-6">
              {company && fileSection("registration_document", ACCEPT_DOCUMENTS)}
              {fileSection("logo", ACCEPT_IMAGES, false)}
              {fileSection("workshop_photo", ACCEPT_IMAGES, true, company ? a.filesHint.workshop_photo : a.filesHint.workshop_photo_independent)}
              {!company && fileSection("product_photo", ACCEPT_IMAGES)}
              {fileSection("supporting_document", ACCEPT_DOCUMENTS)}
              <div className="flex flex-wrap gap-3 border-t border-line pt-4">
                <Link href={self(3)} className="btn btn-ghost border border-line-strong">← {a.back}</Link>
                <Link href={self(5)} className="btn btn-primary">{a.saveContinue}</Link>
              </div>
            </div>
          )}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">{a.reviewTitle}</h2>
              <p className="text-sm text-ink-2">{a.reviewIntro}</p>
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <Row k={a.name} v={m.name} />
                <Row k={s.register.typeTitle} v={s.type[m.seller_type]} />
                {company && <Row k={a.registrationNumber} v={m.registration_number} />}
                <Row k={company ? a.yearCompany : a.yearIndependent} v={m.year_established ? String(m.year_established) : null} />
                <Row k={a.address} v={[m.address, m.region, m.city].filter(Boolean).join(", ")} />
                <Row k={company ? a.contactCompany : a.contactIndependent} v={[m.contact_first_name, m.contact_last_name].filter(Boolean).join(" ")} />
                <Row k={a.contactEmail} v={m.contact_email} />
                <Row k={a.contactPhone} v={m.contact_phone} />
              </dl>
              {missing.length > 0 ? (
                <div className="rounded-lg border border-[#f0dcb0] bg-warn-50 p-3 text-sm text-warn" data-missing={missing.join(",")}>
                  <p className="flex items-center gap-2 font-bold"><AlertCircle className="h-4 w-4" aria-hidden="true" />{a.missingTitle}</p>
                  <ul className="mt-1 list-disc pl-6">
                    {missing.map((k) => (
                      <li key={k}>{a.missing[k] ?? k}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <Link href={self(4)} className="btn btn-ghost border border-line-strong">← {a.back}</Link>
                {m.account_status !== "pending_review" && missing.length === 0 && (
                  <SellerButton op="submit" back={self(5)} lang={lang} label={m.account_status === "info_required" ? a.resubmit : a.submit} tone="primary" />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!editable && !isApproved(m.account_status) && <p className="text-sm text-muted">{a.locked}</p>}

      <section className="card space-y-3 p-4 md:p-5">
        <h2 className="text-base font-bold">{a.messages}</h2>
        <MessageThread lang={lang} messages={messages} viewer="seller" />
        <SellerForm op="reply" back={self()} lang={lang} values={{ track: "account" }} className="space-y-2">
          <TextArea id="ap-reply" name="body" label={a.reply} required maxLength={3000} rows={3} />
          <Submit className="btn btn-dark px-3 py-1.5 text-sm">{a.replySend}</Submit>
        </SellerForm>
      </section>

      <section className="card p-4 md:p-5">
        <h2 className="text-base font-bold">{a.history}</h2>
        <div className="mt-3"><HistoryList lang={lang} items={sellerHistory(ctx, m.slug, "account")} labels={s.accountStatus} showWho={false} /></div>
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div className="flex flex-col border-b border-line pb-2">
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="font-semibold text-ink">{v || "—"}</dd>
    </div>
  );
}
