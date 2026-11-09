-- Local check of the row-level security rules (plain Postgres 16, no Supabase needed).
-- psql -d test -f supabase/tests/auth_stub.sql -f supabase/migrations/0001_orders_payments.sql -f supabase/migrations/0002_accounts_sellers_badge.sql -f supabase/tests/rls_check.sql
\set ON_ERROR_STOP 0
grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;
grant insert, delete on addresses to authenticated; grant usage on all sequences in schema public to authenticated;
insert into auth.users values ('00000000-0000-0000-0000-00000000000a'),('00000000-0000-0000-0000-00000000000b'),('00000000-0000-0000-0000-00000000000c'),('00000000-0000-0000-0000-00000000000d');
insert into profiles (id, role, name, manufacturer_slug) values
 ('00000000-0000-0000-0000-00000000000a','admin','Admin',null),
 ('00000000-0000-0000-0000-00000000000b','manufacturer','Seller B','b-store'),
 ('00000000-0000-0000-0000-00000000000c','manufacturer','Seller C','c-store'),
 ('00000000-0000-0000-0000-00000000000d','customer','Cust',null);
insert into manufacturers (slug, owner_user_id, seller_type, name, account_status) values
 ('b-store','00000000-0000-0000-0000-00000000000b','company','B','draft'),
 ('c-store','00000000-0000-0000-0000-00000000000c','independent','C','approved_independent');
insert into seller_files values ('f1','b-store','registration_document','x','reg.pdf',null,'00000000-0000-0000-0000-00000000000b',now(),null),
 ('f2','c-store','logo','y','logo.png',null,'00000000-0000-0000-0000-00000000000c',now(),null);
insert into seller_messages (manufacturer_slug, track, author_id, author_role, visibility, body) values
 ('b-store','account','00000000-0000-0000-0000-00000000000a','admin','internal','secret note'),
 ('b-store','account','00000000-0000-0000-0000-00000000000a','admin','seller','please add docs');
\echo '--- T1 publish by unapproved seller must fail'
insert into products (slug, manufacturer_slug, category, name, status) values ('p1','b-store','x','P','published');
\echo '--- T2 badge without inspection must fail'
update manufacturers set badge_status='verified' where slug='c-store';
\echo '--- T3 append-only'
delete from seller_messages;
set role authenticated;
select set_config('request.jwt.sub','00000000-0000-0000-0000-00000000000b',false);
\echo '--- T4 seller B: sees own store + approved C (expect 2)'
select count(*) from manufacturers;
\echo '--- T5 seller B: cannot see own registration document (expect 0)'
select count(*) from seller_files where kind='registration_document';
\echo '--- T6 seller B: sees only seller-visible messages (expect 1)'
select count(*) from seller_messages;
\echo '--- T7 seller B: cannot approve itself (permission denied)'
update manufacturers set account_status='approved_company' where slug='b-store';
\echo '--- T8 seller B: may edit own draft application (UPDATE 1)'
update manufacturers set description='hello' where slug='b-store';
\echo '--- T9 seller B: cannot edit store C (UPDATE 0)'
update manufacturers set description='hack' where slug='c-store';
\echo '--- T10 seller B: cannot change own role'
update profiles set role='admin' where id=auth.uid();
select set_config('request.jwt.sub','00000000-0000-0000-0000-00000000000d',false);
\echo '--- T11 customer: sees only approved store C, its logo, no inspections (1,1,0)'
select (select count(*) from manufacturers), (select count(*) from seller_files), (select count(*) from inspections);
\echo '--- T12 customer: own address insert ok, other user fails'
insert into addresses (user_id, recipient, phone, city, address) values (auth.uid(),'r','1','c','a');
insert into addresses (user_id, recipient, phone, city, address) values ('00000000-0000-0000-0000-00000000000b','r','1','c','a');
select set_config('request.jwt.sub','00000000-0000-0000-0000-00000000000a',false);
\echo '--- T13 admin sees everything (2 stores, 2 files, 2 messages)'
select (select count(*) from manufacturers), (select count(*) from seller_files), (select count(*) from seller_messages);
reset role;
update profiles set status='suspended' where id='00000000-0000-0000-0000-00000000000a';
set role authenticated;
\echo '--- T14 suspended admin sees only public data (1 store, 0 messages)'
select (select count(*) from manufacturers), (select count(*) from seller_messages);
