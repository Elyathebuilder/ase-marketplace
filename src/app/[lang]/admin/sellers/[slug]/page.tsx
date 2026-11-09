import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, BadgeCheck, ExternalLink } from "lucide-react";
import { TextArea } from "@/components/forms/Field";
import { Submit } from "@/components/forms/Submit";
import { FormNotice, when } from "@/components/market/ui";
import { AdminSellerForm, FileList, HistoryList, MessageThread, StatusBox, StatusChip, parseList, parseSocial } from "@/components/seller/kit";
import { categoryName, getDict, href, isLang, place } from "@/i18n";
import { CATEGORIES } from "@/lib/categories";
import { getUser } from "@/lib/market/accounts";
import { adminOrNull } from "@/lib/market/auth";
import { getMaker, sellerFiles, sellerHistory, sellerMessages } from "@/lib/market/sellers";
import { market } from "@/lib/market/server";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string; slug: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").adm.sellers.title };
}

/** Which decisions an admin can take from each status (the service checks the same rules again). */
const MOVES: Record<string, string[]> = {
  pending_review: ["startReview", "requestInfo", "approveCompany", "approveIndependent", "reject"],
  under_review: ["requestInfo", "approveCompany", "approveIndependent", "reject"],
  info_required: ["reject"],
  approved_company: ["suspend"],
  approved_independent: ["suspend"],
  suspended: ["reactivate"],
};
const NEEDS_REASON = ["requestInfo", "reject", "suspend"];

export default async function AdminSellerPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const admin = await adminOrNull();
  if (!admin) return null;
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = market();
  const m = getMaker(ctx, slug);
  if (!m) notFound();
  const a = t.adm.seller;
  const s = t.sell;
  const ap = s.app;
  const self = href(lang, `/admin/sellers/${slug}`);
  const owner = m.owner_user_id ? getUser(ctx, m.owner_user_id) : undefined;
  const files = sellerFiles(ctx, slug).filter((f) => !["badge_document", "inspection_photo"].includes(f.kind) && !(f.kind === "workshop_photo" && f.related_id));
  const social = parseSocial(m.social);
  const company = m.seller_type === "company";
  const moves = MOVES[m.account_status] ?? [];
  const actions = ctx.db
    .prepare("SELECT a.*, u.name AS by_name FROM admin_actions a LEFT JOIN users u ON u.id = a.actor_id WHERE a.target_type = 'manufacturer' AND a.target_id = ? ORDER BY a.id DESC LIMIT 30")
    .all(slug) as { id: number; action: string; reason: string | null; at: string; by_name: string | null }[];
  const products = (ctx.db.prepare("SELECT status, COUNT(*) AS n FROM products WHERE manufacturer_slug = ? GROUP BY status").all(slug) as { status: string; n: number }[]);

  const row = (k: string, v: React.ReactNode) => (
    <div className="flex flex-col border-b border-line py-2">
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="whitespace-pre-line font-semibold text-ink">{v || "—"}</dd>
    </div>
  );

  return (
    <div className="space-y-5">
      <Link href={href(lang, "/admin/sellers")} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-2 hover:text-red-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {a.back}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold md:text-3xl">{m.name}</h1>
        <StatusChip status={m.account_status} label={s.accountStatus[m.account_status] ?? m.account_status} />
        <span className="text-sm text-muted">{s.type[m.seller_type]}</span>
        <div className="ml-auto flex flex-wrap gap-3 text-sm font-semibold">
          <Link href={href(lang, `/admin/sellers/${slug}/verification`)} className="inline-flex items-center gap-1 text-ink-2 hover:text-red-600"><BadgeCheck className="h-4 w-4" aria-hidden="true" />{a.verification}</Link>
          <Link href={href(lang, `/manufacturers/${slug}`)} className="inline-flex items-center gap-1 text-ink-2 hover:text-red-600">{a.publicPage}<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></Link>
        </div>
      </div>
      <FormNotice lang={lang} sp={sp} />

      {m.needs_reassessment === 1 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#f0dcb0] bg-warn-50 px-3 py-2 text-sm text-warn">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" /> <span className="flex-1">{a.reassessment}</span>
          <AdminSellerForm op="clearReassessment" slug={slug} back={self}><Submit className="btn btn-ghost border border-line-strong px-3 py-1 text-sm">{a.reassessmentDone}</Submit></AdminSellerForm>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-5">
          <section className="card p-4 md:p-5">
            <h2 className="text-base font-bold">{a.details}</h2>
            <dl className="mt-2 grid gap-x-6 sm:grid-cols-2">
              {row(ap.name, m.name)}
              {company && row(ap.legalName, m.legal_name)}
              {company && row(ap.registrationNumber, m.registration_number)}
              {row(company ? ap.yearCompany : ap.yearIndependent, m.year_established)}
              {row(ap.address, [m.address, m.region, m.city ? place(m.city, lang) : ""].filter(Boolean).join(", "))}
              {row(company ? ap.contactCompany : ap.contactIndependent, [m.contact_first_name, m.contact_last_name].filter(Boolean).join(" "))}
              {row(ap.contactEmail, m.contact_email)}
              {row(ap.contactPhone, m.contact_phone)}
              {row(ap.website, m.website)}
              {row(`${ap.facebook} / ${ap.instagram}`, [social.facebook, social.instagram].filter(Boolean).join("\n"))}
              {row(a.owner, owner ? `${owner.name} · ${owner.email} (${owner.email_verified_at ? a.emailConfirmed : a.emailNotConfirmed})` : "—")}
              {row(a.products, products.map((p) => `${s.products.status[p.status] ?? p.status}: ${p.n}`).join(", "))}
            </dl>
            <dl className="mt-2">
              {row(company ? ap.descriptionCompany : ap.descriptionIndependent, m.description)}
              {row(ap.categories, parseList(m.categories).map((c) => categoryName(c, CATEGORIES.find((x) => x.slug === c)?.name ?? c, lang)).join(", "))}
              {row(company ? ap.extraCompany : ap.extraIndependent, m.extra_info)}
            </dl>
          </section>

          <section className="card space-y-3 p-4 md:p-5">
            <h2 className="text-base font-bold">{a.files}</h2>
            {files.length === 0 ? <p className="text-sm text-muted">{a.noFiles}</p> : (
              ["registration_document", "logo", "workshop_photo", "product_photo", "supporting_document"].map((kind) => {
                const list = files.filter((f) => f.kind === kind);
                return list.length ? (
                  <div key={kind}>
                    <h3 className="mb-1 text-sm font-semibold">{ap.files[kind]}</h3>
                    <FileList lang={lang} files={list} removable={false} back={self} privateKinds={["registration_document", "supporting_document"]} />
                  </div>
                ) : null;
              })
            )}
          </section>

          <section className="card space-y-3 p-4 md:p-5">
            <h2 className="text-base font-bold">{a.messages}</h2>
            <MessageThread lang={lang} messages={sellerMessages(ctx, slug, "account", true)} viewer="admin" />
            <AdminSellerForm op="message" slug={slug} back={self} values={{ track: "account" }} className="space-y-2">
              <TextArea id="as-msg" name="body" label={a.messageLabel} required maxLength={3000} rows={3} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="internal" value="1" defaultChecked />{a.internal}</label>
              <Submit className="btn btn-dark px-3 py-1.5 text-sm">{a.send}</Submit>
            </AdminSellerForm>
          </section>
        </div>

        <aside className="space-y-5">
          <StatusBox status={m.account_status} label={s.accountStatus[m.account_status] ?? m.account_status}>
            {m.submitted_at && <p className="mt-1 text-xs">{t.adm.sellers.colSubmitted}: {when(m.submitted_at, lang)}</p>}
          </StatusBox>
          <section className="card space-y-3 p-4" data-admin-decisions>
            <h2 className="text-base font-bold">{a.decisions}</h2>
            <p className="text-xs text-muted">{a.decisionIntro}</p>
            {moves.length === 0 && <p className="text-sm text-muted">{a.noMoves}</p>}
            {moves.map((move) => (
              <details key={move} className="rounded-lg border border-line" open={move === "startReview"}>
                <summary className={`cursor-pointer list-none px-3 py-2 text-sm font-semibold ${["reject", "suspend"].includes(move) ? "text-red-700" : "text-ink"} hover:bg-paper-2`}>{a.moves[move]}</summary>
                <AdminSellerForm op="decision" slug={slug} back={self} values={{ move }} className="space-y-2 border-t border-line p-3">
                  {move !== "startReview" && (
                    <TextArea id={`dec-${move}`} name="reason" label={NEEDS_REASON.includes(move) ? a.reason : a.reasonOptional} required={NEEDS_REASON.includes(move)} maxLength={2000} rows={2} />
                  )}
                  <Submit className={`btn ${["reject", "suspend"].includes(move) ? "btn-primary" : "btn-dark"} px-3 py-1.5 text-sm`}>{a.moves[move]}</Submit>
                </AdminSellerForm>
              </details>
            ))}
          </section>
          <section className="card p-4">
            <h2 className="text-base font-bold">{a.history}</h2>
            <div className="mt-2"><HistoryList lang={lang} items={sellerHistory(ctx, slug, "account")} labels={s.accountStatus} showWho /></div>
          </section>
          {actions.length > 0 && (
            <section className="card p-4">
              <h2 className="text-base font-bold">{a.actions}</h2>
              <ul className="mt-2 space-y-1 text-xs text-ink-2">
                {actions.map((x) => (
                  <li key={x.id}><span className="tabular-nums text-muted">{when(x.at, lang)}</span> · <strong>{x.action}</strong>{x.by_name ? ` · ${x.by_name}` : ""}{x.reason ? ` · ${x.reason}` : ""}</li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
