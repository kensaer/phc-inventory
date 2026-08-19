-- Migration 002: Add created_at timestamp to transactions
--
-- Adds a proper server-side timestamp column so the app can show the time
-- each usage entry was logged (in addition to the date).
--
-- Existing rows are backfilled from the id field. All app-generated ids
-- are Date.now() + optional Math.random() fractional, so the integer part
-- of the id is the original creation time in Unix milliseconds.
--
-- HOW TO RUN:
--   Paste this entire file into Supabase SQL Editor → New query → Run.

-- Step 1: add the column without a default so existing rows start NULL
alter table public.transactions
  add column if not exists created_at timestamptz;

-- Step 2: backfill any NULL created_at values from the id
update public.transactions
set created_at = to_timestamp(floor(id::float / 1000)::bigint)
where created_at is null;

-- Step 3: set the default for future inserts and enforce not-null
alter table public.transactions
  alter column created_at set default now();
alter table public.transactions
  alter column created_at set not null;
