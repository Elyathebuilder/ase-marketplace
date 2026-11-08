/**
 * DEMO DATA for the seller portal preview (Phase 3 design).
 * The signed-in manufacturer is pretended to be Imereti Timber Works.
 * Nothing here is saved; real orders and quotes come from the database in Phases 4–5.
 */
import { getManufacturer, getProduct, productsBy } from "./catalog";
import { DEFAULT_DELIVERY_SETTINGS, quoteShipment } from "./delivery";
import { approxRoadKm } from "./places";

export const DEMO_SELLER_SLUG = "imereti-timber-works";
export const demoSeller = () => getManufacturer(DEMO_SELLER_SLUG)!;
export const demoSellerProducts = () => productsBy(DEMO_SELLER_SLUG);

/** Example commission rate for the preview. The real rate is an open business decision. */
export const DEMO_COMMISSION_RATE = 0.1;

export type OrderStatus = "new" | "accepted" | "preparing" | "ready" | "dispatched" | "delivered" | "cancelled";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: "red" | "amber" | "blue" | "green" | "grey" }> = {
  new: { label: "New: needs your answer", tone: "red" },
  accepted: { label: "Accepted", tone: "blue" },
  preparing: { label: "Preparing", tone: "amber" },
  ready: { label: "Ready for pickup", tone: "blue" },
  dispatched: { label: "On the way", tone: "blue" },
  delivered: { label: "Delivered", tone: "green" },
  cancelled: { label: "Cancelled", tone: "grey" },
};

/** The steps an order goes through, in order (cancelled is off the path). */
export const ORDER_FLOW: OrderStatus[] = ["new", "accepted", "preparing", "ready", "dispatched", "delivered"];

export interface DemoOrder {
  id: string;
  placedAt: string;
  status: OrderStatus;
  type: "retail" | "quote";
  buyer: { name: string; city: string; business?: string };
  delivery: { mode: "asap" } | { mode: "scheduled"; date: string; window: string };
  items: { slug: string; qty: number; unitPrice: number }[];
  note?: string;
}

const ORDERS: DemoOrder[] = [
  {
    id: "ASE-10482", placedAt: "2026-11-08T10:24:00", status: "new", type: "retail",
    buyer: { name: "Nino K.", city: "Tbilisi" },
    delivery: { mode: "scheduled", date: "2026-11-14", window: "10:00–14:00" },
    items: [{ slug: "oak-dining-table-180", qty: 1, unitPrice: 2450 }, { slug: "beech-bistro-chair", qty: 6, unitPrice: 260 }],
  },
  {
    id: "ASE-10479", placedAt: "2026-11-08T08:02:00", status: "new", type: "retail",
    buyer: { name: "Giorgi M.", city: "Batumi" },
    delivery: { mode: "asap" },
    items: [{ slug: "walnut-cutting-board", qty: 2, unitPrice: 85 }],
  },
  {
    id: "ASE-10466", placedAt: "2026-11-07T15:40:00", status: "preparing", type: "quote",
    buyer: { name: "Levan T.", city: "Tbilisi", business: "Café Rustaveli LLC" },
    delivery: { mode: "scheduled", date: "2026-11-20", window: "09:00–12:00" },
    items: [{ slug: "beech-bistro-chair", qty: 40, unitPrice: 198 }],
    note: "From accepted quotation Q-2207. Stain: dark walnut.",
  },
  {
    id: "ASE-10451", placedAt: "2026-11-06T12:15:00", status: "ready", type: "retail",
    buyer: { name: "Ana B.", city: "Kutaisi" },
    delivery: { mode: "asap" },
    items: [{ slug: "walnut-cutting-board", qty: 1, unitPrice: 85 }],
  },
  {
    id: "ASE-10437", placedAt: "2026-11-05T09:30:00", status: "dispatched", type: "retail",
    buyer: { name: "Tamar G.", city: "Rustavi" },
    delivery: { mode: "scheduled", date: "2026-11-09", window: "14:00–18:00" },
    items: [{ slug: "beech-bistro-chair", qty: 4, unitPrice: 260 }],
  },
  {
    id: "ASE-10402", placedAt: "2026-11-02T17:05:00", status: "delivered", type: "retail",
    buyer: { name: "Davit S.", city: "Tbilisi" },
    delivery: { mode: "asap" },
    items: [{ slug: "oak-dining-table-180", qty: 1, unitPrice: 2450 }],
  },
  {
    id: "ASE-10388", placedAt: "2026-10-30T11:20:00", status: "delivered", type: "quote",
    buyer: { name: "Mariam L.", city: "Telavi", business: "Hotel Kakheti Hills" },
    delivery: { mode: "scheduled", date: "2026-11-04", window: "10:00–14:00" },
    items: [{ slug: "walnut-cutting-board", qty: 60, unitPrice: 58 }],
  },
  {
    id: "ASE-10371", placedAt: "2026-10-28T13:45:00", status: "cancelled", type: "retail",
    buyer: { name: "Irakli P.", city: "Gori" },
    delivery: { mode: "asap" },
    items: [{ slug: "beech-bistro-chair", qty: 2, unitPrice: 260 }],
    note: "Cancelled by buyer before acceptance.",
  },
];

export const demoOrders = () => ORDERS;
export const demoOrder = (id: string) => ORDERS.find((o) => o.id === id);

export function orderTotals(o: DemoOrder) {
  const goods = o.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const commission = Math.round(goods * DEMO_COMMISSION_RATE * 100) / 100;
  const seller = demoSeller();
  const distance = approxRoadKm(seller.city, o.buyer.city) ?? 0;
  const delivery = quoteShipment(
    o.items.map((i) => {
      const p = getProduct(i.slug)!;
      return { quantity: i.qty, weightKg: p.weightKg, lengthCm: p.lengthCm, widthCm: p.widthCm, heightCm: p.heightCm, fragile: p.fragile, specialHandling: p.specialHandling };
    }),
    distance,
    DEFAULT_DELIVERY_SETTINGS,
  );
  return { goods, commission, payout: Math.round((goods - commission) * 100) / 100, delivery };
}

export type QuoteStatus = "new" | "quoted" | "accepted" | "declined";

export const QUOTE_STATUS: Record<QuoteStatus, { label: string; tone: "red" | "amber" | "blue" | "green" | "grey" }> = {
  new: { label: "New request", tone: "red" },
  quoted: { label: "Quote sent", tone: "blue" },
  accepted: { label: "Accepted → order", tone: "green" },
  declined: { label: "Declined", tone: "grey" },
};

export interface DemoQuote {
  id: string;
  receivedAt: string;
  status: QuoteStatus;
  company: string;
  city: string;
  product: string | null;
  title: string;
  qty: number;
  unit: string;
  neededBy?: string;
  requirements: string;
  offer?: { unitPrice: number; leadDays: number; validUntil: string };
}

const QUOTES: DemoQuote[] = [
  {
    id: "Q-2231", receivedAt: "2026-11-08T09:12:00", status: "new", company: "Boutique Hotel Sololaki", city: "Tbilisi",
    product: "hotel-wardrobe-custom", title: "Hotel Room Wardrobe", qty: 24, unit: "piece", neededBy: "2027-01-15",
    requirements: "24 wardrobes for renovated rooms, 110 × 58 × 220 cm, oak veneer, soft-close hinges, hanging rail plus 3 shelves. Delivery to Sololaki, 3rd floor, no lift.",
  },
  {
    id: "Q-2228", receivedAt: "2026-11-07T18:40:00", status: "new", company: "Mtskheta Wine House", city: "Mtskheta",
    product: null, title: "Custom tasting tables", qty: 8, unit: "piece", neededBy: "2026-12-20",
    requirements: "High tasting tables in solid oak, 120 × 60 cm, height 105 cm, with a wine-glass rack underneath. Logo engraving on the edge.",
  },
  {
    id: "Q-2219", receivedAt: "2026-11-05T11:05:00", status: "quoted", company: "Restaurant Supra Group", city: "Batumi",
    product: "beech-bistro-chair", title: "Beech Bistro Chair", qty: 120, unit: "piece",
    requirements: "Two restaurants. Natural stain, felt pads, stackable.",
    offer: { unitPrice: 182, leadDays: 30, validUntil: "2026-11-30" },
  },
  {
    id: "Q-2207", receivedAt: "2026-11-01T14:22:00", status: "accepted", company: "Café Rustaveli LLC", city: "Tbilisi",
    product: "beech-bistro-chair", title: "Beech Bistro Chair", qty: 40, unit: "piece",
    requirements: "Dark walnut stain.",
    offer: { unitPrice: 198, leadDays: 14, validUntil: "2026-11-15" },
  },
  {
    id: "Q-2190", receivedAt: "2026-10-25T10:00:00", status: "declined", company: "Kutaisi Office Park", city: "Kutaisi",
    product: "oak-dining-table-180", title: "Meeting tables", qty: 6, unit: "piece",
    requirements: "Meeting tables 240 cm with cable ports.",
    offer: { unitPrice: 2900, leadDays: 35, validUntil: "2026-11-08" },
  },
];

export const demoQuotes = () => QUOTES;
export const demoQuote = (id: string) => QUOTES.find((q) => q.id === id);

export const DEMO_PAYOUTS = [
  { id: "PO-0091", date: "2026-11-05", amount: 2205, status: "Paid", orders: ["ASE-10402"] },
  { id: "PO-0088", date: "2026-11-05", amount: 3132, status: "Paid", orders: ["ASE-10388"] },
  { id: "PO-0094", date: "2026-11-12", amount: 936, status: "Scheduled after delivery", orders: ["ASE-10437"] },
];

/** Monthly sales for the dashboard chart (GEL, goods only). */
export const DEMO_MONTHLY_SALES = [
  { month: "Jun", value: 6200 },
  { month: "Jul", value: 8900 },
  { month: "Aug", value: 7400 },
  { month: "Sep", value: 11800 },
  { month: "Oct", value: 14250 },
  { month: "Nov", value: 9610 },
];
