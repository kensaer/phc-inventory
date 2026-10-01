import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase';

// ════════════════════════════════════════════════════════════════════════════
// GTC COUNT DAY
// Periodic inventory day for the tree care (GTC) division: walk the shop on a
// phone, count every item, then get a buy list and gear-issue list.
// Spec + approved prototype: gtc-count-day/HANDOFF.md, gtc-count-day/prototype.html
// Tables + permissions: db/migrations/004_gtc_count_day.sql
// ════════════════════════════════════════════════════════════════════════════

const CATS = {
  saws: "Saws & Power", chain: "Chain & Sharpening", fuel: "Fuel & Oil",
  rigging: "Rigging & Climbing", cabling: "Cabling & Bracing", hand: "Hand Tools",
  safety: "Safety & PPE", truck: "Truck & Shop",
};
const CAT_KEYS = Object.keys(CATS);
const VENDORS = ["RBI / Shelter Tree", "Home Depot", "Big Toolbox", "O'Reilly's", "Amazon", "Gregson & Clark", "SiteOne"];
const CONDS = ["Good", "Needs repair", "Out of service", "Missing"];
const LEAD_ROLES = ["admin", "manager", "gtc_team_lead"];

const num = v => (v === null || v === undefined || v === "" || isNaN(v)) ? null : Number(v);
const without = (obj, key) => { const n = { ...obj }; delete n[key]; return n; };

export default function GTCCountDay({ profile, onExit, onSignOut }) {
  const canEdit = LEAD_ROLES.includes(profile?.role);

  const [items, setItems]   = useState(null);   // gtc_items rows
  const [counts, setCounts] = useState({});     // item_id -> gtc_counts row (present = checked)
  const [day, setDay]       = useState(null);   // the open gtc_count_days row
  const [loadErr, setLoadErr] = useState(null);

  const [draft, setDraft] = useState({});       // item_id -> typed count not yet saved
  const [notes, setNotes] = useState({});       // item_id -> note being typed
  const [who, setWho]     = useState(null);     // "Counted by" being typed (null = use saved)
  const [linger, setLinger] = useState({});     // ids kept on screen briefly after checking

  const [tab, setTab]   = useState("count");
  const [cat, setCat]   = useState("all");
  const [filt, setFilt] = useState("todo");
  const [q, setQ]       = useState("");
  const [minEdit, setMinEdit]   = useState(null);
  const [sheetItem, setSheetItem] = useState(undefined); // undefined = closed, null = new item
  const [showArch, setShowArch] = useState(false);
  const [copyText, setCopyText] = useState(null);
  const [resetArmed, setResetArmed] = useState(false);
  const [resetting, setResetting]   = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const timers = useRef({});
  const debounce = (key, ms, fn) => { clearTimeout(timers.current[key]); timers.current[key] = setTimeout(fn, ms); };
  const toast = m => { setToastMsg(m); debounce("toast", 2400, () => setToastMsg(null)); };
  const fail = error => {
    console.error(error);
    const denied = error?.code === "42501" || /row-level security|permission/i.test(error?.message || "");
    toast(denied ? "You don't have permission to change that." : "Couldn't save. Check your signal and try again.");
  };

  // ── Load + live updates ──
  const loadItems = useCallback(async () => {
    const { data, error } = await supabase.from("gtc_items").select("*").order("name");
    if (error) throw error;
    setItems(data);
  }, []);
  const loadCounts = useCallback(async () => {
    const { data, error } = await supabase.from("gtc_counts").select("*");
    if (error) throw error;
    setCounts(Object.fromEntries(data.map(r => [r.item_id, r])));
  }, []);
  const loadDay = useCallback(async () => {
    const { data, error } = await supabase.from("gtc_count_days").select("*")
      .is("completed_at", null).order("started_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    setDay(data);
  }, []);

  useEffect(() => {
    Promise.all([loadItems(), loadCounts(), loadDay()]).catch(e => {
      console.error(e);
      setLoadErr(e?.message || "Unknown error");
    });
    // Many changes can land at once (several counters, or a new count day),
    // so each table reloads at most once per quarter second.
    const t = timers.current;
    const later = (key, fn) => () => { clearTimeout(t[key]); t[key] = setTimeout(() => fn().catch(() => {}), 250); };
    const ch = supabase.channel("gtc-count-day")
      .on("postgres_changes", { event: "*", schema: "public", table: "gtc_items" }, later("ld-items", loadItems))
      .on("postgres_changes", { event: "*", schema: "public", table: "gtc_counts" }, later("ld-counts", loadCounts))
      .on("postgres_changes", { event: "*", schema: "public", table: "gtc_count_days" }, later("ld-day", loadDay))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadItems, loadCounts, loadDay]);

  // ── Derived ──
  const active = (items || []).filter(i => !i.archived);
  const finalCount = it => counts[it.id] ? counts[it.id].count : (it.last_count ?? null);
  const shown = it => (it.id in draft) ? draft[it.id] : finalCount(it);
  const stock = it => {
    const n = num(finalCount(it)), m = +it.min_qty || 0;
    if (n === null) return null;
    if (m > 0 && n === 0) return "out";
    if (m > 0 && n < m) return "low";
    return "ok";
  };
  const buyQty = it => Math.max(0, (+it.min_qty || 0) - (num(finalCount(it)) || 0));
  const R = {
    out: active.filter(i => stock(i) === "out"),
    low: active.filter(i => stock(i) === "low"),
    rep: active.filter(i => i.item_type === "equip" && counts[i.id]?.condition && counts[i.id].condition !== "Good"),
    notYet: active.filter(i => !counts[i.id]),
    total: active.length,
  };
  const checkedN = R.total - R.notYet.length;
  const issueN = R.out.length + R.low.length + R.rep.length;

  // ── Counting ──
  const keepVisible = (id, untilBlur) => {
    setLinger(l => ({ ...l, [id]: true }));
    if (!untilBlur) setTimeout(() => setLinger(l => without(l, id)), 700);
  };

  const check = async (it, cond) => {
    const c = num(shown(it));
    if (c === null) { toast("Enter a count first"); return; }
    const prev = counts[it.id];
    const row = { item_id: it.id, count: c, condition: it.item_type === "equip" ? cond : null, note: prev?.note || null, counted_at: new Date().toISOString() };
    setCounts(cs => ({ ...cs, [it.id]: { ...prev, ...row } }));
    keepVisible(it.id, it.item_type === "equip" && cond !== "Good");
    const { error } = await supabase.from("gtc_counts").upsert(row);
    if (error) { setCounts(cs => prev ? { ...cs, [it.id]: prev } : without(cs, it.id)); fail(error); return; }
    setDraft(d => without(d, it.id));
  };

  const uncheck = async it => {
    const prev = counts[it.id];
    if (!prev) return;
    setDraft(d => ({ ...d, [it.id]: prev.count }));
    setCounts(cs => without(cs, it.id));
    const { error } = await supabase.from("gtc_counts").delete().eq("item_id", it.id);
    if (error) { setCounts(cs => ({ ...cs, [it.id]: prev })); fail(error); }
  };

  const setCount = (it, v) => {
    setDraft(d => ({ ...d, [it.id]: v }));
    if (!counts[it.id] || v === null) return;
    debounce("cnt" + it.id, 700, async () => {
      const { error } = await supabase.from("gtc_counts").update({ count: v }).eq("item_id", it.id);
      if (error) return fail(error);
      setCounts(cs => cs[it.id] ? { ...cs, [it.id]: { ...cs[it.id], count: v } } : cs);
      setDraft(d => d[it.id] === v ? without(d, it.id) : d);
    });
  };

  const setNote = (it, v) => {
    setNotes(n => ({ ...n, [it.id]: v }));
    debounce("note" + it.id, 700, async () => {
      const { error } = await supabase.from("gtc_counts").update({ note: v || null }).eq("item_id", it.id);
      if (error) return fail(error);
      setCounts(cs => cs[it.id] ? { ...cs, [it.id]: { ...cs[it.id], note: v } } : cs);
      setNotes(n => n[it.id] === v ? without(n, it.id) : n);
    });
  };

  // ── Items (team lead and up) ──
  const updateItem = async (id, patch) => {
    setItems(list => list.map(i => i.id === id ? { ...i, ...patch } : i));
    const { error } = await supabase.from("gtc_items").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { loadItems().catch(() => {}); fail(error); return false; }
    return true;
  };

  const saveMin = (it, raw) => {
    setMinEdit(null);
    const v = parseInt(raw, 10);
    if (!isNaN(v) && v >= 0 && v !== (+it.min_qty || 0)) updateItem(it.id, { min_qty: v });
  };

  const toggleOrdered = async it => {
    const to = !it.on_order;
    if (await updateItem(it.id, { on_order: to })) toast(to ? "Marked on order" : "On-order cleared");
  };

  const saveItem = async (id, body) => {
    const { error } = id
      ? await supabase.from("gtc_items").update({ ...body, updated_at: new Date().toISOString() }).eq("id", id)
      : await supabase.from("gtc_items").insert(body);
    if (error) { fail(error); return false; }
    await loadItems().catch(() => {});
    return true;
  };

  // ── Results ──
  const saveWho = v => {
    setWho(v);
    if (!day) return;
    debounce("who", 800, async () => {
      const { error } = await supabase.from("gtc_count_days").update({ counted_by: v || null }).eq("id", day.id);
      if (error) return fail(error);
      setDay(d => d ? { ...d, counted_by: v } : d);
      setWho(w => w === v ? null : w);
    });
  };
  const whoValue = who ?? day?.counted_by ?? "";

  const summary = () => {
    const d = new Date(), ds = `${d.getMonth() + 1}/${d.getDate()}`;
    const L = [`GTC inventory, ${ds}${whoValue ? ` (counted by ${whoValue})` : ""}`, `${checkedN}/${R.total} items checked.`];
    if (R.out.length) L.push("", `OUT (${R.out.length}):`, ...R.out.map(i => `- ${i.name}${i.on_order ? " (on order)" : ""}`));
    if (R.low.length) L.push("", `LOW (${R.low.length}):`, ...R.low.map(i => `- ${i.name}: have ${finalCount(i)}, min ${i.min_qty}${i.on_order ? " (on order)" : ""}`));
    if (R.rep.length) L.push("", `GEAR ISSUES (${R.rep.length}):`, ...R.rep.map(i => `- ${i.name}: ${counts[i.id].condition}${counts[i.id].note ? " — " + counts[i.id].note : ""}`));
    if (!issueN) L.push("Nothing out, low, or damaged.");
    return L.join("\n");
  };

  const copySummary = async () => {
    const text = summary();
    try { await navigator.clipboard.writeText(text); toast("Summary copied. Paste it in your team text."); }
    catch { setCopyText(text); }
  };

  const downloadCSV = () => {
    const qt = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Item", "Category", "Type", "Count", "Minimum", "Status", "Condition", "Note", "Buy", "Vendor", "On order", "Checked"].join(",")];
    [...active].sort((a, b) => (CATS[a.category] || "").localeCompare(CATS[b.category] || "") || a.name.localeCompare(b.name)).forEach(i => {
      const r = counts[i.id], s = stock(i);
      lines.push([i.name, CATS[i.category] || "", i.item_type === "supply" ? "Supply" : "Equipment", finalCount(i), i.min_qty || 0,
        s === "out" ? "Out" : s === "low" ? "Low" : s === "ok" ? "OK" : "Not counted",
        r && i.item_type === "equip" ? r.condition : "", r?.note || "", s === "out" || s === "low" ? buyQty(i) : "",
        i.vendor || "", i.on_order ? "Yes" : "", r ? "Yes" : "No"].map(qt).join(","));
    });
    const d = new Date(), stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `GTC inventory ${stamp}.csv`;
    a.click();
  };

  const startNewDay = async () => {
    if (!resetArmed) { setResetArmed(true); setTimeout(() => setResetArmed(false), 4000); return; }
    setResetting(true);
    const { error } = await supabase.rpc("start_new_count_day");
    setResetting(false);
    setResetArmed(false);
    if (error) return fail(error);
    setDraft({}); setNotes({}); setWho(null);
    await Promise.all([loadItems(), loadCounts(), loadDay()]).catch(() => {});
    toast("New count day started");
  };

  const goTab = t => { setTab(t); window.scrollTo(0, 0); };
  const onSearch = v => { setQ(v); if (tab === "results") setTab("count"); };

  // ── Render pieces ──
  const pills = it => {
    const r = counts[it.id], s = stock(it);
    return <>
      {r && it.item_type === "equip" && r.condition && r.condition !== "Good" && <span className="pill p-out">{r.condition}</span>}
      {s === "out" && <span className="pill p-out">Out</span>}
      {s === "low" && <span className="pill p-low">Low</span>}
      {it.on_order && s !== "ok" && <span className="pill p-ord">On order</span>}
    </>;
  };

  const itemRow = it => {
    const r = counts[it.id], checked = !!r, c = shown(it), m = +it.min_qty || 0;
    const stepper = (
      <div className="stepper">
        <button type="button" aria-label="One fewer" onClick={() => setCount(it, Math.max(0, (num(c) ?? 1) - 1))}>−</button>
        <input type="number" inputMode="numeric" min="0" value={c ?? ""} placeholder="?" aria-label={`Count for ${it.name}`}
          onChange={e => { const v = e.target.value === "" ? null : Math.max(0, parseInt(e.target.value, 10)); setCount(it, isNaN(v) ? null : v); }}
          onKeyDown={e => { if (e.key === "Enter") { e.currentTarget.blur(); if (!checked && it.item_type === "supply") check(it); } }} />
        <button type="button" aria-label="One more" onClick={() => setCount(it, (num(c) ?? -1) + 1)}>+</button>
      </div>
    );
    return (
      <div key={it.id} className={"item" + (checked ? " checked" : "")}>
        <div className="head">
          <div className="name">{it.name}
            <div className="sub">
              <span className="pill p-type">{it.item_type === "supply" ? "Supply" : "Equipment"}</span>
              {it.phc && <span>PHC</span>}
              {pills(it)}
              {!checked && <span>Last count {it.last_count ?? "—"}</span>}
            </div>
          </div>
          <span className="check" aria-label={checked ? "Checked" : "Not checked"}>✓</span>
        </div>
        {it.item_type === "supply" ? (
          <div className="ctrl">
            {stepper}
            <span className="minlbl">min{" "}
              {minEdit === it.id ? (
                <input className="minin" type="number" inputMode="numeric" min="0" defaultValue={m} autoFocus aria-label="Minimum"
                  onFocus={e => e.target.select()} onBlur={e => saveMin(it, e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setMinEdit(null); }} />
              ) : canEdit ? (
                <button type="button" aria-label="Change minimum" onClick={() => setMinEdit(it.id)}>{m || "set"}</button>
              ) : <b>{m || "—"}</b>}
            </span>
            <button className="go" type="button" onClick={() => checked ? uncheck(it) : check(it)}>{checked ? "Checked" : "Count ✓"}</button>
          </div>
        ) : <>
          <div className="ctrl">{stepper}{m > 0 && <span className="minlbl">want {m}</span>}</div>
          <div className="conds" role="group" aria-label="Condition">
            {CONDS.map(k => (
              <button key={k} className="cond" type="button" data-c={k} aria-pressed={checked && r.condition === k}
                onClick={() => (checked && r.condition === k) ? uncheck(it) : check(it, k)}>
                {k === "Out of service" ? <>Out of<br />service</> : k}
              </button>
            ))}
          </div>
          {checked && r.condition && r.condition !== "Good" && (
            <input className="note" placeholder="What's wrong? (optional)" value={notes[it.id] ?? r.note ?? ""}
              autoFocus={!!linger[it.id]}
              onChange={e => setNote(it, e.target.value)}
              onBlur={() => setTimeout(() => setLinger(l => without(l, it.id)), 300)}
              onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} />
          )}
        </>}
      </div>
    );
  };

  const countView = () => {
    if (!items) return <div className="empty">Loading the inventory list…</div>;
    if (!active.length) return <div className="empty">No items yet.{canEdit ? " Add the first one on the Items tab." : ""}</div>;
    const ql = q.trim().toLowerCase();
    const rows = active.filter(it =>
      (cat === "all" || it.category === cat) &&
      (!ql || it.name.toLowerCase().includes(ql)) &&
      (filt === "all" || linger[it.id] || (filt === "done") === !!counts[it.id]));
    if (!rows.length) return <div className="empty">{filt === "todo" && !ql ? "Everything here is checked. Pick another category or open Results." : "Nothing matches. Try a shorter word or switch to All."}</div>;
    return (cat === "all" ? CAT_KEYS : [cat]).map(c => {
      const g = rows.filter(i => i.category === c).sort((x, y) => (x.item_type === y.item_type ? 0 : x.item_type === "supply" ? -1 : 1) || x.name.localeCompare(y.name));
      if (!g.length) return null;
      return <div key={c}><div className="group">{CATS[c]}</div><div className="list">{g.map(itemRow)}</div></div>;
    });
  };

  const resultsView = () => {
    const buy = [...R.out, ...R.low];
    const groups = {};
    buy.forEach(i => (groups[i.vendor || "Vendor not set"] ??= []).push(i));
    return <>
      <h2>Count day results</h2>
      <p className="lede">{R.notYet.length ? `${R.notYet.length} of ${R.total} items still to check. Results fill in as you go.` : `All ${R.total} items checked.`}</p>
      <div className="tiles">
        <div className="tile t-out"><b>{R.out.length}</b><span>Out</span></div>
        <div className="tile t-low"><b>{R.low.length}</b><span>Low</span></div>
        <div className="tile t-rep"><b>{R.rep.length}</b><span>Gear issues</span></div>
        <div className="tile"><b>{R.notYet.length}</b><span>Not checked</span></div>
      </div>
      <div className="toolbar" style={{ marginTop: 14 }}>
        <button className="big primary" type="button" onClick={copySummary}>Copy summary to text</button>
        <button className="big" type="button" onClick={downloadCSV}>Download spreadsheet</button>
      </div>

      <div className="sec">
        <h3><span>Buy list · {buy.length}</span></h3>
        <div className="rows">
          {!buy.length ? <div className="r"><span className="dt">Nothing is out or low.</span></div> :
            Object.keys(groups).sort((x, y) => groups[y].length - groups[x].length).map(v => <div key={v}>
              <div className="vend">{v}</div>
              {groups[v].sort((x, y) => (num(finalCount(x)) || 0) - (num(finalCount(y)) || 0)).map(i => {
                const c = num(finalCount(i));
                return <div key={i.id} className="r">
                  <div><div className="nm">{i.name}</div><div className="dt">{c === 0 ? "Out" : "Have " + c} · min {i.min_qty} · buy {buyQty(i)}</div></div>
                  <button className={"sm" + (i.on_order ? " on" : "")} type="button" aria-pressed={!!i.on_order} disabled={!canEdit} onClick={() => toggleOrdered(i)}>
                    {i.on_order ? "On order" : "Mark ordered"}
                  </button>
                </div>;
              })}
            </div>)}
        </div>
      </div>

      {R.rep.length > 0 && <div className="sec">
        <h3><span>Gear issues · {R.rep.length}</span></h3>
        <div className="rows">
          {R.rep.map(i => <div key={i.id} className="r">
            <div><div className="nm">{i.name}</div><div className="dt">{counts[i.id].condition}{counts[i.id].note ? " — " + counts[i.id].note : ""}</div></div><span />
          </div>)}
        </div>
      </div>}

      <div className="field">
        <label htmlFor="gtc-who">Counted by</label>
        <input id="gtc-who" value={whoValue} placeholder="Who did the count" disabled={!day} onChange={e => saveWho(e.target.value)} />
      </div>
      {R.notYet.length > 0 && <button className="big" type="button" onClick={() => goTab("count")}>Keep counting ({R.notYet.length} left)</button>}
      {canEdit && <>
        <button className="big warn" type="button" disabled={resetting} onClick={startNewDay}>
          {resetting ? "Saving…" : resetArmed ? "Tap again to clear all checkmarks" : "Start a new count day"}
        </button>
        <p className="fine">Starting a new count day clears every checkmark and saves today's numbers as the new "last count." Do it before the next inventory day, not right after this one, so everyone can still see these results.</p>
      </>}
      {!onExit && <button className="signout" type="button" onClick={onSignOut}>Sign out</button>}
    </>;
  };

  const itemsView = () => {
    const ql = q.trim().toLowerCase();
    const list = (items || []).filter(i => !ql || i.name.toLowerCase().includes(ql));
    const live = list.filter(i => !i.archived), arch = list.filter(i => i.archived);
    const line = i => <div key={i.id} className={"mrow" + (i.archived ? " arch" : "")}>
      <div><div className="nm">{i.name}</div>
        <div className="dt">{i.item_type === "supply" ? "Supply" : "Equipment"} · {CATS[i.category] || "No category"}{i.min_qty ? ` · min ${i.min_qty}` : ""}{i.vendor ? ` · ${i.vendor}` : ""}</div></div>
      <button className="sm" type="button" onClick={() => setSheetItem(i)}>Edit</button>
    </div>;
    return <>
      <h2>Items</h2>
      <p className="lede">Rename, recategorize, set minimums, add new items, or archive ones you no longer stock. Changes show up for everyone right away.</p>
      <div className="toolbar"><button className="big primary" type="button" onClick={() => setSheetItem(null)}>Add an item</button></div>
      {CAT_KEYS.map(c => {
        const g = live.filter(i => i.category === c).sort((x, y) => x.name.localeCompare(y.name));
        if (!g.length) return null;
        return <div key={c} className="sec"><h3><span>{CATS[c]} · {g.length}</span></h3><div className="rows">{g.map(line)}</div></div>;
      })}
      {!live.length && <div className="empty">{ql ? "Nothing matches." : "No items yet."}</div>}
      {arch.length > 0 && <div className="sec">
        <h3><span>Archived · {arch.length}</span><button className="sm" type="button" onClick={() => setShowArch(s => !s)}>{showArch ? "Hide" : "Show"}</button></h3>
        {showArch && <div className="rows">{[...arch].sort((x, y) => x.name.localeCompare(y.name)).map(line)}</div>}
      </div>}
    </>;
  };

  const tabs = [["count", "Count"], ["results", "Results"], ...(canEdit ? [["items", "Items"]] : [])];

  return (
    <div className="gtc">
      <style>{GTC_CSS}</style>
      <div className="gtc-app">
      <header className="gtc-hdr">
        <div className="top">
          <div className="brand">
            {onExit && <button type="button" className="hdrbtn" onClick={onExit}>← PHC app</button>}
            GTC Count Day<small>Joshua Tree Experts · Tree Care</small>
          </div>
          <div className="prog">{R.total ? `${checkedN} / ${R.total}` : "–"}<small>checked</small></div>
        </div>
        <div className="bar" aria-hidden="true"><i style={{ width: R.total ? `${checkedN / R.total * 100}%` : 0 }} /></div>
        <label className="search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
          <input type="search" placeholder="Find an item — chain, gloves, whoopie…" autoComplete="off" value={q} onChange={e => onSearch(e.target.value)} />
        </label>
      </header>

      {loadErr ? (
        <main className="gtc-main"><div className="empty">
          The GTC list couldn't load. If this is the first time using Count Day, the database setup (migration 004) may not have been run yet.
          <br /><br /><small>{loadErr}</small>
        </div></main>
      ) : <>
        {tab === "count" && <>
          <div className="chips" role="group" aria-label="Category">
            {[["all", "All"], ...Object.entries(CATS)].map(([k, v]) => {
              const pool = active.filter(i => k === "all" || i.category === k);
              if (k !== "all" && !pool.length) return null;
              const d = pool.filter(i => counts[i.id]).length;
              return <button key={k} className={"chip" + (pool.length && d === pool.length ? " full" : "")} type="button" aria-pressed={cat === k} onClick={() => setCat(k)}>
                {v}<span className="n">{d}/{pool.length}</span>
              </button>;
            })}
          </div>
          <div className="filt" role="group" aria-label="Show">
            {[["todo", "Still to check"], ["done", "Checked"], ["all", "All"]].map(([k, v]) =>
              <button key={k} className="seg" type="button" aria-pressed={filt === k} onClick={() => setFilt(k)}>{v}</button>)}
          </div>
          <main className="gtc-main">{countView()}</main>
        </>}
        {tab === "results" && <main className="gtc-main">{resultsView()}</main>}
        {tab === "items" && canEdit && <main className="gtc-main">{itemsView()}</main>}
      </>}
      </div>

      <nav className="gtc-tabs" aria-label="Sections">
        <div className="in" role="tablist" style={{ gridTemplateColumns: `repeat(${tabs.length},1fr)` }}>
          {tabs.map(([k, l]) => (
            <button key={k} className="tab" role="tab" type="button" aria-selected={tab === k} onClick={() => goTab(k)}>
              {k === "count" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="m8 9 2 2 4-4M8 16h8" /></svg>}
              {k === "results" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>}
              {k === "items" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" /><path d="m17 16 2 2 3-3" /></svg>}
              {l}
              {k === "results" && issueN > 0 && <span className="badge">{issueN}</span>}
            </button>
          ))}
        </div>
      </nav>

      {sheetItem !== undefined && (
        <ItemSheet item={sheetItem} defaultCat={cat !== "all" ? cat : "hand"} onClose={() => setSheetItem(undefined)}
          onSave={async (id, body) => { if (await saveItem(id, body)) { setSheetItem(undefined); toast(id ? "Saved" : "Item added"); } }}
          onArchive={async it => { const to = !it.archived; if (await saveItem(it.id, { archived: to })) { setSheetItem(undefined); toast(to ? "Archived. It's off the checklist." : "Restored to the checklist"); } }} />
      )}

      {copyText !== null && (
        <div className="scrim" onClick={e => { if (e.target === e.currentTarget) setCopyText(null); }}>
          <div className="sheet"><div className="grab" />
            <h4>Copy this text</h4>
            <p className="help">Copying is blocked here. Select the text below and copy it.</p>
            <textarea className="cpy" readOnly value={copyText} autoFocus onFocus={e => e.target.select()} />
            <button className="big" type="button" onClick={() => setCopyText(null)}>Close</button>
          </div>
        </div>
      )}

      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </div>
  );
}

// Add / edit item bottom sheet (team lead and up)
function ItemSheet({ item, defaultCat, onClose, onSave, onArchive }) {
  const isNew = !item;
  const [name, setName]     = useState(item?.name || "");
  const [type, setType]     = useState(item?.item_type || "supply");
  const [cat, setCat]       = useState(item?.category || defaultCat);
  const [min, setMin]       = useState(String(item?.min_qty ?? 0));
  const [last, setLast]     = useState(item?.last_count == null ? "" : String(item.last_count));
  const [vendor, setVendor] = useState(item?.vendor || "");
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState("");
  const vendors = ["", ...VENDORS, ...(item?.vendor && !VENDORS.includes(item.vendor) ? [item.vendor] : [])];

  const save = async () => {
    if (!name.trim()) { setErr("Give the item a name."); return; }
    setBusy(true);
    const lastN = parseInt(last, 10);
    await onSave(item?.id, {
      name: name.trim(), item_type: type, category: cat,
      min_qty: Math.max(0, parseInt(min, 10) || 0),
      last_count: isNaN(lastN) ? null : Math.max(0, lastN),
      vendor: vendor || null,
    });
    setBusy(false);
  };

  return (
    <div className="scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={e => { if (e.key === "Escape") onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="gtc-sheet-title"><div className="grab" />
        <h4 id="gtc-sheet-title">{isNew ? "Add an item" : "Edit item"}</h4>
        <div className="field"><label htmlFor="gtc-f-name">Name</label>
          <input id="gtc-f-name" value={name} autoFocus={isNew} autoComplete="off" placeholder='e.g. Stihl 25" Chain' onChange={e => { setName(e.target.value); setErr(""); }} />
          {err && <p className="help" style={{ color: "var(--bad)" }}>{err}</p>}
        </div>
        <div className="field"><label>Type</label>
          <div className="typeseg" role="group" aria-label="Type">
            <button type="button" aria-pressed={type === "supply"} onClick={() => setType("supply")}>Supply</button>
            <button type="button" aria-pressed={type === "equip"} onClick={() => setType("equip")}>Equipment</button>
          </div>
          <p className="help">Supply = gets used up and reordered. Equipment = gets a condition check.</p>
        </div>
        <div className="field"><label htmlFor="gtc-f-cat">Category</label>
          <select id="gtc-f-cat" value={cat} onChange={e => setCat(e.target.value)}>
            {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="two">
          <div className="field"><label htmlFor="gtc-f-min">Minimum to keep</label>
            <input id="gtc-f-min" type="number" inputMode="numeric" min="0" value={min} onChange={e => setMin(e.target.value)} /></div>
          <div className="field"><label htmlFor="gtc-f-last">Last count</label>
            <input id="gtc-f-last" type="number" inputMode="numeric" min="0" value={last} placeholder="?" onChange={e => setLast(e.target.value)} /></div>
        </div>
        <div className="field"><label htmlFor="gtc-f-vend">Vendor</label>
          <select id="gtc-f-vend" value={vendor} onChange={e => setVendor(e.target.value)}>
            {vendors.map(v => <option key={v} value={v}>{v || "Not set"}</option>)}
          </select>
        </div>
        <div className="sheetacts">
          <button className="big" type="button" onClick={onClose}>Cancel</button>
          <button className="big primary" type="button" disabled={busy} onClick={save}>{isNew ? "Add item" : "Save changes"}</button>
          {!isNew && <button className={"big" + (item.archived ? "" : " warn")} type="button" style={{ gridColumn: "1/-1" }} onClick={() => onArchive(item)}>
            {item.archived ? "Restore to the list" : "Archive (no longer stocked)"}
          </button>}
        </div>
      </div>
    </div>
  );
}

// Styles from the approved prototype, scoped under .gtc so they can't leak
// into the rest of the app (and the app's global reset can't break them).
const GTC_CSS = `
.gtc{--bg:#f2f3ef;--surface:#ffffff;--fg:#1d2419;--muted:#5f685a;--line:#dcdfd6;--done:#f7f8f4;
  --accent:#e8590c;--accent-fg:#ffffff;--bark:#2f3a2a;--bark-fg:#f4f1e8;
  --ok:#2f7d32;--ok-soft:#e3f1e3;--warn:#b26a00;--warn-soft:#fbefd9;--bad:#c62828;--bad-soft:#fbe3e3;--info:#1f5f99;--info-soft:#e2edf7;
  --display:"Barlow Condensed","Arial Narrow",system-ui,sans-serif;
  --body:"Public Sans",system-ui,-apple-system,"Segoe UI",sans-serif;--r:10px;
  background:var(--bg);color:var(--fg);font-family:var(--body);font-size:15px;line-height:1.4;min-height:100vh}
.gtc .gtc-app{max-width:600px;margin:0 auto}
@media (prefers-color-scheme:dark){.gtc{
  --bg:#141812;--surface:#1d231a;--fg:#eef0ea;--muted:#a3ab9c;--line:#323a2d;--done:#181d16;
  --accent:#ff7a33;--accent-fg:#1a0d04;--bark:#0e110c;--bark-fg:#eef0ea;
  --ok:#7fcf83;--ok-soft:#1f3320;--warn:#f0b54f;--warn-soft:#3a2c12;--bad:#ff8a80;--bad-soft:#3d1c1c;--info:#8cc2f2;--info-soft:#18293b;color-scheme:dark}}
.gtc *{box-sizing:border-box}
.gtc button{font:inherit;color:inherit;cursor:pointer}
.gtc button:disabled{cursor:default;opacity:.55}
.gtc button:focus-visible,.gtc input:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.gtc .gtc-hdr{position:sticky;top:env(safe-area-inset-top,0px);z-index:5;background:var(--bark);color:var(--bark-fg);padding:12px 16px;display:grid;gap:10px}
.gtc .top{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
.gtc .brand{font-family:var(--display);font-size:22px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;line-height:1}
.gtc .brand small{display:block;font-family:var(--body);font-size:11px;font-weight:500;letter-spacing:.08em;opacity:.7;margin-top:4px;text-transform:uppercase}
.gtc .hdrbtn{display:block;margin-bottom:8px;border:1px solid rgba(255,255,255,.25);background:transparent;border-radius:8px;padding:5px 10px;font-family:var(--body);font-size:12px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--bark-fg);min-height:32px}
.gtc .prog{font-family:var(--display);font-size:22px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1;text-align:right}
.gtc .prog small{display:block;font-family:var(--body);font-size:11px;font-weight:500;opacity:.7;margin-top:4px}
.gtc .bar{height:6px;border-radius:3px;background:rgba(255,255,255,.15);overflow:hidden}
.gtc .bar i{display:block;height:100%;background:var(--accent);transition:width .25s}
.gtc .search{display:flex;align-items:center;gap:8px;background:var(--surface);color:var(--fg);border-radius:var(--r);padding:0 12px;min-height:46px}
.gtc .search input{flex:1;border:0;background:transparent;font:inherit;font-size:16px;color:inherit;min-width:0;height:44px}
.gtc .search input:focus{outline:none}
.gtc .search:focus-within{box-shadow:0 0 0 3px var(--accent)}
.gtc .chips{display:flex;gap:8px;overflow-x:auto;padding:12px 16px 4px;scrollbar-width:none}
.gtc .chips::-webkit-scrollbar{display:none}
.gtc .chip{flex:none;border:1.5px solid var(--line);background:var(--surface);border-radius:999px;padding:8px 14px;font-size:14px;font-weight:600;min-height:42px;white-space:nowrap}
.gtc .chip[aria-pressed="true"]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.gtc .chip .n{font-weight:500;opacity:.65;margin-left:5px;font-variant-numeric:tabular-nums}
.gtc .chip.full .n{opacity:1;color:var(--ok)}
.gtc .chip.full[aria-pressed="true"] .n{color:inherit}
.gtc .filt{display:flex;gap:4px;padding:8px 16px 0}
.gtc .seg{flex:1;border:0;background:transparent;border-bottom:3px solid transparent;padding:8px 4px;font-weight:600;font-size:14px;color:var(--muted);min-height:42px}
.gtc .seg[aria-pressed="true"]{color:var(--fg);border-bottom-color:var(--accent)}
.gtc .gtc-main{padding:8px 16px calc(96px + env(safe-area-inset-bottom,0px))}
.gtc .group{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:600;margin:16px 2px 8px}
.gtc .list{display:grid;gap:8px}
.gtc .item{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:12px;display:grid;gap:10px}
.gtc .item.checked{background:var(--done)}
.gtc .item.checked .name{color:var(--muted)}
.gtc .head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.gtc .name{font-weight:600;font-size:16px;line-height:1.25;min-width:0}
.gtc .sub{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;font-size:13px;color:var(--muted);align-items:center;font-weight:400}
.gtc .pill{display:inline-block;border-radius:5px;padding:2px 7px;font-size:12px;font-weight:600;line-height:1.5;white-space:nowrap}
.gtc .p-low{background:var(--warn-soft);color:var(--warn)}
.gtc .p-out{background:var(--bad-soft);color:var(--bad)}
.gtc .p-ord{background:var(--info-soft);color:var(--info)}
.gtc .p-type{background:transparent;border:1px solid var(--line);color:var(--muted)}
.gtc .check{flex:none;width:28px;height:28px;border-radius:50%;border:2px solid var(--line);display:grid;place-items:center;color:transparent}
.gtc .checked .check{background:var(--ok);border-color:var(--ok);color:var(--surface)}
.gtc .ctrl{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.gtc .stepper{display:grid;grid-template-columns:48px 64px 48px;border:1.5px solid var(--line);border-radius:10px;overflow:hidden;background:var(--bg)}
.gtc .stepper button{border:0;background:transparent;font-size:24px;font-weight:600;min-height:48px}
.gtc .stepper input{border:0;border-left:1.5px solid var(--line);border-right:1.5px solid var(--line);background:var(--surface);color:var(--fg);text-align:center;font-family:var(--display);font-size:26px;font-weight:700;width:100%;min-width:0;font-variant-numeric:tabular-nums;-moz-appearance:textfield}
.gtc .stepper input::-webkit-outer-spin-button,.gtc .stepper input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.gtc .minlbl{font-size:13px;color:var(--muted)}
.gtc .minlbl button{border:0;background:none;padding:6px 4px;font-weight:600;color:var(--fg);text-decoration:underline;text-underline-offset:2px;min-height:36px}
.gtc .minlbl b{color:var(--fg)}
.gtc .minin{width:64px;min-height:40px;border:1.5px solid var(--accent);border-radius:8px;background:var(--surface);color:var(--fg);text-align:center;font-size:16px}
.gtc .go{margin-left:auto;min-height:48px;border-radius:10px;border:0;background:var(--accent);color:var(--accent-fg);font-weight:700;padding:0 18px}
.gtc .checked .go{background:transparent;border:1.5px solid var(--line);color:var(--muted);font-weight:600}
.gtc .conds{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:100%}
.gtc .cond{min-height:46px;border-radius:9px;border:1.5px solid var(--line);background:var(--surface);font-size:13px;font-weight:600;padding:4px;line-height:1.15}
.gtc .cond[aria-pressed="true"][data-c="Good"]{background:var(--ok-soft);border-color:var(--ok);color:var(--ok)}
.gtc .cond[aria-pressed="true"]:not([data-c="Good"]){background:var(--bad-soft);border-color:var(--bad);color:var(--bad)}
.gtc .note{width:100%;min-height:44px;border:1.5px solid var(--line);border-radius:9px;background:var(--bg);color:var(--fg);padding:0 12px;font:inherit;font-size:16px}
.gtc .empty{text-align:center;color:var(--muted);padding:40px 16px}
.gtc .gtc-tabs{position:fixed;left:0;right:0;bottom:0;z-index:6;background:var(--surface);border-top:1px solid var(--line);padding-bottom:env(safe-area-inset-bottom,0px)}
.gtc .gtc-tabs .in{max-width:600px;margin:0 auto;display:grid}
.gtc .tab{border:0;background:transparent;padding:10px 4px 12px;font-size:13px;font-weight:600;color:var(--muted);display:grid;justify-items:center;gap:3px;min-height:60px;position:relative}
.gtc .tab svg{width:24px;height:24px}
.gtc .tab[aria-selected="true"]{color:var(--accent)}
.gtc .badge{position:absolute;top:6px;left:calc(50% + 8px);background:var(--bad);color:#fff;border-radius:999px;font-size:11px;padding:0 6px;line-height:18px;font-variant-numeric:tabular-nums}
.gtc h2{font-family:var(--display);font-size:28px;font-weight:700;text-transform:uppercase;letter-spacing:.02em;margin:14px 2px 4px;text-wrap:balance}
.gtc .lede{color:var(--muted);font-size:14px;margin:0 2px 14px}
.gtc .tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.gtc .tile{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:10px 8px;text-align:center}
.gtc .tile b{display:block;font-family:var(--display);font-size:32px;line-height:1;font-variant-numeric:tabular-nums}
.gtc .tile span{font-size:12px;color:var(--muted);font-weight:600}
.gtc .t-out b,.gtc .t-rep b{color:var(--bad)}
.gtc .t-low b{color:var(--warn)}
.gtc .sec{margin-top:22px}
.gtc .sec h3{font-size:13px;text-transform:uppercase;letter-spacing:.08em;margin:0 2px 8px;font-weight:600;display:flex;justify-content:space-between;align-items:center;gap:8px}
.gtc .rows{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);overflow:hidden}
.gtc .r,.gtc .mrow{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:10px 12px;border-top:1px solid var(--line)}
.gtc .rows>.r:first-child,.gtc .rows>.mrow:first-child,.gtc .rows>div:first-child>.vend{border-top:0}
.gtc .nm{font-weight:600}
.gtc .dt{font-size:13px;color:var(--muted)}
.gtc .mrow.arch .nm{color:var(--muted);text-decoration:line-through}
.gtc .vend{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:600;padding:10px 12px 4px;border-top:1px solid var(--line)}
.gtc .sm{border:1.5px solid var(--line);background:transparent;border-radius:8px;padding:6px 10px;font-size:13px;font-weight:600;min-height:40px;white-space:nowrap}
.gtc .sm.on{background:var(--info-soft);border-color:var(--info);color:var(--info)}
.gtc .big{display:block;width:100%;min-height:52px;border-radius:10px;border:1.5px solid var(--line);background:var(--surface);font-weight:600;margin-top:10px}
.gtc .big.primary{background:var(--accent);border-color:var(--accent);color:var(--accent-fg)}
.gtc .big.warn{border-color:var(--bad);color:var(--bad)}
.gtc .toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:0 2px 12px}
.gtc .toolbar .big{margin:0;flex:1;min-width:140px}
.gtc .field{display:grid;gap:6px;margin-top:22px}
.gtc .field label{font-size:13px;font-weight:600;color:var(--muted)}
.gtc .field input,.gtc .field select{min-height:48px;border:1.5px solid var(--line);border-radius:10px;background:var(--surface);color:var(--fg);padding:0 12px;font:inherit;font-size:16px;width:100%}
.gtc .fine{font-size:12px;color:var(--muted);margin:14px 2px 0}
.gtc .signout{display:block;margin:28px auto 0;border:0;background:none;color:var(--muted);font-size:13px;text-decoration:underline;min-height:40px;padding:0 12px}
.gtc .toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(76px + env(safe-area-inset-bottom,0px));background:var(--fg);color:var(--bg);padding:10px 16px;border-radius:10px;font-weight:600;font-size:14px;z-index:30;max-width:calc(100% - 32px)}
.gtc .scrim{position:fixed;inset:0;background:rgba(10,14,8,.5);z-index:20;display:flex;align-items:flex-end;justify-content:center}
.gtc .sheet{background:var(--surface);width:100%;max-width:600px;border-radius:16px 16px 0 0;padding:8px 16px calc(20px + env(safe-area-inset-bottom,0px));max-height:92%;overflow:auto;animation:gtcUp .18s ease-out}
@keyframes gtcUp{from{transform:translateY(24px);opacity:.6}to{transform:none;opacity:1}}
@media (prefers-reduced-motion:reduce){.gtc .sheet{animation:none}.gtc .bar i{transition:none}}
.gtc .grab{width:40px;height:4px;border-radius:2px;background:var(--line);margin:4px auto 12px}
.gtc .sheet h4{font-size:20px;font-weight:600;margin:0 0 4px;line-height:1.25}
.gtc .sheet .field{margin-top:14px}
.gtc .sheet .field input,.gtc .sheet .field select{background:var(--bg)}
.gtc .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.gtc .typeseg{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.gtc .typeseg button{min-height:48px;border-radius:10px;border:1.5px solid var(--line);background:var(--bg);font-weight:600}
.gtc .typeseg button[aria-pressed="true"]{border-color:var(--accent);background:var(--surface);color:var(--accent)}
.gtc .help{font-size:12px;color:var(--muted);margin:2px 0 0}
.gtc .sheetacts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:18px}
.gtc .sheetacts .big{margin:0}
.gtc .cpy{width:100%;min-height:240px;margin-top:10px;border:1.5px solid var(--line);border-radius:10px;background:var(--bg);color:var(--fg);padding:10px;font:inherit;font-size:14px}
@media (max-width:380px){.gtc .cond{font-size:12px}.gtc .stepper{grid-template-columns:44px 56px 44px}}
`;
