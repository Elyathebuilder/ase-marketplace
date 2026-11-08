"use client";

/**
 * The shopping cart, kept in this browser only (localStorage) until accounts and
 * checkout arrive in a later phase. Prices are never stored here: the cart holds
 * product slugs and quantities, and every price is looked up again from the catalog.
 */
import { useSyncExternalStore } from "react";

export interface CartLine {
  slug: string;
  qty: number;
}

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
          .map((l) => ({ slug: l.slug, qty: Math.min(l.qty, 9999) }))
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

export function addToCart(slug: string, qty: number) {
  const lines = read();
  const found = lines.find((l) => l.slug === slug);
  write(found ? lines.map((l) => (l.slug === slug ? { ...l, qty: Math.min(l.qty + qty, 9999) } : l)) : [...lines, { slug, qty }]);
}

export function setQty(slug: string, qty: number) {
  write(qty <= 0 ? read().filter((l) => l.slug !== slug) : read().map((l) => (l.slug === slug ? { ...l, qty: Math.min(qty, 9999) } : l)));
}

export const removeFromCart = (slug: string) => setQty(slug, 0);
export const clearCart = () => write([]);
