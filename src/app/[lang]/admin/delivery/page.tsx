import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { DeliveryCalculator } from "@/components/admin/DeliveryCalculator";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { getDict, isLang } from "@/i18n";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery";
import { formatGel } from "@/lib/format";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").admin.title, robots: { index: false, follow: false } };
}

/**
 * Internal page for ASE staff: the full delivery calculation and the rate table.
 * Customers only ever see the final estimate. Access control comes with accounts and roles.
 */
export default async function AdminDeliveryPage({ params }: { params: Params }) {
  const { lang, t } = await pageLang(params);
  const a = t.admin;
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="container-page flex items-center gap-3 py-3">
          <Logo lang={lang} />
          <span className="rounded-md bg-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white">Admin</span>
          <LanguageSwitcher className="ml-auto" />
        </div>
      </header>
      <main id="main" className="container-page space-y-6 py-6 md:py-8">
        <div>
          <h1 className="text-2xl font-extrabold md:text-3xl">{a.title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-2">{a.intro}</p>
          <p className="mt-2 inline-flex items-start gap-2 rounded-lg bg-warn-50 px-3 py-2 text-xs text-warn">
            <ShieldAlert className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
            {a.accessNote}
          </p>
        </div>

        <DeliveryCalculator />

        <section>
          <h2 className="text-lg font-bold">{a.rates}</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="bg-paper-2 text-left text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-2.5">{a.vehicleCol}</th>
                  <th className="px-4 py-2.5">{a.capacity}</th>
                  <th className="px-4 py-2.5">{a.interior}</th>
                  <th className="px-4 py-2.5">{a.baseFee}</th>
                  <th className="px-4 py-2.5">{a.perKm}</th>
                  <th className="px-4 py-2.5">{a.space100}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {DEFAULT_DELIVERY_SETTINGS.vehicles.map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-2.5 font-semibold text-ink">{a.vehicleNames[v.id] ?? v.name}</td>
                    <td className="px-4 py-2.5">{v.maxWeightKg.toLocaleString("en-US")} kg · {v.maxVolumeM3} m³</td>
                    <td className="px-4 py-2.5">{v.interior.lengthCm} × {v.interior.widthCm} × {v.interior.heightCm}</td>
                    <td className="px-4 py-2.5">{formatGel(v.baseFee)}</td>
                    <td className="px-4 py-2.5">{formatGel(v.pricePerKm)}</td>
                    <td className="px-4 py-2.5">{formatGel(v.spaceFee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">= {a.baseFee} + km × {a.perKm} + max(weight %, volume %) × {a.space100}</p>
        </section>
      </main>
    </div>
  );
}
