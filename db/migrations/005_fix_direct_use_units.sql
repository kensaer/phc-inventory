-- Migration 005: Put mL injectables back on mL and fix their inflated usage costs
--
-- The bug: editing a "Direct use" product in Inventory silently switched the
-- unit techs log in from mL to the container unit (liter / pint / qt) and set
-- conversion_rate to 1. Techs kept typing mL amounts, so "165" was costed
-- as 165 liters — roughly 1,000x too high. The app fix stops this from
-- happening again; this script repairs the data already saved.
--
-- Products covered (matched by name): PhosphoJet, MnJet, ArborJet Tree-Age,
-- Propiconazole / Propizol.
--
-- Usage rows are only corrected when the logged amount is 2 or more —
-- no one uses 2+ whole liters/pints/quarts of an injectable in one log, so
-- those were clearly meant as mL. Rows under 2 are left alone and listed by
-- PART C so they can be checked by hand.
--
-- HOW TO RUN (Supabase SQL Editor → New query):
--   1. Paste PART A only → Run. Look over the list (read-only, changes nothing).
--   2. Paste PART B only → Run. This backs up, then fixes.
--   3. Paste PART C only → Run. Shows anything left to check by hand.


-- ═══ PART A: preview (read-only) ════════════════════════════════════════════

with inj as (
  select id from public.products
  where name ilike '%phosphojet%' or name ilike '%mnjet%'
     or name ilike '%tree-age%'   or name ilike '%propiconazole%' or name ilike '%propizol%'
)
select p.id, p.name, p.container_size, p.container_unit, p.mix_unit,
       p.conversion_rate, p.cost_per_container
from public.products p where p.id in (select id from inj)
order by p.name;

with inj as (
  select id from public.products
  where name ilike '%phosphojet%' or name ilike '%mnjet%'
     or name ilike '%tree-age%'   or name ilike '%propiconazole%' or name ilike '%propizol%'
)
select t.id, t.date, t.tech_name, t.product_name, t.product_used,
       t.product_unit, t.product_cost
from public.transactions t
where t.type = 'usage' and t.subtype = 'product'
  and t.product_id in (select id from inj)
  and t.product_unit is distinct from 'mL'
order by t.date;


-- ═══ PART B: back up, then fix ══════════════════════════════════════════════

begin;

create table if not exists public.products_backup_2026_10_28
  as table public.products;
create table if not exists public.transactions_backup_2026_10_28
  as table public.transactions;

-- 1) Products: log in mL again, with the right mL-per-container conversion
update public.products
set mix_unit = 'mL',
    conversion_rate = case container_unit
      when 'liter' then 1000
      when 'pint'  then 473.176
      when 'qt'    then 946.353
      when 'gal'   then 3785.41
      when 'mL'    then 1
    end
where (name ilike '%phosphojet%' or name ilike '%mnjet%'
    or name ilike '%tree-age%'   or name ilike '%propiconazole%' or name ilike '%propizol%')
  and mix_rate is null
  and container_unit in ('liter','pint','qt','gal','mL')
  and mix_unit is distinct from 'mL';

-- 2) Usage logs: relabel as mL and recompute cost from the product's
--    cost per mL (cost per container ÷ mL per container)
update public.transactions t
set product_unit = 'mL',
    input_unit   = 'mL',
    product_cost = round(
      (t.product_used * p.cost_per_container
        / (p.container_size * p.conversion_rate))::numeric, 2)
from public.products p
where t.product_id = p.id
  and t.type = 'usage' and t.subtype = 'product'
  and (p.name ilike '%phosphojet%' or p.name ilike '%mnjet%'
    or p.name ilike '%tree-age%'   or p.name ilike '%propiconazole%' or p.name ilike '%propizol%' or name ilike '%propizol%')
  and p.mix_unit = 'mL'
  and p.cost_per_container is not null
  and p.container_size > 0 and p.conversion_rate > 0
  and t.product_unit is distinct from 'mL'
  and t.product_used >= 2;

commit;


-- ═══ PART C: anything left to check by hand ═════════════════════════════════

select t.id, t.date, t.tech_name, t.product_name, t.product_used,
       t.product_unit, t.product_cost
from public.transactions t
join public.products p on p.id = t.product_id
where t.type = 'usage' and t.subtype = 'product'
  and (p.name ilike '%phosphojet%' or p.name ilike '%mnjet%'
    or p.name ilike '%tree-age%'   or p.name ilike '%propiconazole%' or p.name ilike '%propizol%' or name ilike '%propizol%')
  and t.product_unit is distinct from 'mL'
order by t.date;
