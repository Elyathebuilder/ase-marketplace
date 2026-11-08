import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumbs({ items, label = "Breadcrumb" }: { items: { label: string; href?: string }[]; label?: string }) {
  return (
    <nav aria-label={label} className="text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden="true" />}
            {item.href ? (
              <Link href={item.href} className="hover:text-red-600 hover:underline">{item.label}</Link>
            ) : (
              <span aria-current="page" className="text-ink-2">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
