import type { Metadata } from "next";
import { BadgeCheck, Store } from "lucide-react";
import { Field, TextArea } from "@/components/forms/Field";
import { Submit } from "@/components/forms/Submit";
import { FormNotice, when } from "@/components/market/ui";
import { ACCEPT_DOCUMENTS, ACCEPT_IMAGES, CategoryChecks, HistoryList, MessageThread, SellerButton, SellerForm, StatusBox, parseList } from "@/components/seller/kit";
import { getDict, href, isLang } from "@/i18n";
import { badgeRequests, inspectionOf, openRequest, type BadgeDetails } from "@/lib/market/badge";
import { isApproved } from "@/lib/market/catalog-store";
import { sellerSession } from "@/lib/market/seller-page";
import { sellerHistory, sellerMessages } from "@/lib/market/sellers";
import { market } from "@/lib/market/server";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").sell.badge.title };
}

/** Portal A: apply for the separate Verified Manufacturer badge and follow the request. Only admins decide. */
export default async function SellerVerificationPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const session = await sellerSession();
  if (!session) return null;
  const sp = await searchParams;
  const s = t.sell;
  const b = s.badge;
  const ctx = market();
  const m = session.store;
  const self = href(lang, "/seller/verification");
  const approved = isApproved(m.account_status);
  const open = openRequest(ctx, m.slug);
  const last = badgeRequests(ctx, m.slug)[0];
  const inspection = open ? inspectionOf(ctx, open.id) : undefined;
  const status = open?.status ?? m.badge_status;
  const canApply = approved && ((!open && m.badge_status !== "verified") || open?.status === "info_required");
  const prev: Partial<BadgeDetails> = (() => {
    try {
      return JSON.parse((open ?? last)?.details || "{}") as Partial<BadgeDetails>;
    } catch {
      return {};
    }
  })();
  const decision = !open && last?.decision_reason && ["rejected", "revoked"].includes(m.badge_status) ? last.decision_reason : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">{b.title}</h1>
        <p className="mt-1 text-sm text-muted">{b.intro}</p>
      </div>
      <FormNotice lang={lang} sp={sp} />

      <div className="grid gap-3 md:grid-cols-2">
        <div className="card p-4">
          <p className="flex items-center gap-2 font-bold"><Store className="h-4 w-4" aria-hidden="true" />{b.approvedTitle}</p>
          <p className="mt-1 text-sm text-ink-2">{b.approvedText}</p>
        </div>
        <div className="card border-[#c4e0cf] p-4">
          <p className="flex items-center gap-2 font-bold text-ok"><BadgeCheck className="h-4 w-4" aria-hidden="true" />{b.verifiedTitle}</p>
          <p className="mt-1 text-sm text-ink-2">{b.verifiedText}</p>
        </div>
      </div>

      <StatusBox status={status} label={`${b.current}: ${s.badgeStatus[status] ?? status}`}>
        {m.badge_status === "verified" && m.verified_at && <p className="mt-1 text-sm">{b.verifiedSince}: {when(m.verified_at, lang, false)}</p>}
        {inspection?.scheduled_for && !inspection.completed_at && (
          <p className="mt-1 text-sm">{b.inspection}: {b.scheduledFor} <strong>{when(inspection.scheduled_for.length > 10 ? inspection.scheduled_for : `${inspection.scheduled_for}T09:00`, lang, inspection.scheduled_for.length > 10)}</strong></p>
        )}
        {decision && <p className="mt-1 text-sm">{b.decision}: {decision}</p>}
      </StatusBox>

      {!approved && <p className="rounded-lg bg-paper-2 px-3 py-2 text-sm text-ink-2">{b.notEligible}</p>}

      {canApply && (
        <section className="card p-4 md:p-6">
          <h2 className="text-lg font-bold">{b.apply}</h2>
          <p className="mt-1 text-sm text-ink-2">{b.applyIntro}</p>
          <SellerForm op="badgeRequest" back={self} lang={lang} className="mt-4 space-y-4">
            <Field id="bd-name" name="name" label={b.name} defaultValue={prev.name ?? m.name} required maxLength={120} />
            <Field id="bd-loc" name="location" label={b.location} defaultValue={prev.location ?? [m.address, m.region, m.city].filter(Boolean).join(", ")} required maxLength={300} />
            <TextArea id="bd-act" name="activities" label={b.activities} hint={b.activitiesHint} defaultValue={prev.activities ?? ""} required minLength={30} maxLength={3000} rows={4} />
            <CategoryChecks lang={lang} selected={prev.categories ?? parseList(m.categories)} legend={b.categories} />
            <TextArea id="bd-cap" name="capacity" label={b.capacity} hint={b.capacityHint} defaultValue={prev.capacity ?? ""} required maxLength={1000} rows={2} />
            <Field id="bd-contact" name="contact" label={b.contact} defaultValue={prev.contact ?? `${m.contact_first_name ?? ""} ${m.contact_last_name ?? ""}, ${m.contact_phone}`.trim()} required maxLength={300} />
            <TextArea id="bd-extra" name="extra" label={b.extra} defaultValue={prev.extra ?? ""} maxLength={3000} rows={3} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="bd-docs">{b.documents}</label>
                <input id="bd-docs" type="file" name="documents" accept={ACCEPT_DOCUMENTS} multiple className="max-w-full text-sm file:mr-2 file:rounded-md file:border-0 file:bg-paper-2 file:px-3 file:py-1.5 file:text-sm file:font-semibold" />
                <p className="mt-1 text-xs text-muted">{b.documentsHint}</p>
              </div>
              <div>
                <label className="label" htmlFor="bd-photos">{b.photos}</label>
                <input id="bd-photos" type="file" name="photos" accept={ACCEPT_IMAGES} multiple className="max-w-full text-sm file:mr-2 file:rounded-md file:border-0 file:bg-paper-2 file:px-3 file:py-1.5 file:text-sm file:font-semibold" />
                <p className="mt-1 text-xs text-muted">{b.photosHint}</p>
              </div>
            </div>
            <Submit className="btn btn-primary">{open ? b.sendUpdate : b.send}</Submit>
          </SellerForm>
        </section>
      )}

      {open && open.reason === "seller_request" && (
        <SellerButton op="badgeWithdraw" back={self} lang={lang} label={b.withdraw} tone="ghost" />
      )}

      {(open || last) && (
        <section className="card space-y-3 p-4 md:p-5">
          <h2 className="text-base font-bold">{s.app.messages}</h2>
          <MessageThread lang={lang} messages={sellerMessages(ctx, m.slug, "badge", false)} viewer="seller" />
          <SellerForm op="reply" back={self} lang={lang} values={{ track: "badge" }} className="space-y-2">
            <TextArea id="bd-reply" name="body" label={s.app.reply} required maxLength={3000} rows={3} />
            <Submit className="btn btn-dark px-3 py-1.5 text-sm">{s.app.replySend}</Submit>
          </SellerForm>
        </section>
      )}

      <section className="card p-4 md:p-5">
        <h2 className="text-base font-bold">{b.history}</h2>
        <div className="mt-3"><HistoryList lang={lang} items={sellerHistory(ctx, m.slug, "badge")} labels={s.badgeStatus} showWho={false} /></div>
      </section>
    </div>
  );
}
