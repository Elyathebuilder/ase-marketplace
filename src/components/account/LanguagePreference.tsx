import { Hidden, Select } from "@/components/forms/Field";
import { Submit } from "@/components/forms/Submit";
import { LANGS, LANG_NAMES, getDict, type Lang } from "@/i18n";
import { accountAction } from "@/lib/market/account-actions";

/** The account's language: used for the site after sign-in, and for notifications and emails. */
export function LanguagePreference({ lang, current, back }: { lang: Lang; current: Lang | null; back: string }) {
  const a = getDict(lang).acc.account;
  return (
    <form action={accountAction} className="card grid max-w-xl gap-4 p-4 md:p-5">
      <Hidden values={{ op: "language", back, lang }} />
      <h2 className="text-lg font-bold">{a.language}</h2>
      <Select id="pf-lang" name="preferredLang" label={a.language} hint={a.languageHint} defaultValue={current ?? lang}>
        {LANGS.map((l) => (
          <option key={l} value={l} lang={l}>{LANG_NAMES[l]}</option>
        ))}
      </Select>
      <Submit className="btn btn-dark w-fit">{a.save}</Submit>
    </form>
  );
}
