import type { Metadata } from "next";
import { FormNotice } from "@/components/market/ui";
import { BusinessStep, ContactStep } from "@/components/seller/application";
import { ACCEPT_IMAGES, FileList, UploadForm } from "@/components/seller/kit";
import { getDict, isLang, href } from "@/i18n";
import { isApproved } from "@/lib/market/catalog-store";
import { sellerSession } from "@/lib/market/seller-page";
import { sellerFiles } from "@/lib/market/sellers";
import { market } from "@/lib/market/server";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").sell.profile.title };
}

const EDITABLE = ["draft", "pending_review", "info_required"];

/** Portal A: the store profile. Same fields and server rules as the application. */
export default async function StoreProfilePage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { lang, t } = await pageLang(params);
  const session = await sellerSession();
  if (!session) return null;
  const sp = await searchParams;
  const s = t.sell;
  const m = session.store;
  const self = href(lang, "/seller/company");
  const canEdit = isApproved(m.account_status) || EDITABLE.includes(m.account_status);
  const files = sellerFiles(market(), m.slug).filter((f) => f.related_id === null);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">{s.profile.title}</h1>
        <p className="mt-1 text-sm text-muted">{s.profile.intro}</p>
      </div>
      <FormNotice lang={lang} sp={sp} />
      {isApproved(m.account_status) && <p className="rounded-lg bg-paper-2 px-3 py-2 text-sm text-ink-2">{s.profile.sensitive}</p>}
      {m.needs_reassessment === 1 && <p className="rounded-lg bg-warn-50 px-3 py-2 text-sm text-warn">{s.profile.reassessment}</p>}
      {!canEdit && <p className="text-sm text-muted">{s.app.locked}</p>}

      {canEdit && (
        <>
          <section className="card p-4 md:p-6">
            <h2 className="mb-4 text-lg font-bold">{s.steps[1]}</h2>
            <BusinessStep lang={lang} m={m} back={self} submitLabel={s.app.save} />
          </section>
          <section className="card p-4 md:p-6">
            <h2 className="mb-4 text-lg font-bold">{s.steps[2]}</h2>
            <ContactStep lang={lang} m={m} back={self} submitLabel={s.app.save} />
          </section>
          <section className="card space-y-5 p-4 md:p-6">
            {(["logo", "workshop_photo"] as const).map((kind) => (
              <div key={kind} className="space-y-2">
                <h2 className="text-base font-bold">{s.app.files[kind]}</h2>
                <p className="text-xs text-muted">{s.app.filesHint[kind]}</p>
                <FileList lang={lang} files={files.filter((f) => f.kind === kind)} removable back={self} />
                <UploadForm lang={lang} kind={kind} back={self} multiple={kind !== "logo"} accept={ACCEPT_IMAGES} />
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
