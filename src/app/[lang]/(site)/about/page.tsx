import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftRight, BadgeCheck, ClipboardCheck, Factory, FileSearch, MessageSquare, PackageCheck, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getDict, href, isLang } from "@/i18n";
import { pageLang } from "@/lib/page-lang";

type Params = Promise<{ lang: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(isLang(lang) ? lang : "ka").nav.about };
}

export default async function AboutPage({ params }: { params: Params }) {
  const { lang, t } = await pageLang(params);
  const a = t.about;
  const to = (p: string) => href(lang, p);
  return (
    <div className="container-page py-6 md:py-8">
      <Breadcrumbs label={t.common.breadcrumb} items={[{ label: t.common.home, href: to("/") }, { label: t.nav.about }]} />

      <section className="mt-4 max-w-3xl">
        <p className="eyebrow">{a.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-extrabold md:text-5xl">{a.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-2">
          {a.intro}
        </p>
      </section>

      {/* How the three sides interact */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold">{a.how}</h2>
        <p className="mt-2 max-w-3xl text-ink-2">{a.howText}</p>
        <div className="mt-6 grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1.2fr_auto_1fr]">
          <Party icon={<ShoppingBag className="h-5 w-5" />} title={a.buyer.title} points={a.buyer.points} />
          <Arrow />
          <Party
            highlight
            icon={<ShieldCheck className="h-5 w-5" />}
            title={a.ase.title}
            points={a.ase.points}
          />
          <Arrow />
          <Party icon={<Factory className="h-5 w-5" />} title={a.maker.title} points={a.maker.points} />
        </div>
      </section>

      <section id="sell" className="mt-14 scroll-mt-32 grid gap-8 rounded-2xl bg-ink p-6 text-white md:p-10 lg:grid-cols-2">
        <div>
          <p className="eyebrow text-red-200">{a.sellEyebrow}</p>
          <h2 className="mt-2 text-2xl font-extrabold text-white md:text-3xl">{a.sellTitle}</h2>
          <p className="mt-3 text-white/75">
            {a.sellText}
          </p>
          <p className="mt-3 text-sm text-white/60">{a.sellContact}</p>
          <Link href={to("/seller")} className="btn mt-5 bg-white text-ink hover:bg-paper">{a.sellPortal}</Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {[PackageCheck, MessageSquare, Truck, ClipboardCheck].map((icon, i) => ({ icon, ...a.sellPoints[i] })).map(({ icon: Icon, t: title, d }) => (
            <li key={title} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <Icon className="h-5 w-5 text-red-200" aria-hidden="true" />
              <h3 className="mt-2 font-semibold text-white">{title}</h3>
              <p className="text-sm text-white/70">{d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="verification" className="mt-14 scroll-mt-32 max-w-3xl">
        <h2 className="text-2xl font-bold">{a.verifTitle}</h2>
        <p className="mt-2 text-ink-2">
          {a.verifText}
        </p>
        <ol className="mt-4 space-y-3">
          {[FileSearch, Factory, BadgeCheck].map((icon, i) => ({ icon, ...a.verifSteps[i] })).map(({ icon: Icon, t: title, d }) => (
            <li key={title} className="flex gap-3 rounded-xl border border-line bg-surface p-4">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
              <span><span className="block font-semibold text-ink">{title}</span><span className="text-sm text-ink-2">{d}</span></span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-muted">{a.verifStatuses}</p>
      </section>

      <section id="delivery" className="mt-14 scroll-mt-32 max-w-3xl">
        <h2 className="text-2xl font-bold">{a.deliveryTitle}</h2>
        <p className="mt-2 text-ink-2">{a.deliveryText}</p>
        <p className="mt-2 text-ink-2">{a.deliveryText2}</p>
      </section>

      <section id="policies" className="mt-14 scroll-mt-32 max-w-3xl">
        <h2 className="text-2xl font-bold">{a.policiesTitle}</h2>
        <p className="mt-2 text-ink-2">
          {a.policiesText}
        </p>
        <Link href={to("/products")} className="btn btn-primary mt-6">{a.browse}</Link>
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
