# ASE implementation plan

## Where we stopped (9 November 2026)

Latest work: registration and accounts for customers and sellers (email confirmation, password reset, profile, addresses), the seller application with 8 statuses and admin review, the two seller portals (Store and Orders), product management with wholesale price tiers, colours and choices, order messages between sellers and Amartani, the separate Verified Manufacturer badge with a manual inspection, admin pages for sellers, badges, products, accounts and emails, and the Supabase migration with row-level security. 64 unit tests pass; the browser test of the 21 steps passes on desktop, with phone layouts checked. The full report is in `docs/REPORT-accounts-sellers.md`.

**Next session, in this order:**
1. Owner creates a Resend account, verifies the sending domain and gives `RESEND_API_KEY` and `MAIL_FROM`.
2. Owner chooses hosting (a small server with a disk for the database and uploads) and sets the server settings listed in the README.
3. Native Georgian speaker reviews `src/i18n/*-ka.ts`.
4. Move to Supabase when the owner wants it (`supabase/migrations/0001` and `0002`, checked locally with `supabase/tests/rls_check.sql`).
5. Answer the open decisions below.

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
| Cart (kept in the browser): one shipment per manufacturer, combined delivery total | Done |
| Purchase journey: checkout (name, phone, email, city, address, note) → payment page with bank-transfer instructions → payment notification → confirmation → tracking timeline; one-click demo sign-in from checkout | Done (demo database) |
| TEST mode (`ASE_TEST_MODE`, on unless set to `0`): orders flagged TEST everywhere, placeholder bank details instead of real ones, admin overview keeps real and TEST money apart; never changeable from the admin pages | Done |
| Static preview: the same journey runs in the browser only, with TEST orders kept in localStorage (`tools/preview`) | Done |
| Languages: Georgian default at plain URLs, English under `/en`, "ქართული \| English" switcher; all UI and demo catalog translated | Done (needs native review) |
| Seller quotations | Preview only (B2B RFQ phase) |
| Orders and bank-transfer payments: checkout, bank details, "I have made the payment" with receipt, admin verification (confirm, partial, incorrect amount, reject, ask for the rest) | Done (demo database) |
| Order timeline for customers, one shipment per manufacturer, full status history (who, when, why) | Done (demo database) |
| Manufacturer side: own orders only, accept / reject / preparing / ready, expected payout and commission | Done (demo database) |
| Settlements: payout eligible after collection and inspection, authorize, record transfer with reference and confirmation, complete, fail, hold | Done (demo database) |
| Append-only ledger, reversals instead of edits, cancellations, refunds, holds and disputes, financial overview | Done (demo database) |
| In-app notifications (bell in header) and emails through Resend once its key is set; no SMS | Done |
| Admin settings: commission (5% default, products or products + delivery), payment deadline, Amartani bank details | Done |
| Accounts: customer and seller registration, email confirmation, sign-in, password reset, profile, addresses, suspension | Done |
| Seller application (company or independent maker), 8 statuses, admin review with reasons, messages and internal notes | Done |
| Seller portals: Store (overview, products with tiers and images, store profile, badge, application) and Orders (orders, finances) | Done |
| Verified Manufacturer badge: request, scheduled inspection, scale-appropriate checklist, decision; never automatic | Done |
| Admin: sellers, badges, product moderation (optional), accounts, email outbox | Done |
| Supabase migration with row-level security for all of the above | Done (not yet deployed) |
| Responsive: phone, tablet, desktop | Done |

Buttons that need later phases are visibly switched off or labelled as preview (RFQ send, seller quotations).
Rental features: none exist in ASE (they belong to the separate amartani-properties project).

## Architecture

- **Next.js 16 + TypeScript + Tailwind CSS**, one app with three environments: public marketplace, manufacturer portal (`/seller`), admin (`/admin`).
- **Supabase** (Postgres, Auth, Storage) from Phase 2. Roles: `buyer`, `manufacturer`, `admin`. Row Level Security makes sure a manufacturer only reads its own orders, quotes and finances.
- **Money is calculated on the server.** Prices, commissions, stock and delivery are recalculated server-side at checkout; the order stores an unchangeable snapshot.
- **Delivery engine** is plain TypeScript (`src/lib/delivery`) so the server, the website preview and a future mobile app can share it. Rates move to a database table editable in the admin dashboard (Phase 7).

## Phases

1. ✅ Foundation: public marketplace on demo data
2. ✅ Accounts and roles: buyer, manufacturer, admin; database schema and migrations (Supabase move pending)
3. ✅ Manufacturer portal: company profile, products, images, stock, approval, Verified badge
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
| 4 | Commission % (one rate, or per category) | Before launch | Default 5% of the product subtotal, editable in Admin → Settings. Per-category rates not built |
| 4b | Delivery rates: confirm Scooter 0/0.60/5, Car 0/0.60/10, Van 20/1.50/20, Truck 50/2.50/40 (base / per km / space fee) and vehicle sizes; minimum charge? | Phase 6 | Long trips are expensive for small items (one paint bucket Tbilisi → Batumi ≈ 212 ₾) |
| 5 | Delivery time options: "as soon as possible" vs set day and time window. Does a set time cost extra? | Phase 5 | From the interaction-logic document |
| 6 | Who delivers: ASE's own couriers or partner transport companies | Phase 5 | Affects vehicle capacities and rates |
| 7 | Georgian text review by a native speaker; add Russian later? | Before launch | Georgian is the default; English is second |
| 8 | Brand name and logo | Before launch | "ASE" with a red cross mark is a placeholder; payment pages say "Amartani" |
| 9 | Amartani's real bank account, payment deadline, and legal review of holding customer money before paying manufacturers | Before launch | The demo IBAN is fake. The ledger is internal bookkeeping, not escrow |
| 10 | Email provider account (Resend recommended: free up to 3,000 emails a month) | Before launch | Emails wait in the outbox until the key is set; no paid SMS/WhatsApp without your approval |

## Notes on the interaction-logic document

- Buyer ↔ ASE ↔ Manufacturer: questions about price and shipping go through ASE, not direct contact. Contact details on profiles are shown, but orders and quotes stay on the platform. *To confirm: should manufacturer phone/email be hidden from buyers entirely?*
- Order placed → manufacturer sees it on their seller page **and** gets a message/email → status updates go back to the buyer (Phase 5).
- The document's early delivery formula (D × N under thresholds Q/W/V, otherwise 0.6 × D ± 10 GEL) is replaced by the brief's vehicle-based engine, which uses the same 0.60 GEL/km for scooter and car.
