# GTC Count Day — handoff for the PHC Inventory Tracker

**For Claude Code:** add this as a new GTC section in the PHC Inventory Tracker (React + Supabase + Vercel). This folder holds the decisions, a working prototype, and the real item data. Read this file first, then `prototype.html`, then look at how the existing app handles routing, Supabase access, and roles before writing code. Match the app's existing patterns over anything in the prototype.

## Files in this folder
| File | What it is |
|---|---|
| `HANDOFF.md` | This spec. |
| `prototype.html` | Working single-file prototype (vanilla JS). The screens, copy, and behavior are approved. Its data layer (`claude.use("db")`, `db.collection(...)`, `onSnapshot`) is claude.ai-specific; replace it with Supabase. |
| `schema.sql` | Supabase tables, realtime, RLS stubs, and a seed of all 130 items. |
| `items.json` | The same item list as JSON. |

## What it's for
JTE's tree care (GTC) division does a periodic **inventory day**: someone takes half a day and goes through everything to see what's in stock, what's low, and what's out. This replaces the Google Sheet "Equipment Inventory". It is **not** a check-in/check-out system and does **not** track locations (deliberately left out for now: the shop isn't organized enough for locations to be reliable).

Today one person does the count, on a phone, often with gloves on. Later, several people may count at once, so build for shared live data.

## Decisions already made
- **Two item types.**
  - **Supply** (chain, files, fuel, gloves, cabling parts): a count compared against a minimum. Below the minimum = Low, 0 = Out.
  - **Equipment** (saws, rigging, ropes, hand tools, PPE): a count plus one condition: Good / Needs repair / Out of service / Missing.
- **8 categories** (DB key → label): `saws` Saws & Power, `chain` Chain & Sharpening, `fuel` Fuel & Oil, `rigging` Rigging & Climbing, `cabling` Cabling & Bracing, `hand` Hand Tools, `safety` Safety & PPE, `truck` Truck & Shop.
- **No locations, no subcategories, no check-in/check-out.**
- **Removing an item = archive** (hidden from the checklist, kept for history, can be restored). Never hard-delete.
- **Vendors** (pick list): RBI / Shelter Tree, Home Depot, Big Toolbox, O'Reilly's, Amazon, Gregson & Clark, SiteOne.

## Screens (bottom tab bar, phone-first)
1. **Count**
   - Sticky header with progress (checked / total) and a search box.
   - Category chips that show per-category progress (e.g. `Chain & Sharpening 6/14`).
   - Filter: Still to check / Checked / All. The default is Still to check, so checked items drop away.
   - Each item opens prefilled with its last count, with − / + steppers and a typed number.
   - Supply: tap **Count ✓** to check it off. The minimum is editable inline.
   - Equipment: one condition tap checks it off. A non-Good condition opens a note field.
2. **Results**
   - Tiles for Out / Low / Gear issues / Not checked.
   - Buy list grouped by vendor, showing "have X · min Y · buy Z", with a Mark ordered toggle.
   - Gear issues list with notes, and a "Counted by" free-text field.
   - **Copy summary to text** (short, for a team text), **Download spreadsheet** (CSV), and **Start a new count day**.
3. **Items** (admin)
   - Edit name, type, category, minimum, last count, vendor.
   - Add an item; Archive / Restore.

## Behavior rules
- Glove-sized tap targets (≥ 44px), 16px inputs (prevents iOS zoom), works in dark mode.
- Saves on each tap, so a dead phone loses nothing. Live updates across devices (Supabase realtime).
- **Start a new count day:** copy each checked count into `gtc_items.last_count`, write a snapshot to `gtc_count_history`, close the open `gtc_count_days` row, clear `gtc_counts`, and open a new day. Do it in one Postgres function (RPC) so it's atomic. It needs a two-tap confirm (no browser `confirm()`).
- Stock status: `count == 0 && min > 0` → Out; `count < min` → Low. Items with `min = 0` never show as low.
- The summary text stays short. Ken wants reports the team will actually read: Out, Low, Gear issues, and nothing else.

## Roles (from the app's planned role tiers)
| Role | Can |
|---|---|
| GTC Tech | Count |
| GTC Team Lead | Count, edit items, mark ordered, start a new count day |
| Manager / Admin | Everything, plus see history |

Inspect how the existing app stores roles and write RLS policies to match (stubs are in `schema.sql`). If the planned login system isn't live yet, flag that before building the GTC section; it's the main dependency.

## Suggested build order
1. Run `schema.sql` (after adapting RLS to the app's role model).
2. Add a data hook/module for GTC (items, counts, current day) with realtime subscriptions.
3. Port the three screens from `prototype.html` into components that follow the app's existing style.
4. Add a GTC nav entry, gated by role.
5. Write the `start_new_count_day` RPC.
6. Nice-to-have: email Ken via Resend when a count day is closed, with the short summary.

## Open questions for Ken
- Is the app's login/role system live yet, or does this ship before it?
- Should anyone besides Ken get an email when a count day closes?
