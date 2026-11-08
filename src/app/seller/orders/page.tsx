import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Zap } from "lucide-react";
import { StatusPill } from "@/components/seller/StatusPill";
import { getProduct } from "@/lib/catalog";
import { formatGel } from "@/lib/format";
import { ORDER_STATUS, demoOrders, orderTotals, type OrderStatus } from "@/lib/seller-demo";

export const metadata: Metadata = { title: "Orders" };

const TABS: { key: string; label: string; match: (s: OrderStatus) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "new", label: "New", match: (s) => s === "new" },
  { key: "active", label: "In progress", match: (s) => ["accepted", "preparing", "ready", "dispatched"].includes(s) },
  { key: "completed", label: "Completed", match: (s) => s === "delivered" },
  { key: "cancelled", label: "Cancelled", match: (s) => s === "cancelled" },
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).status;
  const key = typeof raw === "string" && TABS.some((t) => t.key === raw) ? raw : "all";
  const tab = TABS.find((t) => t.key === key)!;
  const all = demoOrders();
  const list = all.filter((o) => tab.match(o.status));

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Orders</h1>
      <p className="mt-1 text-sm text-muted">Every order also arrives by email and SMS. Accept or reject new orders within 24 hours.</p>

      <nav aria-label="Order status" className="mt-5 border-b border-line">
        <ul className="scroll-row auto-cols-max gap-0">
          {TABS.map((t) => {
            const count = all.filter((o) => t.match(o.status)).length;
            const active = t.key === key;
            return (
              <li key={t.key}>
                <Link
                  href={t.key === "all" ? "/seller/orders" : `/seller/orders?status=${t.key}`}
                  aria-current={active ? "page" : undefined}
                  className={`relative inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold ${active ? "text-ink after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-red-600" : "text-muted hover:text-ink"}`}
                >
                  {t.label} <span className="rounded-full bg-paper-2 px-1.5 text-xs tabular-nums text-ink-2">{count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {list.length === 0 ? (
        <p className="card mt-4 p-8 text-center text-sm text-muted">No orders here.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {list.map((o) => {
            const t = orderTotals(o);
            return (
              <li key={o.id}>
                <Link href={`/seller/orders/${o.id}`} className={`card block p-4 transition hover:shadow-[var(--shadow-lift)] ${o.status === "new" ? "border-red-200" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-ink">{o.id}</span>
                    {o.type === "quote" && <span className="chip bg-ink text-white">B2B quote</span>}
                    <StatusPill {...ORDER_STATUS[o.status]} />
                    <span className="ml-auto text-xs text-muted">{new Date(o.placedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="mt-2 text-sm text-ink-2">
                    {o.items.map((i) => `${i.qty} × ${getProduct(i.slug)?.name}`).join(", ")}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted">{o.buyer.business ?? o.buyer.name} · {o.buyer.city}</span>
                    <span className="inline-flex items-center gap-1 text-muted">
                      {o.delivery.mode === "asap" ? (
                        <><Zap className="h-3.5 w-3.5" aria-hidden="true" />As soon as possible</>
                      ) : (
                        <><CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />{new Date(o.delivery.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, {o.delivery.window}</>
                      )}
                    </span>
                    <span className="ml-auto font-bold tabular-nums text-ink">{formatGel(t.goods)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
