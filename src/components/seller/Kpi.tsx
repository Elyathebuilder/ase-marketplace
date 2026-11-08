import Link from "next/link";

export function Kpi({ label, value, hint, href, alert = false }: { label: string; value: string; hint?: string; href?: string; alert?: boolean }) {
  const body = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold tabular-nums ${alert ? "text-red-600" : "text-ink"}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="card block p-4 transition hover:border-red-200 hover:shadow-[var(--shadow-lift)]">{body}</Link>
  ) : (
    <div className="card p-4">{body}</div>
  );
}
