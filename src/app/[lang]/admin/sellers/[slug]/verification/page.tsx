import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Field, Select, TextArea } from "@/components/forms/Field";
import { Submit } from "@/components/forms/Submit";
import { FormNotice, when } from "@/components/market/ui";
import { ACCEPT_IMAGES, AdminSellerForm, FileList, HistoryList, MessageThread, StatusBox, StatusChip } from "@/components/seller/kit";
import { categoryName, getDict, href, isLang } from "@/i18n";
import { CATEGORIES } from "@/lib/categories";
import { adminOrNull } from "@/lib/market/auth";
import { CHECKLIST, LIGHTER_FOR_HOME, badgeRequests, inspectionOf, openRequest, parseChecklist, type BadgeDetails } from "@/lib/market/badge";
import { isApproved } from "@/lib/market/catalog-store";
import { getMaker, sellerFiles, sellerHistory, sellerMessages } from "@/lib/market/sellers";
import { market } from "@/lib/market/server";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string; slug: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").adm.badge.title };
}

/** Admin: review a Verified Manufacturer request, plan and record the inspection, and decide. */
export default async function AdminBadgePage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const admin = await adminOrNull();
  if (!admin) return null;
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = market();
  const m = getMaker(ctx, slug);
  if (!m) notFound();
  const b = t.adm.badge;
  const s = t.sell;
  const self = href(lang, `/admin/sellers/${slug}/verification`);
  const req = openRequest(ctx, slug);
  const all = badgeRequests(ctx, slug);
  const ins = req ? inspectionOf(ctx, req.id) : undefined;
  const checklist = parseChecklist(ins?.checklist);
  const details: Partial<BadgeDetails> = (() => {
    try {
      return JSON.parse(req?.details || "{}") as Partial<BadgeDetails>;
    } catch {
      return {};
    }
  })();
  const files = sellerFiles(ctx, slug);
  const reqFiles = req ? files.filter((f) => f.related_id === req.id) : [];
  const insPhotos = ins ? files.filter((f) => f.related_id === ins.id) : [];
  const scale = ins?.scale ?? "workshop";
  const canInspect = req && ["inspection_scheduled", "inspection_completed", "under_review"].includes(req.status);
  const reasonBox = (op: string, label: string, danger = false, hint?: string) => (
    <details className="rounded-lg border border-line">
      <summary className={`cursor-pointer list-none px-3 py-2 text-sm font-semibold ${danger ? "text-red-700" : "text-ink"} hover:bg-paper-2`}>{label}</summary>
      <AdminSellerForm op={op} slug={slug} back={self} className="space-y-2 border-t border-line p-3">
        {hint && <p className="text-xs text-muted">{hint}</p>}
        <TextArea id={`bd-${op}`} name="reason" label={b.decisionReason} required maxLength={2000} rows={2} />
        <Submit className={`btn ${danger ? "btn-primary" : "btn-dark"} px-3 py-1.5 text-sm`}>{label}</Submit>
      </AdminSellerForm>
    </details>
  );

  return (
    <div className="space-y-5">
      <Link href={href(lang, `/admin/sellers/${slug}`)} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-2 hover:text-red-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {b.backToSeller}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold md:text-3xl">{b.pageTitle(m.name)}</h1>
        <StatusChip status={m.account_status} label={s.accountStatus[m.account_status] ?? m.account_status} />
      </div>
      <FormNotice lang={lang} sp={sp} />
      <StatusBox status={req?.status ?? m.badge_status} label={`${s.badge.current}: ${s.badgeStatus[req?.status ?? m.badge_status] ?? m.badge_status}`}>
        {req && <p className="mt-1 text-sm">{b.request} {req.id} · {b.reason[req.reason]} · {when(req.submitted_at ?? req.created_at, lang)}</p>}
        {m.badge_status === "verified" && req && <p className="mt-1 text-sm">{s.badgeStatus.verified}: {s.badge.verifiedSince} {m.verified_at ? when(m.verified_at, lang, false) : ""}</p>}
      </StatusBox>

      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-5">
          {req ? (
            <section className="card p-4 md:p-5">
              <h2 className="text-base font-bold">{b.request}</h2>
              <dl className="mt-2 grid gap-x-6 sm:grid-cols-2">
                {(["name", "location", "capacity", "contact"] as const).map((k) => (
                  <div key={k} className="flex flex-col border-b border-line py-2">
                    <dt className="text-xs text-muted">{b.details[k]}</dt>
                    <dd className="font-semibold">{details[k] || "—"}</dd>
                  </div>
                ))}
              </dl>
              {(["activities", "extra"] as const).map((k) => (
                <div key={k} className="border-b border-line py-2">
                  <p className="text-xs text-muted">{b.details[k]}</p>
                  <p className="whitespace-pre-line text-sm font-semibold">{details[k] || "—"}</p>
                </div>
              ))}
              <p className="py-2 text-sm"><span className="text-xs text-muted">{b.details.categories}: </span>{(details.categories ?? []).map((c) => categoryName(c, CATEGORIES.find((x) => x.slug === c)?.name ?? c, lang)).join(", ") || "—"}</p>
              <h3 className="mt-3 text-sm font-bold">{b.files}</h3>
              <div className="mt-2"><FileList lang={lang} files={reqFiles} removable={false} back={self} /></div>
            </section>
          ) : (
            <p className="card p-4 text-sm text-muted">{b.noRequest}</p>
          )}

          {req && ["submitted", "under_review", "info_required", "inspection_scheduled"].includes(req.status) && (
            <section className="card space-y-3 p-4 md:p-5">
              <h2 className="text-base font-bold">{b.schedule}</h2>
              <AdminSellerForm op="badgeSchedule" slug={slug} back={self} className="grid gap-3 sm:grid-cols-2">
                <Field id="bs-date" name="date" type="datetime-local" label={b.date} defaultValue={ins?.scheduled_for ?? ""} required />
                <Select id="bs-scale" name="scale" label={b.scale} defaultValue={scale}>
                  {(["home", "workshop", "factory"] as const).map((k) => <option key={k} value={k}>{b.scales[k]}</option>)}
                </Select>
                <TextArea id="bs-note" name="note" label={b.note} maxLength={1000} rows={2} className="sm:col-span-2" />
                <Submit className="btn btn-dark px-3 py-1.5 text-sm sm:justify-self-start">{b.scheduleSend}</Submit>
              </AdminSellerForm>
            </section>
          )}

          {canInspect && (
            <section className="card space-y-4 p-4 md:p-5" data-inspection>
              <div>
                <h2 className="text-base font-bold">{b.inspection}</h2>
                <p className="mt-1 text-xs text-muted">{b.inspectionIntro}</p>
              </div>
              <ul className="space-y-1 rounded-lg bg-paper-2 p-3 text-xs text-ink-2">
                {(["home", "workshop", "factory"] as const).map((k) => <li key={k}><strong>{b.scales[k]}:</strong> {b.scaleHelp[k]}</li>)}
              </ul>
              <AdminSellerForm op="badgeInspection" slug={slug} back={self} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select id="bi-scale" name="scale" label={b.scale} defaultValue={scale}>
                    {(["home", "workshop", "factory"] as const).map((k) => <option key={k} value={k}>{b.scales[k]}</option>)}
                  </Select>
                  <Field id="bi-visit" name="visitedAt" type="date" label={b.visitedAt} defaultValue={ins?.visited_at?.slice(0, 10) ?? ""} />
                </div>
                <ol className="space-y-3">
                  {CHECKLIST.map((k, i) => (
                    <li key={k} className="rounded-lg border border-line p-3">
                      <fieldset>
                        <legend className="text-sm font-semibold">{i + 1}. {b.checklist[k]}{scale === "home" && LIGHTER_FOR_HOME.includes(k) ? <span className="ml-1 text-xs font-normal text-muted">({b.results.na}?)</span> : null}</legend>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm">
                          {(["yes", "no", "na"] as const).map((r) => (
                            <label key={r} className="flex items-center gap-1.5">
                              <input type="radio" name={`${k}.result`} value={r} defaultChecked={checklist[k]?.result === r} />
                              {b.results[r]}
                            </label>
                          ))}
                        </div>
                        <label className="sr-only" htmlFor={`bi-${k}`}>{b.itemNote}</label>
                        <input id={`bi-${k}`} name={`${k}.note`} defaultValue={checklist[k]?.note ?? ""} placeholder={b.itemNote} maxLength={1000} className="input mt-2" />
                      </fieldset>
                    </li>
                  ))}
                </ol>
                <TextArea id="bi-concerns" name="concerns" label={b.concerns} defaultValue={checklist.concerns ?? ""} maxLength={3000} rows={3} />
                <TextArea id="bi-summary" name="summary" label={b.summary} defaultValue={ins?.summary ?? ""} maxLength={3000} rows={3} />
                <Select id="bi-rec" name="recommendation" label={b.recommendation} defaultValue={ins?.recommendation ?? ""} className="max-w-sm">
                  <option value="">—</option>
                  {(["approve", "reject", "more_info"] as const).map((r) => <option key={r} value={r}>{b.recommendations[r]}</option>)}
                </Select>
                <div>
                  <label className="label" htmlFor="bi-photos">{b.photos}</label>
                  <input id="bi-photos" type="file" name="photos" accept={ACCEPT_IMAGES} multiple className="max-w-full text-sm file:mr-2 file:rounded-md file:border-0 file:bg-paper-2 file:px-3 file:py-1.5 file:text-sm file:font-semibold" />
                </div>
                {insPhotos.length > 0 && <FileList lang={lang} files={insPhotos} removable={false} back={self} />}
                <div className="flex flex-wrap gap-2">
                  <Submit className="btn btn-dark" name="complete" value="0">{b.saveDraft}</Submit>
                  <Submit className="btn btn-primary" name="complete" value="1">{b.complete}</Submit>
                </div>
                {ins?.completed_at && <p className="text-xs text-muted">{b.completedAt}: {when(ins.completed_at, lang)}{ins.inspector_name ? ` · ${b.inspector}: ${ins.inspector_name}` : ""}</p>}
              </AdminSellerForm>
            </section>
          )}

          <section className="card space-y-3 p-4 md:p-5">
            <h2 className="text-base font-bold">{b.messages}</h2>
            <MessageThread lang={lang} messages={sellerMessages(ctx, slug, "badge", true)} viewer="admin" />
            <AdminSellerForm op="message" slug={slug} back={self} values={{ track: "badge" }} className="space-y-2">
              <TextArea id="bm-msg" name="body" label={t.adm.seller.messageLabel} required maxLength={3000} rows={3} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="internal" value="1" defaultChecked />{t.adm.seller.internal}</label>
              <Submit className="btn btn-dark px-3 py-1.5 text-sm">{t.adm.seller.send}</Submit>
            </AdminSellerForm>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="card space-y-2 p-4" data-badge-decisions>
            <h2 className="text-base font-bold">{b.decision}</h2>
            {req?.status === "submitted" && (
              <AdminSellerForm op="badgeReview" slug={slug} back={self}><Submit className="btn btn-dark w-full px-3 py-1.5 text-sm">{b.startReview}</Submit></AdminSellerForm>
            )}
            {req?.status === "inspection_completed" && reasonBox("badgeApprove", b.approve, false, b.approveHint)}
            {req && req.status !== "info_required" && reasonBox("badgeInfo", b.requestInfo)}
            {req && reasonBox("badgeReject", b.reject, true)}
            {!req && m.badge_status === "verified" && reasonBox("badgeRevoke", b.revoke, true)}
            {!req && isApproved(m.account_status) && m.badge_status === "verified" && reasonBox("badgeReassess", b.reassess)}
            {!req && m.badge_status !== "verified" && <p className="text-sm text-muted">{b.noRequest}</p>}
          </section>
          <section className="card p-4">
            <h2 className="text-base font-bold">{b.history}</h2>
            <div className="mt-2"><HistoryList lang={lang} items={sellerHistory(ctx, slug, "badge")} labels={s.badgeStatus} showWho /></div>
          </section>
          {all.filter((r) => r.id !== req?.id).length > 0 && (
            <section className="card p-4">
              <h2 className="text-base font-bold">{b.requests}</h2>
              <ul className="mt-2 space-y-1 text-xs text-ink-2">
                {all.filter((r) => r.id !== req?.id).map((r) => (
                  <li key={r.id}>{r.id} · {s.badgeStatus[r.status] ?? r.status} · {when(r.created_at, lang, false)}{r.decision_reason ? ` · ${r.decision_reason}` : ""}</li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
