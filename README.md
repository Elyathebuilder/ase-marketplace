# ASE — Georgian Manufacturers Marketplace

"You manufacture. We sell." A B2C + B2B marketplace for products physically made in Georgia.

**Status: shop, accounts, seller applications and portals, the Verified Manufacturer badge, and the order, payment and settlement workflow, on a built-in database (SQLite).** Demo data is added unless `ASE_SEED_DEMO=0`. Payments are ordinary bank transfers that an administrator verifies by hand; there are no card payments, payment gateways or automatic bank connections.

## Run it

Needs Node.js 22.13 or newer (it uses Node's built-in SQLite for the demo database).

```bash
npm install
npm run dev      # open http://localhost:3000
npm test         # delivery, cart, translations, orders/payments, accounts, sellers, badge (vitest)
npm run build    # production build
npm run e2e      # browser test of the 21 steps against a running app (see tests/e2e/journey.mjs)
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
  auth.ts                Sign-in session (signed, httpOnly cookie)
  accounts.ts            Registration, email confirmation, password reset, profiles, addresses, first admin
  sellers.ts             Seller application, the 8 account statuses, admin decisions, messages, files
  badge.ts               Verified Manufacturer badge: request, inspection checklist, decision (never automatic)
  products.ts            Seller products, price tiers, images, publishing, moderation
  catalog-store.ts       Public catalogue (approved sellers' published products), cached in memory
  mailer.ts              Email outbox; sends through Resend only when RESEND_API_KEY and MAIL_FROM are set
  seller-actions.ts      Server actions of the seller portal and admin seller pages
  market.test.ts, sellers.test.ts   Workflow tests
src/app/[lang]/seller/   Seller portal: Store (overview, products, store profile, badge, application)
                         and Orders (orders, finances, quotes preview)
src/app/[lang]/admin/    Admin: sellers, badges, products, accounts, emails, orders, payments, settlements
tests/e2e/journey.mjs    Browser test: customers, two sellers, admin, purchase, payment, statuses, isolation
supabase/migrations/     The same schema for Postgres, with row level security policies
supabase/tests/          Local check of those policies on plain Postgres (rls_check.sql)
docs/PLAN.md             Implementation plan, phases and open decisions
```

Colours: off-white base, silky red (#B3122A) for details and key actions, near-black/dark grey for text.
Tokens live in `src/app/globals.css`.

## Orders and payments (demo)

Sign in at `/signin` with a demo customer, manufacturer or administrator account.
Customer: basket → checkout (a one-click demo sign-in appears there) → payment page with bank details →
transfer details → confirmation → order tracking.
Manufacturer: `/seller/orders` and `/seller/finances` show only that manufacturer's part.
Admin: `/admin` (overview, orders, payments, settlements, refunds, settings).
Delete the `data/` folder to start again with fresh demo orders.

## Server settings (environment variables)

| Name | What it does |
| --- | --- |
| `ASE_SESSION_SECRET` | Signs sign-in cookies. Required on the live site: a long random string, kept secret. |
| `ASE_BASE_URL` | The site address used in email links, e.g. `https://ase.ge`. |
| `ASE_ADMIN_EMAIL`, `ASE_ADMIN_PASSWORD`, `ASE_ADMIN_NAME` | Create the first administrator on start if no account has that email. Never changes an existing account; remove the password after the first start. |
| `RESEND_API_KEY`, `MAIL_FROM` | Send emails through Resend (e.g. `MAIL_FROM="Amartani <no-reply@ase.ge>"`). Without them emails are kept in the outbox, marked "not sent", and shown at `/admin/emails`. |
| `ASE_DB_PATH`, `ASE_UPLOAD_DIR` | Where the database and uploaded files live (default `data/`). Back both up. |
| `ASE_SEED_DEMO=0` | No demo accounts, sellers, products or orders (use this on the live site). |
| `ASE_TEST_MODE=0` | Switch TEST mode off (it is on by default). |

## Accounts and sellers

Customers register at `/register/customer` and must confirm their email before ordering; the basket is kept.
Sellers register at `/register/seller` as a registered company or an independent maker, then fill in a
5-step application (business, location and contact, documents and photos, review) and send it.
An administrator reviews it at `/admin/sellers` and approves it as a company or an independent maker,
asks for more information, rejects, suspends or reactivates; every decision is stored with its reason.
Only approved sellers' published products are public. The "Verified Manufacturer" badge is separate:
the seller asks for it, an administrator schedules and records an inspection, and only then can award it.

**TEST mode.** New orders are marked TEST, show placeholder bank details ("do not transfer money") instead of
Amartani's real account, and are counted apart from real orders in the admin overview. A test payment
notification is never treated as a received payment: an administrator still has to verify it.

**Static preview** (`tools/preview`): `python3 tools/preview/crawl.py OUT` copies the running app (port 3100)
into static pages, then `PREVIEW_OUT=OUT npx vite build --config tools/preview/vite.config.mjs` builds the
browser-only parts. On the preview, checkout creates TEST orders kept only in that browser.

## Languages

Georgian (ქართული) is the default: every plain address is Georgian. English is the same page under `/en`.
The switcher in the header reads "ქართული | English". The Georgian text should be reviewed by a native speaker before launch.

## Delivery

Customers only see "Estimated delivery: X ₾" (per manufacturer in the cart, plus the combined total).
How the price is built (vehicle, utilization, base fee, per-km rate, space fee) is internal and shown on
`/admin/delivery` for ASE staff. That page gets access control when accounts and roles are added.
