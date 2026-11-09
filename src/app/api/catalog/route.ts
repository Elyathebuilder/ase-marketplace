/**
 * Public product data for the cart and checkout: published products of approved sellers only.
 * GET /api/catalog?slugs=a,b,c (at most 100).
 */
import { NextResponse } from "next/server";
import { getManufacturer, getProduct } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const slugs = [...new Set((new URL(req.url).searchParams.get("slugs") ?? "").split(",").map((s) => s.trim()).filter((s) => /^[a-z0-9-]{1,120}$/.test(s)))].slice(0, 100);
  const products = slugs.map(getProduct).filter((p) => !!p);
  const makers = [...new Set(products.map((p) => p.manufacturer))].map(getManufacturer).filter((m) => !!m);
  return NextResponse.json({ products, makers }, { headers: { "Cache-Control": "no-store" } });
}
