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
import { getDict } from "@/i18n";
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

// No accounts on the static preview: the sign-in and registration pages are shown so they can be
// looked at, but their forms can't be sent (there is no server). The admin menu is hidden.
mount('[data-island="admin-nav"]', <></>);
if (/^\/(signin|register|forgot-password)/.test(ctx.path)) {
  const note = document.createElement("p");
  note.setAttribute("role", "status");
  note.className = "container-page mt-4 rounded-lg border border-[#f0dcb0] bg-warn-50 px-3 py-2 text-sm text-warn";
  note.textContent = getDict(ctx.lang).market.account.previewNote;
  document.querySelector("main")?.prepend(note);
  document.addEventListener(
    "submit",
    (e) => {
      e.preventDefault();
      note.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    true,
  );
}
}

// The demo catalog is a file next to the pages (no server); load it, then mount the islands.
fetch("catalog.json")
  .then((r) => r.json())
  .then((d) => setCatalog(d))
  .catch(() => {})
  .finally(start);
