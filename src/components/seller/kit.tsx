/**
 * Building blocks for the seller portal and the admin seller pages: forms that post to the seller
 * actions, the step indicator, status boxes, message threads, history and file lists.
 * Server components only; they show data and post forms, the services decide what is allowed.
 */
import Link from "next/link";
import { Check, FileText, Lock } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { categoryName, getDict, href, type Lang } from "@/i18n";
import { adminSellerAction, sellerAction } from "@/lib/market/seller-actions";
import type { SellerFile, SellerHistory, SellerMessage } from "@/lib/market/sellers";
import { Submit } from "@/components/forms/Submit";
import { when } from "@/components/market/ui";

type Values = Record<string, string | number | null | undefined>;

function HiddenValues({ values }: { values: Values }) {
  return (
    <>
      {Object.entries(values).map(([k, v]) => (v == null ? null : <input key={k} type="hidden" name={k} value={String(v)} />))}
    </>
  );
}

/** A form posted to the seller actions. `back` is where to return (with ?ok=1 or ?error=…). */
export function SellerForm({ op, back, lang, values, className, children }: { op: string; back: string; lang: Lang; values?: Values; className?: string; children: React.ReactNode }) {
  return (
    <form action={sellerAction} className={className}>
      <HiddenValues values={{ op, back, lang, ...values }} />
      {children}
    </form>
  );
}

/** A form posted to the admin seller actions. */
export function AdminSellerForm({ op, slug, back, values, className, children }: { op: string; slug: string; back: string; values?: Values; className?: string; children: React.ReactNode }) {
  return (
    <form action={adminSellerAction} className={className}>
      <HiddenValues values={{ op, slug, back, ...values }} />
      {children}
    </form>
  );
}

/** One-click seller action. */
export function SellerButton({ op, back, lang, values, label, tone = "dark" }: { op: string; back: string; lang: Lang; values?: Values; label: string; tone?: "dark" | "primary" | "ghost" | "danger" }) {
  const cls = tone === "primary" ? "btn btn-primary" : tone === "ghost" ? "btn btn-ghost border border-line-strong" : tone === "danger" ? "btn btn-ghost border border-red-200 text-red-700" : "btn btn-dark";
  return (
    <SellerForm op={op} back={back} lang={lang} values={values} className="inline">
      <Submit className={`${cls} px-3 py-1.5 text-sm`}>{label}</Submit>
    </SellerForm>
  );
}

/** The step indicator of the seller application. Finished steps are links. */
export function StepProgress({ lang, current, done, linkFrom = 2 }: { lang: Lang; current: number; done: number[]; linkFrom?: number }) {
  const s = getDict(lang).sell;
  return (
    <nav aria-label={s.stepOf(current, s.steps.length)} className="mb-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{s.stepOf(current, s.steps.length)}</p>
      <ol className="grid grid-cols-5 gap-1.5">
        {s.steps.map((label, i) => {
          const n = i + 1;
          const isDone = done.includes(n);
          const isCurrent = n === current;
          const bar = isCurrent ? "bg-red-600" : isDone ? "bg-ink" : "bg-line-strong";
          const content = (
            <>
              <span className={`block h-1.5 rounded-full ${bar}`} aria-hidden="true" />
              <span className={`mt-1.5 hidden text-xs sm:flex sm:items-center sm:gap-1 ${isCurrent ? "font-bold text-ink" : "text-muted"}`}>
                {isDone && !isCurrent && <Check className="h-3 w-3" aria-hidden="true" />}
                {label}
              </span>
              <span className="sr-only">{`${label}${isCurrent ? " (current)" : isDone ? " (done)" : ""}`}</span>
            </>
          );
          return (
            <li key={label} aria-current={isCurrent ? "step" : undefined}>
              {n >= linkFrom && !isCurrent ? (
                <Link href={`${href(lang, "/seller/application")}?step=${n}`} className="block hover:opacity-80">{content}</Link>
              ) : (
                <div>{content}</div>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-sm font-semibold sm:hidden">{s.steps[current - 1]}</p>
    </nav>
  );
}

const TONE: Record<string, string> = {
  draft: "border-line bg-paper-2 text-ink-2",
  pending_review: "border-[#c9d8f0] bg-[#eef3fb] text-[#1f4b8f]",
  under_review: "border-[#c9d8f0] bg-[#eef3fb] text-[#1f4b8f]",
  submitted: "border-[#c9d8f0] bg-[#eef3fb] text-[#1f4b8f]",
  inspection_scheduled: "border-[#c9d8f0] bg-[#eef3fb] text-[#1f4b8f]",
  inspection_completed: "border-[#c9d8f0] bg-[#eef3fb] text-[#1f4b8f]",
  info_required: "border-[#f0dcb0] bg-warn-50 text-warn",
  approved_company: "border-[#c4e0cf] bg-ok-50 text-ok",
  approved_independent: "border-[#c4e0cf] bg-ok-50 text-ok",
  verified: "border-[#c4e0cf] bg-ok-50 text-ok",
  rejected: "border-red-200 bg-red-50 text-red-700",
  suspended: "border-red-200 bg-red-50 text-red-700",
  revoked: "border-red-200 bg-red-50 text-red-700",
  not_requested: "border-line bg-paper-2 text-ink-2",
};

/** A coloured box with a status and an explanation. */
export function StatusBox({ status, label, text, children }: { status: string; label: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className={`rounded-xl border p-4 ${TONE[status] ?? TONE.draft}`} data-status={status}>
      <p className="text-base font-bold">{label}</p>
      {text && <p className="mt-1 text-sm opacity-90">{text}</p>}
      {children}
    </div>
  );
}

/** Small status chip for tables. */
export function StatusChip({ status, label, wrap = false }: { status: string; label: string; wrap?: boolean }) {
  return <span data-status={status} className={`inline-block ${wrap ? "max-w-full" : "whitespace-nowrap"} rounded-full border px-2 py-0.5 text-xs font-semibold ${TONE[status] ?? TONE.draft}`}>{label}</span>;
}

/** Messages between a seller and Amartani. Internal notes are passed only on admin pages. */
export function MessageThread({ lang, messages, viewer }: { lang: Lang; messages: SellerMessage[]; viewer: "seller" | "admin" }) {
  const s = getDict(lang).sell.app;
  if (messages.length === 0) return <p className="text-sm text-muted">{s.noMessages}</p>;
  return (
    <ul className="space-y-2">
      {messages.map((m) => {
        const mine = (viewer === "seller") === (m.author_role === "manufacturer");
        const who = m.author_role === "admin" ? (viewer === "admin" ? m.author_name ?? s.fromAmartani : s.fromAmartani) : viewer === "seller" ? s.you : m.author_name ?? "";
        return (
          <li
            key={m.id}
            className={`rounded-lg border px-3 py-2 text-sm ${m.visibility === "internal" ? "border-dashed border-[#f0dcb0] bg-warn-50" : mine ? "border-line bg-paper-2" : "border-line bg-surface"}`}
          >
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
              <strong className="text-ink">{who}</strong>
              {m.kind === "info_request" && <span className="font-semibold text-warn">{s.infoRequest}</span>}
              {m.kind === "decision" && <span className="font-semibold">{s.decision}</span>}
              {m.visibility === "internal" && (
                <span className="inline-flex items-center gap-1 font-semibold text-warn"><Lock className="h-3 w-3" aria-hidden="true" />internal</span>
              )}
              <span className="ml-auto tabular-nums">{when(m.at, lang)}</span>
            </p>
            <p className="mt-1 whitespace-pre-line text-ink-2">{m.body}</p>
          </li>
        );
      })}
    </ul>
  );
}

/** Permanent status history: who changed what, when and why. */
export function HistoryList({ lang, items, labels, showWho }: { lang: Lang; items: SellerHistory[]; labels: Record<string, string>; showWho: boolean }) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-1.5 text-sm">
      {[...items].reverse().map((h) => (
        <li key={h.id} className="flex flex-wrap gap-x-2">
          <span className="text-xs tabular-nums text-muted">{when(h.at, lang)}</span>
          <span className="text-ink-2">
            {h.from_status ? `${labels[h.from_status] ?? h.from_status} → ` : ""}
            <strong className="text-ink">{labels[h.to_status] ?? h.to_status}</strong>
            {showWho && h.by_name ? ` · ${h.by_name}` : ""}
            {h.reason ? ` · ${h.reason}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Uploaded files with a thumbnail for photos. Files are served by /api/files after a permission check. */
export function FileList({
  lang,
  files,
  removable,
  back,
  privateKinds = [],
  closedKinds = [],
}: {
  lang: Lang;
  files: SellerFile[];
  removable: boolean;
  back: string;
  privateKinds?: string[];
  /** Kinds this viewer can't open (the seller can't reopen its registration document). */
  closedKinds?: string[];
}) {
  const s = getDict(lang).sell.app;
  if (files.length === 0) return <p className="text-sm text-muted">{s.noFiles}</p>;
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {files.map((f) => {
        const isImage = /\.(png|jpg|webp)$/.test(f.file) && !closedKinds.includes(f.kind);
        const Wrap = closedKinds.includes(f.kind) ? "div" : "a";
        return (
          <li key={f.id} className="overflow-hidden rounded-lg border border-line bg-surface text-xs">
            <Wrap {...(Wrap === "a" ? { href: `/api/files/${f.file}`, target: "_blank", rel: "noopener" } : {})} className="block">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element -- uploads are served by our own permission-checked route
                <img src={`/api/files/${f.file}`} alt={f.name} loading="lazy" className="h-24 w-full object-cover" />
              ) : (
                <span className="flex h-24 items-center justify-center bg-paper-2"><FileText className="h-8 w-8 text-muted" aria-hidden="true" /></span>
              )}
              <span className="block truncate px-2 pt-1.5 font-semibold text-ink">{f.name}</span>
            </Wrap>
            <div className="flex items-center gap-2 px-2 pb-1.5">
              {privateKinds.includes(f.kind) && <span className="inline-flex items-center gap-1 text-muted"><Lock className="h-3 w-3" aria-hidden="true" />{s.privateFile}</span>}
              {removable && (
                <SellerForm op="removeFile" back={back} lang={lang} values={{ id: f.id }} className="ml-auto">
                  <button type="submit" className="text-red-700 hover:underline">{s.remove}</button>
                </SellerForm>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Upload form for one kind of seller file. */
export function UploadForm({ lang, kind, back, multiple = true, accept }: { lang: Lang; kind: string; back: string; multiple?: boolean; accept: string }) {
  const s = getDict(lang).sell.app;
  const id = `up-${kind}`;
  return (
    <SellerForm op="upload" back={back} lang={lang} values={{ kind }} className="mt-2 flex flex-wrap items-center gap-2">
      <label htmlFor={id} className="sr-only">{s.files[kind]}</label>
      <input id={id} type="file" name="file" accept={accept} multiple={multiple} required className="max-w-full text-sm file:mr-2 file:rounded-md file:border-0 file:bg-paper-2 file:px-3 file:py-1.5 file:text-sm file:font-semibold" />
      <Submit className="btn btn-dark px-3 py-1.5 text-sm">{s.upload}</Submit>
    </SellerForm>
  );
}

export const ACCEPT_IMAGES = "image/png,image/jpeg,image/webp";
export const ACCEPT_DOCUMENTS = "application/pdf,image/png,image/jpeg";

/** Category checkboxes (stored as a list of slugs). */
export function CategoryChecks({ lang, name = "categories", selected, legend }: { lang: Lang; name?: string; selected: string[]; legend: string }) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {CATEGORIES.map((c) => (
          <label key={c.slug} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm has-[:checked]:border-ink has-[:checked]:bg-paper-2">
            <input type="checkbox" name={name} value={c.slug} defaultChecked={selected.includes(c.slug)} />
            {categoryName(c.slug, c.name, lang)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export const parseList = (json: string | null | undefined): string[] => {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
};

export const parseSocial = (json: string | null | undefined): { facebook?: string; instagram?: string } => {
  try {
    return (JSON.parse(json || "{}") as { facebook?: string; instagram?: string }) ?? {};
  } catch {
    return {};
  }
};
