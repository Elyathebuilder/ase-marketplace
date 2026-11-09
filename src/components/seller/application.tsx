/**
 * The seller application's form steps. Used by the application wizard and, after approval, by the
 * store profile page (same fields, same server rules).
 */
import { Field, Select, TextArea } from "@/components/forms/Field";
import { Submit } from "@/components/forms/Submit";
import { getDict, place, type Lang } from "@/i18n";
import type { MakerRow } from "@/lib/market/catalog-store";
import { PLACES } from "@/lib/places";
import { CategoryChecks, SellerForm, parseList, parseSocial } from "./kit";

export function BusinessStep({ lang, m, back, goto, submitLabel }: { lang: Lang; m: MakerRow; back: string; goto?: number; submitLabel: string }) {
  const a = getDict(lang).sell.app;
  const company = m.seller_type === "company";
  const social = parseSocial(m.social);
  return (
    <SellerForm op="application" back={back} lang={lang} values={{ step: "business", goto }} className="space-y-4">
      <Field id="ap-name" name="name" label={a.name} defaultValue={m.name} required maxLength={120} />
      {company && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="ap-legal" name="legalName" label={a.legalName} hint={a.legalNameHint} defaultValue={m.legal_name ?? ""} maxLength={200} />
          <Field id="ap-reg" name="registrationNumber" label={a.registrationNumber} defaultValue={m.registration_number ?? ""} maxLength={40} inputMode="numeric" />
        </div>
      )}
      <Field
        id="ap-year"
        name="yearEstablished"
        type="number"
        min={1800}
        max={new Date().getFullYear()}
        label={company ? a.yearCompany : a.yearIndependent}
        defaultValue={m.year_established ?? ""}
        className="max-w-xs"
      />
      <TextArea
        id="ap-desc"
        name="description"
        label={company ? a.descriptionCompany : a.descriptionIndependent}
        hint={a.descriptionHint}
        defaultValue={m.description}
        maxLength={3000}
        rows={5}
      />
      <CategoryChecks lang={lang} selected={parseList(m.categories)} legend={a.categories} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="ap-web" name="website" label={a.website} hint={a.linksHint} defaultValue={m.website ?? ""} maxLength={300} inputMode="url" />
        <Field id="ap-fb" name="facebook" label={a.facebook} hint={a.linksHint} defaultValue={social.facebook ?? ""} maxLength={300} inputMode="url" />
        <Field id="ap-ig" name="instagram" label={a.instagram} hint={a.linksHint} defaultValue={social.instagram ?? ""} maxLength={300} inputMode="url" />
      </div>
      <TextArea
        id="ap-extra"
        name="extraInfo"
        label={company ? a.extraCompany : a.extraIndependent}
        hint={company ? undefined : a.extraIndependentHint}
        defaultValue={m.extra_info ?? ""}
        maxLength={2000}
        rows={3}
      />
      <Submit className="btn btn-primary">{submitLabel}</Submit>
    </SellerForm>
  );
}

export function ContactStep({ lang, m, back, goto, submitLabel }: { lang: Lang; m: MakerRow; back: string; goto?: number; submitLabel: string }) {
  const a = getDict(lang).sell.app;
  const company = m.seller_type === "company";
  const cities = Object.keys(PLACES).sort((x, y) => place(x, lang).localeCompare(place(y, lang)));
  return (
    <SellerForm op="application" back={back} lang={lang} values={{ step: "contact", goto }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select id="ap-city" name="city" label={a.city} defaultValue={m.city} required>
          <option value="">—</option>
          {cities.map((c) => (
            <option key={c} value={c}>{place(c, lang)}</option>
          ))}
        </Select>
        <Field id="ap-region" name="region" label={a.region} defaultValue={m.region} maxLength={80} />
      </div>
      <Field id="ap-addr" name="address" label={a.address} hint={a.addressHint} defaultValue={m.address} required maxLength={300} autoComplete="street-address" />
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="label sm:col-span-2">{company ? a.contactCompany : a.contactIndependent}</legend>
        <Field id="ap-cf" name="contactFirstName" label={a.contactFirstName} defaultValue={m.contact_first_name ?? ""} required maxLength={80} autoComplete="given-name" />
        <Field id="ap-cl" name="contactLastName" label={a.contactLastName} defaultValue={m.contact_last_name ?? ""} required maxLength={80} autoComplete="family-name" />
        <Field id="ap-ce" name="contactEmail" type="email" label={a.contactEmail} defaultValue={m.contact_email} required maxLength={200} autoComplete="email" />
        <Field id="ap-cp" name="contactPhone" type="tel" label={a.contactPhone} defaultValue={m.contact_phone} required maxLength={40} autoComplete="tel" />
      </fieldset>
      <Submit className="btn btn-primary">{submitLabel}</Submit>
    </SellerForm>
  );
}
