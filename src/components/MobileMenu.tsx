"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { NAV } from "./nav";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // Close when the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }
  return (
    <div className="lg:hidden">
      <button type="button" className="btn btn-ghost px-2.5" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((o) => !o)}>
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
      </button>
      {open && (
        <nav id="mobile-nav" className="absolute inset-x-0 top-full z-40 max-h-[75dvh] overflow-y-auto border-y border-line bg-paper shadow-[var(--shadow-lift)]">
          <ul className="container-page divide-y divide-line py-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="flex items-center justify-between py-3.5 text-base font-semibold text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
