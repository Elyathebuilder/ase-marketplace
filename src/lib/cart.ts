"use client";

/**
 * The shopping cart, kept in this browser (localStorage). It survives signing in, registering and
 * confirming the email in the same browser, so nobody has to start shopping again, and it can hold
 * products from several manufacturers. Prices are never stored here: the cart holds product slugs,
 * quantities and chosen variations, and every price is looked up again (and checked by the server).
 */
import { useSyncExternalStore } from "react";

export interface CartLine {
  slug: string;
  qty: number;
  /** Chosen variations, e.g. { Size: "M" }. */
  options?: Record<string, string>;
}

/** One cart line per product and choice of variations. */
export const lineKey = (l: { slug: string; options?: Record<string, string> }) =>
  `${l.slug}|${Object.entries(l.options ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(";")}`;

const cleanOpts = (o: unknown): Record<string, string> | undefined => {
  if (!o || typeof o !== "object") return undefined;
  const out = Object.fromEntries(
    Object.entries(o as Record<string, unknown>)
      .filter(([k, v]) => typeof v === "string" && k.length <= 60 && v.length <= 60)
      .slice(0, 5),
  ) as Record<string, string>;
  return Object.keys(out).length ? out : undefined;
};

const KEY = "ase-cart-v1";
const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();
let cache: CartLine[] | null = null;

function read(): CartLine[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed)
      ? parsed
          .filter((l): l is CartLine => typeof l?.slug === "string" && Number.isInteger(l?.qty) && l.qty > 0)
          .map((l) => ({ slug: l.slug, qty: Math.min(l.qty, 9999), options: cleanOpts(l.options) }))
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(lines: CartLine[]) {
  cache = lines;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* Storage blocked (private mode): the cart still works until the page reloads. */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function addToCart(slug: string, qty: number, options?: Record<string, string>) {
  const lines = read();
  const key = lineKey({ slug, options });
  const found = lines.find((l) => lineKey(l) === key);
  write(found ? lines.map((l) => (lineKey(l) === key ? { ...l, qty: Math.min(l.qty + qty, 9999) } : l)) : [...lines, { slug, qty, options: cleanOpts(options) }]);
}

/** Change the quantity of one line (by lineKey). 0 removes it. */
export function setQty(key: string, qty: number) {
  write(qty <= 0 ? read().filter((l) => lineKey(l) !== key) : read().map((l) => (lineKey(l) === key ? { ...l, qty: Math.min(qty, 9999) } : l)));
}

export const removeFromCart = (key: string) => setQty(key, 0);
export const clearCart = () => write([]);
