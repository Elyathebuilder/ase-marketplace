# ASE — Georgian Manufacturers Marketplace

"You manufacture. We sell." A B2C + B2B marketplace for products physically made in Georgia.

**Status: Phase 1 (public marketplace on demo data).** Ordering, accounts and payments are not live.

## Run it

Needs Node.js 20.9 or newer.

```bash
npm install
npm run dev      # open http://localhost:3000
npm test         # delivery engine, cart delivery and translation tests
npm run build    # production build
```

## What's where

```
src/app/[lang]/          Pages (Georgian at /, English at /en): shop, cart, seller portal, admin/delivery
src/proxy.ts             Language routing: plain URLs are Georgian (default), /en/... is English
src/i18n/                UI text (ka.ts, en.ts) and Georgian names for the demo catalog (data-ka.ts)
src/components/          Header, footer, cards, catalog filters, purchase panel, cart, RFQ form
src/lib/demo-data.ts     DEMO manufacturers and products (fictional)
src/lib/catalog.ts       Catalog queries and filters (swapped for Supabase in Phase 2)
src/lib/delivery/        Delivery pricing engine + tests (vehicle selection, utilization, pricing)
src/lib/cart-delivery.ts One shipment per manufacturer, priced from its city to the customer's city
docs/PLAN.md             Implementation plan, phases and open decisions
```

Colours: off-white base, silky red (#B3122A) for details and key actions, near-black/dark grey for text.
Tokens live in `src/app/globals.css`.

## Languages

Georgian (ქართული) is the default: every plain address is Georgian. English is the same page under `/en`.
The switcher in the header reads "ქართული | English". The Georgian text should be reviewed by a native speaker before launch.

## Delivery

Customers only see "Estimated delivery: X ₾" (per manufacturer in the cart, plus the combined total).
How the price is built (vehicle, utilization, base fee, per-km rate, space fee) is internal and shown on
`/admin/delivery` for ASE staff. That page gets access control when accounts and roles are added.
