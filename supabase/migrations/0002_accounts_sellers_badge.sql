-- ASE / Amartani: accounts, seller applications, the Verified Manufacturer badge, products, order messages.
--
-- Mirrors migrations 2 and 3 of the SQLite app (src/lib/market/db.ts) for the move to Supabase (Postgres).
-- Passwords, email confirmation and reset links are handled by Supabase Auth (auth.users), so the
-- app's own password_hash / auth_tokens / login_attempts tables are not needed here.
--
-- Security model (same as the app's services):
-- * Browsers never change statuses. Account approval, badge decisions, product moderation and payment
--   confirmation are written only by server code with the service role, which checks the admin role.
-- * A seller can read and edit only its own store while it is a draft or needs more information,
--   and can never write account_status, badge_status or needs_reassessment (column grants below).
-- * Registration and badge documents and inspection data are readable only by admins.
-- * History and message tables are append-only for everyone.

-- Accounts -------------------------------------------------------------------------------------
alter table profiles
  add column first_name text,
  add column last_name text,
  add column phone text,
  add column status text not null default 'active' check (status in ('active', 'suspended')),
  add column status_reason text,
  add column created_at timestamptz not null default now(),
  add column is_demo boolean not null default false;

-- An active, non-suspended account (suspension locks a user out of every policy at once).
create or replace function is_active() returns boolean language sql stable security definer set search_path = public as
  $$ select coalesce((select status = 'active' from profiles where id = auth.uid()), false) $$;
create or replace function auth_maker() returns text language sql stable security definer set search_path = public as
  $$ select manufacturer_slug from profiles where id = auth.uid() and role = 'manufacturer' and status = 'active' $$;
create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as
  $$ select coalesce((select role = 'admin' and status = 'active' from profiles where id = auth.uid()), false) $$;

create table addresses (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  label text,
  recipient text not null,
  phone text not null,
  city text not null,
  address text not null,
  note text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on addresses (user_id);

create table email_outbox (
  id bigserial primary key,
  user_id uuid references profiles(id),
  to_email text not null,
  kind text not null,
  subject text not null,
  body_text text not null,
  link text,
  created_at timestamptz not null default now(),
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'not_sent')),
  sent_at timestamptz,
  provider_id text,
  error text
);
create index on email_outbox (status);

create table admin_actions (
  id bigserial primary key,
  actor_id uuid not null references profiles(id),
  action text not null,
  target_type text not null,
  target_id text not null,
  reason text,
  at timestamptz not null default now()
);
create index on admin_actions (target_type, target_id);

-- Sellers --------------------------------------------------------------------------------------
create table manufacturers (
  slug text primary key,
  owner_user_id uuid references profiles(id),
  seller_type text not null check (seller_type in ('company', 'independent')),
  name text not null,
  name_ka text,
  legal_name text,
  registration_number text,
  year_established integer,
  city text not null default '',
  region text not null default '',
  address text not null default '',
  tagline text not null default '',
  tagline_ka text,
  description text not null default '',
  description_ka text,
  categories jsonb not null default '[]',
  capabilities jsonb not null default '[]',
  wholesale_note text not null default '',
  employees text not null default '',
  monogram text not null default '',
  contact_first_name text,
  contact_last_name text,
  contact_email text not null default '',
  contact_phone text not null default '',
  website text,
  social jsonb not null default '{}',
  extra_info text,
  logo_file text,
  account_status text not null default 'draft' check (account_status in
    ('draft', 'pending_review', 'under_review', 'info_required', 'approved_company', 'approved_independent', 'rejected', 'suspended')),
  badge_status text not null default 'not_requested' check (badge_status in
    ('not_requested', 'submitted', 'under_review', 'inspection_scheduled', 'inspection_completed', 'info_required', 'verified', 'rejected', 'revoked')),
  needs_reassessment boolean not null default false,
  featured boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  approved_at timestamptz,
  verified_at timestamptz,
  -- The badge can only exist on an approved seller.
  check (badge_status <> 'verified' or account_status in ('approved_company', 'approved_independent', 'suspended'))
);
create index on manufacturers (account_status);
create index on manufacturers (owner_user_id);

create or replace function is_approved_seller(slug text) returns boolean language sql stable security definer set search_path = public as
  $$ select exists (select 1 from manufacturers m where m.slug = $1 and m.account_status in ('approved_company', 'approved_independent')) $$;

create table seller_files (
  id text primary key,
  manufacturer_slug text not null references manufacturers(slug),
  kind text not null check (kind in ('registration_document', 'logo', 'workshop_photo', 'product_photo', 'supporting_document', 'badge_document', 'inspection_photo')),
  file text not null,          -- object path in a private storage bucket
  name text not null,
  related_id text,             -- badge request id for badge uploads
  uploaded_by uuid not null references profiles(id),
  uploaded_at timestamptz not null default now(),
  removed_at timestamptz
);
create index on seller_files (manufacturer_slug, kind);

create table seller_status_history (
  id bigserial primary key,
  manufacturer_slug text not null references manufacturers(slug),
  track text not null check (track in ('account', 'badge')),
  from_status text,
  to_status text not null,
  at timestamptz not null default now(),
  by_user uuid not null references profiles(id),
  reason text
);
create index on seller_status_history (manufacturer_slug, track);

create table seller_messages (
  id bigserial primary key,
  manufacturer_slug text not null references manufacturers(slug),
  track text not null check (track in ('account', 'badge')),
  author_id uuid not null references profiles(id),
  author_role user_role not null check (author_role in ('manufacturer', 'admin')),
  visibility text not null check (visibility in ('seller', 'internal')),
  kind text not null default 'message' check (kind in ('message', 'info_request', 'decision')),
  body text not null,
  at timestamptz not null default now(),
  check (visibility = 'seller' or author_role = 'admin')
);
create index on seller_messages (manufacturer_slug, track);

create table badge_requests (
  id text primary key,
  manufacturer_slug text not null references manufacturers(slug),
  status text not null check (status in ('submitted', 'under_review', 'inspection_scheduled', 'inspection_completed', 'info_required', 'verified', 'rejected', 'revoked', 'withdrawn')),
  reason text not null default 'seller_request' check (reason in ('seller_request', 'reassessment')),
  details jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid not null references profiles(id),
  submitted_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references profiles(id),
  decision_reason text
);
create index on badge_requests (manufacturer_slug);

create table inspections (
  id text primary key,
  request_id text not null unique references badge_requests(id),
  manufacturer_slug text not null references manufacturers(slug),
  scale text not null default 'workshop' check (scale in ('home', 'workshop', 'factory')),
  scheduled_for timestamptz,
  visited_at timestamptz,
  inspector_id uuid references profiles(id),
  checklist jsonb not null default '{}',
  summary text,
  recommendation text check (recommendation in ('approve', 'reject', 'more_info')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

-- The badge is never automatic: 'verified' needs a completed inspection on the latest request.
create or replace function badge_needs_inspection() returns trigger language plpgsql as $$
begin
  if new.badge_status = 'verified' and old.badge_status is distinct from 'verified' and not exists (
    select 1 from badge_requests r join inspections i on i.request_id = r.id
    where r.manufacturer_slug = new.slug and r.status in ('inspection_completed', 'verified') and i.completed_at is not null
  ) then
    raise exception 'the Verified badge needs a completed inspection';
  end if;
  return new;
end $$;
create trigger manufacturers_badge_guard before update on manufacturers for each row execute function badge_needs_inspection();

-- Products -------------------------------------------------------------------------------------
create table products (
  slug text primary key,
  manufacturer_slug text not null references manufacturers(slug),
  status text not null default 'draft' check (status in ('draft', 'pending_review', 'published', 'rejected', 'archived')),
  category text not null,
  name text not null,
  name_ka text,
  description text not null default '',
  description_ka text,
  highlights jsonb not null default '[]',
  highlights_ka jsonb,
  specs jsonb not null default '{}',
  materials jsonb not null default '[]',
  colors jsonb not null default '[]',
  variants jsonb not null default '[]',
  retail_price numeric(12,2) check (retail_price is null or retail_price > 0),
  unit text not null default 'piece',
  length_cm numeric(8,2) not null default 10 check (length_cm > 0),
  width_cm numeric(8,2) not null default 10 check (width_cm > 0),
  height_cm numeric(8,2) not null default 10 check (height_cm > 0),
  weight_kg numeric(8,3) not null default 1 check (weight_kg > 0),
  fragile boolean not null default false,
  special_handling boolean not null default false,
  stock integer not null default 0 check (stock >= 0),
  available boolean not null default true,
  moq integer not null default 1 check (moq >= 1),
  production_days integer not null default 0 check (production_days >= 0),
  customizable boolean not null default false,
  customization_options jsonb not null default '[]',
  buy_now boolean not null default true,
  request_quote boolean not null default false,
  wholesale_min_qty integer,
  wholesale_quote_only boolean not null default true,
  tags jsonb not null default '[]',
  featured boolean not null default false,
  popularity integer not null default 0,
  tone integer not null default 0,
  moderation_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index on products (manufacturer_slug, status);
create index on products (status, category);

-- A product can only be published by an approved seller.
create or replace function product_needs_approved_seller() returns trigger language plpgsql as $$
begin
  if new.status = 'published' and not is_approved_seller(new.manufacturer_slug) then
    raise exception 'only an approved seller can publish';
  end if;
  return new;
end $$;
create trigger products_publish_guard before insert or update on products for each row execute function product_needs_approved_seller();

create table product_price_tiers (
  product_slug text not null references products(slug) on delete cascade,
  min_qty integer not null check (min_qty >= 2),
  unit_price numeric(12,2) not null check (unit_price > 0),
  primary key (product_slug, min_qty)
);

create table product_images (
  id bigserial primary key,
  product_slug text not null references products(slug) on delete cascade,
  file text not null,
  position integer not null default 0
);
create index on product_images (product_slug, position);

-- Orders: what was bought, as it was at the time -----------------------------------------------
alter table order_items
  add column manufacturer_slug text,
  add column manufacturer_name text,
  add column pricing text not null default 'retail' check (pricing in ('retail', 'wholesale')),
  add column snapshot jsonb not null default '{}';

create table order_messages (
  id bigserial primary key,
  order_id text not null references orders(id),
  fulfillment_id text not null references fulfillments(id),
  author_id uuid not null references profiles(id),
  author_role user_role not null check (author_role in ('manufacturer', 'admin')),
  kind text not null default 'comment' check (kind in ('comment', 'question', 'issue', 'delay')),
  body text not null,
  at timestamptz not null default now()
);
create index on order_messages (fulfillment_id);
create index on orders (customer_id);

-- Append-only ----------------------------------------------------------------------------------
create trigger seller_history_append_only before update or delete on seller_status_history for each row execute function refuse_change();
create trigger seller_messages_append_only before update or delete on seller_messages for each row execute function refuse_change();
create trigger order_messages_append_only before update or delete on order_messages for each row execute function refuse_change();
create trigger admin_actions_append_only before update or delete on admin_actions for each row execute function refuse_change();

-- Row Level Security ---------------------------------------------------------------------------
alter table addresses enable row level security;
alter table email_outbox enable row level security;
alter table admin_actions enable row level security;
alter table manufacturers enable row level security;
alter table seller_files enable row level security;
alter table seller_status_history enable row level security;
alter table seller_messages enable row level security;
alter table badge_requests enable row level security;
alter table inspections enable row level security;
alter table products enable row level security;
alter table product_price_tiers enable row level security;
alter table product_images enable row level security;
alter table order_messages enable row level security;

-- Profiles: users may change only their own name and phone (never role, status or store link).
revoke update on profiles from authenticated, anon;
grant update (first_name, last_name, name, phone) on profiles to authenticated;
create policy "edit own profile" on profiles for update using (id = auth.uid() and is_active()) with check (id = auth.uid());

create policy "own addresses" on addresses for all
  using (user_id = auth.uid() and is_active()) with check (user_id = auth.uid() and is_active());

create policy "admins read outbox" on email_outbox for select using (is_admin());
create policy "admins read admin actions" on admin_actions for select using (is_admin());

-- Stores: the public sees approved stores; the owner sees its own; admins see all.
create policy "stores visible" on manufacturers for select using (
  account_status in ('approved_company', 'approved_independent') or slug = auth_maker() or is_admin()
);
-- The owner edits its application only while it is a draft or more information was asked for,
-- and only the application columns (statuses are never granted to browsers).
revoke update on manufacturers from authenticated, anon;
grant update (name, legal_name, registration_number, year_established, city, region, address, tagline, description,
  categories, contact_first_name, contact_last_name, contact_email, contact_phone, website, social, extra_info, updated_at)
  on manufacturers to authenticated;
create policy "owner edits own application" on manufacturers for update
  using (slug = auth_maker() and account_status in ('draft', 'info_required'))
  with check (slug = auth_maker() and account_status in ('draft', 'info_required'));

-- Files: logos, workshop and product photos of approved stores are public; registration, supporting
-- and badge documents and inspection photos are only for admins (the owner sees only the file list
-- through the server, never the registration document itself).
create policy "files visible" on seller_files for select using (
  is_admin()
  or (removed_at is null and kind in ('logo', 'workshop_photo', 'product_photo') and related_id is null and is_approved_seller(manufacturer_slug))
  or (manufacturer_slug = auth_maker() and kind in ('logo', 'workshop_photo', 'product_photo'))
);

create policy "history visible" on seller_status_history for select using (is_admin() or manufacturer_slug = auth_maker());
-- Internal admin notes are never shown to the seller.
create policy "messages visible" on seller_messages for select using (
  is_admin() or (manufacturer_slug = auth_maker() and visibility = 'seller')
);
create policy "badge requests visible" on badge_requests for select using (is_admin() or manufacturer_slug = auth_maker());
create policy "admins read inspections" on inspections for select using (is_admin());

create policy "products visible" on products for select using (
  (status = 'published' and is_approved_seller(manufacturer_slug)) or manufacturer_slug = auth_maker() or is_admin()
);
create policy "tiers visible" on product_price_tiers for select using (
  exists (select 1 from products p where p.slug = product_slug
          and ((p.status = 'published' and is_approved_seller(p.manufacturer_slug)) or p.manufacturer_slug = auth_maker() or is_admin()))
);
create policy "images visible" on product_images for select using (
  exists (select 1 from products p where p.slug = product_slug
          and ((p.status = 'published' and is_approved_seller(p.manufacturer_slug)) or p.manufacturer_slug = auth_maker() or is_admin()))
);

-- Order messages are between one manufacturer and Amartani; customers never see them.
create policy "order messages visible" on order_messages for select using (
  is_admin() or exists (select 1 from fulfillments f where f.id = fulfillment_id and f.manufacturer_slug = auth_maker())
);

-- No other INSERT/UPDATE/DELETE policies: everything else (application submit, status decisions,
-- badge inspection, product save and moderation, order steps, messages) goes through server code
-- with the service role, which repeats every permission check (src/lib/market/*.ts).
