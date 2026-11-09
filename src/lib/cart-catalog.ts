"use client";

/**
 * Product data for the cart and checkout in the browser. The cart only knows product slugs, so
 * the current names, prices and sizes are fetched from the server (/api/catalog), which returns
 * published products of approved sellers only. These numbers are an estimate for the customer;
 * the server recalculates every price when the order is placed.
 *
 * The static preview sets window.__ASE_CATALOG_URL to a file with the whole demo catalog.
 */
import { useEffect, useState } from "react";
import type { CatalogLookup } from "./cart-delivery";
import type { Manufacturer, Product } from "./types";

interface CatalogData {
  products: Product[];
  makers: Manufacturer[];
}

const products = new Map<string, Product | null>();
const makers = new Map<string, Manufacturer>();

async function load(slugs: string[]): Promise<void> {
  const custom = typeof window !== "undefined" ? (window as unknown as { __ASE_CATALOG_URL?: string }).__ASE_CATALOG_URL : undefined;
  const url = custom ?? `/api/catalog?slugs=${encodeURIComponent(slugs.join(","))}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`catalog ${res.status}`);
  const data = (await res.json()) as CatalogData;
  for (const m of data.makers) makers.set(m.slug, m);
  for (const p of data.products) products.set(p.slug, p);
  // Slugs the server didn't return are no longer for sale.
  for (const s of slugs) if (!products.has(s)) products.set(s, null);
}

const lookup: CatalogLookup = {
  product: (slug) => products.get(slug) ?? undefined,
  maker: (slug) => makers.get(slug),
};

/** Loads the given products (once) and returns a lookup plus whether data is still loading. */
export function useCartCatalog(slugs: string[]): { lookup: CatalogLookup; loading: boolean; failed: boolean } {
  const key = [...new Set(slugs)].sort().join(",");
  const missing = key ? key.split(",").filter((s) => !products.has(s)) : [];
  const [, setTick] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!missing.length) return;
    let alive = true;
    load(missing)
      .then(() => alive && setTick((n) => n + 1))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { lookup, loading: missing.length > 0 && !failed, failed };
}
