import type { Metadata } from "next";
import { DeliveryCalculator } from "@/components/admin/DeliveryCalculator";
import { getDict, isLang } from "@/i18n";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery";
import { formatGel } from "@/lib/format";
import { pageLang } from "@/lib/page-lang";
import { adminOrNull } from "@/lib/market/auth";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").admin.title, robots: { index: false, follow: false } };
}

/**
 * Internal page for ASE staff: the full delivery calculation and the rate table.
 * Customers only ever see the final estimate. Only administrators can open it (see admin/layout.tsx).
 */
export default async function AdminDeliveryPage({ params }: { params: Params }) {
  const { t } = await pageLang(params);
  if (!(await adminOrNull())) return null;
  const a = t.admin;
  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold md:text-3xl">{a.title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-2">{a.intro}</p>
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
    </div>
  );
}
