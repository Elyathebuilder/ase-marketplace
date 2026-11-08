# ASE — Georgian Manufacturers Marketplace

"You manufacture. We sell." A B2C + B2B marketplace for products physically made in Georgia.

**Status: Phase 1 (public marketplace on demo data).** Ordering, accounts and payments are not live.

## Run it

Needs Node.js 20.9 or newer.

```bash
npm install
npm run dev      # open http://localhost:3000
npm test         # delivery engine unit tests
npm run build    # production build
```

## What's where

```
src/app/                 Pages: home, products, categories, manufacturers, b2b, about
src/components/          Header, footer, cards, catalog filters, product purchase panel, RFQ form
src/lib/demo-data.ts     DEMO manufacturers and products (fictional)
src/lib/catalog.ts       Catalog queries and filters (swapped for Supabase in Phase 2)
src/lib/delivery/        Delivery pricing engine + tests (vehicle selection, utilization, pricing)
docs/PLAN.md             Implementation plan, phases and open decisions
```

Colours: off-white base, silky red (#B3122A) for details and key actions, near-black/dark grey for text.
Tokens live in `src/app/globals.css`.
