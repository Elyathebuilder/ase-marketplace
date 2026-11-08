# ASE implementation plan

## What exists (Phase 1)

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
| Responsive: phone, tablet, desktop | Done |

Buttons that need later phases are visibly switched off or labelled as preview (Add to cart, RFQ send).

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
| 1 | Where the code lives: GitHub repository for ASE | Now | Gives history, backups and Vercel deploys |
| 2 | Map / distance service (Google Maps, Mapbox, or other) | Phase 5 | Measures road distance pickup → customer |
| 3 | Payment provider for marketplace split payments (e.g. a Georgian bank's marketplace product) | Phase 8 | No money is held by ASE itself until this is settled legally |
| 4 | Commission % (one rate, or per category) | Phase 7 | |
| 5 | Delivery time options: "as soon as possible" vs set day and time window. Does a set time cost extra? | Phase 5 | From the interaction-logic document |
| 6 | Who delivers: ASE's own couriers or partner transport companies | Phase 5 | Affects vehicle capacities and rates |
| 7 | Languages: English + Georgian at launch? Russian? | Before launch | Fonts for Georgian already loaded |
| 8 | Brand name and logo | Before launch | "ASE" with a red cross mark is a placeholder |

## Notes on the interaction-logic document

- Buyer ↔ ASE ↔ Manufacturer: questions about price and shipping go through ASE, not direct contact. Contact details on profiles are shown, but orders and quotes stay on the platform. *To confirm: should manufacturer phone/email be hidden from buyers entirely?*
- Order placed → manufacturer sees it on their seller page **and** gets a message/email → status updates go back to the buyer (Phase 5).
- The document's early delivery formula (D × N under thresholds Q/W/V, otherwise 0.6 × D ± 10 GEL) is replaced by the brief's vehicle-based engine, which uses the same 0.60 GEL/km for scooter and car.
