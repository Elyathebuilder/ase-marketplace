/**
 * Static-preview islands: the preview is plain HTML (no Next.js runtime), so the interactive
 * parts (delivery estimate, add to cart, cart, admin calculator) are mounted here with the
 * same React components the real site uses.
 */
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { DeliveryCalculator } from "@/components/admin/DeliveryCalculator";
import { CartButton } from "@/components/cart/CartButton";
import { CartView } from "@/components/cart/CartView";
import { DeliveryEstimator } from "@/components/DeliveryEstimator";
import { PurchasePanel } from "@/components/PurchasePanel";
import { I18nProvider } from "@/i18n/client";
import type { Lang } from "@/i18n/config";
import { getAllProducts, getManufacturers, getProduct, manufacturerOf, setCatalog } from "./shims/catalog";
import { LocalCheckout, LocalOrderPage } from "./LocalJourney";

declare global {
  interface Window {
    __ASE?: { lang: Lang; path: string };
  }
}

const ctx = window.__ASE ?? { lang: "ka" as Lang, path: "/" };

function mount(selector: string, node: ReactNode) {
  document.querySelectorAll(selector).forEach((el) => {
    const host = document.createElement(el.tagName === "A" ? "span" : "div");
    host.style.display = "contents";
    el.replaceWith(host);
    createRoot(host).render(<I18nProvider lang={ctx.lang}>{node}</I18nProvider>);
  });
}

function start() {
mount('[data-island="cart-button"]', <CartButton />);
mount('[data-island="cart"]', <CartView />);
mount('[data-island="admin-delivery"]', <DeliveryCalculator products={getAllProducts()} makers={Object.fromEntries(getManufacturers().map((m) => [m.slug, m]))} />);

const slug = ctx.path.match(/^\/products\/([^/?#]+)$/)?.[1];
const p = slug ? getProduct(slug) : undefined;
if (p) {
  mount(
    '[data-island="delivery"]',
    <DeliveryEstimator
      origin={manufacturerOf(p).city}
      defaultQty={Math.max(1, p.moq)}
      item={{ weightKg: p.weightKg, lengthCm: p.lengthCm, widthCm: p.widthCm, heightCm: p.heightCm, fragile: p.fragile, specialHandling: p.specialHandling }}
    />,
  );
  mount(
    '[data-island="purchase"]',
    <PurchasePanel
      slug={p.slug}
      unit={p.unit}
      retailPrice={p.retailPrice}
      buyNow={p.buyNow}
      requestQuote={p.requestQuote}
      moq={p.moq}
      stock={p.stock}
      tiers={p.wholesale?.tiers ?? []}
      quoteOnly={p.wholesale?.quoteOnly ?? true}
      variants={p.variants}
      colors={p.colors}
      available={p.available !== false}
    />,
  );
}

// Purchase journey (TEST orders kept in this browser; see LocalJourney.tsx).
mount('[data-island="local-checkout"]', <LocalCheckout />);
mount('[data-island="local-order"]', <LocalOrderPage />);

// No accounts on the static preview: hide the sign-in link and the admin menu.
mount('[data-island="account"]', <></>);
mount('[data-island="admin-nav"]', <></>);
}

// The demo catalog is a file next to the pages (no server); load it, then mount the islands.
fetch("catalog.json")
  .then((r) => r.json())
  .then((d) => setCatalog(d))
  .catch(() => {})
  .finally(start);
