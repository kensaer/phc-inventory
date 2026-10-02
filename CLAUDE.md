# PHC Inventory Tracker

Inventory + usage-logging app for Joshua Tree Experts. Started as the Plant Health Care (PHC) product tracker; now also hosts the GTC (tree care) Count Day tool.

- **Owner:** Ken Saer (Admin). Not a developer — explain in plain language, give click-by-click steps for anything he does himself (Supabase, Vercel), and keep reports short.
- **Live app:** https://phc-inventory-n5ot.vercel.app (Vercel auto-deploys `main`)
- **Repo:** github.com/kensaer/phc-inventory
- **Supabase project:** `ijfcdmlsgbhhcmserikf`

## Stack & files
Create React App (react-scripts 5) + `@supabase/supabase-js`, deployed on Vercel.

| File | What |
|---|---|
| `src/App.js` | Almost the whole PHC app: TechView (phone log screen, calculators), ManagerView (dashboard, inventory, blends, history, users, settings), App (auth gate, data load, realtime). Inline styles. |
| `src/GTCCountDay.js` | GTC Count Day (Count / Results / Items). Styles scoped under `.gtc`. Spec + approved prototype in `gtc-count-day/`. |
| `src/auth.js`, `src/Login.js`, `src/adminUsers.js` | Magic-link login, profile lookup, admin user management (calls the `admin-users` edge function). |
| `supabase/functions/admin-users/` | Edge function for invites / role changes / sign-in links. |
| `db/migrations/00N_*.sql` | Schema changes. **Run by hand** in Supabase SQL Editor — nothing applies them automatically. |

## Roles (`public.profiles.role`)
`admin`, `manager`, `phc_team_lead`, `phc_tech`, `gtc_team_lead`, `gtc_tech`.
- Admin/Manager: PHC tech view + Manager view + GTC Count Day. Admin also gets the Users tab.
- PHC roles: tech log view only.
- GTC roles: go straight to GTC Count Day, no PHC access. GTC Tech counts only; GTC Team Lead also edits items, marks ordered, starts a new count day.
- GTC tables enforce this with RLS via `public.app_role()`. **PHC tables (products, blends, transactions) do not have role-based RLS yet** — that's "Phase 1D".

## Workflow
1. Branch off `main`, commit, push the branch → Vercel builds a preview.
2. Ken tests the preview (it uses the **real** database — tell him what not to submit).
3. On his OK, fast-forward `main` and push → live.

Environment on Ken's PC: Git is installed (`C:\Program Files\Git\cmd\git.exe`; refresh PATH in PowerShell if `git` isn't found). **Node is not installed**, so there's no local build — the Vercel preview is the build check. GitHub auth goes through Git Credential Manager; if a push can't prompt, have Ken run the push in his terminal once.

## Data gotchas
- A usage log's `product_cost` is computed **at log time** from the product's current settings and never recalculated. Changing a product's cost or units doesn't fix old logs.
- Blend logs keep per-product costs in `transactions.components` (JSON); the blend's `product_cost` is their sum.
- Supabase Realtime must be switched on per table (products, blends, transactions, gtc_items, gtc_counts, gtc_count_days are on).
- Magic links are single-use; message-app link previews can burn them. Built-in Supabase email is rate-limited, so admins hand out links from Users → Get link instead of emailing.
- `techs` table is unused (left in place). 

## History of notable fixes (Oct 2026)
- `cpUnit()` used to return 0 when a product's stock was 0, saving $0 costs. Fixed; old $0 logs backfilled. Backup: `transactions_backup_2026_10_01`.
- Shortstop logs were entered as total solution instead of product amount (and two as gallons). All 19 moved to `transactions_archive`. Calculators now have a "Log this amount" button that logs product only and refuses non-mL units.

## Open to-do
- **GTC:** screen to browse past count days (`gtc_count_history` is already being filled). Possibly limit "Start a new count day" to Manager/Admin.
- **Phase 2 — PHC request tool:** restock + new-product requests with urgency; status Pending → Acknowledged → Ordered → Fulfilled / Declined. Open questions: urgency levels, whether team leads see only their own requests, fields for new-product requests.
- **Phase 3 — GTC equipment requests** (chainsaws, polesaws, cobra slings).
- **Phase 1D:** RLS on PHC tables.
- Reclassify PHC vs Lawn products (`products.division`).
- Log screen redesign (mobile-first, like the tech landing).
- Branded email / Resend — blocked on DNS access for joshuatreeexperts.com.
- Barcode restocking (column exists, no UI).
