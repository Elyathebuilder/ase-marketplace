-- ASE / Amartani: orders, bank-transfer payments, manufacturer settlements, ledger, notifications.
--
-- Phase 2 target schema for Supabase (Postgres). The demo app runs the same tables in SQLite
-- (src/lib/market/db.ts); the workflow rules live in src/lib/market/service.ts and move into
-- server-side code / database functions that run with the service role.
--
-- Money is numeric(12,2) in lari (never floating point).
-- Append-only tables refuse UPDATE and DELETE, so history cannot be silently rewritten.
-- Row Level Security: customers read only their own orders; manufacturers read only their own
-- shipments and payouts; only admins read everything. Browsers never write financial rows
-- directly: all writes go through server code that checks the role again.

create type user_role as enum ('customer', 'manufacturer', 'admin');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  name text not null,
  manufacturer_slug text,
  check ((role = 'manufacturer') = (manufacturer_slug is not null))
);

create or replace function auth_role() returns user_role language sql stable security definer set search_path = public as
  $$ select role from profiles where id = auth.uid() $$;
create or replace function auth_maker() returns text language sql stable security definer set search_path = public as
  $$ select manufacturer_slug from profiles where id = auth.uid() and role = 'manufacturer' $$;
create or replace function is_admin() returns boolean language sql stable as $$ select coalesce(auth_role() = 'admin', false) $$;

create table settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);
insert into settings (key, value) values
  ('commissionBps', '500'), ('commissionBase', 'products'), ('paymentDeadlineHours', '72'),
  ('bankAccountHolder', 'Amartani LLC'), ('bankName', ''), ('bankIban', ''), ('bankSwift', '');

create table settings_history (
  id bigserial primary key,
  key text not null,
  old_value text,
  new_value text not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references profiles(id)
);

create table manufacturer_bank_accounts (
  manufacturer_slug text primary key,
  account_holder text not null,
  bank_name text not null,
  iban text not null
);

create table orders (
  id text primary key,
  number integer not null unique,
  customer_id uuid not null references profiles(id),
  status text not null,
  created_at timestamptz not null default now(),
  payment_deadline timestamptz,
  goods numeric(12,2) not null check (goods >= 0),
  delivery numeric(12,2) not null check (delivery >= 0),
  total numeric(12,2) not null check (total = goods + delivery),
  commission_bps integer not null check (commission_bps between 0 and 10000),
  commission_base text not null check (commission_base in ('products', 'products_and_delivery')),
  delivery_name text not null,
  delivery_phone text not null,
  delivery_city text not null,
  delivery_address text not null,
  delivery_note text,
  hold_kind text check (hold_kind in ('hold', 'dispute')),
  hold_reason text
);

create table fulfillments (
  id text primary key,
  order_id text not null references orders(id),
  manufacturer_slug text not null,
  status text not null,
  goods numeric(12,2) not null check (goods >= 0),
  delivery numeric(12,2) not null check (delivery >= 0),
  commission numeric(12,2) not null check (commission >= 0),
  payable numeric(12,2) not null check (payable >= 0 and payable = goods - commission),
  prepare_by timestamptz,
  reject_reason text,
  unique (order_id, manufacturer_slug)
);
create index on fulfillments (manufacturer_slug);

create table order_items (
  id bigserial primary key,
  order_id text not null references orders(id),
  fulfillment_id text not null references fulfillments(id),
  product_slug text not null,
  product_name text not null,
  unit text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  qty integer not null check (qty > 0),
  line_total numeric(12,2) not null check (line_total = unit_price * qty)
);

create table payments (
  id text primary key,
  order_id text not null references orders(id),
  method text not null default 'bank_transfer' check (method = 'bank_transfer'),
  status text not null,
  expected numeric(12,2) not null,
  reported numeric(12,2),
  reported_date date,
  reference text,
  receipt_path text,          -- Supabase Storage, private bucket "receipts"
  receipt_name text,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  submitted_by uuid references profiles(id),
  received numeric(12,2),     -- set only by an admin after checking the bank
  verified_at timestamptz,
  verified_by uuid references profiles(id)
);

create table payouts (
  id text primary key,
  fulfillment_id text not null unique references fulfillments(id),
  status text not null,
  payable numeric(12,2) not null check (payable >= 0),
  authorized_at timestamptz,
  authorized_by uuid references profiles(id),
  transfer_reference text,
  transfer_date date,
  confirmation_path text,     -- private bucket "transfer-confirmations"
  confirmation_name text,
  completed_at timestamptz,
  completed_by uuid references profiles(id),
  hold_reason text
);

create table refunds (
  id text primary key,
  order_id text not null references orders(id),
  fulfillment_id text references fulfillments(id),
  amount numeric(12,2) not null check (amount > 0),
  reason text not null,
  status text not null check (status in ('pending', 'completed')),
  reference text,
  transfer_date date,
  created_at timestamptz not null default now(),
  created_by uuid not null references profiles(id),
  completed_at timestamptz,
  completed_by uuid references profiles(id)
);

-- The ledger records obligations and admin-recorded bank transactions. It is not a bank balance.
create table ledger_entries (
  id bigserial primary key,
  order_id text not null references orders(id),
  fulfillment_id text references fulfillments(id),
  manufacturer_slug text,
  kind text not null check (kind in ('customer_payment', 'delivery_allocation', 'commission', 'manufacturer_payable',
                                     'manufacturer_payout', 'refund_due', 'refund_paid')),
  amount numeric(12,2) not null,           -- negative only for linked reversals
  bank_reference text,
  note text,
  adjusts_entry_id bigint references ledger_entries(id),
  created_at timestamptz not null default now(),
  created_by uuid not null references profiles(id),
  check (amount >= 0 or adjusts_entry_id is not null)
);
create index on ledger_entries (order_id);

create table status_history (
  id bigserial primary key,
  order_id text not null references orders(id),
  entity text not null check (entity in ('order', 'fulfillment', 'payment', 'payout', 'refund')),
  entity_id text not null,
  from_status text,
  to_status text not null,
  at timestamptz not null default now(),
  by_user uuid not null references profiles(id),
  note text
);
create index on status_history (order_id);

create table notes (
  id bigserial primary key,
  order_id text not null references orders(id),
  payment_id text references payments(id),
  body text not null,
  at timestamptz not null default now(),
  by_user uuid not null references profiles(id)
);

create table notifications (
  id bigserial primary key,
  user_id uuid not null references profiles(id),
  kind text not null,
  order_id text,
  fulfillment_id text,
  params jsonb not null default '{}',
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index on notifications (user_id, read_at);

-- Append-only: no updates, no deletes, for anyone (including the service role).
create or replace function refuse_change() returns trigger language plpgsql as
  $$ begin raise exception '% is append-only', tg_table_name; end $$;
create trigger ledger_append_only before update or delete on ledger_entries for each row execute function refuse_change();
create trigger history_append_only before update or delete on status_history for each row execute function refuse_change();
create trigger notes_append_only before update or delete on notes for each row execute function refuse_change();
create trigger settings_history_append_only before update or delete on settings_history for each row execute function refuse_change();

-- Row Level Security --------------------------------------------------------------------------
alter table profiles enable row level security;
alter table settings enable row level security;
alter table settings_history enable row level security;
alter table manufacturer_bank_accounts enable row level security;
alter table orders enable row level security;
alter table fulfillments enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table payouts enable row level security;
alter table refunds enable row level security;
alter table ledger_entries enable row level security;
alter table status_history enable row level security;
alter table notes enable row level security;
alter table notifications enable row level security;

-- No INSERT/UPDATE/DELETE policies are defined for browser users on financial tables: without a
-- policy, RLS refuses those writes. All writes go through server code using the service role,
-- which applies the workflow rules (only admins confirm payments and payouts).

create policy "own profile" on profiles for select using (id = auth.uid() or is_admin());

-- Bank details are shown to customers; everything else in settings only to admins.
create policy "public bank details" on settings for select using (key like 'bank%' or is_admin());
create policy "admins read settings history" on settings_history for select using (is_admin());

create policy "maker own bank account" on manufacturer_bank_accounts for select
  using (is_admin() or manufacturer_slug = auth_maker());

create policy "customer own orders" on orders for select using (customer_id = auth.uid() or is_admin());

create policy "fulfillments visible" on fulfillments for select using (
  is_admin()
  or manufacturer_slug = auth_maker()
  or exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid())
);

create policy "items visible" on order_items for select using (
  is_admin()
  or exists (select 1 from fulfillments f where f.id = fulfillment_id and f.manufacturer_slug = auth_maker())
  or exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid())
);

create policy "payments visible" on payments for select using (
  is_admin() or exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid())
);

create policy "payouts visible" on payouts for select using (
  is_admin() or exists (select 1 from fulfillments f where f.id = fulfillment_id and f.manufacturer_slug = auth_maker())
);

create policy "refunds visible" on refunds for select using (
  is_admin() or exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid())
);

-- Manufacturers see only ledger lines about their own shipment; customers see none (they get a summary from the server).
create policy "ledger visible" on ledger_entries for select using (
  is_admin() or (manufacturer_slug is not null and manufacturer_slug = auth_maker())
);

create policy "history visible" on status_history for select using (
  is_admin()
  or (entity in ('order', 'fulfillment', 'refund') and exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid()))
  or (entity in ('fulfillment', 'payout') and exists (
        select 1 from fulfillments f left join payouts p on p.fulfillment_id = f.id
        where f.manufacturer_slug = auth_maker() and (f.id = entity_id or p.id = entity_id)))
);

create policy "admins read notes" on notes for select using (is_admin());

create policy "own notifications" on notifications for select using (user_id = auth.uid());
create policy "mark own notifications read" on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Users may only change read_at on their own notifications.
revoke update on notifications from authenticated, anon;
grant update (read_at) on notifications to authenticated;
