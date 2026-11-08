import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftRight, BadgeCheck, ClipboardCheck, Factory, FileSearch, MessageSquare, PackageCheck, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery";
import { formatGel } from "@/lib/format";

export const metadata: Metadata = { title: "About us" };

export default function AboutPage() {
  return (
    <div className="container-page py-6 md:py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "About us" }]} />

      <section className="mt-4 max-w-3xl">
        <p className="eyebrow">About ASE</p>
        <h1 className="mt-2 text-3xl font-extrabold md:text-5xl">You manufacture. We sell.</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-2">
          ASE is a marketplace dedicated to products physically made in Georgia. We connect Georgian manufacturers with customers and businesses, and handle the parts makers shouldn&apos;t have to: the storefront, orders, communication and delivery coordination.
        </p>
      </section>

      {/* How the three sides interact */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold">How it works</h2>
        <p className="mt-2 max-w-3xl text-ink-2">ASE sits in the middle. Buyers and manufacturers deal with each other through the platform, so prices, agreements and deliveries are always on record.</p>
        <div className="mt-6 grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1.2fr_auto_1fr]">
          <Party icon={<ShoppingBag className="h-5 w-5" />} title="Buyer" points={["Browses and orders", "Asks about price & shipping", "Chooses delivery: as soon as possible or a set day & time", "Receives the delivery"]} />
          <Arrow />
          <Party
            highlight
            icon={<ShieldCheck className="h-5 w-5" />}
            title="ASE (mediator)"
            points={["Answers product questions with the maker", "Sends every order to the manufacturer: on their seller page and by message/email", "Shares order status updates", "Calculates and organises delivery"]}
          />
          <Arrow />
          <Party icon={<Factory className="h-5 w-5" />} title="Manufacturer" points={["Lists products and prices", "Accepts and prepares orders", "Updates order status", "Hands goods over for delivery"]} />
        </div>
      </section>

      <section id="sell" className="mt-14 scroll-mt-32 grid gap-8 rounded-2xl bg-ink p-6 text-white md:p-10 lg:grid-cols-2">
        <div>
          <p className="eyebrow text-red-200">Sell on ASE</p>
          <h2 className="mt-2 text-2xl font-extrabold text-white md:text-3xl">For Georgian manufacturers</h2>
          <p className="mt-3 text-white/75">
            List your products for retail and wholesale, receive orders and quotation requests, and get paid after dispatch, minus a platform commission. Seller accounts open in the next phase.
          </p>
          <p className="mt-3 text-sm text-white/60">Want to be among the first sellers? Write to hello@ase.demo.</p>
          <Link href="/seller" className="btn mt-5 bg-white text-ink hover:bg-paper">See the seller portal (preview)</Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: PackageCheck, t: "Your own store page", d: "Company profile, products, capabilities." },
            { icon: MessageSquare, t: "B2B requests", d: "Quote bulk and custom orders." },
            { icon: Truck, t: "Delivery handled", d: "We collect from your pickup location." },
            { icon: ClipboardCheck, t: "Simple dashboard", d: "Orders, stock, payouts in one place." },
          ].map(({ icon: Icon, t, d }) => (
            <li key={t} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <Icon className="h-5 w-5 text-red-200" aria-hidden="true" />
              <h3 className="mt-2 font-semibold text-white">{t}</h3>
              <p className="text-sm text-white/70">{d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="verification" className="mt-14 scroll-mt-32 max-w-3xl">
        <h2 className="text-2xl font-bold">How we verify manufacturers</h2>
        <p className="mt-2 text-ink-2">
          Only companies that physically produce goods qualify as manufacturers. Service-only businesses (for example design studios, or CNC and 3D-printing services) are not listed unless they also make their own products.
        </p>
        <ol className="mt-4 space-y-3">
          {[
            { icon: FileSearch, t: "Documents", d: "Company registration and proof of a production site in Georgia." },
            { icon: Factory, t: "Production check", d: "Our team confirms the products are made by the company itself." },
            { icon: BadgeCheck, t: "Badge", d: "Approved companies get the Verified manufacturer badge. Only ASE administrators can grant it." },
          ].map(({ icon: Icon, t, d }) => (
            <li key={t} className="flex gap-3 rounded-xl border border-line bg-surface p-4">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
              <span><span className="block font-semibold text-ink">{t}</span><span className="text-sm text-ink-2">{d}</span></span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-muted">Statuses: Unverified · Verification pending · Verified manufacturer.</p>
      </section>

      <section id="delivery" className="mt-14 scroll-mt-32">
        <h2 className="text-2xl font-bold">Delivery</h2>
        <p className="mt-2 max-w-3xl text-ink-2">
          Each manufacturer ships from its own location, so an order from three manufacturers is three shipments. For each one we pick the smallest vehicle that fits by weight, volume and package size, and you see the combined price before you pay.
        </p>
        <p className="mt-2 max-w-3xl text-sm text-muted">Price = base fee + distance × rate per km + share of the vehicle used × space fee.</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="bg-paper-2 text-left text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-2.5">Vehicle</th>
                <th className="px-4 py-2.5">Carries up to</th>
                <th className="px-4 py-2.5">Base fee</th>
                <th className="px-4 py-2.5">Per km</th>
                <th className="px-4 py-2.5">Space fee (100%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {DEFAULT_DELIVERY_SETTINGS.vehicles.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-2.5 font-semibold text-ink">{v.name}</td>
                  <td className="px-4 py-2.5">{v.maxWeightKg.toLocaleString("en-US")} kg · {v.maxVolumeM3} m³</td>
                  <td className="px-4 py-2.5">{formatGel(v.baseFee)}</td>
                  <td className="px-4 py-2.5">{formatGel(v.pricePerKm)}</td>
                  <td className="px-4 py-2.5">{formatGel(v.spaceFee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">Very large, heavy or special items get a manual transport quote from our team.</p>
      </section>

      <section id="policies" className="mt-14 scroll-mt-32 max-w-3xl">
        <h2 className="text-2xl font-bold">Terms & policies</h2>
        <p className="mt-2 text-ink-2">
          Terms of use, privacy, returns and seller policies will be published before launch. Payments will be handled by a licensed payment provider.
        </p>
        <Link href="/products" className="btn btn-primary mt-6">Start browsing</Link>
      </section>
    </div>
  );
}

function Party({ icon, title, points, highlight = false }: { icon: React.ReactNode; title: string; points: string[]; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 ${highlight ? "bg-red-600 text-white" : "card"}`}>
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${highlight ? "bg-white text-red-600" : "bg-red-50 text-red-600"}`}>{icon}</span>
      <h3 className={`mt-3 text-lg font-bold ${highlight ? "text-white" : ""}`}>{title}</h3>
      <ul className={`mt-2 space-y-1.5 text-sm ${highlight ? "text-white/90" : "text-ink-2"}`}>
        {points.map((p) => <li key={p}>• {p}</li>)}
      </ul>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex items-center justify-center text-subtle" aria-hidden="true">
      <ArrowLeftRight className="h-6 w-6 rotate-90 lg:rotate-0" />
    </div>
  );
}
