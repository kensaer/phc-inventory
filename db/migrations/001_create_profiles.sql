-- Phase 1A: Profiles table
--
-- Creates app-specific user metadata (name, role) on top of Supabase's built-in
-- auth.users table. One profile row per real user.
--
-- HOW TO RUN:
--   1. Open the Supabase dashboard for project ijfcdmlsgbhhcmserikf
--   2. Go to SQL Editor → New query
--   3. Paste this entire file and click Run
--   4. After your first magic-link sign-in (see step 6 below), run the bootstrap
--      block at the bottom as a separate query.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  role text not null check (role in (
    'admin',
    'manager',
    'phc_team_lead',
    'phc_tech',
    'gtc_team_lead',
    'gtc_tech'
  )),
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Enable row-level security and allow any signed-in user to read profiles.
-- Stricter policies (who can INSERT / UPDATE / DELETE) come in Phase 1D.
alter table public.profiles enable row level security;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
  on public.profiles for select
  using (auth.role() = 'authenticated');


-- ─────────────────────────────────────────────────────────────────────────────
-- BOOTSTRAP — run AFTER you have signed in with the magic link at least once.
--
-- Your first magic-link sign-in creates a row in auth.users with your email.
-- This block looks up that row and inserts the matching admin profile.
-- Safe to re-run: the WHERE NOT EXISTS guard prevents duplicates.
-- ─────────────────────────────────────────────────────────────────────────────

-- insert into public.profiles (id, email, full_name, role)
-- select u.id, u.email, 'Ken Saer', 'admin'
-- from auth.users u
-- where u.email = 'ksaer@joshuatreeexperts.com'
--   and not exists (
--     select 1 from public.profiles p where p.id = u.id
--   );
