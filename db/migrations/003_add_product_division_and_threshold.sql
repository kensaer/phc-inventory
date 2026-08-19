-- Migration 003: Add division, reorder threshold, and barcode to products
--
-- - division: which service line the product belongs to
--     'phc'   = Plant Health Care only
--     'lawn'  = Lawn Care only
--     'both'  = used across both PHC and Lawn (soil amendments, some ferts)
--   Existing rows default to 'phc' — reclassify Lawn / Both products
--   individually from the Add/Edit Product form once this is live.
--
-- - reorder_threshold: nullable numeric. When set, overrides the app's
--   default "low stock" cutoff (0.5 containers) with a per-product value.
--
-- - barcode: nullable text. Placeholder for future barcode-scan restock;
--   no scanning UI yet, but adding the column now so we don't need
--   another migration later.
--
-- HOW TO RUN:
--   Paste this entire file into Supabase SQL Editor → New query → Run.

alter table public.products
  add column if not exists division text not null default 'phc'
    check (division in ('phc', 'lawn', 'both'));

alter table public.products
  add column if not exists reorder_threshold numeric;

alter table public.products
  add column if not exists barcode text;
