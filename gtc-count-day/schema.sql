-- GTC Count Day — Supabase schema + seed
-- Run in the Supabase SQL editor of the PHC Inventory Tracker project.
-- Item list exported from the claude.ai prototype on 2026-10-01 (130 items, 9 archived).

create table if not exists gtc_items (
  id          uuid primary key default gen_random_uuid(),
  legacy_id   text unique,                       -- id from the claude.ai prototype
  name        text not null,
  category    text not null check (category in ('saws','chain','fuel','rigging','cabling','hand','safety','truck')),
  item_type   text not null check (item_type in ('supply','equip')),
  min_qty     integer not null default 0 check (min_qty >= 0),
  last_count  integer check (last_count >= 0),   -- null = never counted
  vendor      text,
  on_order    boolean not null default false,
  phc         boolean not null default false,    -- item also used by PHC
  archived    boolean not null default false,    -- "no longer stocked": hidden from checklist, kept for history
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One row per item for the CURRENT count day. Cleared when a new count day starts.
create table if not exists gtc_counts (
  item_id     uuid primary key references gtc_items(id) on delete cascade,
  count       integer not null check (count >= 0),
  condition   text check (condition in ('Good','Needs repair','Out of service','Missing')), -- equipment only
  note        text,
  counted_by  uuid,                              -- auth user id (TODO: match the app's users table)
  counted_at  timestamptz not null default now()
);

-- One row per count day. The open one has completed_at null.
create table if not exists gtc_count_days (
  id            uuid primary key default gen_random_uuid(),
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  counted_by    text                              -- free-text names, e.g. "Jamal + Kevin"
);

-- Snapshot of every count when a count day is closed, so history survives the reset.
create table if not exists gtc_count_history (
  id            bigint generated always as identity primary key,
  count_day_id  uuid not null references gtc_count_days(id) on delete cascade,
  item_id       uuid not null references gtc_items(id) on delete cascade,
  item_name     text not null,                    -- name at the time of the count
  count         integer,
  min_qty       integer,
  condition     text,
  note          text
);

-- Live updates for the checklist and results screens
alter publication supabase_realtime add table gtc_items, gtc_counts, gtc_count_days;

-- Row level security: TODO in the app — tie to the existing roles.
--   read:                     any signed-in GTC Tech, GTC Team Lead, Manager, Admin
--   write gtc_counts:         GTC Tech and up
--   write gtc_items / reset:  GTC Team Lead, Manager, Admin
alter table gtc_items enable row level security;
alter table gtc_counts enable row level security;
alter table gtc_count_days enable row level security;
alter table gtc_count_history enable row level security;

-- Seed
insert into gtc_items (legacy_id, name, category, item_type, min_qty, last_count, vendor, on_order, phc, archived) values
  ('i100', 'Cobra 2/4T End Caps', 'cabling', 'supply', 2, 0, 'RBI / Shelter Tree', false, false, false),
  ('i098', 'Cobra 2/4T Insert', 'cabling', 'supply', 4, 10, 'RBI / Shelter Tree', false, false, false),
  ('i099', 'Cobra 2/4T Shock Absorber', 'cabling', 'supply', 4, 12, 'RBI / Shelter Tree', false, false, false),
  ('i096', 'Cobra 2T Cable', 'cabling', 'supply', 1, 1, 'RBI / Shelter Tree', true, false, false),
  ('i101', 'Cobra 2T Sleeves', 'cabling', 'supply', 2, 1, 'RBI / Shelter Tree', false, false, false),
  ('i097', 'Cobra 4T Cable', 'cabling', 'supply', 1, 1, 'RBI / Shelter Tree', true, false, false),
  ('i103', 'Cobra Mini Absorber', 'cabling', 'supply', 2, 8, null, false, false, false),
  ('i104', 'Cobra Mini Braces', 'cabling', 'supply', 2, 4, null, false, false, false),
  ('i102', 'Cobra Mini Cable', 'cabling', 'supply', 1, 1, null, false, false, false),
  ('i105', 'Cobra Mini Sleeves', 'cabling', 'supply', 1, 1, null, false, false, false),
  ('i106', 'Cobra Splicing Torch', 'cabling', 'equip', 0, 3, 'RBI / Shelter Tree', false, false, false),
  ('i035', '13/64" File', 'chain', 'supply', 2, 4, 'Amazon', false, false, false),
  ('i031', '3/16" File', 'chain', 'supply', 16, 12, 'RBI / Shelter Tree', false, false, false),
  ('i032', '5/32" File', 'chain', 'supply', 9, 4, 'RBI / Shelter Tree', false, false, false),
  ('i033', '5/32" File', 'chain', 'supply', 2, 2, 'RBI / Shelter Tree', false, false, false),
  ('i034', '7/32" File', 'chain', 'supply', 4, 11, 'RBI / Shelter Tree', false, false, false),
  ('xiupbvhw5zs592s2qoaq', 'BAR: Stihl 20" (500i OR 362)', 'chain', 'supply', 0, 2, 'Big Toolbox', false, false, false),
  ('yywp4bm5la5hy78mgbb4', 'BAR: Stihl 25" (500i OR 362)', 'chain', 'supply', 0, 2, 'Big Toolbox', false, false, false),
  ('vmldmrufkhanpjpnnf6o', 'BAR: Stihl 28" (500i)', 'chain', 'supply', 0, 2, 'Big Toolbox', false, false, false),
  ('i016', 'CHAIN: Stihl 14" Pitch: 3/8, Gauge: 0.043", Drive Links: 50 (MSA 190T)', 'chain', 'supply', 4, 2, 'RBI / Shelter Tree', false, false, false),
  ('65sb3zmpcino9mwisejw', 'CHAIN: Stihl 16" (MSA 220TC) - Pitch: 3/8", Gauge: 0.050" or 0.043", Drive Links: 55', 'chain', 'supply', 2, null, 'Big Toolbox', false, false, false),
  ('i014', 'CHAIN: Stihl 20" (MS 362) - Pitch: 3/8", Gauge: 0.050, Drive Links: 72', 'chain', 'supply', 3, 2, 'Big Toolbox', false, false, false),
  ('g8f4ycn8dkof37jc4lro', 'CHAIN: Stihl 24" (500i OR 362) - Pitch: 3/8", Gauge: 0.050", Drive Links: 84', 'chain', 'supply', 0, 1, 'Big Toolbox', false, false, false),
  ('i015', 'CHAIN: Stihl 25" (500i) - Pitch: 3/8", Gauge: 0.050", Drive Links: 84', 'chain', 'supply', 2, 1, 'Big Toolbox', false, false, false),
  ('ghkcjqelu1yuvm3eawai', 'CHAIN: Stihl 28" (500i) - Pitch: 3/8", Gauge: 0.050", Drive Links: 91', 'chain', 'supply', 2, 2, 'Big Toolbox', false, false, false),
  ('i036', 'Depth Gauge & Flat File', 'chain', 'supply', 1, 2, 'RBI / Shelter Tree', false, false, false),
  ('i037', 'Flat File', 'chain', 'supply', 1, 3, 'RBI / Shelter Tree', false, false, false),
  ('i117', '2.5 Gal Gas Can', 'fuel', 'equip', 0, 1, 'Big Toolbox', false, false, false),
  ('i007', '50:1 Mix, 110oz', 'fuel', 'supply', 6, 6, null, false, false, false),
  ('i006', 'Bar & Chain Oil, 1 gal', 'fuel', 'supply', 2, 4, 'Home Depot', false, false, false),
  ('i107', 'Butane (torch fuel)', 'fuel', 'supply', 1, 1, 'Home Depot', false, false, false),
  ('pah4o4ke36035vhw9dyk', 'Diesel Can, 2.5 gal', 'fuel', 'supply', 0, 3, null, false, false, false),
  ('i028', 'Moly Grease, 14 oz', 'fuel', 'supply', 4, 6, 'Home Depot', true, false, false),
  ('i002', 'Scepter 5 Gal Gas Can', 'fuel', 'equip', 0, 2, 'Home Depot', false, false, false),
  ('i013', 'Valvoline MaxLife ATF', 'fuel', 'supply', 2, 1, 'O''Reilly''s', false, false, false),
  ('i089', 'Collins 5 lb Axe', 'hand', 'equip', 0, 1, 'Big Toolbox', false, false, false),
  ('i073', 'Felling Wedges, assorted sizes', 'hand', 'equip', 0, 2, 'RBI / Shelter Tree', false, false, false),
  ('i088', 'Fiskars Loppers', 'hand', 'equip', 2, 1, 'Big Toolbox', false, false, false),
  ('i025', 'Husky 12" Adjustable Wrench', 'hand', 'equip', 0, 1, 'Home Depot', false, false, false),
  ('i018', 'Husky 24-pc 3/8" Socket Set', 'hand', 'equip', 0, 1, 'Home Depot', false, false, false),
  ('i090', 'Husky 3.5 lb Pick Mattock', 'hand', 'equip', 0, 1, 'Big Toolbox', false, false, false),
  ('i021', 'Husky 5-pc Socket Set', 'hand', 'equip', 0, 1, 'Home Depot', false, false, false),
  ('i093', 'Husky Soft Rake', 'hand', 'equip', 0, 4, 'Home Depot', false, false, false),
  ('i086', 'Jameson 6'' Pole Section', 'hand', 'equip', 0, 6, 'RBI / Shelter Tree', false, false, false),
  ('i004', 'Jameson Barracuda 13" Pole Saw Blade', 'hand', 'supply', 4, 3, 'RBI / Shelter Tree', false, false, false),
  ('i085', 'Jameson Pole Pruner Head', 'hand', 'equip', 0, 3, 'RBI / Shelter Tree', true, false, false),
  ('i058', 'Log-Rite Log Roller', 'hand', 'equip', 0, 1, 'RBI / Shelter Tree', false, false, false),
  ('i024', 'Milwaukee 15-pc Drill Bit Set', 'hand', 'equip', 0, 1, 'Home Depot', false, false, false),
  ('i091', 'Pitchfork', 'hand', 'equip', 0, 1, 'RBI / Shelter Tree', false, false, false),
  ('i094', 'Push Broom', 'hand', 'equip', 0, 1, 'Home Depot', true, false, false),
  ('i092', 'Rehab Hard Rakes', 'hand', 'equip', 0, 2, 'RBI / Shelter Tree', false, false, false),
  ('i003', 'Silky Zubat 13" Replacement Blade', 'hand', 'supply', 6, 4, 'RBI / Shelter Tree', false, false, false),
  ('i087', 'Silky Zubat Handsaw', 'hand', 'equip', 3, 2, 'RBI / Shelter Tree', false, false, false),
  ('i095', 'Wheelbarrow', 'hand', 'equip', 0, 1, 'Big Toolbox', false, false, false),
  ('i051', 'Climbing Saddle', 'rigging', 'equip', 0, 2, null, false, false, false),
  ('i057', 'Come-Along, 4-Ton Cable Puller', 'rigging', 'equip', 0, 1, 'Big Toolbox', false, false, false),
  ('i044', 'ISC 1000 lb Block', 'rigging', 'equip', 0, 1, 'RBI / Shelter Tree', false, false, false),
  ('i042', 'ISC Anchor Block RP051', 'rigging', 'equip', 0, 2, 'RBI / Shelter Tree', false, false, false),
  ('i043', 'ISC Anchor Block RP051', 'rigging', 'equip', 0, 2, 'RBI / Shelter Tree', false, false, false),
  ('i052', 'Notch Ergo Spikes', 'rigging', 'equip', 0, 2, 'RBI / Shelter Tree', false, false, false),
  ('i053', 'Notch Porta-Wrap', 'rigging', 'equip', 0, 1, 'RBI / Shelter Tree', false, false, false),
  ('i054', 'Notch Rope Bag', 'rigging', 'equip', 0, 2, 'RBI / Shelter Tree', false, false, false),
  ('i050', 'Orange Climbing Rope', 'rigging', 'equip', 0, 2, 'RBI / Shelter Tree', false, false, false),
  ('i055', 'Rigging Strap, Large Orange', 'rigging', 'equip', 0, 4, 'RBI / Shelter Tree', false, false, false),
  ('i056', 'Rigging Strap, Medium Blue', 'rigging', 'equip', 0, 3, 'RBI / Shelter Tree', false, false, false),
  ('i045', 'Samson 1/2" Blue Rigging Line, 200''', 'rigging', 'equip', 0, 2, 'RBI / Shelter Tree', false, false, false),
  ('i046', 'Samson Orange Rigging Line', 'rigging', 'equip', 0, 1, 'RBI / Shelter Tree', false, false, false),
  ('i047', 'Sterling 10 mm Prusik Cord', 'rigging', 'supply', 10, 6, 'RBI / Shelter Tree', false, false, false),
  ('i049', 'Throw Line', 'rigging', 'equip', 0, 2, null, false, false, false),
  ('i048', 'Weaver Throwline Bag', 'rigging', 'equip', 0, 2, 'RBI / Shelter Tree', false, false, false),
  ('i041', 'Whoopie Sling 3/4" Orange, 14'' adj.', 'rigging', 'equip', 0, 2, 'RBI / Shelter Tree', false, false, false),
  ('i040', 'Whoopie Sling 5/8" Red', 'rigging', 'equip', 0, 2, 'RBI / Shelter Tree', false, false, false),
  ('i066', 'Chainsaw Chaps', 'safety', 'equip', 0, 4, 'RBI / Shelter Tree', false, false, false),
  ('i071', 'Fire Extinguisher', 'safety', 'equip', 0, 3, 'RBI / Shelter Tree', false, false, false),
  ('i070', 'Loggers First Aid Kit', 'safety', 'equip', 0, 2, 'RBI / Shelter Tree', false, false, false),
  ('i067', 'Milwaukee Hard Hat w/ Sena', 'safety', 'equip', 0, 3, 'RBI / Shelter Tree', false, false, false),
  ('i068', 'Milwaukee Mesh Face Guard', 'safety', 'equip', 0, 1, 'RBI / Shelter Tree', false, false, false),
  ('i060', 'Nitrile Dipped Gloves', 'safety', 'supply', 6, 3, 'RBI / Shelter Tree', false, false, false),
  ('i063', 'PortWest Ear Plugs, 200 pr', 'safety', 'supply', 1, null, 'RBI / Shelter Tree', false, false, false),
  ('i064', 'Safety Glasses, Clear', 'safety', 'supply', 19, 0, 'RBI / Shelter Tree', false, false, false),
  ('i065', 'Safety Glasses, Tinted', 'safety', 'supply', 15, 5, 'RBI / Shelter Tree', false, false, false),
  ('i069', 'Tree Work Street Sign', 'safety', 'equip', 0, 2, 'RBI / Shelter Tree', false, false, false),
  ('i019', 'Milwaukee 1/2" Drill Driver', 'saws', 'equip', 0, 1, 'Home Depot', false, false, false),
  ('i020', 'Milwaukee 1/4" Impact Driver', 'saws', 'equip', 0, 1, 'Home Depot', false, false, false),
  ('i080', 'Milwaukee M18 FUEL Chainsaw', 'saws', 'equip', 0, 2, 'RBI / Shelter Tree', false, false, false),
  ('i023', 'Stihl 4 count battery charger', 'saws', 'equip', 2, 2, 'Big Toolbox', false, false, false),
  ('i022', 'Stihl AP300 Batteries', 'saws', 'equip', 0, 4, 'Big Toolbox', false, false, false),
  ('i010', 'Stihl BG 86 C Blower', 'saws', 'equip', 0, 2, 'Big Toolbox', false, false, false),
  ('x285vu2jdiwfh2jpcv8m', 'Stihl BGA 250 Blower', 'saws', 'equip', 0, 2, 'Big Toolbox', false, false, false),
  ('i082', 'Stihl BR 600 Backpack Blower', 'saws', 'equip', 0, 1, 'Big Toolbox', false, false, false),
  ('i084', 'Stihl FS 561 C Brushcutter', 'saws', 'equip', 0, 2, 'Big Toolbox', false, false, false),
  ('hefjszc603nzp300w63y', 'Stihl HLA 66 Hedgetrimmer', 'saws', 'equip', 0, 1, 'Big Toolbox', false, false, false),
  ('i083', 'Stihl HS 56 Hedge Trimmer', 'saws', 'equip', 0, 1, 'Big Toolbox', false, false, false),
  ('ozhpjchqxb2bfbxl3lz0', 'Stihl HTA 135 Power Pole', 'saws', 'equip', 0, 1, 'Big Toolbox', false, false, false),
  ('0iuro6dwl5u9koa9lfrr', 'Stihl HTA 86 Power Pole', 'saws', 'equip', 0, 1, 'Big Toolbox', false, false, false),
  ('i077', 'Stihl MS 194 T Chainsaw', 'saws', 'equip', 0, 1, 'Big Toolbox', false, false, false),
  ('i078', 'Stihl MS 201 T Chainsaw', 'saws', 'equip', 0, 1, 'RBI / Shelter Tree', false, false, false),
  ('i079', 'Stihl MS 362 Chainsaw', 'saws', 'equip', 0, 2, 'Big Toolbox', false, false, false),
  ('i009', 'Stihl MS 500i Chainsaw', 'saws', 'equip', 0, 2, 'Big Toolbox', false, false, false),
  ('sq9v1tfuictnioisis1x', 'Stihl MSA 190T Chainsaw', 'saws', 'equip', 0, 1, 'Big Toolbox', false, false, false),
  ('dfg17gli3ya43jgrqwmc', 'Stihl MSA 220 TC Chainsaw', 'saws', 'equip', 0, 2, 'Big Toolbox', false, false, false),
  ('i116', '50 Gal Trash Can', 'truck', 'equip', 0, 1, null, false, false, false),
  ('i108', 'Anvil Toolbox', 'truck', 'equip', 0, 1, 'Home Depot', false, false, false),
  ('i109', 'Bungee Cords', 'truck', 'supply', 1, 1, 'Home Depot', false, false, false),
  ('i038', 'HDX Painter''s Towels', 'truck', 'supply', 2, 1, 'Home Depot', false, false, false),
  ('i027', 'Husky 1/2" Torque Wrench (chipper)', 'truck', 'equip', 0, 1, 'Home Depot', false, false, false),
  ('i026', 'Husky 15/16" Socket (chipper)', 'truck', 'equip', 0, 1, 'Home Depot', false, false, false),
  ('i039', 'Husky Contractor Bags', 'truck', 'supply', 1, 1, 'Home Depot', false, false, false),
  ('i113', 'Ice Scraper', 'truck', 'equip', 0, 3, 'Amazon', false, false, false),
  ('i115', 'Igloo Water Cooler', 'truck', 'equip', 0, 1, 'Home Depot', false, false, false),
  ('i005', 'NGK Spark Plugs', 'truck', 'supply', 2, 4, 'RBI / Shelter Tree', false, false, false),
  ('i011', 'Rain Bird Drip Repair Kit', 'truck', 'equip', 0, 1, 'Home Depot', false, true, false),
  ('i001', 'Rubbermaid Brute 32 Gal Can', 'truck', 'equip', 0, 2, 'Home Depot', false, false, false),
  ('i012', 'Silverstar H13 Headlight Bulbs', 'truck', 'supply', 0, 1, 'O''Reilly''s', false, false, false),
  ('i114', 'Spray Bottle', 'truck', 'equip', 0, 1, 'SiteOne', false, false, false),
  ('i059', 'Spray Gun, Orange Tip', 'truck', 'equip', 0, 1, 'Gregson & Clark', false, true, false),
  ('i110', 'Tarp, Large', 'truck', 'equip', 0, 2, 'RBI / Shelter Tree', true, false, false),
  ('i111', 'Tarp, Small', 'truck', 'equip', 0, 1, 'RBI / Shelter Tree', false, false, false),
  ('i112', 'Tire Repair Kit', 'truck', 'equip', 0, 1, 'Home Depot', false, false, false),
  ('i072', 'Wheel Chocks', 'truck', 'equip', 7, 4, 'Home Depot', false, false, false),
  ('i029', 'Zinga AE10 Hydraulic Filter (chipper)', 'truck', 'supply', 1, 2, 'Home Depot', false, false, false),
  ('i017', 'Milwaukee 14" Chain', 'chain', 'supply', 6, 2, null, false, false, true),
  ('i008', 'Stihl MotoMix 50:1, 12.5 gal', 'fuel', 'supply', 1, 1, 'RBI / Shelter Tree', false, false, true),
  ('i074', 'Medford Wedge, Large', 'hand', 'equip', 0, 2, 'RBI / Shelter Tree', false, false, true),
  ('i075', 'Medford Wedge, Medium', 'hand', 'equip', 0, 1, 'RBI / Shelter Tree', false, false, true),
  ('i076', 'Medford Wedge, Small', 'hand', 'equip', 0, 1, 'RBI / Shelter Tree', false, false, true),
  ('i061', 'DeltaPlus Nitrile Gloves, Size 8', 'safety', 'supply', 6, 0, 'RBI / Shelter Tree', false, false, true),
  ('i062', 'Firm Grip A1 Nitrile Gloves', 'safety', 'supply', 6, 14, 'RBI / Shelter Tree', true, false, true),
  ('i030', 'Safety Triangles', 'safety', 'equip', 0, 6, 'RBI / Shelter Tree', false, false, true),
  ('i081', 'Milwaukee M18 FUEL Pole Saw', 'saws', 'equip', 0, 1, 'RBI / Shelter Tree', false, false, true)
on conflict (legacy_id) do nothing;

insert into gtc_count_days (counted_by) select null where not exists (select 1 from gtc_count_days where completed_at is null);
