/** Shapes a customer's order for the shared journey components (server only). */
import { locMaker, locProduct, type Lang } from "@/i18n";
import { getManufacturer, getProduct } from "../catalog";
import { customerOrder } from "./queries";
import type { Ctx } from "./service";
import { MarketError, type Actor } from "./types";
import type { SummaryShipment } from "@/components/market/journey";

export function loadCustomerOrder(ctx: Ctx, actor: Actor | null, id: string, lang: Lang) {
  let v;
  try {
    v = customerOrder(ctx, actor, id);
  } catch (e) {
    if (e instanceof MarketError) return null;
    throw e;
  }
  const shipments: SummaryShipment[] = v.shipments.map((s) => {
    const m = locMaker(getManufacturer(s.manufacturer)!, lang);
    return {
      id: s.id,
      maker: m.name,
      city: m.city,
      status: s.status,
      delivery: s.delivery,
      items: s.items.map((i) => {
        const p = getProduct(i.product_slug);
        return { key: String(i.id), name: p ? locProduct(p, lang).name : i.product_name, qty: i.qty, line: i.line_tetri };
      }),
    };
  });
  return { ...v, summary: shipments };
}
