# ASE implementation plan

## Where we stopped (8 November 2026)

Latest work: Georgian became the default language, delivery now depends on the customer's city, and the cart groups orders by manufacturer. Everything is pushed to `main`, and 32 tests pass.

**Next session, in this order:**
1. Owner reviews the updated preview (Georgian default, delivery estimate, cart, seller portal).
2. Native Georgian speaker reviews `src/i18n/ka.ts` and `src/i18n/data-ka.ts`.
3. Start Phase 2: accounts and roles (Supabase), database schema. The admin delivery page gets admin-only access here.
4. Answer the open decisions below, especially map service and delivery rates.

## What exists

| Area | Status |
|---|---|
| Design system (off-white / silky red / dark grey) | Done |
| Homepage: search, categories, featured, popular, recent, manufacturers, verified, B2B band, promos, footer | Done |
| Catalog with filters (category, manufacturer, price, availability, location, characteristics, verified, retail/wholesale) and sorting | Done |
| Category pages (13 categories) | Done |
| Product page: retail vs wholesale prices, bulk tiers, MOQ, stock, production time, customization, shipping info, related products | Done |
| Manufacturer directory and profiles with verification status | Done |
| B2B page with RFQ form (validated, **not sent** yet) | Done (UI only) |
| Delivery engine: smallest suitable vehicle, utilization, pricing, manual-quote fallback, per-manufacturer shipments, 22 unit tests | Done (module) |
| Delivery estimate depends on the customer's city (approximate city-to-city distance); customers see only "Estimated delivery: X ₾" | Done |
| Internal delivery calculator with full breakdown and rate table at `/admin/delivery` | Done (no access control yet) |
| Cart (kept in the browser): one shipment per manufacturer, combined delivery total; checkout switched off | Done (preview) |
| Languages: Georgian default at plain URLs, English under `/en`, "ქართული \| English" switcher; all UI and demo catalog translated | Done (needs native review) |
| Seller portal preview: dashboard, orders, quotations, products, finances, company profile (demo data, nothing saved) | Done (UI only) |
| Responsive: phone, tablet, desktop | Done |

Buttons that need later phases are visibly switched off or labelled as preview (checkout, RFQ send, seller portal saves).
Rental features: none exist in ASE (they belong to the separate amartani-properties project).

## Architecture

- **Next.js 16 + TypeScript + Tailwind CSS**, one app with three environments: public marketplace, manufacturer portal (`/seller`), admin (`/admin`).
- **Supabase** (Postgres, Auth, Storage) from Phase 2. Roles: `buyer`, `manufacturer`, `admin`. Row Level Security makes sure a manufacturer only reads its own orders, quotes and finances.
- **Money is calculated on the server.** Prices, commissions, stock and delivery are recalculated server-side at checkout; the order stores an unchangeable snapshot.
- **Delivery engine** is plain TypeScript (`src/lib/delivery`) so the server, the website preview and a future mobile app can share it. Rates move to a database table editable in the admin dashboard (Phase 7).

## Phases

1. ✅ Foundation: public marketplace on demo data
2. Accounts and roles (Supabase Auth): buyer, manufacturer, admin; database schema and migrations
3. Manufacturer portal: company profile, products, images, stock, approval
4. B2B: RFQ storage, manufacturer quotations, messaging, accept → order
5. B2C orders: cart, checkout, one shipment per manufacturer, order tracking, notifications
6. Delivery engine wiring: real distances, delivery time choice, admin settings
7. Admin dashboard: verification, product approval, orders, refunds, delivery settings, commissions
8. Payments (licensed provider), payouts, security review, deployment

## Decisions needed from the owner

| # | Decision | Needed by | Notes |
|---|---|---|---|
| 1 | ~~Where the code lives~~ | Decided | github.com/Elyathebuilder/ase-marketplace |
| 2 | Map / distance service (Google Maps, Mapbox, or other) | Phase 5 | Today distance is approximate (straight line × 1.3 between city centres). A map service gives real road distance to the exact address |
| 3 | Payment provider for marketplace split payments (e.g. a Georgian bank's marketplace product) | Phase 8 | No money is held by ASE itself until this is settled legally |
| 4 | Commission % (one rate, or per category) | Phase 7 | The seller portal shows 10% only as an example |
| 4b | Delivery rates: confirm Scooter 0/0.60/5, Car 0/0.60/10, Van 20/1.50/20, Truck 50/2.50/40 (base / per km / space fee) and vehicle sizes; minimum charge? | Phase 6 | Long trips are expensive for small items (one paint bucket Tbilisi → Batumi ≈ 212 ₾) |
| 5 | Delivery time options: "as soon as possible" vs set day and time window. Does a set time cost extra? | Phase 5 | From the interaction-logic document |
| 6 | Who delivers: ASE's own couriers or partner transport companies | Phase 5 | Affects vehicle capacities and rates |
| 7 | Georgian text review by a native speaker; add Russian later? | Before launch | Georgian is the default; English is second |
| 8 | Brand name and logo | Before launch | "ASE" with a red cross mark is a placeholder |

## Notes on the interaction-logic document

- Buyer ↔ ASE ↔ Manufacturer: questions about price and shipping go through ASE, not direct contact. Contact details on profiles are shown, but orders and quotes stay on the platform. *To confirm: should manufacturer phone/email be hidden from buyers entirely?*
- Order placed → manufacturer sees it on their seller page **and** gets a message/email → status updates go back to the buyer (Phase 5).
- The document's early delivery formula (D × N under thresholds Q/W/V, otherwise 0.6 × D ± 10 GEL) is replaced by the brief's vehicle-based engine, which uses the same 0.60 GEL/km for scooter and car.
