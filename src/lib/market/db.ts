/**
 * The marketplace database (orders, payments, settlements, ledger, notifications).
 *
 * For the demo this is a SQLite file inside the app (data/ase.db), created and filled with demo
 * data on first use. Supabase/Postgres replaces it in Phase 2; the same tables and rules are in
 * supabase/migrations. Money columns are whole tetri (integers), never floating point.
 *
 * Append-only tables (ledger_entries, status_history, notes, settings_history) refuse UPDATE and
 * DELETE at the database level, so history can't be silently rewritten. Corrections are new entries.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('customer','manufacturer','admin')),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  manufacturer_slug TEXT,
  CHECK ((role = 'manufacturer') = (manufacturer_slug IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS settings_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  changed_by TEXT
);

CREATE TABLE IF NOT EXISTS manufacturer_bank_accounts (
  manufacturer_slug TEXT PRIMARY KEY,
  account_holder TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  iban TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  payment_deadline TEXT,
  goods_tetri INTEGER NOT NULL CHECK (goods_tetri >= 0),
  delivery_tetri INTEGER NOT NULL CHECK (delivery_tetri >= 0),
  total_tetri INTEGER NOT NULL CHECK (total_tetri = goods_tetri + delivery_tetri),
  commission_bps INTEGER NOT NULL CHECK (commission_bps BETWEEN 0 AND 10000),
  commission_base TEXT NOT NULL CHECK (commission_base IN ('products','products_and_delivery')),
  delivery_name TEXT NOT NULL,
  delivery_phone TEXT NOT NULL,
  delivery_city TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_note TEXT,
  delivery_email TEXT,
  -- 1 = TEST order: placed in test mode, never real money, shown with a TEST label everywhere
  is_test INTEGER NOT NULL DEFAULT 0 CHECK (is_test IN (0,1)),
  hold_kind TEXT CHECK (hold_kind IN ('hold','dispute')),
  hold_reason TEXT
);

CREATE TABLE IF NOT EXISTS fulfillments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  manufacturer_slug TEXT NOT NULL,
  status TEXT NOT NULL,
  goods_tetri INTEGER NOT NULL CHECK (goods_tetri >= 0),
  delivery_tetri INTEGER NOT NULL CHECK (delivery_tetri >= 0),
  commission_tetri INTEGER NOT NULL CHECK (commission_tetri >= 0),
  payable_tetri INTEGER NOT NULL CHECK (payable_tetri >= 0),
  prepare_by TEXT,
  reject_reason TEXT,
  UNIQUE (order_id, manufacturer_slug)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id),
  fulfillment_id TEXT NOT NULL REFERENCES fulfillments(id),
  product_slug TEXT NOT NULL,
  product_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  unit_price_tetri INTEGER NOT NULL CHECK (unit_price_tetri >= 0),
  qty INTEGER NOT NULL CHECK (qty > 0),
  line_tetri INTEGER NOT NULL CHECK (line_tetri = unit_price_tetri * qty)
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  method TEXT NOT NULL DEFAULT 'bank_transfer' CHECK (method = 'bank_transfer'),
  status TEXT NOT NULL,
  expected_tetri INTEGER NOT NULL CHECK (expected_tetri >= 0),
  reported_tetri INTEGER,
  reported_date TEXT,
  reference TEXT,
  receipt_file TEXT,
  receipt_name TEXT,
  created_at TEXT NOT NULL,
  submitted_at TEXT,
  submitted_by TEXT,
  received_tetri INTEGER,
  verified_at TEXT,
  verified_by TEXT
);

CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  fulfillment_id TEXT NOT NULL UNIQUE REFERENCES fulfillments(id),
  status TEXT NOT NULL,
  payable_tetri INTEGER NOT NULL CHECK (payable_tetri >= 0),
  authorized_at TEXT,
  authorized_by TEXT,
  transfer_reference TEXT,
  transfer_date TEXT,
  confirmation_file TEXT,
  confirmation_name TEXT,
  completed_at TEXT,
  completed_by TEXT,
  hold_reason TEXT
);

CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  fulfillment_id TEXT REFERENCES fulfillments(id),
  amount_tetri INTEGER NOT NULL CHECK (amount_tetri > 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','completed')),
  reference TEXT,
  transfer_date TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  completed_at TEXT,
  completed_by TEXT
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id),
  fulfillment_id TEXT REFERENCES fulfillments(id),
  manufacturer_slug TEXT,
  kind TEXT NOT NULL CHECK (kind IN (
    'customer_payment',      -- money actually received in Amartani's bank account (recorded by an admin)
    'delivery_allocation',   -- part of the customer payment that covers delivery
    'commission',            -- platform commission earned
    'manufacturer_payable',  -- what Amartani owes the manufacturer
    'manufacturer_payout',   -- money actually transferred to the manufacturer (recorded by an admin)
    'refund_due',            -- what Amartani owes the customer back
    'refund_paid'            -- money actually returned to the customer (recorded by an admin)
  )),
  amount_tetri INTEGER NOT NULL,
  bank_reference TEXT,
  note TEXT,
  adjusts_entry_id INTEGER REFERENCES ledger_entries(id),
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  entity TEXT NOT NULL CHECK (entity IN ('order','fulfillment','payment','payout','refund')),
  entity_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  at TEXT NOT NULL,
  by_user TEXT NOT NULL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  payment_id TEXT,
  body TEXT NOT NULL,
  at TEXT NOT NULL,
  by_user TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL,
  order_id TEXT,
  fulfillment_id TEXT,
  params TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  read_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_fulfillments_maker ON fulfillments(manufacturer_slug);
CREATE INDEX IF NOT EXISTS idx_ledger_order ON ledger_entries(order_id);
CREATE INDEX IF NOT EXISTS idx_history_order ON status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at);
`;

const APPEND_ONLY = ["ledger_entries", "status_history", "notes", "settings_history", "admin_actions", "seller_status_history", "seller_messages", "order_messages"];
const TRIGGERS = APPEND_ONLY.flatMap((t) => [
  `CREATE TRIGGER IF NOT EXISTS ${t}_no_update BEFORE UPDATE ON ${t} BEGIN SELECT RAISE(ABORT, '${t} is append-only'); END;`,
  `CREATE TRIGGER IF NOT EXISTS ${t}_no_delete BEFORE DELETE ON ${t} BEGIN SELECT RAISE(ABORT, '${t} is append-only'); END;`,
]).join("\n");

export type DB = DatabaseSync;

/**
 * Versioned migrations. The database remembers which ones ran (PRAGMA user_version), so each runs
 * exactly once, in order, and existing data is kept. Never edit a migration that has shipped: add a new one.
 */
export const MIGRATIONS: { version: number; name: string; up: (db: DatabaseSync) => void }[] = [
  {
    version: 1,
    name: "orders: delivery email and TEST flag",
    up(db) {
      const cols = columns(db, "orders");
      if (!cols.has("delivery_email")) db.exec("ALTER TABLE orders ADD COLUMN delivery_email TEXT");
      if (!cols.has("is_test")) db.exec("ALTER TABLE orders ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0 CHECK (is_test IN (0,1))");
    },
  },
  { version: 2, name: "accounts, sign-in tokens, addresses, email outbox, admin actions", up: (db) => db.exec(ACCOUNTS_SQL) },
  { version: 3, name: "sellers, verification, Verified badge, products, order messages", up: (db) => db.exec(SELLERS_SQL) },
];

const columns = (db: DatabaseSync, table: string) => new Set((db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name));

const ACCOUNTS_SQL = `
ALTER TABLE users ADD COLUMN first_name TEXT;
ALTER TABLE users ADD COLUMN last_name TEXT;
ALTER TABLE users ADD COLUMN phone TEXT;
-- scrypt hash (see accounts.ts). NULL for demo accounts, which can't sign in with a password.
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN email_verified_at TEXT;
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended'));
ALTER TABLE users ADD COLUMN status_reason TEXT;
ALTER TABLE users ADD COLUMN created_at TEXT;
-- Raised on password reset and suspension: every older session cookie stops working.
ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users(lower(email));

-- One-time links for email verification and password reset. Only a hash of the token is stored.
CREATE TABLE IF NOT EXISTS auth_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  purpose TEXT NOT NULL CHECK (purpose IN ('verify_email','reset_password')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id, purpose);

-- Failed sign-ins, to slow down password guessing.
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  at TEXT NOT NULL,
  ok INTEGER NOT NULL CHECK (ok IN (0,1))
);
CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts(email, at);

CREATE TABLE IF NOT EXISTS addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  label TEXT,
  recipient TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  note TEXT,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);

-- Every email the platform wants to send. Sent through the email provider when one is configured;
-- otherwise kept here as 'not_sent' and shown to admins in TEST mode. Never claims to be sent when it wasn't.
CREATE TABLE IF NOT EXISTS email_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id),
  to_email TEXT NOT NULL,
  kind TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  link TEXT,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','not_sent')),
  sent_at TEXT,
  provider_id TEXT,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_outbox_status ON email_outbox(status);

-- Who did what in the admin area (account suspensions, approvals, moderation). Append-only.
CREATE TABLE IF NOT EXISTS admin_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_type, target_id);
`;

const SELLERS_SQL = `
-- A seller's store and its marketplace application. Demo manufacturers are rows here too.
CREATE TABLE IF NOT EXISTS manufacturers (
  slug TEXT PRIMARY KEY,
  owner_user_id TEXT REFERENCES users(id),
  seller_type TEXT NOT NULL CHECK (seller_type IN ('company','independent')),
  name TEXT NOT NULL,
  name_ka TEXT,
  legal_name TEXT,
  registration_number TEXT,
  year_established INTEGER,
  city TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  tagline TEXT NOT NULL DEFAULT '',
  tagline_ka TEXT,
  description TEXT NOT NULL DEFAULT '',
  description_ka TEXT,
  categories TEXT NOT NULL DEFAULT '[]',
  capabilities TEXT NOT NULL DEFAULT '[]',
  wholesale_note TEXT NOT NULL DEFAULT '',
  employees TEXT NOT NULL DEFAULT '',
  monogram TEXT NOT NULL DEFAULT '',
  contact_first_name TEXT,
  contact_last_name TEXT,
  contact_email TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  website TEXT,
  social TEXT NOT NULL DEFAULT '{}',
  extra_info TEXT,
  logo_file TEXT,
  -- Permission to sell (set only by an admin, except draft -> pending_review when the seller submits).
  account_status TEXT NOT NULL DEFAULT 'draft' CHECK (account_status IN
    ('draft','pending_review','under_review','info_required','approved_company','approved_independent','rejected','suspended')),
  -- The separate Verified Manufacturer badge, awarded only by an admin after an inspection.
  badge_status TEXT NOT NULL DEFAULT 'not_requested' CHECK (badge_status IN
    ('not_requested','submitted','under_review','inspection_scheduled','inspection_completed','info_required','verified','rejected','revoked')),
  -- Sensitive details changed after approval: an admin should look again.
  needs_reassessment INTEGER NOT NULL DEFAULT 0 CHECK (needs_reassessment IN (0,1)),
  featured INTEGER NOT NULL DEFAULT 0,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  submitted_at TEXT,
  approved_at TEXT,
  verified_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_manufacturers_status ON manufacturers(account_status);
CREATE INDEX IF NOT EXISTS idx_manufacturers_owner ON manufacturers(owner_user_id);

-- Documents and photos. Stored privately; served only after a permission check.
CREATE TABLE IF NOT EXISTS seller_files (
  id TEXT PRIMARY KEY,
  manufacturer_slug TEXT NOT NULL REFERENCES manufacturers(slug),
  kind TEXT NOT NULL CHECK (kind IN ('registration_document','logo','workshop_photo','product_photo','supporting_document','badge_document','inspection_photo')),
  file TEXT NOT NULL,
  name TEXT NOT NULL,
  related_id TEXT,
  uploaded_by TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  removed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_seller_files ON seller_files(manufacturer_slug, kind);

-- Every change of a seller's account status or badge status. Append-only.
CREATE TABLE IF NOT EXISTS seller_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manufacturer_slug TEXT NOT NULL,
  track TEXT NOT NULL CHECK (track IN ('account','badge')),
  from_status TEXT,
  to_status TEXT NOT NULL,
  at TEXT NOT NULL,
  by_user TEXT NOT NULL,
  reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_seller_history ON seller_status_history(manufacturer_slug, track);

-- Messages between Amartani and the applicant ('seller'), and internal admin notes ('internal'). Append-only.
CREATE TABLE IF NOT EXISTS seller_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manufacturer_slug TEXT NOT NULL,
  track TEXT NOT NULL CHECK (track IN ('account','badge')),
  author_id TEXT NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('manufacturer','admin')),
  visibility TEXT NOT NULL CHECK (visibility IN ('seller','internal')),
  kind TEXT NOT NULL DEFAULT 'message' CHECK (kind IN ('message','info_request','decision')),
  body TEXT NOT NULL,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_seller_messages ON seller_messages(manufacturer_slug, track);

-- Requests for the Verified Manufacturer badge. A new request is made for each reassessment.
CREATE TABLE IF NOT EXISTS badge_requests (
  id TEXT PRIMARY KEY,
  manufacturer_slug TEXT NOT NULL REFERENCES manufacturers(slug),
  status TEXT NOT NULL CHECK (status IN ('submitted','under_review','inspection_scheduled','inspection_completed','info_required','verified','rejected','revoked','withdrawn')),
  reason TEXT NOT NULL DEFAULT 'seller_request' CHECK (reason IN ('seller_request','reassessment')),
  details TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  submitted_at TEXT,
  decided_at TEXT,
  decided_by TEXT,
  decision_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_badge_requests ON badge_requests(manufacturer_slug);

-- The inspection for a badge request: visit, scale-appropriate checklist and findings.
CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE REFERENCES badge_requests(id),
  manufacturer_slug TEXT NOT NULL REFERENCES manufacturers(slug),
  scale TEXT NOT NULL DEFAULT 'workshop' CHECK (scale IN ('home','workshop','factory')),
  scheduled_for TEXT,
  visited_at TEXT,
  inspector_id TEXT,
  checklist TEXT NOT NULL DEFAULT '{}',
  summary TEXT,
  recommendation TEXT CHECK (recommendation IN ('approve','reject','more_info')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS products (
  slug TEXT PRIMARY KEY,
  manufacturer_slug TEXT NOT NULL REFERENCES manufacturers(slug),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_review','published','rejected','archived')),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ka TEXT,
  description TEXT NOT NULL DEFAULT '',
  description_ka TEXT,
  highlights TEXT NOT NULL DEFAULT '[]',
  highlights_ka TEXT,
  specs TEXT NOT NULL DEFAULT '{}',
  materials TEXT NOT NULL DEFAULT '[]',
  colors TEXT NOT NULL DEFAULT '[]',
  -- Choices the customer picks, e.g. [{"name":"Size","options":["S","M","L"]}]. Same price for every choice.
  variants TEXT NOT NULL DEFAULT '[]',
  retail_price_tetri INTEGER CHECK (retail_price_tetri IS NULL OR retail_price_tetri > 0),
  unit TEXT NOT NULL DEFAULT 'piece',
  length_cm REAL NOT NULL DEFAULT 10 CHECK (length_cm > 0),
  width_cm REAL NOT NULL DEFAULT 10 CHECK (width_cm > 0),
  height_cm REAL NOT NULL DEFAULT 10 CHECK (height_cm > 0),
  weight_kg REAL NOT NULL DEFAULT 1 CHECK (weight_kg > 0),
  fragile INTEGER NOT NULL DEFAULT 0,
  special_handling INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  available INTEGER NOT NULL DEFAULT 1 CHECK (available IN (0,1)),
  moq INTEGER NOT NULL DEFAULT 1 CHECK (moq >= 1),
  production_days INTEGER NOT NULL DEFAULT 0 CHECK (production_days >= 0),
  customizable INTEGER NOT NULL DEFAULT 0,
  customization_options TEXT NOT NULL DEFAULT '[]',
  buy_now INTEGER NOT NULL DEFAULT 1,
  request_quote INTEGER NOT NULL DEFAULT 0,
  wholesale_min_qty INTEGER,
  -- 1: wholesale prices need a quotation. 0: the tier price applies automatically at checkout.
  wholesale_quote_only INTEGER NOT NULL DEFAULT 1,
  tags TEXT NOT NULL DEFAULT '[]',
  featured INTEGER NOT NULL DEFAULT 0,
  popularity INTEGER NOT NULL DEFAULT 0,
  tone INTEGER NOT NULL DEFAULT 0,
  moderation_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_products_maker ON products(manufacturer_slug, status);
CREATE INDEX IF NOT EXISTS idx_products_public ON products(status, category);

-- Quantity prices: from min_qty units, each unit costs unit_price_tetri.
CREATE TABLE IF NOT EXISTS product_price_tiers (
  product_slug TEXT NOT NULL REFERENCES products(slug) ON DELETE CASCADE,
  min_qty INTEGER NOT NULL CHECK (min_qty >= 2),
  unit_price_tetri INTEGER NOT NULL CHECK (unit_price_tetri > 0),
  PRIMARY KEY (product_slug, min_qty)
);

CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_slug TEXT NOT NULL REFERENCES products(slug) ON DELETE CASCADE,
  file TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_product_images ON product_images(product_slug, position);

-- What was bought, as it was at the time: later product edits never change an order.
ALTER TABLE order_items ADD COLUMN manufacturer_slug TEXT;
ALTER TABLE order_items ADD COLUMN manufacturer_name TEXT;
ALTER TABLE order_items ADD COLUMN pricing TEXT NOT NULL DEFAULT 'retail' CHECK (pricing IN ('retail','wholesale'));
ALTER TABLE order_items ADD COLUMN snapshot TEXT NOT NULL DEFAULT '{}';

-- Messages about one manufacturer's part of an order, between that manufacturer and Amartani. Append-only.
CREATE TABLE IF NOT EXISTS order_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id),
  fulfillment_id TEXT NOT NULL REFERENCES fulfillments(id),
  author_id TEXT NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('manufacturer','admin')),
  kind TEXT NOT NULL DEFAULT 'comment' CHECK (kind IN ('comment','question','issue','delay')),
  body TEXT NOT NULL,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_messages ON order_messages(fulfillment_id);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_time ON notifications(user_id, created_at);
`;

function migrate(db: DatabaseSync) {
  const version = () => (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
  for (const m of MIGRATIONS) {
    if (m.version <= version()) continue;
    tx(db, () => {
      // Another process (for example a parallel build worker) may have run it while we waited for the lock.
      if (m.version <= version()) return;
      m.up(db);
      db.exec(`PRAGMA user_version = ${m.version}`);
    });
  }
}

/** Run several writes as one unit: all of them happen, or none. */
export function tx<T>(db: DB, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export function openDb(file: string): DB {
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  // Wait for other processes first, so switching to WAL or migrating never fails with "database is locked".
  db.exec("PRAGMA busy_timeout = 10000; PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  db.exec(SCHEMA);
  migrate(db);
  db.exec(TRIGGERS);
  return db;
}
