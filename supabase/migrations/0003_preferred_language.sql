-- Preferred language of each account: the site opens in it after sign-in, and notifications and
-- emails are written in it. NULL means not chosen yet, which is Georgian (the default language).
alter table profiles
  add column preferred_lang text check (preferred_lang is null or preferred_lang in ('ka', 'en', 'ru', 'tr', 'hy'));

-- People may change their own language (the existing "edit own profile" policy limits it to their row).
grant update (preferred_lang) on profiles to authenticated;
