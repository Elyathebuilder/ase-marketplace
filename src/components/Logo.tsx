import Link from "next/link";

/** ASE wordmark with a small red cross mark (a nod to the Georgian flag). */
export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="ASE home">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect width="32" height="32" rx="7" className={inverted ? "fill-white" : "fill-ink"} />
        <rect x="13.5" y="5" width="5" height="22" rx="1" className="fill-red-600" />
        <rect x="5" y="13.5" width="22" height="5" rx="1" className="fill-red-600" />
      </svg>
      <span className={`font-[family-name:var(--font-display)] text-[1.45rem] font-extrabold tracking-tight ${inverted ? "text-white" : "text-ink"}`}>
        ASE
      </span>
    </Link>
  );
}
