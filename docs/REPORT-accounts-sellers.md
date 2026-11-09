# Technical report: accounts, sellers, verification and seller portals

9 November 2026. Covers the work requested in "Marketplace: Customer Registration, Seller Registration, Verification & Seller Portal", including part 15 (the Verified Manufacturer badge).

## 1. Summary

Everything in the brief is built and connected to the database and the server. Customers and sellers can register, confirm their email, sign in and out, and reset their password. Sellers apply as a registered company or an independent maker, and an administrator reviews them through 8 stored statuses. Approved sellers manage their store and products in Portal A and their orders in Portal B. Notifications come from server events. The Verified Manufacturer badge is a separate, inspection-based process that is never automatic.

Checks run:
- 64 unit tests (vitest), including 7 for this work.
- A browser test of all 21 steps (`npm run e2e`): 22 of 22 checks pass, with phone layouts checked on 21 pages.
- 14 database-rule checks for the Supabase migration on Postgres 16.
- Type check, lint and production build are clean.

## 2. What was reused

- **The order, payment and settlement workflow** (`src/lib/market/service.ts`). Kept and extended rather than rebuilt:
  - one order per customer, one "fulfilment" per manufacturer;
  - bank-transfer payments that only an admin verifies;
  - payouts, refunds, holds and disputes;
  - the append-only ledger and status history;
  - TEST mode.
- **In-app notifications** (`notifications` table, header bell). New event kinds were added to it.
- **The signed session cookie** (`auth.ts`). It now points at real accounts, and a version number lets a password reset or a suspension sign out every device.
- **Private file storage and the `/api/files` permission check.** Reused for registration documents, photos and product images, and tightened.
- **The catalogue, cart, delivery engine, design system and translations.** Products now come from the database, but the shop pages and the cart work as before.
- **The SQLite demo database with versioned migrations** (`PRAGMA user_version`). The new tables arrive as migrations 2 and 3, and existing data is kept.

## 3. Database: tables and migrations

**SQLite (the running app)** is in `src/lib/market/db.ts`.

Migration 2, accounts:
- New columns on `users`: first and last name, phone, `password_hash` (scrypt), `email_verified_at`, `status` (active/suspended), `status_reason`, `session_version`, `is_demo`, `created_at`, and a unique email index.
- `auth_tokens`: one-time email and reset links. Only a hash of each token is stored; verification links last 48 hours, reset links 1 hour.
- `login_attempts`: after 8 failed sign-ins in 15 minutes, sign-in is paused.
- `addresses`: the customer's delivery addresses.
- `email_outbox`: every email, with its status (queued, sent, failed, not_sent).
- `admin_actions`: append-only log of admin actions.

Migration 3, sellers:
- `manufacturers`: the store and its application. Holds the seller type, all application fields, `account_status` (8 statuses), `badge_status`, and `needs_reassessment`.
- `seller_files`: registration document, logo, workshop photos, product photos, supporting documents, badge documents and inspection photos.
- `seller_status_history` (append-only): every account and badge status change, with who made it and why.
- `seller_messages` (append-only): messages between the seller and Amartani, and internal admin notes.
- `badge_requests` and `inspections`: the Verified badge process.
- `products`, `product_price_tiers`, `product_images`. Products carry variants, colours, materials, specifications, dimensions, weight, stock, availability, minimum order, production days, custom-made options, wholesale minimum, and whether wholesale needs a quotation.
- New columns on `order_items`: `manufacturer_slug`, `manufacturer_name`, `pricing` (retail/wholesale), and `snapshot` (the product as bought).
- `order_messages` (append-only): seller ↔ Amartani messages about one shipment.
- Indexes on everything that is filtered.

On top of the migrations:
- **Startup:** two processes starting at once take turns through a lock file, so migrations and demo data never run twice.
- **Prices:** money is stored in whole tetri. Historical prices live on the order items and are never read back from the product.

**Supabase (Postgres)** is in `supabase/migrations/0002_accounts_sellers_badge.sql`, the same model for the planned move.
- **Sign-in:** passwords and email links are handled by Supabase Auth, so this file has no password or token tables.
- **Row-level security** is on for every table:
  - The public sees approved stores and their published products.
  - A seller sees only its own store, files, history, messages, badge requests, products and order messages. It never sees internal notes or its own registration document.
  - A seller may edit only the application fields, and only while the application is a draft or more information was asked for. The status columns are not writable from the browser at all.
  - A customer sees only their own addresses and orders.
  - A suspended account loses all access at once.
- **Database guards** (triggers):
  - Only an approved seller can publish.
  - The Verified badge needs a completed inspection.
  - History and message tables refuse updates and deletes.
- **Checked locally** with `supabase/tests/rls_check.sql`.

## 4. Pages and components

**Customer pages:**
- `/register` (choose customer or seller), `/register/customer`.
- `/signin`, `/forgot-password`, `/reset-password`.
- Email confirmation: `/account/verify` and `/account/verified`.
- `/account` (overview), `/account/profile`, `/account/security` (password), `/account/addresses`.
- `/account/orders`, `/account/orders/[id]`, `/account/notifications`.
- The checkout asks for a confirmed email, and the basket survives sign-in and registration.

**Seller registration:**
- `/register/seller` is step 1: company or independent, store name, contact person, email, phone and password.
- `/seller/application` holds steps 2–5:
  - Step 2, business: name, legal name, registration number, year, description, categories.
  - Step 3, location and contact.
  - Step 4, documents and photos. The company document is required only for companies; independent makers give product or workspace photos instead.
  - Step 5, review: shows what is still missing, then sends the application.
- The application page also shows the current status, Amartani's requests, a reply box and the status history.

**Portal A, Store:**
- `/seller`: overview with published, draft and waiting products, the badge status, orders needing action, and recent activity.
- `/seller/products` and `/seller/products/[slug]`, the full product editor:
  - images (several, with a main image);
  - categories, price and stock or availability;
  - specifications, dimensions and weight, materials;
  - colours and choices;
  - production time, custom-made options and minimum order;
  - wholesale tiers (for example 20, 50 and 100 units), and whether wholesale needs a quotation;
  - publish, archive and delete.
- `/seller/company`: store profile. Changing sensitive details after approval flags the store for admin review.
- `/seller/verification`: the Verified badge.

**Portal B, Orders:**
- `/seller/orders` has filters: new, awaiting payment, paid, preparing, ready, collected, completed, cancelled or disputed.
- `/seller/orders/[id]` shows:
  - the products, with images, specifications, quantity, agreed price, and whether the price was retail or wholesale;
  - the seller's total, the commission and the settlement amount;
  - the customer's name and delivery city;
  - the payment stage;
  - the next steps the seller can take;
  - messages with Amartani, and the status history.
- `/seller/finances`: expected and paid settlements.
- Quotations remain a preview until the business-buyer (B2B) part is built.

**Admin pages:**
- `/admin/sellers`: a list with filters. `/admin/sellers/[slug]` shows the application, the documents, messages and internal notes, the decisions with reasons, the status history and the admin log.
- `/admin/sellers/[slug]/verification`: the badge process.
- `/admin/badges`: the queue of badge requests.
- `/admin/products`: moderation. Product moderation is optional and can be switched on in Admin, Settings.
- `/admin/accounts`: suspend or reactivate any account.
- `/admin/emails`: the outbox. In TEST mode, its links can be opened from here.
- An order message thread on `/admin/orders/[id]`.

**Shared components:**
- `components/forms` (`Field`, `Submit`), `components/account`.
- `components/seller/kit.tsx`: forms, status chips and boxes, message threads, history, file lists, uploads, category checkboxes.
- `components/seller/application.tsx`.
- The seller navigation, which keeps the two portals separate, on desktop and phone.

## 5. Services and permissions

Every rule lives in server code that runs on every request. Hiding a button is never the protection.

- **`accounts.ts`**:
  - registration (the role comes from the form used, never from the browser);
  - email confirmation, sign-in with throttling, password reset, profile, addresses;
  - account suspension, and the first admin, created from server settings.
- **`sellers.ts`**:
  - the application and its 8 statuses (draft, pending review, under review, more information required, approved company, approved independent, rejected, suspended);
  - admin decisions (each checks which moves are allowed from the current status);
  - messages, internal notes and files;
  - the reassessment flag.
  - A seller can only take one step itself: sending its own application.
- **`badge.ts`**:
  - request, review, scheduled inspection;
  - a 9-point checklist suited to the size of the workshop (home, workshop or factory), with summary and recommendation;
  - award, reject, more information, revoke, reassess.
  - The badge can only be awarded after a completed inspection, and approving a seller never awards it.
- **`products.ts`**:
  - save, publish, unpublish, archive, delete, images, tiers;
  - only an approved seller can publish;
  - optional moderation.
- **`service.ts`** (orders):
  - The seller steps are accept, start preparation, preparation in progress and ready for collection, each with an optional comment.
  - Payment verification, collection, inspection, delivery, payouts, refunds and completion are admin-only.
  - A seller can only act on its own shipments.
- **`queries.ts`**: what each role may read.
  - A seller sees only its own shipments, with the customer's name and delivery city. It never sees the email, phone or payment details.
  - A customer sees only their own orders.
  - Admins see everything.
- **`/api/files`**:
  - Logos, store photos and product images of approved stores are public.
  - Registration and supporting documents, badge documents and inspection photos are admin-only.
  - Payment receipts are visible to the paying customer and admins.

## 6. How registration works

1. **Customer.** The customer gives first name, last name, email and password (twice).
   - The account is created as a customer and a confirmation link is emailed.
   - The customer can browse and fill the basket at once, but must confirm the email before placing an order.
   - The basket is kept through registration and sign-in, including products from several manufacturers.
2. **Seller.**
   - Step 1 creates the account and an empty draft store.
   - Steps 2–5 can be filled in over several visits; nothing is lost between them.
   - Sending the application moves the store to "pending review" and tells the admins.
   - Meanwhile the seller can prepare draft products, which stay private.

## 7. How seller verification works

1. **Review starts.** The admin opens the application and can start the review, which the seller sees as "under review".
2. **The admin's options:**
   - ask for more information (the seller sees the request, edits, uploads and sends again);
   - approve as a registered company or as an independent maker;
   - reject;
   - later, suspend or reactivate.
3. **Reasons.** Rejecting, asking for more information and suspending all need a reason, which the seller sees.
4. **Records.** Every change is stored in the history with who made it and when. Internal notes are kept apart and never shown to the seller.
5. **Sensitive changes later.** If an approved seller changes sensitive details, the store stays open but is flagged for the admin to look again.

**Verified Manufacturer badge** (part 15):
1. Separate from approval: an approved seller asks for it with details, documents and photos.
2. The admin starts a review and schedules an inspection visit.
3. The admin fills in the checklist during or after the visit, then completes the inspection.
4. Only then can the admin award the badge. They can also reject, ask for more information, revoke, or ask for a new inspection.
5. The public store page explains what "Approved seller" and "Verified Manufacturer" each mean. It never suggests that every approved seller was inspected.

## 8. How the two seller portals work

- **Portal A (Store)** is about the seller's public presence: overview, products, store profile, badge and application.
- **Portal B (Orders)** is the operational side:
  - Each shipment shows its payment stage: awaiting customer payment, customer sent payment details, payment verified by Amartani, approved for preparation, payout pending, paid, settled.
  - The seller moves its own steps forward. It cannot mark anything as paid, collected or delivered; those buttons do not exist for sellers, and the server refuses them.
  - A message box lets the seller report problems or delays to Amartani; customers never see these messages.

## 9. How notifications are triggered

- **Source:** notifications are written by the server functions that change the data, inside the same database transaction, never by a button in the browser.
- **Customers** are told when:
  - the order is placed;
  - a payment is verified, partly received or rejected;
  - the manufacturer accepts or starts preparing;
  - preparation is in progress, or the order is ready, collected, on its way, delivered or completed;
  - a delay, cancellation or refund happens.
- **Payment notifications** come only from an admin's payment verification.
- **Sellers** are told about:
  - application decisions and information requests;
  - badge steps;
  - product moderation;
  - new paid orders and messages from Amartani;
  - payouts.
- **Admins** are told about:
  - new and updated applications and sensitive store changes;
  - badge requests and products waiting for review;
  - payment reports and seller messages;
  - orders ready for collection and manufacturer rejections.
- **Delivery:**
  - Notifications show in the bell and on the notifications page, with read/unread state.
  - Email copies go out through Resend once the key is set. Until then they are kept in the outbox, marked "not sent", and never claimed as sent.
  - No SMS or WhatsApp is used.

## 10. What still needs a person (manual admin actions)

- Starting the review of each seller application, then approving, rejecting or asking for more information.
- Badge inspections: scheduling, the visit, the checklist and the decision.
- Product review, if moderation is switched on (it is off by default).
- Checking each bank transfer against the bank statement and recording it.
  - The seller and the customer can never do this.
  - In TEST mode no real money is involved.
- Confirming collection, inspection, delivery and completion of each shipment.
- Authorising and recording each manufacturer payout made through the bank.
- Refunds, disputes, holds and account suspensions.
- Looking at sellers flagged for reassessment.

## 11. What is incomplete

- **Email sending** needs a Resend account and key (see section 12). Until then nothing is emailed. In TEST mode the confirmation links can be opened from `/admin/emails` and `/account/verify`.
- **Phone verification by SMS** is not built, because it costs money per message. The phone number is collected but not verified.
- **Supabase:** the migration and its security rules are written and tested on a local Postgres. The running app still uses the built-in database, and moving the data across is a separate step.
- **Business buyers (B2B):** the quote request form and seller quotations are still a preview.
- **The browser test** was run in English only, on desktop with phone layouts checked; the whole journey was not repeated at phone size. The Georgian text still needs a review by a native speaker.
- **Image handling:** images are not resized; the files are checked for type and size (5 MB) and served as uploaded. Resizing can be added when hosting is chosen.

## 12. Security and deployment

**Server settings to provide** (also listed in the README):
- `ASE_SESSION_SECRET`: a long random string. Without it a random one is created in `data/`.
- `ASE_BASE_URL`: for example `https://ase.ge`, used in email links.
- `ASE_ADMIN_EMAIL` and `ASE_ADMIN_PASSWORD`: create the first admin on the first start. Remove the password afterwards.
- `RESEND_API_KEY` and `MAIL_FROM`: email sending, with the sending domain verified in Resend.
- `ASE_SEED_DEMO=0`: no demo data on the live site.
- `ASE_TEST_MODE=0`: only when real payments start.
- `ASE_DB_PATH` and `ASE_UPLOAD_DIR`: a persistent disk, backed up daily.

**Hosting:** a single Node.js 22 server with a persistent disk (any small VPS). Platforms without a disk, such as Vercel, need the Supabase move first.

**Already in place:**
- Passwords are stored as scrypt hashes with a salt.
- Email and reset links are single-use, time-limited and stored only as hashes.
- Sign-in is throttled after repeated failures.
- Session cookies are httpOnly and signed, and are marked secure in production.
- Suspension and password reset sign out every device.
- Uploads are checked by their real content, not their name, and given random file names.
- Private documents are admin-only.
- No secret is sent to the browser.
- All prices, tiers, commissions and delivery are recalculated on the server when an order is placed.
- There are no card payments, gateways or automatic bank connections, and no money is held in escrow.

**Before launch:**
- Use HTTPS.
- Set a strong admin password.
- Back up the database and uploads.
- Have the Georgian texts reviewed.
- Get a legal review of how customer payments are handled before paying manufacturers.
