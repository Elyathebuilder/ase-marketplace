import { MailWarning } from "lucide-react";
import { getDict, href, type Lang } from "@/i18n";
import { accountAction } from "@/lib/market/account-actions";

/** Shown until the email address is confirmed, with a button to send the link again. */
export function VerifyBanner({ lang, back, seller = false }: { lang: Lang; back: string; seller?: boolean }) {
  const v = getDict(lang).acc.verify;
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border border-[#ecd9ad] bg-warn-50 px-3 py-2 text-sm text-warn">
      <MailWarning className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">{seller ? v.bannerSeller : v.banner}</span>
      <a href={href(lang, "/account/verify")} className="font-semibold underline">{v.sentTitle}</a>
      <form action={accountAction}>
        <input type="hidden" name="op" value="resend" />
        <input type="hidden" name="back" value={back} />
        <button type="submit" className="font-semibold underline">{v.resend}</button>
      </form>
    </div>
  );
}
