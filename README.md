# ASE — Georgian Manufacturers Marketplace

"You manufacture. We sell." A B2C + B2B marketplace for products physically made in Georgia.

**Status: Phase 1 plus the order, payment and settlement workflow on a built-in demo database.** All data is demo data. Payments are ordinary bank transfers that an administrator verifies by hand; there are no card payments, payment gateways or automatic bank connections.

## Run it

Needs Node.js 22.13 or newer (it uses Node's built-in SQLite for the demo database).

```bash
npm install
npm run dev      # open http://localhost:3000
npm test         # delivery engine, cart, translations and the order/payment/settlement workflow
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
src/lib/money.ts         Money in whole tetri (integers), never floating point
src/lib/market/          Orders, bank-transfer payments, settlements, ledger, notifications:
  db.ts                  Tables (SQLite demo database at data/ase.db, created and seeded on first run)
  service.ts             The workflow; every action checks the signed-in role on the server
  queries.ts             What each role may read
  settings.ts            Commission (default 5%) and Amartani bank details, editable by admins
  auth.ts                Demo sign-in (signed cookie); replaced by Supabase Auth in Phase 2
  market.test.ts         Workflow tests
supabase/migrations/     The same schema for Postgres, with row level security policies
docs/PLAN.md             Implementation plan, phases and open decisions
```

Colours: off-white base, silky red (#B3122A) for details and key actions, near-black/dark grey for text.
Tokens live in `src/app/globals.css`.

## Orders and payments (demo)

Sign in at `/signin` with a demo customer, manufacturer or administrator account.
Customer: cart → checkout → bank details → "I have made the payment" → order timeline.
Manufacturer: `/seller/orders` and `/seller/finances` show only that manufacturer's part.
Admin: `/admin` (overview, orders, payments, settlements, refunds, settings).
Delete the `data/` folder to start again with fresh demo orders. Environment variables:
`ASE_SESSION_SECRET` (cookie signing secret), `ASE_DB_PATH`, `ASE_SEED_DEMO=0` (no demo orders).

## Languages

Georgian (ქართული) is the default: every plain address is Georgian. English is the same page under `/en`.
The switcher in the header reads "ქართული | English". The Georgian text should be reviewed by a native speaker before launch.

## Delivery

Customers only see "Estimated delivery: X ₾" (per manufacturer in the cart, plus the combined total).
How the price is built (vehicle, utilization, base fee, per-km rate, space fee) is internal and shown on
`/admin/delivery` for ASE staff. That page gets access control when accounts and roles are added.
