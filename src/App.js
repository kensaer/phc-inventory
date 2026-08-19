import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { supabase } from './supabase';
import Login from './Login';
import { getSession, getProfile, onAuthChange, signOut } from './auth';
import { listProfiles, inviteUser, updateUserRole, removeUser, resendSignInLink } from './adminUsers';

// ── Seed data ─────────────────────────────────────────────────────────────────
const SEED_PRODUCTS = [
  {id:1, name:"ArborJet Tree-Age R10 Insecticide",                containers:2.75,container_size:1,   container_unit:"pint", mix_rate:null,mix_unit:"mL",   mix_per:null,      conversion_rate:473.18, cost_per_container:465.20,product_type:"direct"},
  {id:2, name:"Shortstop 2SC Plant Growth Regulator",            containers:1.25,container_size:1,   container_unit:"gal",  mix_rate:null,mix_unit:"mL",   mix_per:null,      conversion_rate:3785.41,cost_per_container:397.58,product_type:"direct"},
  {id:3, name:"Spring Fert - ArborJet NUTRIROOT 2-2-3",          containers:0.5, container_size:1,   container_unit:"gal",  mix_rate:64,  mix_unit:"fl oz",mix_per:"100 gal", conversion_rate:128,    cost_per_container:178.14,product_type:"mixed"},
  {id:4, name:"Spring Fert - BioPro ArborPlex 14-4-5",           containers:1.5, container_size:2.5, container_unit:"gal",  mix_rate:64,  mix_unit:"fl oz",mix_per:"100 gal", conversion_rate:128,    cost_per_container:85.29, product_type:"mixed"},
  {id:5, name:"Spring Fert - BioPro BioMP 5-3-2",                containers:4,   container_size:2.5, container_unit:"gal",  mix_rate:15,  mix_unit:"fl oz",mix_per:"100 gal", conversion_rate:128,    cost_per_container:65.96, product_type:"mixed"},
  {id:6, name:"Spring Fert - BioPro EnviroPlex Soil Conditioner",containers:4,   container_size:2.5, container_unit:"gal",  mix_rate:12,  mix_unit:"fl oz",mix_per:"100 gal", conversion_rate:128,    cost_per_container:61.93, product_type:"mixed"},
  {id:7, name:"Ecologel Hydretain Liquid Humectant",             containers:1,   container_size:2.5, container_unit:"gal",  mix_rate:10,  mix_unit:"fl oz",mix_per:"100 gal", conversion_rate:128,    cost_per_container:115.31,product_type:"mixed"},
  {id:8, name:"Cytogro Hormone Biostimulant",                    containers:0.5, container_size:1,   container_unit:"gal",  mix_rate:4,   mix_unit:"fl oz",mix_per:"100 gal", conversion_rate:128,    cost_per_container:39.70, product_type:"mixed"},
  {id:9, name:"Tengard SFR Termiticide/Insecticide",             containers:3,   container_size:1.25,container_unit:"gal",  mix_rate:64,  mix_unit:"fl oz",mix_per:"100 gal", conversion_rate:128,    cost_per_container:70.56, product_type:"mixed"},
  {id:10,name:"Eagle 20EW Liquid Fungicide",                     containers:0.25,container_size:1,   container_unit:"pint", mix_rate:64,  mix_unit:"fl oz",mix_per:"100 gal", conversion_rate:16,     cost_per_container:32.99, product_type:"mixed"},
  {id:11,name:"Talstar P Professional Insecticide",              containers:0.25,container_size:1,   container_unit:"pint", mix_rate:12,  mix_unit:"fl oz",mix_per:"100 gal", conversion_rate:16,     cost_per_container:36.64, product_type:"mixed"},
  {id:12,name:"Avid 0.15 EC Insecticide",                       containers:0.1, container_size:8,   container_unit:"oz",   mix_rate:4,   mix_unit:"fl oz",mix_per:"100 gal", conversion_rate:1,      cost_per_container:105.23,product_type:"mixed"},
  {id:13,name:"Yardage Acidifier Penetrant Drift Control Agent", containers:1.25,container_size:2.5, container_unit:"gal",  mix_rate:3,   mix_unit:"fl oz",mix_per:"100 gal", conversion_rate:128,    cost_per_container:88.03, product_type:"mixed"},
  {id:14,name:"Transfilm Anti-Transpirant",                      containers:1,   container_size:2.5, container_unit:"gal",  mix_rate:0.25,mix_unit:"gal",  mix_per:"100 gal", conversion_rate:1,      cost_per_container:212.18,product_type:"mixed"},
  {id:15,name:"Yuccah Natural Wetting Agent",                    containers:0.5, container_size:2.5, container_unit:"gal",  mix_rate:null,mix_unit:null,   mix_per:null,      conversion_rate:null,   cost_per_container:null,  product_type:"direct"},
  {id:16,name:"PhosphoJet Systemic Fungicide",                   containers:0.5, container_size:1,   container_unit:"liter",mix_rate:null,mix_unit:"mL",   mix_per:null,      conversion_rate:1000,   cost_per_container:72.14, product_type:"direct"},
  {id:17,name:"MnJet",                                           containers:1.5, container_size:1,   container_unit:"liter",mix_rate:null,mix_unit:"mL",   mix_per:null,      conversion_rate:1000,   cost_per_container:100.29,product_type:"direct"},
  {id:18,name:"Naturcide",                                       containers:0.1, container_size:64,  container_unit:"oz",   mix_rate:null,mix_unit:"fl oz",mix_per:null,      conversion_rate:1,      cost_per_container:153.95,product_type:"direct"},
  {id:19,name:"Propiconazole",                                   containers:0.25,container_size:1,   container_unit:"qt",   mix_rate:null,mix_unit:"mL",   mix_per:null,      conversion_rate:946.35, cost_per_container:65.44, product_type:"direct"},
  {id:20,name:"ArborPro 15-8-4",                                 containers:0.1, container_size:2.5, container_unit:"gal",  mix_rate:64,  mix_unit:"fl oz",mix_per:"100 gal", conversion_rate:128,    cost_per_container:94.50, product_type:"mixed"},
  {id:21,name:"Zylam",                                           containers:1,   container_size:1,   container_unit:"qt",   mix_rate:null,mix_unit:null,   mix_per:null,      conversion_rate:null,   cost_per_container:null,  product_type:"direct"},
  {id:22,name:"Fall Fert - ArborJet Nutriroot 2-2-3",            containers:0.5, container_size:2.5, container_unit:"gal",  mix_rate:64,  mix_unit:"fl oz",mix_per:"100 gal", conversion_rate:128,    cost_per_container:178.14,product_type:"mixed"},
  {id:23,name:"Fall Fert - BioPro ArborPlex 14-4-5",             containers:2.5, container_size:2.5, container_unit:"gal",  mix_rate:16,  mix_unit:"fl oz",mix_per:"100 gal", conversion_rate:128,    cost_per_container:85.29, product_type:"mixed"},
  {id:24,name:"Fall Fert - BioPro BioMP 5-3-2",                  containers:2.5, container_size:2.5, container_unit:"gal",  mix_rate:15,  mix_unit:"fl oz",mix_per:"100 gal", conversion_rate:128,    cost_per_container:65.96, product_type:"mixed"},
  {id:25,name:"Fall Fert - BioPro EnviroPlex",                   containers:2,   container_size:2.5, container_unit:"gal",  mix_rate:6,   mix_unit:"fl oz",mix_per:"100 gal", conversion_rate:128,    cost_per_container:61.93, product_type:"mixed"},
];
const SEED_BLENDS = [
  {id:101,name:"Spring Fertilizer Blend",color:"#16a34a",description:"Full spring fert program",product_ids:[3,4,5,6]},
  {id:102,name:"Fall Fertilizer Blend",  color:"#d97706",description:"Full fall fert program",  product_ids:[22,23,24,25]},
];

const TECHS = ["Alex","Jordan","Marcus","Sam","Taylor"];
const CATEGORIES = ["Fertilizer","Pesticide","Fungicide","Tree Injection","Herbicide","Growth Regulator","Insecticide","Biostimulant","Other"];
const CONTAINER_UNITS = ["oz","fl oz","pint","qt","gal","liter","mL","kg","lbs"];
const MIX_UNITS = ["fl oz","mL","oz","gal","liter","qt","pint"];
const BLEND_COLORS = ["#16a34a","#d97706","#2563eb","#9333ea","#dc2626","#0891b2","#be185d"];
const TO_ML = {"fl oz":29.5735,"oz":29.5735,"pint":473.176,"qt":946.353,"gal":3785.41,"liter":1000,"mL":1};
const TO_G  = {"oz":28.3495,"lbs":453.592,"kg":1000,"g":1};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt$  = (n) => n==null ? "—" : "$"+Number(n).toFixed(2);
const fmtN  = (n,d=2) => n==null ? "—" : Number(n).toLocaleString(undefined,{maximumFractionDigits:d});
const today = () => new Date().toISOString().slice(0,10);
const fmtDate = (iso) => new Date(iso+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});

function cvt(amount,from,to){
  if(from===to)return amount;
  if(TO_ML[from]&&TO_ML[to])return amount*(TO_ML[from]/TO_ML[to]);
  if(TO_G[from]&&TO_G[to])return amount*(TO_G[from]/TO_G[to]);
  return null;
}
function calcUsed(p,gallons){
  const a=parseFloat(gallons)||0;
  if(!p||!a)return 0;
  return p.mix_rate?(a/100)*p.mix_rate:a;
}
function totalVol(p){
  if(!p.conversion_rate)return p.containers*p.container_size;
  return p.containers*p.container_size*p.conversion_rate;
}
function cpUnit(p){
  const v=totalVol(p),t=p.containers*(p.cost_per_container||0);
  return v>0?t/v:0;
}
function buildSummary(f){
  const ct=parseFloat(f.containers)||0,cs=parseFloat(f.container_size)||0,cpc=parseFloat(f.cost_per_container)||0,mr=parseFloat(f.mix_rate);
  const isMix=f.product_type==="mixed";
  if(!cs||!f.container_unit)return null;
  const tv=ct*cs;
  if(!isMix){
    const cpu=tv>0&&cpc>0?(ct*cpc)/tv:null;
    return{valid:true,lines:[`📦 ${ct} container${ct!==1?"s":""} × ${cs} ${f.container_unit} = ${fmtN(tv)} ${f.container_unit}`,cpu?`💰 Cost per ${f.container_unit}: ${fmt$(cpu)}`:null,`🔬 Techs log in: ${f.container_unit}`].filter(Boolean)};
  }
  if(!mr||!f.mix_unit||!f.mix_per)return{valid:false,error:"Enter mix rate, unit, and per-volume."};
  const mp=parseFloat(f.mix_per)||100;
  const tim=cvt(tv,f.container_unit,f.mix_unit);
  if(tim===null)return{valid:false,error:`Cannot convert ${f.container_unit} → ${f.mix_unit}.`};
  const gals=(tim/mr)*mp,cpu=tim>0&&cpc>0?(ct*cpc)/tim:null;
  return{valid:true,lines:[`📦 ${ct} container${ct!==1?"s":""} × ${cs} ${f.container_unit} = ${fmtN(tv)} ${f.container_unit}`,`🔄 ${fmtN(tim)} ${f.mix_unit} of concentrate`,`📐 Mix rate: ${mr} ${f.mix_unit} per ${mp} gal mix`,`🌿 Treats ~${fmtN(gals,0)} gal total`,cpu?`💰 Cost per ${f.mix_unit}: ${fmt$(cpu)}`:null,`🧑‍🔧 Techs enter: gallons of spray mix`].filter(Boolean)};
}

// localStorage passcode only (doesn't need to be synced)
const getPC = () => { try{ return localStorage.getItem("phc_passcode"); }catch{ return null; } };
const setPC = (v) => { try{ localStorage.setItem("phc_passcode",v); }catch{} };

// ── Shared UI ─────────────────────────────────────────────────────────────────
const iS={width:"100%",padding:"10px 12px",border:"1.5px solid #d1d5db",borderRadius:8,fontSize:14,fontFamily:"inherit",color:"#111827",background:"#f9fafb",boxSizing:"border-box",outline:"none"};
const iSM={width:"100%",padding:"14px 16px",border:"2px solid #e5e7eb",borderRadius:12,fontSize:16,fontFamily:"inherit",color:"#111827",background:"#fff",boxSizing:"border-box",outline:"none"};

function Modal({title,onClose,children,wide}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(10,20,10,0.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto"}}>
      <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:wide?700:500,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 32px 80px rgba(0,0,0,0.22)",margin:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"22px 26px 0"}}>
          <h3 style={{margin:0,fontSize:19,fontFamily:"'Playfair Display',serif",color:"#1a2e1a"}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:24,cursor:"pointer",color:"#9ca3af",lineHeight:1,padding:"0 4px"}}>×</button>
        </div>
        <div style={{padding:"18px 26px 26px"}}>{children}</div>
      </div>
    </div>
  );
}
function FF({label,children,span2}){
  return(
    <div style={{marginBottom:14,gridColumn:span2?"span 2":"span 1"}}>
      <label style={{display:"block",fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:5,letterSpacing:"0.07em",textTransform:"uppercase"}}>{label}</label>
      {children}
    </div>
  );
}
function Btn({children,onClick,color="green",disabled,style:s={}}){
  const bg=color==="green"?"linear-gradient(135deg,#2d6a2d,#4a9e4a)":color==="red"?"linear-gradient(135deg,#b91c1c,#dc2626)":"#f3f4f6";
  return(
    <button onClick={onClick} disabled={disabled} style={{background:disabled?"#d1d5db":bg,color:color==="ghost"?"#374151":"#fff",border:color==="ghost"?"1.5px solid #d1d5db":"none",borderRadius:8,padding:"10px 20px",fontFamily:"inherit",fontSize:14,fontWeight:700,cursor:disabled?"default":"pointer",opacity:disabled?0.7:1,...s}}>
      {children}
    </button>
  );
}
function Toast({toast}){
  if(!toast)return null;
  return <div style={{position:"fixed",bottom:24,right:24,background:toast.type==="error"?"#991b1b":"#1a2e1a",color:"#fff",padding:"13px 22px",borderRadius:10,fontSize:14,fontWeight:600,boxShadow:"0 8px 32px rgba(0,0,0,0.22)",zIndex:3000,display:"flex",alignItems:"center",gap:8,maxWidth:380}}>{toast.type==="error"?"⚠":"✓"} {toast.msg}</div>;
}
function Spinner(){
  return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",flexDirection:"column",gap:14}}>
    <div style={{width:36,height:36,border:"3px solid #e5e7eb",borderTop:"3px solid #4a9e4a",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
    <div style={{color:"#6b7280",fontSize:14,fontFamily:"'DM Sans',sans-serif"}}>Loading inventory…</div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>;
}

// ── Passcode modal ────────────────────────────────────────────────────────────
function PasscodeModal({onSuccess,onCancel}){
  const stored=getPC(),isSetup=!stored;
  const [val,setVal]=useState(""),[confirm,setConfirm]=useState(""),[err,setErr]=useState("");
  const handle=()=>{
    if(isSetup){
      if(val.length<4){setErr("Min 4 characters.");return;}
      if(val!==confirm){setErr("Passcodes don't match.");return;}
      setPC(val);onSuccess();
    } else {
      if(val===stored)onSuccess();
      else{setErr("Incorrect passcode.");setVal("");}
    }
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(10,20,10,0.7)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#fff",borderRadius:16,padding:"28px",width:"100%",maxWidth:360,boxShadow:"0 24px 60px rgba(0,0,0,0.25)"}}>
        <div style={{fontSize:28,textAlign:"center",marginBottom:12}}>🔒</div>
        <h3 style={{margin:"0 0 6px",fontSize:20,fontFamily:"'Playfair Display',serif",color:"#1a2e1a",textAlign:"center"}}>{isSetup?"Set Manager Passcode":"Manager Access"}</h3>
        <p style={{margin:"0 0 20px",color:"#6b7280",fontSize:13,textAlign:"center"}}>{isSetup?"Create a passcode to protect manager features.":"Enter your passcode to continue."}</p>
        <input type="password" value={val} onChange={e=>{setVal(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&handle()} placeholder={isSetup?"New passcode":"Passcode"} style={{...iS,fontSize:16,marginBottom:10,textAlign:"center",letterSpacing:"0.2em"}} autoFocus/>
        {isSetup&&<input type="password" value={confirm} onChange={e=>{setConfirm(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&handle()} placeholder="Confirm passcode" style={{...iS,fontSize:16,marginBottom:10,textAlign:"center",letterSpacing:"0.2em"}}/>}
        {err&&<div style={{color:"#dc2626",fontSize:13,marginBottom:10,textAlign:"center"}}>{err}</div>}
        <div style={{display:"flex",gap:10}}><Btn onClick={handle} style={{flex:1}}>{isSetup?"Set Passcode":"Unlock"}</Btn><Btn onClick={onCancel} color="ghost">Cancel</Btn></div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CALCULATORS SCREEN
// ════════════════════════════════════════════════════════════════════════════
function CalcCard({title,color,children}){
  return(
    <div style={{background:"#fff",borderRadius:16,border:`1.5px solid ${color}33`,overflow:"hidden",marginBottom:16}}>
      <div style={{height:4,background:color}}/>
      <div style={{padding:"16px"}}>
        <div style={{fontSize:15,fontWeight:700,color:"#111827",marginBottom:14}}>{title}</div>
        {children}
      </div>
    </div>
  );
}
function CalcInput({label,value,onChange,placeholder,unit}){
  return(
    <div style={{marginBottom:12}}>
      <label style={{display:"block",fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:5}}>{label}{unit&&<span style={{fontWeight:400,textTransform:"none",marginLeft:4}}>({unit})</span>}</label>
      <input type="number" inputMode="decimal" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||"0"} min="0" step="any"
        style={{width:"100%",padding:"12px 14px",border:"2px solid #e5e7eb",borderRadius:10,fontSize:16,fontWeight:600,color:"#111827",background:"#f9fafb",fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
    </div>
  );
}
function CalcResult({label,value,unit,highlight}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",background:highlight?"#f0fdf4":"#f9fafb",borderRadius:8,marginBottom:6,border:highlight?"1px solid #bbf7d0":"1px solid #f3f4f6"}}>
      <span style={{fontSize:13,color:"#374151"}}>{label}</span>
      <span style={{fontSize:15,fontWeight:700,color:highlight?"#166534":"#111827"}}>{value} <span style={{fontSize:12,fontWeight:400,color:"#6b7280"}}>{unit}</span></span>
    </div>
  );
}

function ShortstopCalc(){
  const [dbh,setDbh]=useState("");
  const [volPerInch,setVolPerInch]=useState("");
  const d=parseFloat(dbh)||0, v=parseFloat(volPerInch)||0;
  const shortstop = d>0 ? (d*d)/12 : null;
  const water = (d>0&&v>0) ? (d*v) - shortstop : null;
  const total = (shortstop!==null&&water!==null) ? shortstop+water : null;
  const fmtML = n => n!=null ? n.toFixed(2) : "—";
  return(
    <CalcCard title="💉 Shortstop 2SC — Soil Drench" color="#2563eb">
      <div style={{background:"#eff6ff",border:"1px solid #dbeafe",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:12,color:"#1e40af"}}>
        Volume per inch varies by tree species — check the Shortstop label for the correct value.
      </div>
      <CalcInput label="DBH" value={dbh} onChange={setDbh} placeholder="e.g. 12" unit="inches"/>
      <CalcInput label="Volume per inch (from label)" value={volPerInch} onChange={setVolPerInch} placeholder="e.g. 20" unit="mL/inch"/>
      {total!==null&&(
        <div style={{marginTop:14}}>
          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:8}}>Results</div>
          <CalcResult label="mL of Shortstop" value={fmtML(shortstop)} unit="mL" highlight/>
          <CalcResult label="mL of Water" value={fmtML(water)} unit="mL"/>
          <CalcResult label="Total Solution" value={fmtML(total)} unit="mL"/>
        </div>
      )}
    </CalcCard>
  );
}

function PhosphoJetCalc(){
  const [dbh,setDbh]=useState("");
  const d=parseFloat(dbh)||0;
  const sites = d>0 ? Math.round(d/2) : null;
  const total = sites!=null ? sites*20 : null;
  const phospho = total!=null ? total/2.85 : null;
  const water = (total!=null&&phospho!=null) ? total-phospho : null;
  const volPerSite = (total!=null&&sites!=null&&sites>0) ? total/sites : null;
  const fmtML = n => n!=null ? n.toFixed(2) : "—";
  return(
    <CalcCard title="💉 PhosphoJet — Trunk Injection" color="#7e22ce">
      <CalcInput label="DBH" value={dbh} onChange={setDbh} placeholder="e.g. 12" unit="inches"/>
      {sites!=null&&(
        <div style={{marginTop:14}}>
          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:8}}>Results</div>
          <CalcResult label="Number of Injection Sites" value={sites} unit="sites"/>
          <CalcResult label="Total Solution Volume" value={fmtML(total)} unit="mL"/>
          <CalcResult label="PhosphoJet" value={fmtML(phospho)} unit="mL" highlight/>
          <CalcResult label="Water" value={fmtML(water)} unit="mL"/>
          <CalcResult label="Volume per Injection Site" value={fmtML(volPerSite)} unit="mL/site" highlight/>
          <div style={{background:"#fdf4ff",border:"1px solid #e9d5ff",borderRadius:8,padding:"8px 12px",marginTop:8,fontSize:12,color:"#7e22ce"}}>
            Mix ratio: 1 part PhosphoJet to 2 parts water
          </div>
        </div>
      )}
    </CalcCard>
  );
}

function MnJetCalc(){
  const [dbh,setDbh]=useState("");
  const [rate,setRate]=useState("low");
  const d=parseFloat(dbh)||0;
  const circ = d>0 ? d*3 : null;
  const sites = circ!=null ? Math.round(circ*0.1667) : null;
  const totalVol = (d>0&&sites!=null) ? d*(rate==="low"?5:12) : null;
  const volPerSite = (totalVol!=null&&sites!=null&&sites>0) ? totalVol/sites : null;
  const fmtML = n => n!=null ? n.toFixed(2) : "—";
  return(
    <CalcCard title="💉 MnJet — Trunk Injection" color="#0891b2">
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {[["low","🌱 Low Rate (Spring/Summer)"],["high","🍂 High Rate (Fall)"]].map(([val,lbl])=>(
          <button key={val} onClick={()=>setRate(val)} style={{flex:1,padding:"9px 6px",borderRadius:8,border:`2px solid ${rate===val?"#0891b2":"#e5e7eb"}`,background:rate===val?"#f0f9ff":"#f9fafb",color:rate===val?"#0e7490":"#6b7280",fontFamily:"inherit",fontSize:12,fontWeight:700,cursor:"pointer"}}>{lbl}</button>
        ))}
      </div>
      <div style={{background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:8,padding:"7px 12px",marginBottom:12,fontSize:12,color:"#0e7490"}}>
        Rate: <strong>{rate==="low"?"5 mL per inch DBH":"12 mL per inch DBH"}</strong>
      </div>
      <CalcInput label="DBH" value={dbh} onChange={setDbh} placeholder="e.g. 12" unit="inches"/>
      {circ!=null&&(
        <div style={{marginTop:14}}>
          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:8}}>Results</div>
          <CalcResult label="Circumference" value={circ.toFixed(1)} unit="inches"/>
          <CalcResult label="Number of Injection Sites" value={sites} unit="sites"/>
          <CalcResult label="Total MnJet Volume" value={fmtML(totalVol)} unit="mL" highlight/>
          <CalcResult label="Volume per Injection Site" value={fmtML(volPerSite)} unit="mL/site" highlight/>
        </div>
      )}
    </CalcCard>
  );
}

function CalculatorsScreen({onBack}){
  return(
    <div style={{minHeight:"100vh",background:"#f0f4f0"}}>
      <div style={{background:"linear-gradient(135deg,#1a2e1a,#2d4a2d)",padding:"18px 16px",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",maxWidth:500,margin:"0 auto"}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:8,padding:"7px 12px",color:"#8faf8f",fontSize:13,fontWeight:600,fontFamily:"inherit",cursor:"pointer",minWidth:60}}>← Back</button>
          <div style={{fontSize:17,fontWeight:700,color:"#fff",fontFamily:"'Playfair Display',serif"}}>Mix Rate Calculators</div>
          <div style={{minWidth:60}}/>
        </div>
      </div>
      <div style={{padding:"16px",maxWidth:500,margin:"0 auto",paddingBottom:40}}>
        <p style={{fontSize:13,color:"#6b7280",marginBottom:16,textAlign:"center"}}>Enter tree measurements to calculate product volumes for trunk injections and soil drenches.</p>
        <ShortstopCalc/>
        <PhosphoJetCalc/>
        <MnJetCalc/>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TECH VIEW
// ════════════════════════════════════════════════════════════════════════════
function TechView({products,blends,transactions,techName,setTechName,onSave,onManagerRequest,session,profile,onSignOut}){
  const [screen,setScreen]=useState(techName?"log":"landing");
  const [logDate,setLogDate]=useState(today());
  const [entries,setEntries]=useState([{type:"product",id:"",amount:""}]);
  const [successEntries,setSuccessEntries]=useState([]);
  const [search,setSearch]=useState("");
  const [saving,setSaving]=useState(false);

  const updE=(i,k,v)=>setEntries(es=>es.map((e,idx)=>idx===i?{...e,[k]:v}:e));
  const addE=()=>setEntries(es=>[...es,{type:"product",id:"",amount:""}]);
  const remE=(i)=>setEntries(es=>es.filter((_,idx)=>idx!==i));

  const selectTech=(name)=>{setTechName(name);setEntries([{type:"product",id:"",amount:""}]);setLogDate(today());setScreen("log");};

  const submit=async()=>{
    const valid=entries.filter(e=>e.id&&e.amount);
    if(!valid.length||saving)return;
    setSaving(true);
    const updP=[...products],newT=[];
    for(const entry of valid){
      if(entry.type==="blend"){
        const blend=blends.find(b=>b.id===parseInt(entry.id));if(!blend)continue;
        const comps=products.filter(p=>blend.product_ids.includes(p.id));const deds=[];
        for(const p of comps){
          const pi=updP.findIndex(u=>u.id===p.id);if(pi===-1)continue;
          const used=calcUsed(p,entry.amount),cpu=cpUnit(p),upc=p.container_size*(p.conversion_rate||1);
          updP[pi]={...updP[pi],containers:Math.max(0,updP[pi].containers-(upc>0?used/upc:0))};
          deds.push({product_id:p.id,product_name:p.name,product_used:used,product_unit:p.mix_unit||p.container_unit,product_cost:used*cpu});
        }
        newT.push({id:Date.now()+Math.random(),type:"usage",subtype:"blend",date:logDate,tech_name:techName,blend_id:blend.id,blend_name:blend.name,input_amount:parseFloat(entry.amount),input_unit:"gal mix",components:deds,product_cost:deds.reduce((s,c)=>s+(c.product_cost||0),0)});
      } else {
        const pi=updP.findIndex(p=>p.id===parseInt(entry.id));if(pi===-1)continue;
        const p=updP[pi],used=calcUsed(p,entry.amount),cpu=cpUnit(p),upc=p.container_size*(p.conversion_rate||1);
        updP[pi]={...p,containers:Math.max(0,p.containers-(upc>0?used/upc:0))};
        newT.push({id:Date.now()+Math.random(),type:"usage",subtype:"product",date:logDate,tech_name:techName,product_id:p.id,product_name:p.name,input_amount:parseFloat(entry.amount),input_unit:p.mix_rate?"gal mix":(p.mix_unit||p.container_unit),product_used:used,product_unit:p.mix_unit||p.container_unit,product_cost:used*cpu});
      }
    }
    await onSave(updP,newT);
    setSaving(false);
    setSuccessEntries(valid);
    setScreen("success");
  };

  const filtP=products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name));
  const hdr=(title,back,right)=>(
    <div style={{background:"linear-gradient(135deg,#1a2e1a,#2d4a2d)",padding:"18px 16px",position:"sticky",top:0,zIndex:10}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",maxWidth:500,margin:"0 auto"}}>
        <button onClick={back} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:8,padding:"7px 12px",color:"#8faf8f",fontSize:13,fontWeight:600,fontFamily:"inherit",cursor:"pointer",minWidth:60}}>← Back</button>
        <div style={{fontSize:17,fontWeight:700,color:"#fff",fontFamily:"'Playfair Display',serif",textAlign:"center"}}>{title}</div>
        {right||<div style={{minWidth:60}}/>}
      </div>
    </div>
  );

  if(screen==="success") return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#166534,#14532d)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <style>{`@keyframes popIn{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}`}</style>
      <div style={{animation:"popIn 0.5s cubic-bezier(.34,1.56,.64,1) both",fontSize:72,marginBottom:16}}>✓</div>
      <h2 style={{margin:"0 0 8px",color:"#fff",fontSize:26,fontFamily:"'Playfair Display',serif",textAlign:"center"}}>Logged!</h2>
      <p style={{margin:"0 0 28px",color:"#86efac",fontSize:15,textAlign:"center"}}>{techName} · {new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"})}</p>
      <div style={{background:"rgba(255,255,255,0.12)",borderRadius:14,padding:"16px 20px",width:"100%",maxWidth:380,marginBottom:28}}>
        {successEntries.map((e,i)=>{
          if(e.type==="blend"){
            const blend=blends.find(b=>b.id===parseInt(e.id));if(!blend)return null;
            const comps=products.filter(p=>blend.product_ids.includes(p.id));
            return(<div key={i} style={{paddingBottom:10,marginBottom:10,borderBottom:i<successEntries.length-1?"1px solid rgba(255,255,255,0.1)":"none"}}>
              <div style={{color:"#fff",fontSize:14,fontWeight:700,marginBottom:4}}>🧬 {blend.name} — {e.amount} gal mix</div>
              {comps.map(p=><div key={p.id} style={{display:"flex",justifyContent:"space-between",color:"#86efac",fontSize:12,marginBottom:2}}><span>↳ {p.name.length>30?p.name.slice(0,30)+"…":p.name}</span><span>−{fmtN(calcUsed(p,e.amount))} {p.mix_unit||p.container_unit}</span></div>)}
            </div>);
          }
          const p=products.find(pr=>pr.id===parseInt(e.id));if(!p)return null;
          return(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i<successEntries.length-1?"1px solid rgba(255,255,255,0.1)":"none"}}>
            <div><div style={{color:"#fff",fontSize:14,fontWeight:600}}>{p.name.length>28?p.name.slice(0,28)+"…":p.name}</div><div style={{color:"#86efac",fontSize:12}}>{e.amount} {p.mix_rate?"gal mix":(p.mix_unit||p.container_unit)}</div></div>
            <div style={{color:"#4ade80",fontWeight:700,fontSize:14}}>−{fmtN(calcUsed(p,e.amount))} {p.mix_unit||p.container_unit}</div>
          </div>);
        })}
      </div>
      <button onClick={()=>{setEntries([{type:"product",id:"",amount:""}]);setLogDate(today());setScreen("log");}} style={{background:"#fff",color:"#166534",border:"none",borderRadius:12,padding:"15px 40px",fontSize:16,fontWeight:700,fontFamily:"inherit",cursor:"pointer",width:"100%",maxWidth:380,marginBottom:12}}>Log More</button>
      <button onClick={()=>{setScreen("landing");setTechName("");}} style={{background:"rgba(255,255,255,0.15)",color:"#fff",border:"none",borderRadius:12,padding:"12px 40px",fontSize:14,fontWeight:600,fontFamily:"inherit",cursor:"pointer",width:"100%",maxWidth:380}}>Done</button>
    </div>
  );

  if(screen==="landing") {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const displayName = profile?.full_name || session?.user?.email || "";
    const firstName = displayName.split(" ")[0].split("@")[0] || "there";
    const todayStr = today();
    const myTodayLogs = (transactions || []).filter(t =>
      t.date === todayStr &&
      t.tech_name === displayName &&
      t.type === "usage"
    );
    const todayCount = myTodayLogs.length;
    const todayCost = myTodayLogs.reduce((s, t) => s + (t.product_cost || 0), 0);
    return(
      <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#1a2e1a,#0d1a0d)",display:"flex",flexDirection:"column"}}>
        <style>{`
          @keyframes fadeUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
          .land-scroll{flex:1;display:flex;flex-direction:column;padding-bottom:calc(96px + env(safe-area-inset-bottom))}
          .land-container{display:flex;flex-direction:column;gap:22px;padding:34px 20px 20px;max-width:900px;margin:0 auto;width:100%;box-sizing:border-box;flex:1}
          .land-primary{display:flex;flex-direction:column;gap:20px;animation:fadeUp 0.4s ease}
          .land-log{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:18px 20px;animation:fadeUp 0.5s ease 0.05s both}
          .hero-btn{background:linear-gradient(135deg,#2d6a2d,#4a9e4a);border:none;border-radius:16px;padding:22px 24px;color:#fff;font-size:18px;font-weight:700;font-family:inherit;cursor:pointer;box-shadow:0 12px 32px rgba(74,158,74,0.35);width:100%;transition:transform 0.15s}
          .hero-btn:active{transform:scale(0.98)}
          .land-signout{text-align:center;padding:22px 0 8px}
          .land-signout button{background:none;border:none;color:rgba(255,255,255,0.28);font-family:inherit;font-size:10px;font-weight:500;cursor:pointer;padding:6px 12px;text-decoration:underline;letter-spacing:0.04em}
          .land-nav{display:flex;gap:6px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:rgba(13,26,13,0.95);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid rgba(255,255,255,0.08);position:fixed;bottom:0;left:0;right:0;z-index:50}
          .nav-btn{flex:1;background:none;border:none;color:#8faf8f;font-family:inherit;font-size:11px;font-weight:600;padding:8px 4px;cursor:pointer;border-radius:10px;display:flex;flex-direction:column;align-items:center;gap:3px;min-height:52px;transition:background 0.15s}
          .nav-btn:active{background:rgba(255,255,255,0.08)}
          .nav-icon{font-size:20px;line-height:1}
          @media (min-width: 900px) {
            .land-scroll{padding-bottom:20px}
            .land-container{flex-direction:row;gap:32px;padding:60px 32px 20px;max-width:1100px;align-items:flex-start}
            .land-primary{flex:1;max-width:480px}
            .land-log{flex:1}
            .land-nav{position:static;background:transparent;border-top:none;padding:12px 0 4px;max-width:900px;margin:8px auto 0;backdrop-filter:none;-webkit-backdrop-filter:none}
            .nav-btn{color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04)}
          }
        `}</style>
        <div className="land-scroll">
          <div className="land-container">
            <div className="land-primary">
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#4a9e4a",letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:8}}>Plant Health Care</div>
                <h1 style={{margin:0,fontSize:34,fontFamily:"'Playfair Display',serif",color:"#fff",lineHeight:1.15}}>Daily Log</h1>
                <p style={{margin:"6px 0 0",color:"#6b9e6b",fontSize:13}}>{now.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</p>
              </div>
              <div>
                <div style={{fontSize:22,fontWeight:700,color:"#fff",marginBottom:6}}>{greeting}, {firstName} 👋</div>
                <div style={{fontSize:14,color:"#8faf8f",lineHeight:1.5}}>
                  {todayCount === 0
                    ? "Nothing logged yet today."
                    : `You've logged ${todayCount} item${todayCount===1?"":"s"} today${todayCost>0?` · ${fmt$(todayCost)}`:""}.`}
                </div>
              </div>
              <button className="hero-btn" onClick={()=>{setEntries([{type:"product",id:"",amount:""}]);setLogDate(today());setScreen("log");}}>
                Start Logging →
              </button>
            </div>
            <div className="land-log">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:"#8faf8f",letterSpacing:"0.15em",textTransform:"uppercase"}}>Today's Log</div>
                <div style={{fontSize:11,color:"#4a9e4a",fontWeight:600}}>{todayCount} {todayCount===1?"entry":"entries"}</div>
              </div>
              {myTodayLogs.length === 0 ? (
                <div style={{padding:"22px 12px",textAlign:"center",color:"rgba(255,255,255,0.35)",fontSize:13}}>
                  Nothing yet — your logs today will show here.
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {myTodayLogs.map(t => (
                    <div key={t.id} style={{background:"rgba(255,255,255,0.05)",borderRadius:10,padding:"10px 12px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {t.subtype === "blend" ? `🧬 ${t.blend_name}` : t.product_name}
                          </div>
                          <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:2}}>
                            {t.subtype === "blend" ? `${t.input_amount} gal mix` : `${t.input_amount} ${t.input_unit||""}`}
                          </div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{fontSize:12,color:"#fca5a5",fontWeight:700,whiteSpace:"nowrap"}}>
                            {t.subtype === "blend"
                              ? `${t.components?.length||0} products`
                              : `−${fmtN(t.product_used)} ${t.product_unit||""}`}
                          </div>
                          {t.product_cost > 0 && (
                            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:2}}>{fmt$(t.product_cost)}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="land-signout">
            <button onClick={onSignOut}>Sign out</button>
          </div>
        </div>
        <div className="land-nav">
          <button className="nav-btn" onClick={()=>setScreen("inventory")}>
            <span className="nav-icon">📦</span>
            <span>Stock</span>
          </button>
          <button className="nav-btn" onClick={()=>setScreen("cheatsheet")}>
            <span className="nav-icon">📋</span>
            <span>Mix Rates</span>
          </button>
          <button className="nav-btn" onClick={()=>setScreen("calculators")}>
            <span className="nav-icon">🧮</span>
            <span>Calc</span>
          </button>
          {onManagerRequest && (
            <button className="nav-btn" onClick={onManagerRequest}>
              <span className="nav-icon">⚙</span>
              <span>Manager</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if(screen==="log"){
    const canSubmit=entries.some(e=>e.id&&e.amount)&&!saving;
    return(
      <div style={{minHeight:"100vh",background:"#f0f4f0"}}>
        <style>{`select{appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%236b7280' d='M6 8L0 0h12z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center}`}</style>
        {hdr(techName,()=>setScreen("landing"),
          <button onClick={()=>setScreen("cheatsheet")} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:8,padding:"7px 12px",color:"#8faf8f",fontSize:13,fontWeight:600,fontFamily:"inherit",cursor:"pointer",minWidth:60}}>📋 Rates</button>
        )}
        <div style={{padding:"18px 16px 120px",maxWidth:500,margin:"0 auto"}}>
          <div style={{background:"#fff",borderRadius:14,padding:"12px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:12,border:"1.5px solid #e5e7eb"}}>
            <span style={{fontSize:18}}>📅</span>
            <div style={{flex:1}}>
              <div style={{fontSize:10,fontWeight:700,color:"#6b7280",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:3}}>Date</div>
              <input type="date" value={logDate} onChange={e=>setLogDate(e.target.value)} style={{...iSM,padding:"4px 0",border:"none",background:"transparent",fontSize:15,fontWeight:600,color:"#111827",width:"auto"}}/>
            </div>
          </div>
          {entries.map((entry,i)=>{
            const isB=entry.type==="blend",blend=isB?blends.find(b=>b.id===parseInt(entry.id)):null,product=!isB?products.find(p=>p.id===parseInt(entry.id)):null;
            const bComps=blend?products.filter(p=>blend.product_ids.includes(p.id)):[];
            return(
              <div key={i} style={{background:"#fff",borderRadius:16,padding:"16px",marginBottom:12,border:"1.5px solid #e5e7eb",position:"relative"}}>
                {entries.length>1&&<button onClick={()=>remE(i)} style={{position:"absolute",top:12,right:12,background:"#fee2e2",border:"none",borderRadius:8,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:14,color:"#dc2626"}}>×</button>}
                {blends.length>0&&(
                  <div style={{display:"flex",gap:8,marginBottom:12}}>
                    {[["blend","🧬 Blend"],["product","Single Product"]].map(([val,lbl])=>(
                      <button key={val} onClick={()=>updE(i,"type",val)} style={{flex:1,padding:"8px 6px",borderRadius:8,border:`2px solid ${entry.type===val?(val==="blend"?"#9333ea":"#4a9e4a"):"#e5e7eb"}`,background:entry.type===val?(val==="blend"?"#fdf4ff":"#f0fdf4"):"#f9fafb",color:entry.type===val?(val==="blend"?"#7e22ce":"#166534"):"#6b7280",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer"}}>{lbl}</button>
                    ))}
                  </div>
                )}
                <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:7}}>{isB?"Blend":"Product"}{entries.length>1?` #${i+1}`:""}</div>
                <select style={{...iSM,marginBottom:10,paddingRight:40}} value={entry.id} onChange={e=>updE(i,"id",e.target.value)}>
                  <option value="">Select {isB?"a blend":"a product"}…</option>
                  {isB?[...blends].sort((a,b)=>a.name.localeCompare(b.name)).map(b=><option key={b.id} value={b.id}>{b.name}</option>):[...products].sort((a,b)=>a.name.localeCompare(b.name)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {isB&&blend&&<div style={{background:"#fdf4ff",border:"1px solid #e9d5ff",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:12}}><div style={{fontWeight:700,color:"#7e22ce",marginBottom:3}}>Contains {bComps.length} products:</div>{bComps.map(p=><div key={p.id} style={{color:"#6b21a8",marginBottom:1}}>· {p.name} <span style={{color:"#a855f7"}}>({p.mix_rate} {p.mix_unit}/{p.mix_per})</span></div>)}</div>}
                {!isB&&product&&<div style={{background:product.mix_rate?"#f0fdf4":"#f8faff",border:`1px solid ${product.mix_rate?"#bbf7d0":"#dbeafe"}`,borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:13}}>{product.mix_rate?<span style={{color:"#166534"}}>🧪 Mix: <strong>{product.mix_rate} {product.mix_unit} / {product.mix_per}</strong> — enter gal of mix</span>:<span style={{color:"#1e40af"}}>💉 Direct — enter <strong>{product.mix_unit||product.container_unit}</strong></span>}</div>}
                {(isB?blend:product)&&(
                  <>
                    <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:6}}>{isB||product?.mix_rate?"Gallons of Mix Applied":`Amount (${product?.mix_unit||product?.container_unit})`}</div>
                    <input type="number" inputMode="decimal" style={{...iSM,fontSize:22,fontWeight:700,color:"#1a2e1a",textAlign:"center",padding:"14px"}} value={entry.amount} onChange={e=>updE(i,"amount",e.target.value)} placeholder="0" min="0" step="any"/>
                    {entry.amount>0&&isB&&blend&&<div style={{marginTop:8,background:"#fdf4ff",border:"1px solid #e9d5ff",borderRadius:8,padding:"9px 12px"}}><div style={{fontSize:11,fontWeight:700,color:"#7e22ce",marginBottom:5}}>Will deduct:</div>{bComps.map(p=><div key={p.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#6b21a8",marginBottom:2}}><span>{p.name.length>30?p.name.slice(0,30)+"…":p.name}</span><strong>−{fmtN(calcUsed(p,entry.amount))} {p.mix_unit||p.container_unit}</strong></div>)}</div>}
                    {entry.amount>0&&!isB&&product&&<div style={{marginTop:8,background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"8px 12px",display:"flex",justifyContent:"space-between",fontSize:13,color:"#166534"}}><span>Concentrate used:</span><strong>{fmtN(calcUsed(product,entry.amount))} {product.mix_unit||product.container_unit}</strong></div>}
                  </>
                )}
              </div>
            );
          })}
          <button onClick={addE} style={{width:"100%",background:"transparent",border:"2px dashed #c5d9c5",borderRadius:14,padding:"13px",color:"#4a9e4a",fontSize:15,fontWeight:700,fontFamily:"inherit",cursor:"pointer"}}>+ Add Another</button>
        </div>
        <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(240,244,240,0.96)",backdropFilter:"blur(8px)",padding:"12px 16px 28px",borderTop:"1px solid #e5e7eb"}}>
          <div style={{maxWidth:500,margin:"0 auto"}}>
            <button onClick={submit} disabled={!canSubmit} style={{width:"100%",background:canSubmit?"linear-gradient(135deg,#2d6a2d,#4a9e4a)":"#d1d5db",border:"none",borderRadius:14,padding:"17px",color:"#fff",fontSize:17,fontWeight:700,fontFamily:"inherit",cursor:canSubmit?"pointer":"default",boxShadow:canSubmit?"0 4px 20px rgba(74,158,74,0.35)":"none"}}>
              {saving?"Saving…":`Submit Log (${entries.filter(e=>e.id&&e.amount).length} item${entries.filter(e=>e.id&&e.amount).length!==1?"s":""})`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if(screen==="inventory") return(
    <div style={{minHeight:"100vh",background:"#f0f4f0"}}>
      {hdr("Stock Levels",()=>setScreen("landing"))}
      <div style={{padding:"16px",maxWidth:500,margin:"0 auto"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{...iSM,marginBottom:12}}/>
        {filtP.map(p=>{
          const lvl=p.containers<=0?"critical":p.containers<0.5?"low":"ok";
          return(<div key={p.id} style={{background:"#fff",borderRadius:14,padding:"13px 16px",marginBottom:10,border:`1.5px solid ${lvl==="critical"?"#fecaca":lvl==="low"?"#fed7aa":"#e5e7eb"}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1,paddingRight:10}}><div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:2}}>{p.name}</div><div style={{fontSize:12,color:"#6b7280"}}>{fmtN(totalVol(p))} {p.mix_unit||p.container_unit}</div></div>
              <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:17,fontWeight:700,color:lvl==="critical"?"#dc2626":lvl==="low"?"#d97706":"#166534"}}>{fmtN(p.containers,2)}</div><div style={{fontSize:11,color:"#9ca3af"}}>containers</div></div>
            </div>
            <div style={{background:"#e5e7eb",borderRadius:99,height:4,marginTop:8}}><div style={{background:lvl==="critical"?"#ef4444":lvl==="low"?"#f59e0b":"#4a9e4a",width:`${Math.min(100,p.containers*25)}%`,height:"100%",borderRadius:99}}/></div>
            {lvl!=="ok"&&<div style={{marginTop:5,fontSize:11,fontWeight:700,color:lvl==="critical"?"#dc2626":"#d97706"}}>{lvl==="critical"?"⚠ OUT OF STOCK":"⚠ Low stock"}</div>}
          </div>);
        })}
      </div>
    </div>
  );

  if(screen==="cheatsheet"){
    const mixP=products.filter(p=>p.mix_rate).sort((a,b)=>a.name.localeCompare(b.name)),dirP=products.filter(p=>!p.mix_rate).sort((a,b)=>a.name.localeCompare(b.name));
    return(
      <div style={{minHeight:"100vh",background:"#f0f4f0"}}>
        {hdr("Mix Rate Guide",()=>setScreen(techName?"log":"landing"))}
        <div style={{padding:"16px",maxWidth:500,margin:"0 auto"}}>
          {blends.length>0&&<>
            <div style={{fontSize:11,fontWeight:700,color:"#7e22ce",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>🧬 Blends</div>
            {[...blends].sort((a,b)=>a.name.localeCompare(b.name)).map(b=>{const comps=products.filter(p=>b.product_ids.includes(p.id));return(<div key={b.id} style={{background:"#fff",borderRadius:14,padding:"13px 16px",marginBottom:10,border:`1.5px solid ${b.color}44`,position:"relative",overflow:"hidden"}}><div style={{position:"absolute",top:0,left:0,right:0,height:3,background:b.color}}/><div style={{fontWeight:700,fontSize:14,color:"#111827",marginBottom:6}}>{b.name}</div>{comps.map(p=><div key={p.id} style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:3}}><span style={{color:"#374151"}}>· {p.name.length>30?p.name.slice(0,30)+"…":p.name}</span><strong style={{color:b.color,whiteSpace:"nowrap",marginLeft:8}}>{p.mix_rate} {p.mix_unit}/{p.mix_per}</strong></div>)}</div>);})}
            <div style={{marginBottom:18}}/>
          </>}
          <div style={{fontSize:11,fontWeight:700,color:"#4a9e4a",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>🧪 Mixed Products</div>
          {mixP.map(p=><div key={p.id} style={{background:"#fff",borderRadius:14,padding:"12px 16px",marginBottom:8,border:"1.5px solid #e5e7eb"}}><div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:6}}>{p.name}</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><span style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:7,padding:"4px 10px",fontSize:12,fontWeight:700,color:"#166534"}}>{p.mix_rate} {p.mix_unit} / {p.mix_per}</span><span style={{background:"#f8faff",border:"1px solid #dbeafe",borderRadius:7,padding:"4px 10px",fontSize:12,color:"#1e40af"}}>{p.container_size} {p.container_unit}</span></div></div>)}
          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10,marginTop:18}}>💉 Direct Use</div>
          {dirP.map(p=><div key={p.id} style={{background:"#fff",borderRadius:14,padding:"12px 16px",marginBottom:8,border:"1.5px solid #e5e7eb"}}><div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:3}}>{p.name}</div><div style={{fontSize:13,color:"#6b7280"}}>Log in: <strong style={{color:"#374151"}}>{p.mix_unit||p.container_unit}</strong></div></div>)}
        </div>
      </div>
    );
  }

  if(screen==="calculators") return <CalculatorsScreen onBack={()=>setScreen(techName?"log":"landing")}/>;

  return null;
}

function BlendCard({b, products, onEdit, onDelete}){
  const [exp, setExp] = useState(false);
  const comps = products.filter(p => b.product_ids.includes(p.id));
  return(
    <div style={{background:"#fff",borderRadius:14,border:"1.5px solid #e5e7eb",overflow:"hidden",marginBottom:12}}>
      <div style={{height:4,background:b.color}}/>
      <div style={{padding:"13px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
              <span>🧬</span>
              <span style={{fontWeight:700,fontSize:15,color:"#111827"}}>{b.name}</span>
              <span style={{background:b.color+"22",color:b.color,fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:99}}>BLEND</span>
            </div>
            {b.description&&<div style={{fontSize:13,color:"#6b7280",marginBottom:4}}>{b.description}</div>}
            <div style={{fontSize:13,color:"#374151"}}><span style={{fontWeight:600}}>{comps.length} products</span></div>
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0,marginLeft:10}}>
            <button onClick={()=>setExp(e=>!e)} style={{background:"#f3f4f6",border:"none",borderRadius:6,padding:"5px 9px",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:600}}>{exp?"▲":"▼"}</button>
            <button onClick={()=>onEdit(b)} style={{background:"#f3f4f6",border:"none",borderRadius:6,padding:"5px 7px",cursor:"pointer",fontSize:12}}>✏️</button>
            <button onClick={()=>onDelete(b.id)} style={{background:"#fee2e2",border:"none",borderRadius:6,padding:"5px 7px",cursor:"pointer",fontSize:12}}>🗑️</button>
          </div>
        </div>
        {exp&&<div style={{marginTop:10,borderTop:"1px solid #f3f4f6",paddingTop:10}}>
          {comps.map((p,i)=>(
            <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 9px",background:i%2===0?"#f9fafb":"#fff",borderRadius:6,marginBottom:3}}>
              <span style={{fontSize:13,color:"#374151"}}>{p.name}</span>
              <span style={{fontSize:12,fontWeight:700,color:"#166534",background:"#f0fdf4",padding:"2px 7px",borderRadius:5,whiteSpace:"nowrap",marginLeft:8}}>{p.mix_rate?`${p.mix_rate} ${p.mix_unit}/${p.mix_per}`:"Direct"}</span>
            </div>
          ))}
        </div>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// USERS VIEW (admin only)
// ════════════════════════════════════════════════════════════════════════════
const ROLE_LABELS = {
  admin: "Admin",
  manager: "Manager",
  phc_team_lead: "PHC Team Lead",
  phc_tech: "PHC Tech",
  gtc_team_lead: "GTC Team Lead",
  gtc_tech: "GTC Tech",
};
const ROLE_KEYS = Object.keys(ROLE_LABELS);

function UsersView({currentProfile, showToast, iS, Btn}){
  const [users, setUsers] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({email:"", full_name:"", role:"phc_tech"});
  const [pendingRow, setPendingRow] = useState(null); // user_id being modified
  const [confirmRemove, setConfirmRemove] = useState(null); // user object
  const [linkModal, setLinkModal] = useState(null); // { title, subtitle, link, email }
  const [copied, setCopied] = useState(false);

  const reload = async () => {
    try {
      const rows = await listProfiles();
      setUsers(rows);
      setLoadErr(null);
    } catch (e) {
      setLoadErr(e.message || String(e));
    }
  };
  useEffect(() => { reload(); }, []);

  const submitInvite = async () => {
    const email = inviteForm.email.trim().toLowerCase();
    const full_name = inviteForm.full_name.trim();
    if (!email || !full_name) return showToast("Email and name are required.", "error");
    setInviting(true);
    try {
      const res = await inviteUser({email, full_name, role: inviteForm.role});
      setShowInvite(false);
      setInviteForm({email:"", full_name:"", role:"phc_tech"});
      reload();
      setLinkModal({
        title: `Invite ready for ${full_name}`,
        subtitle: `Send this sign-in link to ${email} however you like (text, Slack, in person). It signs them in the first time — after that their session persists.`,
        link: res.action_link,
        email,
      });
    } catch (e) {
      showToast(e.message || "Invite failed", "error");
    } finally {
      setInviting(false);
    }
  };

  const getSignInLink = async (u) => {
    setPendingRow(u.id);
    try {
      const res = await resendSignInLink({email: u.email});
      setLinkModal({
        title: `Sign-in link for ${u.full_name}`,
        subtitle: `Share this link with ${u.email}. Signs them in without needing an email.`,
        link: res.action_link,
        email: u.email,
      });
    } catch (e) {
      showToast(e.message || "Could not generate link", "error");
    } finally {
      setPendingRow(null);
    }
  };

  const copyLink = async () => {
    if (!linkModal?.link) return;
    try {
      await navigator.clipboard.writeText(linkModal.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Couldn't access clipboard — copy manually", "error");
    }
  };

  const closeLinkModal = () => { setLinkModal(null); setCopied(false); };

  const changeRole = async (u, newRole) => {
    if (newRole === u.role) return;
    setPendingRow(u.id);
    try {
      await updateUserRole({user_id: u.id, role: newRole});
      showToast(`${u.full_name} → ${ROLE_LABELS[newRole]}`);
      reload();
    } catch (e) {
      showToast(e.message || "Update failed", "error");
    } finally {
      setPendingRow(null);
    }
  };

  const doRemove = async (u) => {
    setPendingRow(u.id);
    try {
      await removeUser({user_id: u.id});
      showToast(`${u.full_name} removed`);
      setConfirmRemove(null);
      reload();
    } catch (e) {
      showToast(e.message || "Remove failed", "error");
    } finally {
      setPendingRow(null);
    }
  };

  return (
    <div style={{animation:"fadeUp 0.3s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
        <div>
          <h1 style={{margin:0,fontSize:25,fontFamily:"'Playfair Display',serif",color:"#1a2e1a"}}>Users</h1>
          <p style={{margin:"4px 0 0",color:"#6b7280",fontSize:13}}>Invite teammates and control who has access to the app.</p>
        </div>
        <Btn onClick={()=>setShowInvite(true)}>+ Invite User</Btn>
      </div>

      {loadErr && <div style={{background:"#fef2f2",border:"1px solid #fecaca",color:"#991b1b",padding:"10px 14px",borderRadius:10,marginBottom:14,fontSize:13}}>Couldn't load users: {loadErr}</div>}

      <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:"#f9fafb"}}>
              {["Name","Email","Role","Added",""].map(h=><th key={h} style={{padding:"10px 13px",textAlign:"left",fontSize:10,fontWeight:700,color:"#6b7280",letterSpacing:"0.07em",textTransform:"uppercase",borderBottom:"1px solid #e5e7eb",whiteSpace:"nowrap"}}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {users === null && <tr><td colSpan={5} style={{padding:24,textAlign:"center",color:"#9ca3af"}}>Loading users…</td></tr>}
            {users && users.length === 0 && <tr><td colSpan={5} style={{padding:24,textAlign:"center",color:"#9ca3af"}}>No users yet.</td></tr>}
            {users && users.map((u)=>{
              const isSelf = u.id === currentProfile.id;
              const busy = pendingRow === u.id;
              return (
                <tr key={u.id} style={{borderBottom:"1px solid #f3f4f6"}}>
                  <td style={{padding:"10px 13px",fontWeight:600,color:"#111827"}}>{u.full_name}{isSelf && <span style={{marginLeft:6,fontSize:11,color:"#9ca3af",fontWeight:400}}>(you)</span>}</td>
                  <td style={{padding:"10px 13px",color:"#6b7280"}}>{u.email}</td>
                  <td style={{padding:"10px 13px"}}>
                    <select value={u.role} disabled={isSelf || busy} onChange={e=>changeRole(u, e.target.value)} style={{...iS, padding:"6px 10px", fontSize:13, width:"auto", minWidth:150, opacity:isSelf?0.55:1}}>
                      {ROLE_KEYS.map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </td>
                  <td style={{padding:"10px 13px",color:"#6b7280",fontSize:12,whiteSpace:"nowrap"}}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                  <td style={{padding:"10px 10px",whiteSpace:"nowrap",textAlign:"right"}}>
                    {!isSelf && (
                      <>
                        <button onClick={()=>getSignInLink(u)} disabled={busy} style={{background:"#eef2ff",border:"none",borderRadius:5,padding:"5px 10px",cursor:busy?"default":"pointer",fontSize:12,color:"#4338ca",fontFamily:"inherit",fontWeight:600,marginRight:6,opacity:busy?0.5:1}}>Get link</button>
                        <button onClick={()=>setConfirmRemove(u)} disabled={busy} style={{background:"#fee2e2",border:"none",borderRadius:5,padding:"5px 10px",cursor:busy?"default":"pointer",fontSize:12,color:"#dc2626",fontFamily:"inherit",fontWeight:600,opacity:busy?0.5:1}}>Remove</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showInvite && (
        <div style={{position:"fixed",inset:0,background:"rgba(10,20,10,0.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:460,padding:"22px 26px"}}>
            <h3 style={{margin:"0 0 14px",fontSize:19,fontFamily:"'Playfair Display',serif",color:"#1a2e1a"}}>Invite User</h3>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:5}}>Email</div>
              <input type="email" value={inviteForm.email} onChange={e=>setInviteForm(f=>({...f,email:e.target.value}))} placeholder="teammate@example.com" style={iS} autoFocus/>
            </div>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:5}}>Full Name</div>
              <input type="text" value={inviteForm.full_name} onChange={e=>setInviteForm(f=>({...f,full_name:e.target.value}))} placeholder="Jane Smith" style={iS}/>
            </div>
            <div style={{marginBottom:18}}>
              <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:5}}>Role</div>
              <select value={inviteForm.role} onChange={e=>setInviteForm(f=>({...f,role:e.target.value}))} style={iS}>
                {ROLE_KEYS.map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:10}}>
              <Btn onClick={submitInvite} disabled={inviting} style={{flex:1}}>{inviting?"Sending…":"Send Invite"}</Btn>
              <Btn onClick={()=>setShowInvite(false)} color="ghost">Cancel</Btn>
            </div>
          </div>
        </div>
      )}

      {confirmRemove && (
        <div style={{position:"fixed",inset:0,background:"rgba(10,20,10,0.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:420,padding:"22px 26px"}}>
            <h3 style={{margin:"0 0 8px",fontSize:19,fontFamily:"'Playfair Display',serif",color:"#1a2e1a"}}>Remove User</h3>
            <p style={{margin:"0 0 16px",color:"#6b7280",fontSize:14,lineHeight:1.5}}>
              Remove <strong style={{color:"#111827"}}>{confirmRemove.full_name}</strong> ({confirmRemove.email})? They'll lose access immediately and their sign-in link will stop working.
            </p>
            <div style={{display:"flex",gap:10}}>
              <Btn onClick={()=>doRemove(confirmRemove)} color="red" disabled={pendingRow===confirmRemove.id} style={{flex:1}}>{pendingRow===confirmRemove.id?"Removing…":"Yes, Remove"}</Btn>
              <Btn onClick={()=>setConfirmRemove(null)} color="ghost">Cancel</Btn>
            </div>
          </div>
        </div>
      )}

      {linkModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(10,20,10,0.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:520,padding:"22px 26px"}}>
            <div style={{textAlign:"center",fontSize:30,marginBottom:8}}>🔗</div>
            <h3 style={{margin:"0 0 6px",fontSize:19,fontFamily:"'Playfair Display',serif",color:"#1a2e1a",textAlign:"center"}}>{linkModal.title}</h3>
            <p style={{margin:"0 0 16px",color:"#6b7280",fontSize:13,textAlign:"center",lineHeight:1.5}}>{linkModal.subtitle}</p>
            <div style={{background:"#f9fafb",border:"1.5px solid #e5e7eb",borderRadius:10,padding:"10px 12px",marginBottom:12,wordBreak:"break-all",fontSize:12,fontFamily:"monospace",color:"#374151",maxHeight:120,overflow:"auto"}}>
              {linkModal.link}
            </div>
            <div style={{display:"flex",gap:10}}>
              <Btn onClick={copyLink} style={{flex:1}}>{copied?"✓ Copied":"Copy Link"}</Btn>
              <Btn onClick={closeLinkModal} color="ghost">Done</Btn>
            </div>
            <p style={{margin:"12px 0 0",color:"#9ca3af",fontSize:11,textAlign:"center"}}>The link is one-use. If it gets used or expires, come back here and click "Get link" again for a fresh one.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MANAGER VIEW
// ════════════════════════════════════════════════════════════════════════════
function ManagerView({products,blends,transactions,onSave,onSaveBlends,onExit,onSaveProducts,profile}){
  const [view,setView]=useState("dashboard");
  const [modal,setModal]=useState(null);
  const [editTarget,setEditTarget]=useState(null);
  const [toast,setToast]=useState(null);
  const [search,setSearch]=useState("");
  const [dateFrom,setDateFrom]=useState("");
  const [dateTo,setDateTo]=useState(today());
  const [form,setForm]=useState({});
  const [saving,setSaving]=useState(false);

  const showToast=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3500);};
  const totalVal=products.reduce((s,p)=>s+(p.containers*(p.cost_per_container||0)),0);
  const filtUsage=transactions.filter(t=>t.type==="usage"&&(!dateFrom||t.date>=dateFrom)&&(!dateTo||t.date<=dateTo));
  const usageCost=filtUsage.reduce((s,t)=>s+(t.product_cost||0),0);
  const filtP=products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name));

  const openLogUsage=()=>{setForm({date:today(),entries:[{type:"product",id:products[0]?.id||"",amount:""}]});setModal("logUsage");};
  const addUR=()=>setForm(f=>({...f,entries:[...f.entries,{type:"product",id:products[0]?.id||"",amount:""}]}));
  const remUR=(i)=>setForm(f=>({...f,entries:f.entries.filter((_,idx)=>idx!==i)}));
  const updUR=(i,k,v)=>setForm(f=>({...f,entries:f.entries.map((e,idx)=>idx===i?{...e,[k]:v}:e)}));

  const submitUsage=async()=>{
    const valid=form.entries.filter(e=>e.id&&e.amount);
    if(!valid.length||saving)return showToast("Fill in at least one row.","error");
    setSaving(true);
    const updP=[...products],newT=[];
    for(const entry of valid){
      if(entry.type==="blend"){
        const blend=blends.find(b=>b.id===parseInt(entry.id));if(!blend)continue;
        const comps=products.filter(p=>blend.product_ids.includes(p.id));const deds=[];
        for(const p of comps){const pi=updP.findIndex(u=>u.id===p.id);if(pi===-1)continue;const used=calcUsed(p,entry.amount),cpu=cpUnit(p),upc=p.container_size*(p.conversion_rate||1);updP[pi]={...updP[pi],containers:Math.max(0,updP[pi].containers-(upc>0?used/upc:0))};deds.push({product_id:p.id,product_name:p.name,product_used:used,product_unit:p.mix_unit||p.container_unit,product_cost:used*cpu});}
        newT.push({id:Date.now()+Math.random(),type:"usage",subtype:"blend",date:form.date,blend_id:blend.id,blend_name:blend.name,input_amount:parseFloat(entry.amount),input_unit:"gal mix",components:deds,product_cost:deds.reduce((s,c)=>s+(c.product_cost||0),0)});
      } else {
        const pi=updP.findIndex(p=>p.id===parseInt(entry.id));if(pi===-1)continue;
        const p=updP[pi],used=calcUsed(p,entry.amount),cpu=cpUnit(p),upc=p.container_size*(p.conversion_rate||1);
        updP[pi]={...p,containers:Math.max(0,p.containers-(upc>0?used/upc:0))};
        newT.push({id:Date.now()+Math.random(),type:"usage",subtype:"product",date:form.date,product_id:p.id,product_name:p.name,input_amount:parseFloat(entry.amount),input_unit:p.mix_rate?"gal mix":(p.mix_unit||p.container_unit),product_used:used,product_unit:p.mix_unit||p.container_unit,product_cost:used*cpu});
      }
    }
    await onSave(updP,newT);setSaving(false);showToast(`Logged ${newT.length} entr${newT.length>1?"ies":"y"}`);setModal(null);
  };

  const openRestock=()=>{setForm({date:today(),productId:products[0]?.id||"",containersAdded:"",vendor:"",notes:""});setModal("restock");};
  const submitRestock=async()=>{
    if(!form.productId||!form.containersAdded)return showToast("Fill in product and quantity.","error");
    const p=products.find(p=>p.id===parseInt(form.productId));if(!p)return;
    const added=parseFloat(form.containersAdded);
    setSaving(true);
    await onSave(products.map(pr=>pr.id===p.id?{...pr,containers:pr.containers+added}:pr),[{id:Date.now(),type:"restock",date:form.date,product_id:p.id,product_name:p.name,containers_added:added,container_unit:p.container_unit,container_size:p.container_size,total_cost_added:added*(p.cost_per_container||0),vendor:form.vendor,notes:form.notes}]);
    setSaving(false);showToast(`Restocked ${added} container${added>1?"s":""} of ${p.name}`);setModal(null);
  };

  const openAddP=()=>{setEditTarget(null);setForm({name:"",category:"Pesticide",product_type:"mixed",containers:"",container_size:"",container_unit:"gal",mix_rate:"",mix_unit:"fl oz",mix_per:"100",cost_per_container:""});setModal("editProduct");};
  const openEditP=(p)=>{setEditTarget(p);setForm({...p,product_type:p.mix_rate?"mixed":"direct",mix_rate:p.mix_rate??"",mix_per:p.mix_per?String(p.mix_per).replace(/[^\d.]/g,""):"100"});setModal("editProduct");};
  const submitProduct=async()=>{
    if(!form.name)return showToast("Product name required.","error");
    const s=buildSummary(form);if(s&&!s.valid)return showToast(s.error,"error");
    const isMix=form.product_type==="mixed",cs=parseFloat(form.container_size)||1,mu=isMix?form.mix_unit:form.container_unit,mp=isMix?(parseFloat(form.mix_per)||100):null,mr=isMix?(parseFloat(form.mix_rate)||null):null;
    let cr=null;if(isMix){const c=cvt(cs,form.container_unit,mu);cr=c!==null?c/cs:null;}else cr=1;
    const cleaned={...form,containers:parseFloat(form.containers)||0,container_size:cs,mix_rate:mr,mix_unit:mu,mix_per:mp?`${mp} gal`:null,conversion_rate:cr,cost_per_container:form.cost_per_container!==""?parseFloat(form.cost_per_container):null};
    setSaving(true);
    if(editTarget){await onSaveProducts(products.map(p=>p.id===editTarget.id?{...cleaned,id:editTarget.id}:p));showToast(`${form.name} updated`);}
    else{await onSaveProducts([...products,{...cleaned,id:Date.now()}]);showToast(`${form.name} added`);}
    setSaving(false);setModal(null);
  };
  const delProduct=async(id)=>{await onSaveProducts(products.filter(p=>p.id!==id));showToast("Product removed");};

  const openAddB=()=>{setEditTarget(null);setForm({name:"",description:"",color:BLEND_COLORS[0],product_ids:[]});setModal("editBlend");};
  const openEditB=(b)=>{setEditTarget(b);setForm({...b});setModal("editBlend");};
  const toggleBP=(id)=>setForm(f=>({...f,product_ids:(f.product_ids||[]).includes(id)?(f.product_ids||[]).filter(i=>i!==id):[...(f.product_ids||[]),id]}));
  const submitBlend=async()=>{
    if(!form.name)return showToast("Blend name required.","error");
    if(!form.product_ids?.length)return showToast("Add at least one product.","error");
    setSaving(true);
    if(editTarget){await onSaveBlends(blends.map(b=>b.id===editTarget.id?{...form,id:editTarget.id}:b));showToast(`${form.name} updated`);}
    else{await onSaveBlends([...blends,{...form,id:Date.now()}]);showToast(`${form.name} created`);}
    setSaving(false);setModal(null);
  };
  const delBlend=async(id)=>{await onSaveBlends(blends.filter(b=>b.id!==id));showToast("Blend removed");};

  const deleteTransaction=async(t)=>{
    setSaving(true);
    // Reverse inventory impact for usage transactions
    if(t.type==="usage"){
      const updP=[...products];
      if(t.subtype==="blend"&&t.components?.length){
        // Restore each component product
        for(const comp of t.components){
          const pi=updP.findIndex(p=>p.id===comp.product_id);
          if(pi===-1)continue;
          const upc=updP[pi].container_size*(updP[pi].conversion_rate||1);
          const containersToRestore=upc>0?comp.product_used/upc:0;
          updP[pi]={...updP[pi],containers:updP[pi].containers+containersToRestore};
        }
      } else if(t.product_id){
        // Restore single product
        const pi=updP.findIndex(p=>p.id===t.product_id);
        if(pi!==-1){
          const upc=updP[pi].container_size*(updP[pi].conversion_rate||1);
          const containersToRestore=upc>0?t.product_used/upc:0;
          updP[pi]={...updP[pi],containers:updP[pi].containers+containersToRestore};
        }
      }
      // Save restored inventory
      const {error:pErr}=await supabase.from("products").upsert(updP);
      if(pErr){setSaving(false);showToast("Failed to restore inventory.","error");return;}
    }
    // Delete the transaction record
    const {error}=await supabase.from("transactions").delete().eq("id",t.id);
    if(error){setSaving(false);showToast("Failed to delete entry.","error");return;}
    showToast(t.type==="usage"?"Entry deleted and inventory restored":"Entry deleted");
    setSaving(false);setModal(null);setEditTarget(null);
  };

  const openChangePC=()=>{setForm({np:"",cp:""});setModal("changePC");};
  const submitChangePC=()=>{if(form.np.length<4)return showToast("Min 4 characters.","error");if(form.np!==form.cp)return showToast("Passcodes don't match.","error");setPC(form.np);showToast("Passcode updated");setModal(null);};

  const exportCSV=()=>{
    const rows=[["PHC Inventory — "+new Date().toLocaleDateString()],[],["INVENTORY"],["Product","Containers","Container Size","Unit","Mix Rate","Cost/Container","Total Value"],...products.map(p=>[p.name,p.containers,p.container_size,p.container_unit,p.mix_rate?`${p.mix_rate} ${p.mix_unit}/${p.mix_per}`:"Direct",p.cost_per_container||"",(p.containers*(p.cost_per_container||0)).toFixed(2)]),[""],["BLENDS"],["Blend","Products"],...blends.map(b=>[b.name,products.filter(p=>b.product_ids.includes(p.id)).map(p=>p.name).join(" | ")]),[""],["TRANSACTIONS"],["Date","Type","Product/Blend","Tech","Input","Used","Cost"],...transactions.map(t=>t.subtype==="blend"?[t.date,"BLEND",t.blend_name,t.tech_name||"",`${t.input_amount} gal mix`,"(breakdown below)",fmt$(t.product_cost)]:t.type==="usage"?[t.date,"USAGE",t.product_name,t.tech_name||"",`${t.input_amount} ${t.input_unit}`,`${fmtN(t.product_used)} ${t.product_unit}`,fmt$(t.product_cost)]:[t.date,"RESTOCK",t.product_name,"",`+${t.containers_added} containers`,"",fmt$(t.total_cost_added)])];
    const csv=rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="PHC_Inventory.csv";a.click();
    showToast("Exported to CSV");
  };

  const exportUsageCSV=()=>{
    const rangeLabel=`${dateFrom||"start"}_to_${dateTo||today()}`;
    const rows=[[`PHC Usage History — ${dateFrom||"start"} to ${dateTo||today()}`],[],["Date","Type","Product / Blend","Tech","Input","Used","Unit","Cost"]];
    filtUsage.forEach(t=>{
      if(t.subtype==="blend"){
        rows.push([t.date,"BLEND",t.blend_name||"",t.tech_name||"",`${t.input_amount} gal mix`,"","",fmt$(t.product_cost||0)]);
        (t.components||[]).forEach(c=>rows.push([t.date,"  └ component",c.product_name||"",t.tech_name||"","",fmtN(c.product_used),c.product_unit||"",fmt$(c.product_cost||0)]));
      }else{
        rows.push([t.date,"USAGE",t.product_name||"",t.tech_name||"",`${t.input_amount} ${t.input_unit||""}`,fmtN(t.product_used),t.product_unit||"",fmt$(t.product_cost||0)]);
      }
    });
    const csv=rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=`PHC_Usage_${rangeLabel}.csv`;a.click();
    showToast("Exported usage history to CSV");
  };

  const exportInventoryCSV=()=>{
    const sorted=[...products].sort((a,b)=>a.name.localeCompare(b.name));
    const rows=[[`PHC Inventory — ${new Date().toLocaleDateString()}`],[],["Product","Containers","Container Size","Unit","Total Volume","Mix Rate","Cost/Container","Total Value"],...sorted.map(p=>[p.name,p.containers,p.container_size,p.container_unit,`${fmtN(totalVol(p))} ${p.mix_unit||p.container_unit}`,p.mix_rate?`${p.mix_rate} ${p.mix_unit}/${p.mix_per}`:"Direct",p.cost_per_container||"",(p.containers*(p.cost_per_container||0)).toFixed(2)]),[""],["Total Inventory Value","","","","","","",fmt$(totalVal)]];
    const csv=rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=`PHC_Inventory_${today()}.csv`;a.click();
    showToast("Exported inventory to CSV");
  };

  const isAdmin = profile?.role === "admin";
  const navItems=[
    {k:"dashboard",l:"Dashboard",i:"◈"},
    {k:"inventory",l:"Inventory",i:"⊞"},
    {k:"blends",l:"Blends",i:"🧬"},
    {k:"history",l:"History",i:"↺"},
    ...(isAdmin ? [{k:"users",l:"Users",i:"🔐"}] : []),
    {k:"settings",l:"Settings",i:"⚙"},
  ];

  return(
    <div style={{minHeight:"100vh",background:"#eef2ee",display:"flex"}}>
      <style>{`
        @keyframes fadeUp{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
        .nav-item:hover{background:rgba(74,158,74,0.14)!important}
        .trow:hover{background:#f0f7f0!important}
        .pcard:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,0.09)!important}
        select{appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%236b7280' d='M6 8L0 0h12z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#c5d9c5;border-radius:99px}
      `}</style>
      {/* Sidebar */}
      <div style={{position:"fixed",left:0,top:0,bottom:0,width:200,background:"linear-gradient(180deg,#162616,#0d1a0d)",display:"flex",flexDirection:"column",zIndex:200}}>
        <div style={{padding:"22px 16px 14px"}}><div style={{fontSize:10,fontWeight:700,color:"#4a9e4a",letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:3}}>Plant Health Care</div><div style={{fontSize:19,fontFamily:"'Playfair Display',serif",color:"#e8f5e8",lineHeight:1.25}}>Inventory<br/>Manager</div></div>
        <nav style={{padding:"6px 8px",flex:1}}>
          {navItems.map(item=>(
            <button key={item.k} className="nav-item" onClick={()=>setView(item.k)} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 10px",background:view===item.k?"rgba(74,158,74,0.18)":"transparent",border:"none",borderLeft:view===item.k?"3px solid #4a9e4a":"3px solid transparent",borderRadius:8,color:view===item.k?"#7dcf7d":"#8faf8f",fontSize:13,fontWeight:view===item.k?700:500,cursor:"pointer",marginBottom:2,fontFamily:"inherit",textAlign:"left",transition:"all 0.15s"}}>
              <span>{item.i}</span>{item.l}
              {item.k==="blends"&&blends.length>0&&<span style={{marginLeft:"auto",background:"rgba(74,158,74,0.25)",color:"#7dcf7d",fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:99}}>{blends.length}</span>}
            </button>
          ))}
        </nav>
        <div style={{padding:"10px 8px 8px",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
          <button onClick={openLogUsage} style={{width:"100%",background:"linear-gradient(135deg,#2d6a2d,#4a9e4a)",border:"none",borderRadius:7,color:"#fff",fontFamily:"inherit",fontSize:12,fontWeight:700,padding:"9px 0",cursor:"pointer",marginBottom:6}}>− Log Usage</button>
          <button onClick={openRestock}  style={{width:"100%",background:"rgba(74,158,74,0.15)",border:"1px solid rgba(74,158,74,0.3)",borderRadius:7,color:"#7dcf7d",fontFamily:"inherit",fontSize:12,fontWeight:700,padding:"8px 0",cursor:"pointer",marginBottom:6}}>+ Log Restock</button>
          <button onClick={exportCSV}    style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,color:"#aabfaa",fontFamily:"inherit",fontSize:12,fontWeight:600,padding:"8px 0",cursor:"pointer",marginBottom:6}}>↓ Export CSV</button>
          <button onClick={onExit}       style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:7,color:"rgba(255,255,255,0.3)",fontFamily:"inherit",fontSize:12,fontWeight:600,padding:"8px 0",cursor:"pointer"}}>← Tech View</button>
        </div>
        <div style={{padding:"8px 16px 16px",fontSize:10,color:"#4a7a4a"}}>{products.length} products · {blends.length} blends</div>
      </div>

      {/* Content */}
      <div style={{marginLeft:200,padding:"26px",minHeight:"100vh",flex:1}}>
        {view==="dashboard"&&(
          <div style={{animation:"fadeUp 0.3s ease"}}>
            <div style={{marginBottom:22}}><h1 style={{margin:0,fontSize:25,fontFamily:"'Playfair Display',serif",color:"#1a2e1a"}}>Dashboard</h1><p style={{margin:"4px 0 0",color:"#6b7280",fontSize:13}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</p></div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:22}}>
              {[{l:"Total Products",v:products.length,i:"🌿",bg:"#f0f9f0",ac:"#1a6a1a"},{l:"Active Blends",v:blends.length,i:"🧬",bg:"#fdf4ff",ac:"#7e22ce"},{l:"Inventory Value",v:fmt$(totalVal),i:"💰",bg:"#f0f4ff",ac:"#3730a3"},{l:"Usage Cost (range)",v:fmt$(usageCost),i:"📊",bg:"#fff7ed",ac:"#b45309"}].map(s=>(
                <div key={s.l} className="pcard" style={{background:s.bg,borderRadius:12,padding:"16px 18px",border:`1px solid ${s.ac}18`,transition:"all 0.2s",cursor:"default"}}>
                  <div style={{fontSize:20,marginBottom:7}}>{s.i}</div>
                  <div style={{fontSize:21,fontWeight:700,color:s.ac,fontFamily:"'Playfair Display',serif"}}>{s.v}</div>
                  <div style={{fontSize:10,color:"#6b7280",fontWeight:700,letterSpacing:"0.05em",textTransform:"uppercase",marginTop:2}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"11px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <span style={{fontSize:13,fontWeight:700,color:"#374151"}}>Cost range:</span>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{...iS,width:145,fontSize:13}}/>
              <span style={{color:"#9ca3af"}}>to</span>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{...iS,width:145,fontSize:13}}/>
            </div>
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
              <div style={{padding:"13px 18px",borderBottom:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:700,fontSize:14,color:"#1a2e1a"}}>Recent Activity</span><button onClick={()=>setView("history")} style={{background:"none",border:"none",color:"#4a9e4a",fontWeight:600,fontSize:13,cursor:"pointer"}}>View all →</button></div>
              {transactions.slice(0,6).length===0?<div style={{padding:24,color:"#9ca3af",textAlign:"center",fontSize:14}}>No activity yet.</div>:transactions.slice(0,6).map(t=>(
                <div key={t.id} className="trow" style={{display:"flex",alignItems:"center",padding:"10px 18px",borderBottom:"1px solid #f9fafb",transition:"background 0.15s"}}>
                  <div style={{width:28,height:28,borderRadius:7,background:t.subtype==="blend"?"#fdf4ff":t.type==="usage"?"#fee2e2":"#d1fae5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,marginRight:10,flexShrink:0}}>{t.subtype==="blend"?"🧬":t.type==="usage"?"−":"+"}</div>
                  <div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:13,color:"#111827",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.blend_name||t.product_name}</div><div style={{fontSize:11,color:"#9ca3af"}}>{fmtDate(t.date)}{t.tech_name?` · ${t.tech_name}`:""}</div></div>
                  <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}><div style={{fontWeight:700,fontSize:13,color:t.type==="usage"?"#dc2626":"#16a34a"}}>{t.type==="usage"?`−${t.input_amount} ${t.input_unit}`:`+${t.containers_added} containers`}</div><div style={{fontSize:11,color:"#9ca3af"}}>{fmt$(t.product_cost||t.total_cost_added)}</div></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view==="inventory"&&(
          <div style={{animation:"fadeUp 0.3s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}><div><h1 style={{margin:0,fontSize:25,fontFamily:"'Playfair Display',serif",color:"#1a2e1a"}}>Inventory</h1><p style={{margin:"4px 0 0",color:"#6b7280",fontSize:13}}>{products.length} products · {fmt$(totalVal)}</p></div><div style={{display:"flex",gap:8}}><Btn onClick={exportInventoryCSV} color="ghost">↓ Export CSV</Btn><Btn onClick={openAddP}>+ Add Product</Btn></div></div>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products…" style={{...iS,width:260,marginBottom:14}}/>
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:"#f9fafb"}}>{["Product","Stock Status","Containers","Total Volume","Mix Rate","Cost/Container","Total Value",""].map(h=><th key={h} style={{padding:"10px 13px",textAlign:"left",fontSize:10,fontWeight:700,color:"#6b7280",letterSpacing:"0.07em",textTransform:"uppercase",borderBottom:"1px solid #e5e7eb",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                <tbody>
                  {filtP.map(p=>{
                    const inB=blends.filter(b=>b.product_ids.includes(p.id));
                    const lvl=p.containers<=0?"critical":p.containers<0.5?"low":"ok";
                    const lvlColor=lvl==="critical"?"#dc2626":lvl==="low"?"#d97706":"#166534";
                    const lvlBg=lvl==="critical"?"#fee2e2":lvl==="low"?"#fff7ed":"#f0fdf4";
                    const lvlLabel=lvl==="critical"?"⚠ Out of stock":lvl==="low"?"⚠ Low stock":"✓ In stock";
                    return(<tr key={p.id} className="trow" style={{borderBottom:"1px solid #f3f4f6",transition:"background 0.12s",background:lvl==="critical"?"#fff8f8":lvl==="low"?"#fffdf5":"#fff"}}>
                      <td style={{padding:"10px 13px",fontWeight:600,color:"#111827",maxWidth:220}}><div>{p.name}</div>{inB.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:3}}>{inB.map(b=><span key={b.id} style={{fontSize:10,background:b.color+"18",color:b.color,padding:"1px 6px",borderRadius:99,fontWeight:700}}>🧬 {b.name}</span>)}</div>}</td>
                      <td style={{padding:"10px 13px",whiteSpace:"nowrap"}}>
                        <div style={{marginBottom:4}}><span style={{background:lvlBg,color:lvlColor,padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:700}}>{lvlLabel}</span></div>
                        <div style={{background:"#e5e7eb",borderRadius:99,height:4,width:80}}><div style={{background:lvlColor,width:`${Math.min(100,p.containers*25)}%`,height:"100%",borderRadius:99,transition:"width 0.3s"}}/></div>
                      </td>
                      <td style={{padding:"10px 13px",color:"#374151",fontWeight:700,whiteSpace:"nowrap"}}>{fmtN(p.containers,2)}</td>
                      <td style={{padding:"10px 13px",color:"#374151",whiteSpace:"nowrap"}}>{fmtN(totalVol(p))} {p.mix_unit||p.container_unit}</td>
                      <td style={{padding:"10px 13px",whiteSpace:"nowrap"}}>{p.mix_rate?<span style={{background:"#f0fdf4",color:"#166534",padding:"2px 7px",borderRadius:99,fontWeight:700,fontSize:11}}>{p.mix_rate} {p.mix_unit}/{p.mix_per}</span>:<span style={{color:"#d1d5db"}}>Direct</span>}</td>
                      <td style={{padding:"10px 13px",color:"#374151"}}>{fmt$(p.cost_per_container)}</td>
                      <td style={{padding:"10px 13px",fontWeight:700,color:"#1a2e1a"}}>{fmt$(p.containers*(p.cost_per_container||0))}</td>
                      <td style={{padding:"10px 10px",whiteSpace:"nowrap"}}><button onClick={()=>openEditP(p)} style={{background:"#f3f4f6",border:"none",borderRadius:5,padding:"4px 7px",cursor:"pointer",fontSize:12,marginRight:3}}>✏️</button><button onClick={()=>delProduct(p.id)} style={{background:"#fee2e2",border:"none",borderRadius:5,padding:"4px 7px",cursor:"pointer",fontSize:12}}>🗑️</button></td>
                    </tr>);
                  })}
                </tbody>
                <tfoot><tr style={{background:"#f9fafb",borderTop:"2px solid #e5e7eb"}}><td colSpan={7} style={{padding:"10px 13px",fontWeight:700,color:"#374151"}}>Total Inventory Value</td><td style={{padding:"10px 13px",fontWeight:700,color:"#1a2e1a",fontSize:14,fontFamily:"'Playfair Display',serif"}}>{fmt$(totalVal)}</td><td/></tr></tfoot>
              </table>
            </div>
          </div>
        )}

        {view==="blends"&&(
          <div style={{animation:"fadeUp 0.3s ease",maxWidth:680}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}><div><h1 style={{margin:0,fontSize:25,fontFamily:"'Playfair Display',serif",color:"#1a2e1a"}}>Product Blends</h1><p style={{margin:"4px 0 0",color:"#6b7280",fontSize:13}}>Multi-product blends techs can log as a single item</p></div><Btn onClick={openAddB}>+ New Blend</Btn></div>
            {blends.length===0?<div style={{background:"#fff",borderRadius:14,border:"2px dashed #d1d5db",padding:36,textAlign:"center",color:"#9ca3af"}}><div style={{fontSize:28,marginBottom:8}}>🧬</div><div style={{fontWeight:600,marginBottom:4}}>No blends yet</div></div>
            :blends.map(b=>(
              <BlendCard key={b.id} b={b} products={products} onEdit={openEditB} onDelete={delBlend}/>
            ))}
          </div>
        )}

        {view==="history"&&(
          <div style={{animation:"fadeUp 0.3s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}><div><h1 style={{margin:0,fontSize:25,fontFamily:"'Playfair Display',serif",color:"#1a2e1a"}}>Transaction History</h1><p style={{margin:"4px 0 0",color:"#6b7280",fontSize:13}}>{transactions.length} total</p></div><Btn onClick={exportUsageCSV}>↓ Export CSV</Btn></div>
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"10px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <span style={{fontSize:13,fontWeight:700,color:"#374151"}}>Filter:</span>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{...iS,width:145,fontSize:13}}/>
              <span style={{color:"#9ca3af"}}>to</span>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{...iS,width:145,fontSize:13}}/>
              <button onClick={()=>{setDateFrom("");setDateTo(today());}} style={{background:"none",border:"none",color:"#4a9e4a",fontWeight:600,fontSize:13,cursor:"pointer"}}>Reset</button>
              {filtUsage.length>0&&<span style={{marginLeft:"auto",fontWeight:700,color:"#374151",fontSize:13}}>Usage cost: {fmt$(usageCost)}</span>}
            </div>
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:"#f9fafb"}}>{["Date","Type","Product / Blend","Tech","Input","Details","Cost",""].map(h=><th key={h} style={{padding:"10px 13px",textAlign:"left",fontSize:10,fontWeight:700,color:"#6b7280",letterSpacing:"0.07em",textTransform:"uppercase",borderBottom:"1px solid #e5e7eb"}}>{h}</th>)}</tr></thead>
                <tbody>
                  {transactions.filter(t=>(!dateFrom||t.date>=dateFrom)&&(!dateTo||t.date<=dateTo)).map(t=>(
                    <Fragment key={t.id}>
                      <tr className="trow" style={{borderBottom:t.subtype==="blend"?"none":"1px solid #f3f4f6",transition:"background 0.12s"}}>
                        <td style={{padding:"10px 13px",color:"#6b7280",whiteSpace:"nowrap"}}>{fmtDate(t.date)}</td>
                        <td style={{padding:"10px 13px"}}><span style={{background:t.subtype==="blend"?"#fdf4ff":t.type==="usage"?"#fee2e2":"#d1fae5",color:t.subtype==="blend"?"#7e22ce":t.type==="usage"?"#991b1b":"#065f46",padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:700}}>{t.subtype==="blend"?"BLEND":t.type.toUpperCase()}</span></td>
                        <td style={{padding:"10px 13px",fontWeight:600,color:"#111827",maxWidth:200}}>{t.blend_name||t.product_name}</td>
                        <td style={{padding:"10px 13px",color:"#6b7280",fontSize:12}}>{t.tech_name||"—"}</td>
                        <td style={{padding:"10px 13px",color:"#374151",whiteSpace:"nowrap"}}>{t.type==="usage"?`${t.input_amount} ${t.input_unit}`:`+${t.containers_added} containers`}</td>
                        <td style={{padding:"10px 13px",fontWeight:700,whiteSpace:"nowrap",color:t.type==="usage"?"#dc2626":"#16a34a"}}>{t.type==="usage"&&!t.subtype&&`−${fmtN(t.product_used)} ${t.product_unit}`}{t.subtype==="blend"&&<span style={{color:"#7e22ce",fontSize:12}}>{t.components?.length} products ▾</span>}{t.type==="restock"&&`+${fmtN(t.containers_added*t.container_size)} ${t.container_unit}`}</td>
                        <td style={{padding:"10px 13px",color:"#374151"}}>{fmt$(t.product_cost||t.total_cost_added)}</td>
                        <td style={{padding:"10px 10px",whiteSpace:"nowrap"}}><button onClick={()=>{setEditTarget(t);setModal("confirmDelete");}} style={{background:"#fee2e2",border:"none",borderRadius:5,padding:"4px 7px",cursor:"pointer",fontSize:12,color:"#dc2626"}}>🗑️</button></td>
                      </tr>
                      {t.subtype==="blend"&&t.components?.map((c,ci)=>(
                        <tr key={`${t.id}-${ci}`} style={{background:"#faf5ff",borderBottom:ci===t.components.length-1?"1px solid #f3f4f6":"none"}}>
                          <td style={{padding:"4px 13px"}}/><td/><td style={{padding:"4px 13px",fontSize:12,color:"#7e22ce",paddingLeft:26}}>↳ {c.product_name}</td><td/><td style={{padding:"4px 13px",fontSize:12,color:"#6b7280"}}>via blend</td><td style={{padding:"4px 13px",fontSize:12,color:"#dc2626",fontWeight:600}}>−{fmtN(c.product_used)} {c.product_unit}</td><td style={{padding:"4px 13px",fontSize:12,color:"#6b7280"}}>{fmt$(c.product_cost)}</td><td/>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                  {transactions.filter(t=>(!dateFrom||t.date>=dateFrom)&&(!dateTo||t.date<=dateTo)).length===0&&<tr><td colSpan={7} style={{textAlign:"center",padding:32,color:"#9ca3af"}}>No transactions in range.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view==="users"&&isAdmin&&(
          <UsersView currentProfile={profile} showToast={showToast} iS={iS} Btn={Btn}/>
        )}

        {view==="settings"&&(
          <div style={{animation:"fadeUp 0.3s ease",maxWidth:480}}>
            <h1 style={{margin:"0 0 20px",fontSize:25,fontFamily:"'Playfair Display',serif",color:"#1a2e1a"}}>Settings</h1>
            <div style={{background:"#fff",borderRadius:14,border:"1px solid #e5e7eb",padding:"20px 22px",marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:15,color:"#111827",marginBottom:4}}>Manager Passcode</div>
              <div style={{fontSize:13,color:"#6b7280",marginBottom:14}}>Change the passcode required to access the manager view.</div>
              <Btn onClick={openChangePC} color="ghost">Change Passcode</Btn>
            </div>
            <div style={{background:"#fff",borderRadius:14,border:"1px solid #e5e7eb",padding:"20px 22px"}}>
              <div style={{fontWeight:700,fontSize:15,color:"#111827",marginBottom:4}}>Export Data</div>
              <div style={{fontSize:13,color:"#6b7280",marginBottom:14}}>Download all inventory and transaction data as CSV.</div>
              <Btn onClick={exportCSV} color="ghost">Export CSV</Btn>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal==="logUsage"&&(
        <Modal title="Log Product Usage" onClose={()=>setModal(null)} wide>
          <FF label="Date"><input type="date" style={iS} value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></FF>
          {form.entries?.map((entry,i)=>{
            const isB=entry.type==="blend",blend=isB?blends.find(b=>b.id===parseInt(entry.id)):null,product=!isB?products.find(p=>p.id===parseInt(entry.id)):null;
            return(<div key={i} style={{background:"#f9fafb",borderRadius:10,padding:"13px 15px",marginBottom:10,border:"1px solid #e5e7eb",position:"relative"}}>
              {form.entries.length>1&&<button onClick={()=>remUR(i)} style={{position:"absolute",top:9,right:9,background:"#fee2e2",border:"none",borderRadius:5,padding:"2px 6px",cursor:"pointer",fontSize:12,color:"#dc2626"}}>×</button>}
              <div style={{display:"flex",gap:8,marginBottom:10}}>{[["product","Single Product"],["blend","Blend 🧬"]].map(([val,lbl])=><button key={val} onClick={()=>updUR(i,"type",val)} style={{flex:1,padding:"6px",borderRadius:7,border:`1.5px solid ${entry.type===val?"#4a9e4a":"#e5e7eb"}`,background:entry.type===val?"#f0fdf4":"#fff",color:entry.type===val?"#166534":"#6b7280",fontFamily:"inherit",fontSize:12,fontWeight:700,cursor:"pointer"}}>{lbl}</button>)}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <FF label={isB?"Blend":"Product"}><select style={iS} value={entry.id} onChange={e=>updUR(i,"id",e.target.value)}><option value="">Select…</option>{isB?[...blends].sort((a,b)=>a.name.localeCompare(b.name)).map(b=><option key={b.id} value={b.id}>{b.name}</option>):[...products].sort((a,b)=>a.name.localeCompare(b.name)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></FF>
                <FF label={isB||product?.mix_rate?"Gal of Mix":`Amount (${product?.mix_unit||product?.container_unit||"units"})`}><input type="number" style={iS} value={entry.amount} onChange={e=>updUR(i,"amount",e.target.value)} placeholder="0" min="0" step="any"/></FF>
              </div>
              {entry.amount>0&&isB&&blend&&<div style={{background:"#fdf4ff",border:"1px solid #e9d5ff",borderRadius:7,padding:"8px 11px",fontSize:12}}><div style={{fontWeight:700,color:"#7e22ce",marginBottom:4}}>🧬 Deductions for {entry.amount} gal:</div>{products.filter(p=>blend.product_ids.includes(p.id)).map(p=><div key={p.id} style={{display:"flex",justifyContent:"space-between",color:"#6b21a8",marginBottom:2}}><span>{p.name.length>34?p.name.slice(0,34)+"…":p.name}</span><strong>−{fmtN(calcUsed(p,entry.amount))} {p.mix_unit||p.container_unit}</strong></div>)}</div>}
              {entry.amount>0&&!isB&&product&&<div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:7,padding:"6px 11px",fontSize:12,color:"#166534",display:"flex",justifyContent:"space-between"}}><span>Used:</span><strong>{fmtN(calcUsed(product,entry.amount))} {product.mix_unit||product.container_unit}</strong></div>}
            </div>);
          })}
          <button onClick={addUR} style={{width:"100%",background:"none",border:"1.5px dashed #d1d5db",borderRadius:8,padding:"8px",cursor:"pointer",fontSize:13,color:"#6b7280",fontFamily:"inherit",fontWeight:600,marginBottom:12}}>+ Add Row</button>
          <div style={{display:"flex",gap:10}}><Btn onClick={submitUsage} disabled={saving} style={{flex:1}}>{saving?"Saving…":"Submit"}</Btn><Btn onClick={()=>setModal(null)} color="ghost">Cancel</Btn></div>
        </Modal>
      )}
      {modal==="restock"&&(
        <Modal title="Log Restock" onClose={()=>setModal(null)}>
          <FF label="Product"><select style={iS} value={form.productId} onChange={e=>setForm(f=>({...f,productId:e.target.value}))}>{[...products].sort((a,b)=>a.name.localeCompare(b.name)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></FF>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <FF label="Containers Added"><input type="number" style={iS} value={form.containersAdded} onChange={e=>setForm(f=>({...f,containersAdded:e.target.value}))} placeholder="e.g. 2" min="0" step="any"/></FF>
            <FF label="Date"><input type="date" style={iS} value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></FF>
            <FF label="Vendor"><input style={iS} value={form.vendor||""} onChange={e=>setForm(f=>({...f,vendor:e.target.value}))} placeholder="Supplier"/></FF>
            <FF label="Notes"><input style={iS} value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Invoice #"/></FF>
          </div>
          <div style={{display:"flex",gap:10}}><Btn onClick={submitRestock} disabled={saving} style={{flex:1}}>{saving?"Saving…":"Submit Restock"}</Btn><Btn onClick={()=>setModal(null)} color="ghost">Cancel</Btn></div>
        </Modal>
      )}
      {modal==="editProduct"&&(()=>{
        const s=buildSummary(form),isMix=form.product_type==="mixed";
        return(<Modal title={editTarget?"Edit Product":"Add New Product"} onClose={()=>setModal(null)} wide>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:"#4a9e4a",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>① Product Info</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <FF label="Product Name" span2><input style={iS} value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. BioPro ArborPlex 14-4-5"/></FF>
              <FF label="Category"><select style={iS} value={form.category||"Other"} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></FF>
              <FF label="Cost Per Container ($)"><input type="number" style={iS} value={form.cost_per_container||""} onChange={e=>setForm(f=>({...f,cost_per_container:e.target.value}))} placeholder="0.00" min="0" step="0.01"/></FF>
            </div>
          </div>
          <div style={{marginBottom:14,borderTop:"1px solid #f3f4f6",paddingTop:12}}>
            <div style={{fontSize:11,fontWeight:700,color:"#4a9e4a",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>② Container</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <FF label="# Containers"><input type="number" style={iS} value={form.containers||""} onChange={e=>setForm(f=>({...f,containers:e.target.value}))} placeholder="2.5" min="0" step="any"/></FF>
              <FF label="Container Size"><input type="number" style={iS} value={form.container_size||""} onChange={e=>setForm(f=>({...f,container_size:e.target.value}))} placeholder="2.5" min="0" step="any"/></FF>
              <FF label="Container Unit"><select style={iS} value={form.container_unit||"gal"} onChange={e=>setForm(f=>({...f,container_unit:e.target.value}))}>{CONTAINER_UNITS.map(u=><option key={u}>{u}</option>)}</select></FF>
            </div>
          </div>
          <div style={{marginBottom:14,borderTop:"1px solid #f3f4f6",paddingTop:12}}>
            <div style={{fontSize:11,fontWeight:700,color:"#4a9e4a",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>③ Application Type</div>
            <div style={{display:"flex",gap:10,marginBottom:10}}>{[["mixed","🧪 Mixed"],["direct","💉 Direct use"]].map(([val,lbl])=><button key={val} onClick={()=>setForm(f=>({...f,product_type:val}))} style={{flex:1,padding:"9px",borderRadius:8,border:`2px solid ${form.product_type===val?"#4a9e4a":"#e5e7eb"}`,background:form.product_type===val?"#f0fdf4":"#f9fafb",color:form.product_type===val?"#166534":"#6b7280",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer"}}>{lbl}</button>)}</div>
            {isMix&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <FF label="Mix Rate"><input type="number" style={iS} value={form.mix_rate||""} onChange={e=>setForm(f=>({...f,mix_rate:e.target.value}))} placeholder="64" min="0" step="any"/></FF>
              <FF label="Mix Unit"><select style={iS} value={form.mix_unit||"fl oz"} onChange={e=>setForm(f=>({...f,mix_unit:e.target.value}))}>{MIX_UNITS.map(u=><option key={u}>{u}</option>)}</select></FF>
              <FF label="Per (gal)"><input type="number" style={iS} value={form.mix_per||"100"} onChange={e=>setForm(f=>({...f,mix_per:e.target.value}))} placeholder="100" min="1" step="any"/></FF>
              {form.container_unit&&form.mix_unit&&(()=>{const t=cvt(1,form.container_unit,form.mix_unit);return t===null?<div style={{gridColumn:"span 3",background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:7,padding:"7px 11px",fontSize:12,color:"#c2410c"}}>⚠ Cannot convert {form.container_unit} → {form.mix_unit}</div>:<div style={{gridColumn:"span 3",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:7,padding:"7px 11px",fontSize:12,color:"#166534"}}>✓ 1 {form.container_unit} = {fmtN(t)} {form.mix_unit}</div>;})()}
            </div>}
          </div>
          {s&&<div style={{borderTop:"1px solid #f3f4f6",paddingTop:12,marginBottom:12}}><div style={{fontSize:11,fontWeight:700,color:"#4a9e4a",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>④ Verify</div><div style={{background:s.valid?"#f0fdf4":"#fff7ed",border:`1.5px solid ${s.valid?"#86efac":"#fed7aa"}`,borderRadius:9,padding:"11px 14px"}}>{s.valid?s.lines.map((l,i)=><div key={i} style={{fontSize:13,color:"#166534",marginBottom:i<s.lines.length-1?4:0}}>{l}</div>):<div style={{fontSize:13,color:"#c2410c"}}>⚠ {s.error}</div>}</div></div>}
          <div style={{display:"flex",gap:10}}><Btn onClick={submitProduct} disabled={saving} style={{flex:1}}>{saving?"Saving…":editTarget?"Save Changes":"Add Product"}</Btn><Btn onClick={()=>setModal(null)} color="ghost">Cancel</Btn></div>
        </Modal>);
      })()}
      {modal==="editBlend"&&(
        <Modal title={editTarget?"Edit Blend":"Create Blend"} onClose={()=>setModal(null)} wide>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <FF label="Blend Name" span2><input style={iS} value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Spring Fertilizer Blend"/></FF>
            <FF label="Description"><input style={iS} value={form.description||""} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Optional notes"/></FF>
            <FF label="Color"><div style={{display:"flex",gap:6,paddingTop:4}}>{BLEND_COLORS.map(c=><button key={c} onClick={()=>setForm(f=>({...f,color:c}))} style={{width:26,height:26,borderRadius:99,background:c,border:form.color===c?"3px solid #111":"2px solid transparent",cursor:"pointer"}}/>)}</div></FF>
          </div>
          <div style={{borderTop:"1px solid #f3f4f6",paddingTop:12}}>
            <div style={{fontSize:11,fontWeight:700,color:"#4a9e4a",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>Select Products <span style={{color:"#9ca3af",fontWeight:400,textTransform:"none",fontSize:12}}>({form.product_ids?.length||0} selected)</span></div>
            <div style={{maxHeight:260,overflowY:"auto",border:"1px solid #e5e7eb",borderRadius:9}}>
              {products.filter(p=>p.mix_rate).map((p,i,arr)=>{
                const sel=(form.product_ids||[]).includes(p.id);
                return(<div key={p.id} onClick={()=>toggleBP(p.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 13px",cursor:"pointer",background:sel?"#f0fdf4":"#fff",borderBottom:i<arr.length-1?"1px solid #f3f4f6":"none",transition:"background 0.12s"}}>
                  <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${sel?"#4a9e4a":"#d1d5db"}`,background:sel?"#4a9e4a":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{sel&&<span style={{color:"#fff",fontSize:11,lineHeight:1}}>✓</span>}</div>
                  <div style={{flex:1,fontSize:13,fontWeight:sel?700:500,color:"#111827"}}>{p.name}</div>
                  <div style={{fontSize:12,color:"#6b7280",whiteSpace:"nowrap"}}>{p.mix_rate} {p.mix_unit}/{p.mix_per}</div>
                </div>);
              })}
            </div>
            {(form.product_ids?.length||0)>0&&<div style={{marginTop:10,background:"#fdf4ff",border:"1px solid #e9d5ff",borderRadius:8,padding:"9px 13px"}}><div style={{fontSize:12,fontWeight:700,color:"#7e22ce",marginBottom:5}}>Preview — per 100 gal:</div>{products.filter(p=>form.product_ids?.includes(p.id)).map(p=><div key={p.id} style={{fontSize:12,color:"#6b21a8",display:"flex",justifyContent:"space-between",marginBottom:2}}><span>{p.name.length>38?p.name.slice(0,38)+"…":p.name}</span><strong>{p.mix_rate} {p.mix_unit}</strong></div>)}</div>}
          </div>
          <div style={{display:"flex",gap:10,marginTop:14}}><Btn onClick={submitBlend} disabled={saving} style={{flex:1}}>{saving?"Saving…":editTarget?"Save Changes":"Create Blend"}</Btn><Btn onClick={()=>setModal(null)} color="ghost">Cancel</Btn></div>
        </Modal>
      )}
      {modal==="confirmDelete"&&editTarget&&(
        <Modal title="Delete Entry" onClose={()=>{setModal(null);setEditTarget(null);}}>
          <div style={{marginBottom:18}}>
            <div style={{fontSize:14,color:"#374151",marginBottom:8}}>
              Are you sure you want to delete this transaction?
              {editTarget.type==="usage"&&<span style={{color:"#166534",fontWeight:600}}> Inventory will be restored.</span>}
              {editTarget.type==="restock"&&<span style={{color:"#6b7280"}}> Inventory will not be adjusted.</span>}
            </div>
            <div style={{background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:8,padding:"11px 14px",fontSize:13}}>
              <div style={{fontWeight:700,color:"#111827",marginBottom:3}}>{editTarget.blend_name||editTarget.product_name}</div>
              <div style={{color:"#6b7280"}}>{fmtDate(editTarget.date)}{editTarget.tech_name?` · ${editTarget.tech_name}`:""} · {fmt$(editTarget.product_cost||editTarget.total_cost_added)}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn onClick={()=>deleteTransaction(editTarget)} color="red" disabled={saving} style={{flex:1}}>{saving?"Deleting…":"Yes, Delete"}</Btn>
            <Btn onClick={()=>{setModal(null);setEditTarget(null);}} color="ghost">Cancel</Btn>
          </div>
        </Modal>
      )}
      {modal==="changePC"&&(
        <Modal title="Change Passcode" onClose={()=>setModal(null)}>
          <FF label="New Passcode"><input type="password" style={iS} value={form.np||""} onChange={e=>setForm(f=>({...f,np:e.target.value}))} placeholder="Min 4 characters"/></FF>
          <FF label="Confirm"><input type="password" style={iS} value={form.cp||""} onChange={e=>setForm(f=>({...f,cp:e.target.value}))} placeholder="Repeat passcode"/></FF>
          <div style={{display:"flex",gap:10}}><Btn onClick={submitChangePC} style={{flex:1}}>Update Passcode</Btn><Btn onClick={()=>setModal(null)} color="ghost">Cancel</Btn></div>
        </Modal>
      )}
      <Toast toast={toast}/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ROOT — Supabase data layer
// ════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [products, setProducts]         = useState(null);
  const [blends, setBlends]             = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [mode, setMode]                 = useState("tech");
  const [techName, setTechName]         = useState("");
  const [error, setError]               = useState(null);
  const [session, setSession]           = useState(null);
  const [profile, setProfile]           = useState(null);
  const [profileChecked, setProfileChecked] = useState(false);

  // ── Auth (Phase 1B: login required, role-gated) ──
  // currentUserId tracks the last user we fetched a profile for. Supabase
  // fires onAuthStateChange on every token refresh (including tab-focus),
  // and re-fetching the profile each time briefly unmounts the app UI —
  // which reset the manager view back to Dashboard whenever the user
  // switched tabs. Only refetch when the user actually changes.
  const currentUserId = useRef(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const s = await getSession();
      if (!mounted) return;
      setSession(s);
      currentUserId.current = s?.user?.id || null;
      if (s) {
        const p = await getProfile();
        if (mounted) { setProfile(p); setProfileChecked(true); }
      } else {
        setProfileChecked(true);
      }
    })();
    const unsubscribe = onAuthChange(async (newSession) => {
      const newUserId = newSession?.user?.id || null;
      setSession(newSession);
      if (newUserId === currentUserId.current) return;  // same user, no reload
      currentUserId.current = newUserId;
      if (newSession) {
        setProfileChecked(false);
        const p = await getProfile();
        setProfile(p);
        setProfileChecked(true);
      } else {
        setProfile(null);
        setProfileChecked(true);
      }
    });
    return () => { mounted = false; unsubscribe(); };
  }, []);

  // Sync tech name with signed-in profile so log entries record the real user
  useEffect(() => {
    if (profile?.full_name) setTechName(profile.full_name);
  }, [profile]);

  // ── Initial load ──
  useEffect(() => {
    (async () => {
      try {
        const [pr, bl, tr] = await Promise.all([
          supabase.from("products").select("*").order("id"),
          supabase.from("blends").select("*").order("id"),
          supabase.from("transactions").select("*").order("id", { ascending: false }),
        ]);
        if (pr.error || bl.error || tr.error) throw pr.error || bl.error || tr.error;

        // Seed database on first load if empty
        if (pr.data.length === 0) {
          const { error: seedErr } = await supabase.from("products").insert(SEED_PRODUCTS);
          if (seedErr) throw seedErr;
          setProducts(SEED_PRODUCTS);
        } else {
          setProducts(pr.data);
        }
        if (bl.data.length === 0) {
          const { error: seedErr } = await supabase.from("blends").insert(SEED_BLENDS);
          if (seedErr) throw seedErr;
          setBlends(SEED_BLENDS);
        } else {
          setBlends(bl.data);
        }
        setTransactions(tr.data);
      } catch (err) {
        console.error(err);
        setError("Could not connect to database. Check your Supabase credentials.");
      }
    })();
  }, []);

  // ── Real-time subscriptions ──
  useEffect(() => {
    if (!products) return; // wait for initial load

    const productsSub = supabase
      .channel("products-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        supabase.from("products").select("*").order("id").then(({ data }) => data && setProducts(data));
      })
      .subscribe();

    const blendsSub = supabase
      .channel("blends-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "blends" }, () => {
        supabase.from("blends").select("*").order("id").then(({ data }) => data && setBlends(data));
      })
      .subscribe();

    const txSub = supabase
      .channel("transactions-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
        supabase.from("transactions").select("*").order("id", { ascending: false }).then(({ data }) => data && setTransactions(data));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(productsSub);
      supabase.removeChannel(blendsSub);
      supabase.removeChannel(txSub);
    };
  }, [!!products]); // only re-subscribe if loaded state changes

  // ── Save helpers ──
  const saveProductsAndTxns = useCallback(async (updatedProducts, newTxns) => {
    // Upsert all products
    const { error: pErr } = await supabase.from("products").upsert(updatedProducts);
    if (pErr) { console.error(pErr); return; }
    setProducts(updatedProducts);
    // Insert new transactions
    if (newTxns && newTxns.length > 0) {
      const { error: tErr } = await supabase.from("transactions").insert(newTxns);
      if (tErr) { console.error(tErr); return; }
      setTransactions(prev => [...newTxns, ...(prev || [])]);
    }
  }, []);

  const saveProducts = useCallback(async (updatedProducts) => {
    // Handle deletions: find IDs in current that aren't in updated
    const updatedIds = updatedProducts.map(p => p.id);
    const deletedIds = (products || []).filter(p => !updatedIds.includes(p.id)).map(p => p.id);
    if (deletedIds.length > 0) {
      await supabase.from("products").delete().in("id", deletedIds);
    }
    if (updatedProducts.length > 0) {
      const { error } = await supabase.from("products").upsert(updatedProducts);
      if (error) { console.error(error); return; }
    }
    setProducts(updatedProducts);
  }, [products]);

  const saveBlends = useCallback(async (updatedBlends) => {
    const updatedIds = updatedBlends.map(b => b.id);
    const deletedIds = (blends || []).filter(b => !updatedIds.includes(b.id)).map(b => b.id);
    if (deletedIds.length > 0) {
      await supabase.from("blends").delete().in("id", deletedIds);
    }
    if (updatedBlends.length > 0) {
      const { error } = await supabase.from("blends").upsert(updatedBlends);
      if (error) { console.error(error); return; }
    }
    setBlends(updatedBlends);
  }, [blends]);

  if (error) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",flexDirection:"column",gap:16,padding:24,textAlign:"center"}}>
      <div style={{fontSize:32}}>⚠️</div>
      <div style={{fontWeight:700,fontSize:18,color:"#1a2e1a"}}>Database Connection Error</div>
      <div style={{color:"#6b7280",fontSize:14,maxWidth:400}}>{error}</div>
    </div>
  );

  if (!products || !blends || !transactions) return <Spinner />;

  // ── Auth gates ──
  if (!session) return <Login />;
  if (!profileChecked) return <Spinner />;
  if (!profile) return <NoAccessScreen email={session.user.email} onSignOut={signOut} />;

  const role = profile.role;
  const canAccessManager = role === "admin" || role === "manager";
  const isGTC = role === "gtc_team_lead" || role === "gtc_tech";

  if (isGTC) return <GTCPlaceholder profile={profile} onSignOut={signOut} />;

  return (
    <>
      {mode === "tech" && (
        <TechView
          products={products} blends={blends} transactions={transactions}
          techName={techName} setTechName={setTechName}
          onSave={saveProductsAndTxns}
          onManagerRequest={canAccessManager ? () => setMode("manager") : null}
          session={session}
          profile={profile}
          onSignOut={signOut}
        />
      )}
      {mode === "manager" && canAccessManager && (
        <ManagerView
          products={products} blends={blends} transactions={transactions}
          onSave={saveProductsAndTxns}
          onSaveBlends={saveBlends}
          onSaveProducts={saveProducts}
          onExit={() => setMode("tech")}
          profile={profile}
        />
      )}
    </>
  );
}

function NoAccessScreen({ email, onSignOut }) {
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#1a2e1a,#0d1a0d)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{maxWidth:420,textAlign:"center",color:"#fff"}}>
        <div style={{fontSize:44,marginBottom:14}}>🔒</div>
        <h1 style={{margin:"0 0 10px",fontSize:24,fontFamily:"'Playfair Display',serif"}}>Access Not Set Up</h1>
        <p style={{color:"#8faf8f",fontSize:14,lineHeight:1.5,marginBottom:22}}>
          You're signed in as <strong style={{color:"#fff"}}>{email}</strong>, but this email doesn't have a profile in the app yet. Contact your administrator to request access.
        </p>
        <button onClick={onSignOut} style={{background:"rgba(255,255,255,0.1)",border:"1.5px solid rgba(255,255,255,0.2)",borderRadius:10,padding:"11px 22px",color:"#fff",fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer"}}>Sign Out</button>
      </div>
    </div>
  );
}

function GTCPlaceholder({ profile, onSignOut }) {
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#1a2e1a,#0d1a0d)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{maxWidth:420,textAlign:"center",color:"#fff"}}>
        <div style={{fontSize:44,marginBottom:14}}>🌳</div>
        <h1 style={{margin:"0 0 10px",fontSize:24,fontFamily:"'Playfair Display',serif"}}>GTC Features Coming Soon</h1>
        <p style={{color:"#8faf8f",fontSize:14,lineHeight:1.5,marginBottom:22}}>
          Welcome, <strong style={{color:"#fff"}}>{profile.full_name}</strong>. GTC inventory and request features are still being built and will appear here once they're ready.
        </p>
        <button onClick={onSignOut} style={{background:"rgba(255,255,255,0.1)",border:"1.5px solid rgba(255,255,255,0.2)",borderRadius:10,padding:"11px 22px",color:"#fff",fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer"}}>Sign Out</button>
      </div>
    </div>
  );
}
