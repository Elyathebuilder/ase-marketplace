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

const APPEND_ONLY = ["ledger_entries", "status_history", "notes", "settings_history"];
const TRIGGERS = APPEND_ONLY.flatMap((t) => [
  `CREATE TRIGGER IF NOT EXISTS ${t}_no_update BEFORE UPDATE ON ${t} BEGIN SELECT RAISE(ABORT, '${t} is append-only'); END;`,
  `CREATE TRIGGER IF NOT EXISTS ${t}_no_delete BEFORE DELETE ON ${t} BEGIN SELECT RAISE(ABORT, '${t} is append-only'); END;`,
]).join("\n");

export type DB = DatabaseSync;

export function openDb(file: string): DB {
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  db.exec(SCHEMA);
  db.exec(TRIGGERS);
  return db;
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
