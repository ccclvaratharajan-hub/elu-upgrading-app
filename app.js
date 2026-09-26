const LEGACY_STORAGE_KEY="elu_premium_v13";
const PREV_STORAGE_KEY="elu_premium_v12";
const SECURE_STATE_KEY="elu_secure_state_v3";
const AUTO_LOCK_MS=15*60*1000;
const ZONE_BLOCKS={1:[564,565,566,567,568,569],2:[544,545,546,547,548,549,550],3:[531,532,533,534,535,536],4:[557,558,559,560,561,562],5:[537,538,539,540,541,542,543],6:[551,552,553,554,555,556]};
const SLOTS=["9am–11am","11am–1pm","2pm–4pm","4pm–6pm"];
const SLOT_END_MINUTES={"9am–11am":660,"11am–1pm":780,"2pm–4pm":960,"4pm–6pm":1080};
const fmtDate=new Intl.DateTimeFormat("en-SG",{day:"2-digit",month:"short",year:"numeric"});

function isoTodaySG(){
  const p=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Singapore",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const o=Object.fromEntries(p.map(x=>[x.type,x.value]));return `${o.year}-${o.month}-${o.day}`;
}
function sgClock(){
  const p=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Singapore",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(new Date());
  const o=Object.fromEntries(p.map(x=>[x.type,x.value]));return {date:`${o.year}-${o.month}-${o.day}`,minutes:Number(o.hour)*60+Number(o.minute)}
}
function legacyDateISO(text){const m=String(text||"").match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})\b/);if(!m)return"";let y=Number(m[3]);if(y<100)y+=2000;return `${y}-${String(Number(m[2])).padStart(2,"0")}-${String(Number(m[1])).padStart(2,"0")}`}
function normalizeTimeToken(h,mins,ampm){let hour=Number(h),minute=Number(mins||0),ap=String(ampm||"").toLowerCase();if(ap==="pm"&&hour!==12)hour+=12;if(ap==="am"&&hour===12)hour=0;return hour*60+minute}
function legacySlot(text){const m=String(text||"").match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);if(!m)return"";const left=`${Number(m[1])}${m[2]?":"+m[2]:""}${m[3].toLowerCase()}`,right=`${Number(m[4])}${m[5]?":"+m[5]:""}${m[6].toLowerCase()}`;return `${left}–${right}`}
function slotEndMinutes(slot){const m=String(slot||"").match(/[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);if(!m)return null;return normalizeTimeToken(m[1],m[2],m[3])}
function slotStartMinutes(slot){const m=String(slot||"").match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);if(!m)return 9999;return normalizeTimeToken(m[1],m[2],m[3])}
function time24ToLabel(v){if(!v)return"";const [h0,m0]=v.split(":").map(Number),ap=h0>=12?"pm":"am",h=h0%12||12;return `${h}${m0?":"+String(m0).padStart(2,"0"):""}${ap}`}
function customSlotLabel(start,end){return `${time24ToLabel(start)}–${time24ToLabel(end)}`}
function minutesTo24(n){if(n==null||n===9999)return"";return `${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`}
function slotToCustomTimes(slot){return {start:minutesTo24(slotStartMinutes(slot)),end:minutesTo24(slotEndMinutes(slot))}}


function importedAppointmentId(block,floor,unit){return 600000000+Number(block)*100000+Number(floor)*1000+Number(unit)}
function seedAppointments(){
  return (SOURCE_APPOINTMENTS||[]).map(a=>({...a,remarks:"",scheduleState:a.scheduleState||"Active"}))
}
function unitKey(block,floor,unit){return `${block}-${floor}-${unit}`}
function unitDisplay(floor,unit){return `#${String(floor).padStart(2,"0")}-${unit}`}
function esc(v=""){return String(v).replace(/[&<>"']/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[s]))}
function safeDate(v){if(!v)return "";const d=new Date(v+"T00:00:00");return Number.isNaN(d.getTime())?v:fmtDate.format(d)}
function shortBoardDate(v){if(!v)return "";const d=new Date(v+"T00:00:00");return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat("en-SG",{day:"2-digit",month:"2-digit",year:"2-digit"}).format(d)}
function toast(msg){const e=document.getElementById("toast");e.textContent=msg;e.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>e.classList.remove("show"),1800)}
function normalizeStatus(v){v=String(v||"").trim().toUpperCase();if(v==="OPT_OUT")return"D";if(v==="DL")return"NR";return["A","C","P","D","NR"].includes(v)?v:""}
function statusLabel(v){v=normalizeStatus(v);return v==="A"?"A · Opt-In":v==="C"?"C · Confirmation":v==="P"?"P · Pending Confirmation":v==="D"?"D · Opt-Out":v==="NR"?"NR · No Response":""}
function statusPill(v){v=normalizeStatus(v);const c=v==="A"?"a":v==="C"?"c":v==="P"?"p":v==="D"?"d":v==="NR"?"nr":"pending";return `<span class="pill ${c}">${v==="P"?'<i class="pending-clock">◷</i>':""}${esc(statusLabel(v))}</span>`}

function baseUnit(block,floor,unit){
  const d=PROJECT_LAYOUT[String(block)]||PROJECT_LAYOUT[block];const seed=(d?.seed||{})[`${floor}-${unit}`]||{};
  return {
    key:unitKey(block,floor,unit),zone:Number(d?.zone||0),block:Number(block),floor:Number(floor),unit:Number(unit),
    response:normalizeStatus(seed.response),ownerName:seed.ownerName||"",contact:seed.contact||"",remarks:"",
    followUpDate:"",lastFollowUp:"",appointmentDate:"",appointmentSlot:"",team:"",
    workStatus:seed.completed?"Completed":"Pending",
    legacySchedule:seed.legacySchedule||"",legacyRemark:seed.legacyRemark||""
  };
}
function makeInitialState(){
  const units={};
  Object.entries(PROJECT_LAYOUT).forEach(([block,d])=>Object.entries(d.floors).forEach(([floor,arr])=>arr.forEach(unit=>{const u=baseUnit(block,floor,unit);units[u.key]=u})));
  return {units,surveys:[],appointments:seedAppointments(),appointmentTombstones:[],complaints:[],statusOverrides:{},statusAudit:[],statusDecisionSchema:2,createdAt:new Date().toISOString()};
}
function isUserAppointment(a){
  return ["Planner","Manual","Planner History"].includes(String(a?.source||""))||Number(a?.id)>1000000000000
}
function mergeSavedIntoFresh(saved){
  const fresh=makeInitialState();
  if(!saved)return fresh;

  fresh.surveys=(saved.surveys||[]).map(s=>({
    ...s,
    visitDate:s.visitDate||s.followUpDate||"",
    visitTime:s.visitTime||"",
    createdAt:s.createdAt||new Date(Number(s.id)||Date.now()).toISOString()
  }));
  fresh.complaints=saved.complaints||[];

  const savedAppointments=saved.appointments||[];
  const savedIds=new Set(savedAppointments.map(a=>String(a.id)));
  const tombstones=new Set((saved.appointmentTombstones||[]).map(String));

  // Migration for V7.46 and earlier:
  // if a seeded/imported appointment existed in data.js but is absent from the
  // user's saved appointment list, that absence represents a prior user Delete.
  if(!Array.isArray(saved.appointmentTombstones)){
    fresh.appointments.forEach(seed=>{
      if(seed?.id!=null&&!seed?.newSeedImport&&!savedIds.has(String(seed.id)))tombstones.add(String(seed.id))
    })
  }

  fresh.appointmentTombstones=[...tombstones];
  fresh.appointments=fresh.appointments.filter(a=>!tombstones.has(String(a.id)));

  savedAppointments.forEach(a=>{
    if(tombstones.has(String(a.id)))return;
    const clean={
      ...a,
      status:undefined,
      scheduleState:a.scheduleState||"Active",
      workStatus:a.workStatus||"Pending",
      source:a.source||"Manual"
    };
    const idx=fresh.appointments.findIndex(x=>
      String(x.id)===String(clean.id)||
      (x.unitKey===clean.unitKey&&x.date===clean.date&&x.slot===clean.slot)
    );

    if(idx>=0){
      const seed=fresh.appointments[idx];
      const explicitScheduleOverride=Boolean(
        clean.userScheduleOverride||
        clean.cancelledAt||
        ["Cancelled","Rescheduled","History"].includes(clean.scheduleState)
      );
      fresh.appointments[idx]={
        ...seed,
        ownerName:clean.ownerName||seed.ownerName||"",
        contact:clean.contact||seed.contact||"",
        remarks:(clean.userRemarks||isUserAppointment(clean))?(clean.remarks||""):"",
        userRemarks:Boolean(clean.userRemarks||isUserAppointment(clean)),
        source:isUserAppointment(clean)?clean.source:seed.source,
        team:clean.team||seed.team||"",
        scheduleState:explicitScheduleOverride
          ? clean.scheduleState
          : isUserAppointment(clean)
            ? (clean.scheduleState||seed.scheduleState||"Active")
            : (seed.scheduleState||"Active"),
        cancelledAt:clean.cancelledAt||seed.cancelledAt,
        userScheduleOverride:Boolean(clean.userScheduleOverride||explicitScheduleOverride),
        workStatus:isUserAppointment(clean)?(clean.workStatus||seed.workStatus||"Pending"):(clean.workStatus||seed.workStatus||"Pending")
      };
    }else if(isUserAppointment(clean)||clean.userScheduleOverride||clean.cancelledAt){
      fresh.appointments.push(clean);
    }
  });

  // V7.56 latest-user-edit source of truth.
  // V7.55 locked overrides are preserved as manual decisions, but the lock itself is removed.
  fresh.statusDecisionSchema=2;
  fresh.statusOverrides={};
  if(saved.statusDecisionSchema>=1&&saved.statusOverrides&&typeof saved.statusOverrides==="object"){
    Object.entries(saved.statusOverrides).forEach(([key,o])=>{
      const status=normalizeStatus(o?.status);
      if(!status)return;
      fresh.statusOverrides[key]={
        status,
        source:"Manual",
        reason:o?.reason||"Manual latest status",
        updatedAt:o?.updatedAt||new Date().toISOString(),
        decisionId:o?.decisionId||null
      }
    })
  }
  fresh.statusAudit=Array.isArray(saved.statusAudit)?[...saved.statusAudit]:[];

  // One-time migration from V7.54 and earlier. Keep a confirmed Opt-Out only when
  // it is still the latest explicit decision. A later user appointment will replace it.
  if(!(saved.statusDecisionSchema>=1)){
    const latestOptOutByUnit={};
    fresh.appointments.forEach(a=>{
      if(a?.scheduleState!=="OptOut")return;
      const prev=latestOptOutByUnit[a.unitKey];
      if(!prev||Number(a.id)>Number(prev.id))latestOptOutByUnit[a.unitKey]=a
    });
    Object.entries(latestOptOutByUnit).forEach(([key,o])=>{
      const newerBooking=fresh.appointments.some(a=>a.unitKey===key&&Number(a.id)>Number(o.id)&&!["Rescheduled","Cancelled","History","OptOut"].includes(a?.scheduleState));
      if(newerBooking)return;
      fresh.statusOverrides[key]={status:"D",source:"Manual",reason:"Migrated latest Opt-Out",updatedAt:o.cancelledAt||new Date(Number(o.id)||Date.now()).toISOString(),decisionId:o.id};
      fresh.statusAudit.push({id:`migration-${o.id}`,unitKey:key,from:"",to:"D",action:"migrate-latest-edit",source:"V7.56 migration",at:o.cancelledAt||new Date(Number(o.id)||Date.now()).toISOString()})
    })
  }

  return fresh
}
function loadLegacyPlainState(){
  const keys=[LEGACY_STORAGE_KEY,PREV_STORAGE_KEY,"elu_premium_v11","elu_premium_v10"];
  for(const k of keys){
    try{
      const raw=localStorage.getItem(k);
      if(raw)return JSON.parse(raw)
    }catch{}
  }
  return null
}
let state={units:{},surveys:[],appointments:[],complaints:[],statusOverrides:{},statusAudit:[],statusDecisionSchema:2,createdAt:""};
let secureSessionKey=null;
let securePersistChain=Promise.resolve();
let appStarted=false;
let autoCompleteTimer=null;
let idleLockTimer=null;
let SECURE_PROFILE_NAME="Secure User";
const SECURE_USERNAME="Manoharan";

function bytesFromB64(v){const bin=atob(v),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}
function b64FromBytes(v){let s="";for(const b of new Uint8Array(v))s+=String.fromCharCode(b);return btoa(s)}
async function deriveSecureKey(password){
  const base=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey(
    {name:"PBKDF2",salt:bytesFromB64(SECURE_SEED_PAYLOAD.salt),iterations:Number(SECURE_SEED_PAYLOAD.iterations),hash:"SHA-256"},
    base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]
  )
}
async function decryptPayload(payload,key){
  const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:bytesFromB64(payload.iv)},key,bytesFromB64(payload.cipher));
  return JSON.parse(new TextDecoder().decode(plain))
}
async function encryptPayload(value,key){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const plain=new TextEncoder().encode(JSON.stringify(value));
  const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,plain);
  return {v:1,iv:b64FromBytes(iv),cipher:b64FromBytes(cipher)}
}
function secureSnapshot(){
  return {surveys:state.surveys,appointments:state.appointments,complaints:state.complaints,statusOverrides:state.statusOverrides||{},statusAudit:state.statusAudit||[],statusDecisionSchema:2,createdAt:state.createdAt}
}
async function securePersistNow(){
  if(!secureSessionKey||!appStarted)return;
  const payload=await encryptPayload(secureSnapshot(),secureSessionKey);
  localStorage.setItem(SECURE_STATE_KEY,JSON.stringify(payload))
}
function queueSecurePersist(){
  if(!secureSessionKey||!appStarted)return;
  securePersistChain=securePersistChain.then(()=>securePersistNow()).catch(err=>{
    console.error("Secure save failed",err);
    toast("Secure save failed — keep this page open and retry")
  })
}
function removeLegacyPlaintext(){
  const remove=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k&&/^elu_premium_v\d+$/.test(k))remove.push(k)
  }
  remove.forEach(k=>localStorage.removeItem(k))
}
async function loadEncryptedRuntimeState(key){
  const raw=localStorage.getItem(SECURE_STATE_KEY);
  if(!raw)return null;
  const payload=JSON.parse(raw);
  return decryptPayload(payload,key)
}
function showSecurityMessage(msg,isError=true){
  const e=document.getElementById("securityMessage");
  e.textContent=msg||"";
  e.classList.toggle("error",Boolean(msg&&isError))
}
function resetIdleLock(){
  if(!appStarted)return;
  clearTimeout(idleLockTimer);
  idleLockTimer=setTimeout(()=>secureLockAndReload(),AUTO_LOCK_MS)
}
async function secureLockAndReload(){
  try{await securePersistChain;await securePersistNow()}catch{}
  secureSessionKey=null;
  location.reload()
}
function startIdleLockWatch(){
  ["pointerdown","keydown","touchstart","mousemove"].forEach(evt=>document.addEventListener(evt,resetIdleLock,{passive:true}));
  resetIdleLock()
}
async function unlockSecureApp(password){
  if(!window.crypto?.subtle)throw new Error("This browser does not support secure encryption.");
  const key=await deriveSecureKey(password);

  let seed;
  try{
    seed=await decryptPayload(SECURE_SEED_PAYLOAD,key);
  }catch(err){
    const e=new Error("INVALID_CREDENTIALS");e.code="INVALID_CREDENTIALS";throw e
  }

  PROJECT_LAYOUT=seed.PROJECT_LAYOUT||{};
  SOURCE_APPOINTMENTS=seed.SOURCE_APPOINTMENTS||[];
  SECURE_PROFILE_NAME=seed.profileName||"Secure User";

  let saved=null;
  if(localStorage.getItem(SECURE_STATE_KEY)){
    try{
      saved=await loadEncryptedRuntimeState(key);
    }catch(err){
      const e=new Error("SAVED_STATE_DECRYPT_FAILED");e.code="SAVED_STATE_DECRYPT_FAILED";throw e
    }
  }else{
    saved=loadLegacyPlainState();
  }

  secureSessionKey=key;
  state=saved?mergeSavedIntoFresh(saved):makeInitialState();
  normalizeManualOverrides();
  startApp();
  await securePersistNow();
  removeLegacyPlaintext();

  document.getElementById("userNameChip").textContent=SECURE_PROFILE_NAME;
  document.getElementById("securityGate").classList.add("hidden");
  document.body.classList.remove("secure-locked");
  document.getElementById("securityUsername").value="";document.getElementById("securityPassword").value="";
  startIdleLockWatch()
}
function initSecurityGate(){
  const form=document.getElementById("securityLoginForm");
  const userInput=document.getElementById("securityUsername");
  const input=document.getElementById("securityPassword");
  const btn=document.getElementById("securityUnlockBtn");
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const username=userInput.value.trim();
    const password=input.value;
    if(!username||!password)return;
    if(username!==SECURE_USERNAME){
      showSecurityMessage("Wrong username or password.");
      input.value="";
      userInput.select();
      return
    }
    btn.disabled=true;btn.textContent="Logging in…";showSecurityMessage("",false);
    try{
      await unlockSecureApp(password)
    }catch(err){
      console.error(err);
      if(err?.code==="INVALID_CREDENTIALS"){
        showSecurityMessage("Wrong username or password.");
        input.select()
      }else if(err?.code==="SAVED_STATE_DECRYPT_FAILED"){
        showSecurityMessage("Login is correct, but saved browser data could not be opened. Do not clear site data.");
      }else{
        showSecurityMessage("Login is correct, but the app could not start. Please use the latest ELU version.");
      }
    }finally{
      btn.disabled=false;btn.textContent="Login"
    }
  });
  document.getElementById("securityLogoutBtn").addEventListener("click",secureLockAndReload);
  setTimeout(()=>userInput.focus(),100)
}

function getUnit(key){return state.units[key]}
function unitsArray(){return Object.values(state.units)}
function getBlockUnits(block){return unitsArray().filter(u=>u.block===Number(block)).sort((a,b)=>b.floor-a.floor||a.unit-b.unit)}
function appointmentHasEnded(a){
  if(!a?.date||!a?.slot)return false;
  const now=sgClock();if(a.date<now.date)return true;if(a.date>now.date)return false;
  const end=SLOT_END_MINUTES[a.slot]??slotEndMinutes(a.slot);return end==null?false:now.minutes>=Number(end);
}
function latestById(arr){return [...arr].sort((a,b)=>Number(b.id)-Number(a.id))[0]||null}
function manualStatusOverride(key){
  const o=state.statusOverrides&&state.statusOverrides[key];
  if(!o)return null;
  const status=normalizeStatus(o.status);
  return status?{...o,status}:null
}
function hasManualStatusDecision(key){return Boolean(manualStatusOverride(key))}
function appendStatusAudit(key,from,to,action,detail=""){
  state.statusAudit=Array.isArray(state.statusAudit)?state.statusAudit:[];
  state.statusAudit.push({id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,unitKey:key,from:normalizeStatus(from),to:normalizeStatus(to),action,detail,source:"Manual",at:new Date().toISOString()});
  if(state.statusAudit.length>5000)state.statusAudit=state.statusAudit.slice(-5000)
}
function setManualStatusDecision(key,status,detail=""){
  status=normalizeStatus(status);if(!status)return false;
  state.statusOverrides=state.statusOverrides&&typeof state.statusOverrides==="object"?state.statusOverrides:{};
  const before=currentUnitAppointmentState(key).status;
  const prev=state.statusOverrides[key];
  state.statusOverrides[key]={status,source:"Manual",reason:detail||"Latest manual status",updatedAt:new Date().toISOString(),decisionId:prev?.decisionId||null};
  appendStatusAudit(key,before,status,prev?"replace-latest-edit":"set-latest-edit",detail||"Latest manual status");
  return true
}
function clearManualStatusDecision(key,detail="Later explicit user edit"){
  const o=manualStatusOverride(key);if(!o)return false;
  delete state.statusOverrides[key];
  appendStatusAudit(key,o.status,"","superseded-by-later-edit",detail);
  return true
}
function applyLaterAppointmentEdit(key,sourceLabel="Appointment"){
  // A later explicit user save is allowed to replace an earlier manual D decision.
  // No special unlock/re-open step is required.
  clearManualStatusDecision(key,`Later explicit user edit: ${sourceLabel}`);
}

function latestOptOutDecision(key){
  return latestById(state.appointments.filter(a=>a.unitKey===key&&a.scheduleState==="OptOut"))
}
function isInactiveSchedule(a){
  if(["Rescheduled","Cancelled","History","OptOut"].includes(a?.scheduleState))return true;
  const d=latestOptOutDecision(a?.unitKey);
  return Boolean(d&&Number(d.id)>Number(a?.id||0))
}
function activeAppointmentsForUnit(key){return state.appointments.filter(a=>a.unitKey===key&&!isInactiveSchedule(a))}
function preferredMasterAppointment(key){
  if(hasManualStatusDecision(key))return null;
  const arr=activeAppointmentsForUnit(key);if(!arr.length)return null;
  const pending=arr.filter(a=>a.workStatus!=="Completed"&&!appointmentHasEnded(a));
  if(pending.length){
    const manual=pending.filter(a=>a.source==="Planner"||a.source==="Manual");
    const pool=manual.length?manual:pending;
    return [...pool].sort((a,b)=>b.date.localeCompare(a.date)||slotStartMinutes(b.slot)-slotStartMinutes(a.slot)||Number(b.id)-Number(a.id))[0]
  }
  return [...arr].sort((a,b)=>b.date.localeCompare(a.date)||slotStartMinutes(b.slot)-slotStartMinutes(a.slot)||Number(b.id)-Number(a.id))[0]
}

function currentUnitAppointmentState(key){
  const manual=manualStatusOverride(key);
  if(manual){
    return {appointment:null,status:manual.status,workStatus:manual.status==="A"?"Completed":"Pending",active:false,completed:manual.status==="A",manualOverride:manual}
  }

  const a=preferredMasterAppointment(key);

  if(a&&a.date){
    const completed=a.workStatus==="Completed"||appointmentHasEnded(a);
    if(completed)return {appointment:a,status:"A",workStatus:"Completed",active:false,completed:true};
    return {appointment:a,status:"C",workStatus:"Pending",active:true,completed:false}
  }

  const u=state.units[key];
  let seedStatus="",seedOwner="",seedContact="";
  if(u){
    const d=PROJECT_LAYOUT[String(u.block)]||PROJECT_LAYOUT[u.block];
    const seed=(d?.seed||{})[`${u.floor}-${u.unit}`]||{};
    seedStatus=normalizeStatus(seed.response);
    seedOwner=String(seed.ownerName||"").trim();
    seedContact=String(seed.contact||"").trim()
  }

  if(seedStatus==="D")return {appointment:null,status:"D",workStatus:"Pending",active:false,completed:false};
  if(seedStatus==="A")return {appointment:null,status:"A",workStatus:"Completed",active:false,completed:true};

  const identityAppt=latestById(state.appointments.filter(x=>x.unitKey===key&&(String(x.ownerName||"").trim()||String(x.contact||"").trim())));
  const hasResidentResponse=Boolean(
    String(identityAppt?.ownerName||"").trim()||
    String(identityAppt?.contact||"").trim()||
    String(u?.ownerName||"").trim()||
    String(u?.contact||"").trim()||
    seedOwner||seedContact||
    seedStatus==="C"
  );

  if(hasResidentResponse)return {appointment:null,status:"P",workStatus:"Pending",active:false,completed:false};
  return {appointment:null,status:"NR",workStatus:"Pending",active:false,completed:false}
}

function normalizeManualOverrides(){
  const by={};
  state.appointments.forEach(a=>{
    if(hasManualStatusDecision(a.unitKey)||isInactiveSchedule(a)||a.workStatus==="Completed"||appointmentHasEnded(a))return;
    (by[a.unitKey]||(by[a.unitKey]=[])).push(a)
  });
  Object.values(by).forEach(arr=>{
    const manual=arr.filter(a=>a.source==="Planner"||a.source==="Manual");
    if(!manual.length)return;
    const keep=[...manual].sort((a,b)=>Number(b.id)-Number(a.id))[0];
    arr.forEach(a=>{if(a!==keep)a.scheduleState="Rescheduled"})
  })
}
function rebuildUnitMaster(key){
  const current=state.units[key];if(!current)return;
  const base=baseUnit(current.block,current.floor,current.unit);

  const surveys=state.surveys.filter(s=>s.unitKey===key),latestSurvey=latestById(surveys);
  if(latestSurvey&&latestSurvey.contact&&!base.contact)base.contact=latestSurvey.contact;

  const allUnitAppointments=state.appointments.filter(a=>a.unitKey===key);
  const latestIdentityAppt=latestById(allUnitAppointments.filter(a=>a.ownerName||a.contact));
  if(latestIdentityAppt){
    if(latestIdentityAppt.ownerName)base.ownerName=latestIdentityAppt.ownerName;
    if(latestIdentityAppt.contact)base.contact=latestIdentityAppt.contact;
  }

  state.units[key]={...current,ownerName:base.ownerName,contact:base.contact};
  const live=currentUnitAppointmentState(key);
  const a=live.appointment;

  base.response=live.status;
  base.workStatus=live.workStatus;

  if(a){
    base.appointmentDate=a.date||"";
    base.appointmentSlot=a.slot||"";
    base.team=a.team||"";
    if(a.ownerName)base.ownerName=a.ownerName;
    if(a.contact)base.contact=a.contact;
    if(a.remarks&&(isUserAppointment(a)||a.userRemarks)){
      const parts=[base.remarks,a.remarks].map(v=>String(v||"").trim()).filter(Boolean);
      base.remarks=[...new Set(parts)].join(" · ");
    }
    if(live.completed&&a.workStatus!=="Completed")a.workStatus="Completed";
  }else{
    base.appointmentDate="";
    base.appointmentSlot="";
    base.team="";
  }

  state.units[key]=base;
}
function rebuildAllMasters(){Object.keys(state.units).forEach(rebuildUnitMaster)}
function persist(){queueSecurePersist()}
function save(msg){normalizeManualOverrides();rebuildAllMasters();persist();renderAll();if(msg)toast(msg)}
function autoCompleteAppointments(showToast=false){
  let changed=0;
  state.appointments.forEach(a=>{
    if(!hasManualStatusDecision(a.unitKey)&&!isInactiveSchedule(a)&&a.workStatus!=="Completed"&&appointmentHasEnded(a)){a.workStatus="Completed";changed++}
  });
  if(changed){rebuildAllMasters();persist();renderAll();if(showToast)toast(`${changed} appointment${changed===1?"":"s"} changed C → A`)}
}
function viewTitle(view){return {
dashboard:["Executive Dashboard","One view of A, C, D, NR, appointments and completed work."],
blockboard:["Block & Floor Board","Exact floor-wise units from your PR3 Excel files."],
survey:["Survey Visit Register","Visit diary for resident calls: date, exact time and contact reference."],
appointments:["Appointment Schedule","Main operational source for resident, date, slot, team and work confirmation."],
units:["Unit Register","Read-only master data populated automatically from your working registers."],
complaints:["Complaint Register","Separate complaint records with unit lookup."],
teams:["Appointment Planner","Simple read-only daily view of appointments entered in Appointment Schedule."],
schedulemaster:["Master Appointment Schedule","Fast 22 → 21 cycle entry. The same live records feed Planner and Photo Report."],
photos:["Photo Report","Daily photo inbox with Zone-wise and Block-wise Word / PDF outputs."],
reports:["Weekly Meeting Report","Progress Summary calculated directly from the read-only Unit Register."]
}[view]}
function setView(view){
  rebuildAllMasters();
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));document.getElementById(view).classList.add("active");
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  const [t,s]=viewTitle(view);document.getElementById("pageTitle").textContent=t;document.getElementById("pageSubtitle").textContent=s;
  if(view==="dashboard")renderDashboard();
  else if(view==="blockboard")renderBlockBoard();
  else if(view==="survey")renderSurveyTable();
  else if(view==="appointments")renderAppointmentTable();
  else if(view==="units")renderUnitTable();
  else if(view==="complaints")renderComplaintTable();
  else if(view==="teams")renderPlanner();
  else if(view==="schedulemaster")renderMasterSchedule();
  else if(view==="photos"){syncPhotoTargetUnits();photoAutoCleanup()}
  else if(view==="reports")renderReport();
  window.scrollTo({top:0,behavior:"smooth"});
}
document.getElementById("nav").addEventListener("click",e=>{const b=e.target.closest(".nav-item");if(b)setView(b.dataset.view)});
document.body.addEventListener("click",e=>{const b=e.target.closest("[data-go]");if(b)setView(b.dataset.go)});
let activeMapZone="all";
document.getElementById("zoneMapPanel").addEventListener("click",e=>{
  const blockButton=e.target.closest("[data-map-block]");
  const openButton=e.target.closest("[data-open-map-zone]");
  const zoneButton=e.target.closest("[data-map-zone]");
  if(!blockButton&&!openButton&&!zoneButton)return;
  const zone=blockButton?.dataset.mapZone||openButton?.dataset.openMapZone||zoneButton?.dataset.mapZone;
  if(zone==="all"&&zoneButton){activeMapZone="all";renderZoneMap(unitsArray());return}
  if(!ZONE_BLOCKS[zone])return;
  if(zoneButton&&!blockButton&&!openButton){activeMapZone=zone;renderZoneMap(unitsArray());return;}
  document.getElementById("boardZone").value=zone;
  syncBoardBlocks();
  if(blockButton){
    document.getElementById("boardBlock").value=blockButton.dataset.mapBlock;
    renderBoardFloorOptions();
  }
  document.getElementById("boardFloor").value="all";
  document.getElementById("boardSearch").value="";
  setView("blockboard");
});

function zoneOptions(includeAll=false){return(includeAll?`<option value="all">All Zones</option>`:"")+Object.keys(ZONE_BLOCKS).map(z=>`<option value="${z}">Zone ${z}</option>`).join("")}
function blockOptions(zone){return(ZONE_BLOCKS[zone]||[]).map(b=>`<option value="${b}">Blk ${b}</option>`).join("")}
function allBlockOptions(includeAll=true){const h=includeAll?`<option value="all">All Blocks</option>`:"";return h+Object.values(ZONE_BLOCKS).flat().map(b=>`<option value="${b}">Blk ${b}</option>`).join("")}
function filterBlockOptions(zone,includeAll=true){if(zone==="all")return allBlockOptions(includeAll);const h=includeAll?`<option value="all">All Blocks</option>`:"";return h+blockOptions(zone)}
function zoneOfBlock(block){return Number(Object.keys(ZONE_BLOCKS).find(z=>(ZONE_BLOCKS[z]||[]).includes(Number(block)))||0)}
function zoneGroupHeader(zone,count,label){return `<div class="zone-group-head"><div><span>ZONE ${zone}</span><strong>Blocks ${(ZONE_BLOCKS[zone]||[]).join(", ")}</strong></div><em>${count} ${label}</em></div>`}
function unitOptionsForBlock(block){return getBlockUnits(block).map(u=>`<option value="${u.key}">${unitDisplay(u.floor,u.unit)}</option>`).join("")}
function initSelectors(){
  ["boardZone","surveyZone","appointmentZone","complaintZone","plannerZone"].forEach(id=>document.getElementById(id).innerHTML=zoneOptions());
  ["unitZoneFilter","appointmentZoneFilter","complaintZoneFilter","plannerViewZone","reportZoneFilter","responseSummaryZoneFilter"].forEach(id=>document.getElementById(id).innerHTML=zoneOptions(true));
  ["boardZone","surveyZone","appointmentZone","complaintZone","plannerZone"].forEach(id=>document.getElementById(id).value="1");
  ["unitZoneFilter","appointmentZoneFilter","complaintZoneFilter","plannerViewZone","reportZoneFilter","responseSummaryZoneFilter"].forEach(id=>document.getElementById(id).value="all");
  ["unitBlockFilter","appointmentBlockFilter","complaintBlockFilter","plannerViewBlock","reportBlockFilter"].forEach(id=>document.getElementById(id).innerHTML=allBlockOptions(true));
  syncBoardBlocks();syncSurveyBlocks();syncAppointmentBlocks();syncComplaintBlocks();syncPlannerBlocks();
}
function syncBoardBlocks(){const z=document.getElementById("boardZone").value;document.getElementById("boardBlock").innerHTML=blockOptions(z);renderBoardFloorOptions();renderBlockBoard()}
function renderBoardFloorOptions(){
  const b=document.getElementById("boardBlock").value,floors=Object.keys(PROJECT_LAYOUT[b]?.floors||{}).map(Number).sort((a,b)=>b-a),e=document.getElementById("boardFloor"),old=e.value;
  e.innerHTML=`<option value="all">All floors</option>`+floors.map(x=>`<option value="${x}">Floor ${x}</option>`).join("");if([...e.options].some(o=>o.value===old))e.value=old
}
function syncSurveyBlocks(){document.getElementById("surveyBlock").innerHTML=blockOptions(document.getElementById("surveyZone").value);syncSurveyUnits()}
function syncSurveyUnits(){document.getElementById("surveyUnit").innerHTML=unitOptionsForBlock(document.getElementById("surveyBlock").value);autofillSurvey()}
function syncAppointmentBlocks(){document.getElementById("appointmentBlock").innerHTML=blockOptions(document.getElementById("appointmentZone").value);syncPairUnits("appointment")}
function syncComplaintBlocks(){document.getElementById("complaintBlock").innerHTML=blockOptions(document.getElementById("complaintZone").value);syncPairUnits("complaint")}
function syncPlannerBlocks(){document.getElementById("plannerBlock").innerHTML=blockOptions(document.getElementById("plannerZone").value);syncPlannerUnits()}
function syncPairUnits(prefix){document.getElementById(prefix+"Unit").innerHTML=unitOptionsForBlock(document.getElementById(prefix+"Block").value);autofillPair(prefix)}
function syncPlannerUnits(){document.getElementById("plannerUnit").innerHTML=unitOptionsForBlock(document.getElementById("plannerBlock").value)}
function autofillSurvey(){
  const u=getUnit(document.getElementById("surveyUnit").value);if(!u)return;
  document.getElementById("surveyOwner").value=u.ownerName||"";
  document.getElementById("surveyContact").value=u.contact||""
}

function preferredUnitAppointment(key){return preferredMasterAppointment(key)}
function appointmentTargetForForm(key){
  const editId=Number(document.getElementById("appointmentEditId").value);
  if(editId)return state.appointments.find(a=>a.id===editId)||null;
  return preferredUnitAppointment(key)
}
function toggleAppointmentCustomTime(){
  const row=document.getElementById("appointmentCustomTimeRow");
  if(row)row.classList.toggle("hidden",document.getElementById("appointmentSlot").value!=="CUSTOM")
}
function appointmentSlotValue(){
  const sel=document.getElementById("appointmentSlot");
  if(sel.value!=="CUSTOM")return sel.value;
  const start=document.getElementById("appointmentCustomStart").value,end=document.getElementById("appointmentCustomEnd").value;
  if(!start||!end)return "";
  return customSlotLabel(start,end)
}
function fillAppointmentScheduleInputs(a){
  const date=document.getElementById("appointmentDate"),slot=document.getElementById("appointmentSlot"),team=document.getElementById("appointmentTeam");
  if(!date||!slot||!team)return;
  if(a){
    date.value=a.date||isoTodaySG();
    team.value=a.team||"";
    if(SLOTS.includes(a.slot)){
      slot.value=a.slot;
      document.getElementById("appointmentCustomStart").value="";
      document.getElementById("appointmentCustomEnd").value="";
    }else{
      slot.value="CUSTOM";
      const t=slotToCustomTimes(a.slot);
      document.getElementById("appointmentCustomStart").value=t.start;
      document.getElementById("appointmentCustomEnd").value=t.end;
    }
  }else{
    date.value=date.value||isoTodaySG();
    slot.value=SLOTS[0];
    team.value="Team 1";
    document.getElementById("appointmentCustomStart").value="";
    document.getElementById("appointmentCustomEnd").value="";
  }
  toggleAppointmentCustomTime()
}
function renderAppointmentPlan(a){
  const card=document.getElementById("appointmentPlanCard"),note=document.getElementById("appointmentSyncNote");
  document.getElementById("appointmentPlanDate").textContent=a?safeDate(a.date):"—";
  document.getElementById("appointmentPlanSlot").textContent=a?(a.slot||"—"):"—";
  document.getElementById("appointmentPlanTeam").textContent=a?(a.team||"Unassigned"):"—";
  card.classList.toggle("no-plan",!a);
  if(note)note.textContent=a?`Current active booking: ${safeDate(a.date)} · ${a.slot}${a.team?` · ${a.team}`:""}. Edit here or in Planner — both update the same record.`:"No active booking yet. Enter Date + Slot + Team here for a direct appointment."
}
function autofillPair(prefix){
  const u=getUnit(document.getElementById(prefix+"Unit").value);if(!u)return;
  document.getElementById(prefix+"Owner").value=u.ownerName||"";
  document.getElementById(prefix+"Contact").value=u.contact||"";
  if(prefix==="appointment"){
    const a=appointmentTargetForForm(u.key);
    if(a){
      document.getElementById("appointmentOwner").value=a.ownerName||u.ownerName||"";
      document.getElementById("appointmentContact").value=a.contact||u.contact||"";
      document.getElementById("appointmentRemarks").value=a.remarks||"";
    }else{
      document.getElementById("appointmentRemarks").value="";
    }
    fillAppointmentScheduleInputs(a);
    renderAppointmentPlan(a)
  }
}
document.getElementById("boardZone").addEventListener("change",syncBoardBlocks);document.getElementById("boardBlock").addEventListener("change",()=>{renderBoardFloorOptions();renderBlockBoard()});document.getElementById("boardFloor").addEventListener("change",renderBlockBoard);document.getElementById("boardSearch").addEventListener("input",renderBlockBoard);
document.getElementById("downloadBlockBoardBtn").addEventListener("click",exportBlockBoardPrint);
document.getElementById("surveyZone").addEventListener("change",syncSurveyBlocks);document.getElementById("surveyBlock").addEventListener("change",syncSurveyUnits);document.getElementById("surveyUnit").addEventListener("change",autofillSurvey);
document.getElementById("appointmentZone").addEventListener("change",syncAppointmentBlocks);document.getElementById("appointmentBlock").addEventListener("change",()=>syncPairUnits("appointment"));document.getElementById("appointmentUnit").addEventListener("change",()=>autofillPair("appointment"));
document.getElementById("complaintZone").addEventListener("change",syncComplaintBlocks);document.getElementById("complaintBlock").addEventListener("change",()=>syncPairUnits("complaint"));document.getElementById("complaintUnit").addEventListener("change",()=>autofillPair("complaint"));
document.getElementById("plannerZone").addEventListener("change",syncPlannerBlocks);document.getElementById("plannerBlock").addEventListener("change",syncPlannerUnits);
document.getElementById("plannerSlot").addEventListener("change",togglePlannerCustomTime);
document.getElementById("appointmentSlot").addEventListener("change",toggleAppointmentCustomTime);

const ZONE_MAP_CENTER=[1.3690,103.95125];
function mapWorld(lat,lon,zoom){
  const scale=256*2**zoom,rad=Math.max(-85,Math.min(85,lat))*Math.PI/180;
  return{x:(lon+180)/360*scale,y:(1-Math.log(Math.tan(rad)+1/Math.cos(rad))/Math.PI)/2*scale};
}
function zoneMapViewport(stage){
  if(activeMapZone==="all")return{center:ZONE_MAP_CENTER,zoom:stage.clientWidth<650?16:17};
  const points=ZONE_BLOCKS[activeMapZone].map(b=>BLOCK_MAP_LOCATION[b]);
  const center=[points.reduce((v,p)=>v+p[0],0)/points.length,points.reduce((v,p)=>v+p[1],0)/points.length];
  let zoom=stage.clientWidth<650?17:18;
  while(zoom>15){
    const xy=points.map(p=>mapWorld(p[0],p[1],zoom));
    const width=Math.max(...xy.map(p=>p.x))-Math.min(...xy.map(p=>p.x));
    const height=Math.max(...xy.map(p=>p.y))-Math.min(...xy.map(p=>p.y));
    if(width<stage.clientWidth-150&&height<stage.clientHeight-210)break;
    zoom--;
  }
  return{center,zoom};
}
function mapPixel(lat,lon,stage){
  const {zoom,center}=zoneMapViewport(stage),p=mapWorld(lat,lon,zoom),c=mapWorld(...center,zoom);
  return{x:Math.round(stage.clientWidth/2+p.x-c.x),y:Math.round(stage.clientHeight/2+p.y-c.y)};
}
function renderZoneMapTiles(stage){
  const layer=document.getElementById("zoneMapTiles"),w=stage.clientWidth,h=stage.clientHeight,{zoom,center}=zoneMapViewport(stage);
  if(!w||!h)return;
  const key=`${w}x${h}z${zoom}-${center.map(v=>v.toFixed(6)).join(",")}`;
  if(layer.dataset.size===key)return;
  layer.dataset.size=key;
  const c=mapWorld(...center,zoom),left=c.x-w/2,top=c.y-h/2;
  const x0=Math.floor(left/256),x1=Math.floor((left+w)/256),y0=Math.floor(top/256),y1=Math.floor((top+h)/256);
  let tiles="";
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)tiles+=`<img alt="" loading="lazy" src="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}" onerror="this.onerror=null;this.src='https://www.onemap.gov.sg/maps/tiles/Night/${zoom}/${x}/${y}.png'" style="left:${Math.round(x*256-left)}px;top:${Math.round(y*256-top)}px">`;
  layer.innerHTML=tiles;
}
function layoutMapBuildings(blocks,stage){
  const positions=blocks.map(b=>{const loc=BLOCK_MAP_LOCATION[b],p=mapPixel(loc[0],loc[1],stage);return{block:b,x:p.x,y:p.y}});
  const mobile=stage.clientWidth<650,sepX=mobile?58:72,sepY=mobile?48:58;
  const minX=36,maxX=Math.max(minX,stage.clientWidth-minX),minY=mobile?145:105,maxY=Math.max(minY,stage.clientHeight-36);
  for(let k=0;k<90;k++){
    for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++){
      const a=positions[i],b=positions[j],dx=b.x-a.x,dy=b.y-a.y;
      if(Math.abs(dx)<sepX&&Math.abs(dy)<sepY){
        const sx=(dx===0?(j%2?1:-1):Math.sign(dx))*Math.min(10,(sepX-Math.abs(dx))*.21);
        const sy=(dy===0?(j%2?-1:1):Math.sign(dy))*Math.min(9,(sepY-Math.abs(dy))*.17);
        a.x-=sx;a.y-=sy;b.x+=sx;b.y+=sy;
      }
    }
    positions.forEach(p=>{p.x=Math.min(maxX,Math.max(minX,p.x));p.y=Math.min(maxY,Math.max(minY,p.y))});
  }
  return positions;
}
function renderZoneMap(u){
  const zoneStats=z=>{
    const units=u.filter(x=>x.zone===Number(z)),completed=units.filter(x=>x.workStatus==="Completed").length;
    return{units:units.length,completed,pct:units.length?Math.round(completed/units.length*100):0};
  };
  const stage=document.querySelector(".zone-map-stage");renderZoneMapTiles(stage);
  const nav=`<div class="map-zone-nav" aria-label="Project zones"><button type="button" data-map-zone="all" aria-pressed="${activeMapZone==="all"}">All zones</button>${Object.keys(ZONE_BLOCKS).map(z=>`<button type="button" data-map-zone="${z}" aria-pressed="${activeMapZone===z}">Zone ${z}</button>`).join("")}</div>`;
  const markers=Object.keys(ZONE_BLOCKS).map(z=>{
    const s=zoneStats(z),active=z===activeMapZone;
    if(active)return layoutMapBuildings(ZONE_BLOCKS[z],stage).map(({block:b,x,y})=>{
      return `<button class="map-building-pin" type="button" data-map-zone="${z}" data-map-block="${b}" style="left:${Math.round(x)}px;top:${Math.round(y)}px" title="Open Blk ${b} · ${BLOCK_MAP_LOCATION[b][2]}" aria-label="Open Block ${b} in Zone ${z}"><span class="map-block-number">BLK ${b}</span></button>`;
    }).join("");
    if(activeMapZone!=="all")return"";
    const points=ZONE_BLOCKS[z].map(b=>BLOCK_MAP_LOCATION[b]);
    const lat=points.reduce((sum,p)=>sum+p[0],0)/points.length,lon=points.reduce((sum,p)=>sum+p[1],0)/points.length;
    const p=mapPixel(lat,lon,stage);
    return `<button class="map-zone-pin map-zone-pin-${z}" type="button" data-map-zone="${z}" style="left:${p.x}px;top:${p.y}px" aria-label="Show Zone ${z} blocks"><span>ZONE ${z}</span><small>${ZONE_BLOCKS[z].length} blocks · ${s.pct}% done</small></button>`;
  }).join("");
  document.getElementById("zoneMap").innerHTML=nav+markers;
}
let zoneMapResizeTimer;
window.addEventListener("resize",()=>{clearTimeout(zoneMapResizeTimer);zoneMapResizeTimer=setTimeout(()=>renderZoneMap(unitsArray()),140)});
function renderDashboard(){
  const u=unitsArray(),total=u.length,a=u.filter(x=>x.response==="A").length,c=u.filter(x=>x.response==="C").length,p=u.filter(x=>x.response==="P").length,d=u.filter(x=>x.response==="D").length,nr=u.filter(x=>x.response==="NR").length,done=u.filter(x=>x.workStatus==="Completed").length;
  const agree=a+c,openFollowups=state.surveys.filter(s=>s.visitDate&&s.visitDate>=isoTodaySG()).length,donePct=total?Math.round(done/total*100):0;
  document.getElementById("heroTotalUnits").textContent=total.toLocaleString();const tag=document.getElementById("heroTagUnits");if(tag)tag.textContent=`${total.toLocaleString()} Units`;const orbit=document.getElementById("heroOrbit");if(orbit)orbit.style.setProperty("--pct",`${donePct*3.6}deg`);const orbitText=document.getElementById("heroCompletionPct");if(orbitText)orbitText.textContent=`${donePct}%`;
  document.getElementById("kpiOptIn").textContent=agree.toLocaleString();document.getElementById("kpiOptInPct").textContent=`${total?Math.round(agree/total*100):0}% · A + C`;
  document.getElementById("kpiAppointments").textContent=c.toLocaleString();
  document.getElementById("kpiPending").textContent=p.toLocaleString();
  document.getElementById("kpiCompleted").textContent=done.toLocaleString();document.getElementById("kpiCompletedPct").textContent=`${donePct}% project`;
  document.getElementById("kpiNR").textContent=nr.toLocaleString();document.getElementById("kpiOptOut").textContent=d.toLocaleString();document.getElementById("kpiFollowups").textContent=openFollowups.toLocaleString();
  document.getElementById("zoneProgress").innerHTML=Object.keys(ZONE_BLOCKS).map(z=>{const zu=u.filter(x=>x.zone===Number(z)),zc=zu.filter(x=>x.workStatus==="Completed").length,za=zu.filter(x=>x.response==="A"||x.response==="C").length,zp=zu.filter(x=>x.response==="P").length,pct=zu.length?Math.round(zc/zu.length*100):0;return`<div class="zone-line"><div><div><div class="zone-name">Zone ${z}</div><div class="zone-pct">${pct}% complete</div></div><div class="zone-mini">${zc}/${zu.length}<br>${za} opt-in · ${zp} pending</div></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div>`}).join("");
  renderZoneMap(u);
  const upcoming=state.appointments.filter(x=>!isInactiveSchedule(x)&&x.workStatus!=="Completed"&&!appointmentHasEnded(x)&&x.date>=isoTodaySG()).sort((a,b)=>a.date.localeCompare(b.date)||slotStartMinutes(a.slot)-slotStartMinutes(b.slot)||Number(a.block)-Number(b.block)).slice(0,6);
  document.getElementById("upcomingAppointments").innerHTML=upcoming.length?upcoming.map(x=>`<div class="compact-item"><div><strong>Blk ${x.block} · ${esc(x.unitDisplay)}</strong><span>${esc(getUnit(x.unitKey)?.ownerName||"Owner not entered")} · ${esc(x.team||"Unassigned")}</span></div><small>C · ${safeDate(x.date)}<br>${esc(x.slot)}</small></div>`).join(""):`<div class="empty-state">No upcoming confirmations.</div>`;
  const follow=state.surveys.filter(s=>s.visitDate&&s.visitDate>=isoTodaySG()).sort((a,b)=>a.visitDate.localeCompare(b.visitDate)||String(a.visitTime||"").localeCompare(String(b.visitTime||""))).slice(0,6);
  document.getElementById("followupAttention").innerHTML=follow.length?follow.map(s=>`<div class="attention-card"><strong>Blk ${s.block} · ${esc(s.unitDisplay)}</strong><span>${esc(s.ownerName||"Name not entered")} · ${esc(s.contact||"No contact")}</span><b>${safeDate(s.visitDate)}${s.visitTime?` · ${esc(s.visitTime)}`:""}</b></div>`).join(""):`<div class="empty-state">No upcoming survey visits.</div>`;
  renderTodayTeamBoard();
}
function renderBlockBoard(){
  const block=Number(document.getElementById("boardBlock").value),floorFilter=document.getElementById("boardFloor").value,q=document.getElementById("boardSearch").value.trim().toLowerCase(),raw=getBlockUnits(block);
  const u=raw.map(x=>{const live=currentUnitAppointmentState(x.key),a=live.appointment;return{...x,response:live.status,workStatus:live.workStatus,appointmentDate:a?.date||"",appointmentSlot:a?.slot||"",team:a?.team||""}});
  const total=u.length,a=u.filter(x=>x.response==="A").length,c=u.filter(x=>x.response==="C").length,p=u.filter(x=>x.response==="P").length,d=u.filter(x=>x.response==="D").length,nr=u.filter(x=>x.response==="NR").length,pct=n=>total?Math.round(n/total*100):0;
  document.getElementById("blockHeadline").innerHTML=`<div class="block-title-wrap"><span class="block-zone-tag">ZONE ${PROJECT_LAYOUT[block].zone}</span><h2>Block ${block}</h2><p>${total} exact project units · live appointment status</p></div><div class="block-summary-grid"><div class="summary-tile total"><span>Total Units</span><strong>${total}</strong><small>100%</small></div><div class="summary-tile a"><span>A · Opt-In</span><strong>${a}</strong><small>${pct(a)}%</small></div><div class="summary-tile c"><span>C · Confirmed</span><strong>${c}</strong><small>${pct(c)}%</small></div><div class="summary-tile p"><span>◷ P · Pending</span><strong>${p}</strong><small>${pct(p)}%</small></div><div class="summary-tile d"><span>D · Opt-Out</span><strong>${d}</strong><small>${pct(d)}%</small></div><div class="summary-tile nr"><span>NR · No Response</span><strong>${nr}</strong><small>${pct(nr)}%</small></div></div>`;
  const floors=[...new Set(u.map(x=>x.floor))].sort((a,b)=>b-a).filter(f=>floorFilter==="all"||Number(floorFilter)===f);
  document.getElementById("floorBoard").innerHTML=floors.map(f=>{const fu=u.filter(x=>x.floor===f).filter(x=>!q||unitDisplay(x.floor,x.unit).toLowerCase().includes(q)||String(x.unit).includes(q));if(!fu.length)return"";return`<div class="floor-row"><div class="floor-label"><strong>${f}</strong><span>Floor</span></div><div class="unit-grid">${fu.map(x=>{const sc=x.response==="A"?"status-a":x.response==="C"?"status-c":x.response==="P"?"status-p":x.response==="D"?"status-out":x.response==="NR"?"status-nr":"";const dateLine=x.appointmentDate&&(x.response==="A"||x.response==="C")?`<div class="u-date ${x.response==="A"?"done-date":"appt-date"}"><span>${x.response==="A"?"Done":"Appt"}</span>${esc(shortBoardDate(x.appointmentDate))}</div>`:"";const pendingIcon=x.response==="P"?'<span class="pending-inline-icon">◷</span>':"";return`<button class="unit-card ${sc}" data-unit-key="${x.key}"><div class="u-no">${unitDisplay(x.floor,x.unit)}</div><div class="u-status">${pendingIcon}${esc(statusLabel(x.response))}</div>${dateLine}</button>`}).join("")}</div></div>`}).join("")||`<div class="empty-state">No units match this filter.</div>`;
}
document.getElementById("floorBoard").addEventListener("click",e=>{const b=e.target.closest("[data-unit-key]");if(b)openDrawer(b.dataset.unitKey)});

function latestAppointment(key){return preferredMasterAppointment(key)||latestById(state.appointments.filter(a=>a.unitKey===key&&!isInactiveSchedule(a)))}
function openDrawer(key){
  const u=getUnit(key);if(!u)return;const a=latestAppointment(key);
  document.getElementById("drawerUnitKey").value=key;document.getElementById("drawerUnitTitle").textContent=`Blk ${u.block} · ${unitDisplay(u.floor,u.unit)}`;document.getElementById("drawerUnitMeta").textContent=`Zone ${u.zone} · Floor ${u.floor}`;
  const survey=latestById(state.surveys.filter(s=>s.unitKey===key));
  const surveyVisit=survey?.visitDate?`${safeDate(survey.visitDate)}${survey.visitTime?` · ${survey.visitTime}`:""}`:"—";
  document.getElementById("drawerStatusText").textContent=statusLabel(u.response);document.getElementById("drawerOwnerText").textContent=u.ownerName||"—";document.getElementById("drawerContactText").textContent=u.contact||"—";document.getElementById("drawerFollowupText").textContent=surveyVisit;document.getElementById("drawerRemarksText").textContent=u.remarks||"—";document.getElementById("drawerAppointmentText").textContent=u.appointmentDate?`${safeDate(u.appointmentDate)} · ${u.appointmentSlot}`:"—";document.getElementById("drawerTeamText").textContent=u.team||"—";
  const legacy=document.getElementById("drawerLegacy"),txt=[u.legacySchedule&&`Imported schedule: ${u.legacySchedule}`,u.legacyRemark&&`Imported Excel remark: ${u.legacyRemark}`].filter(Boolean).join("<br>");legacy.innerHTML=txt;legacy.classList.toggle("show",!!txt);
  document.getElementById("drawerBackdrop").classList.add("open");document.getElementById("unitDrawer").classList.add("open");
}
function closeDrawer(){document.getElementById("drawerBackdrop").classList.remove("open");document.getElementById("unitDrawer").classList.remove("open")}
document.getElementById("drawerClose").addEventListener("click",closeDrawer);document.getElementById("drawerBackdrop").addEventListener("click",closeDrawer);
function jumpFromDrawer(target){const u=getUnit(document.getElementById("drawerUnitKey").value);if(!u)return;closeDrawer();setView(target);if(target==="survey"){document.getElementById("surveyZone").value=String(u.zone);syncSurveyBlocks();document.getElementById("surveyBlock").value=String(u.block);syncSurveyUnits();document.getElementById("surveyUnit").value=u.key;autofillSurvey()}else{document.getElementById("appointmentZone").value=String(u.zone);syncAppointmentBlocks();document.getElementById("appointmentBlock").value=String(u.block);syncPairUnits("appointment");document.getElementById("appointmentUnit").value=u.key;autofillPair("appointment")}}
document.getElementById("drawerSurveyBtn").addEventListener("click",()=>jumpFromDrawer("survey"));document.getElementById("drawerAppointmentBtn").addEventListener("click",()=>jumpFromDrawer("appointments"));

function resetSurveyForm(){
  document.getElementById("surveyEditId").value="";
  document.getElementById("surveySaveBtn").textContent="Save Survey Visit";
  document.getElementById("surveyCancelEdit").classList.add("hidden");
  document.getElementById("surveyVisitDate").value="";
  document.getElementById("surveyVisitTime").value="";
  document.getElementById("surveyRemarks").value="";
  autofillSurvey()
}
document.getElementById("surveyCancelEdit").addEventListener("click",resetSurveyForm);
document.getElementById("surveyForm").addEventListener("submit",e=>{
  e.preventDefault();
  const key=document.getElementById("surveyUnit").value,u=getUnit(key);if(!u)return;
  const id=Number(document.getElementById("surveyEditId").value)||Date.now();
  const visitDate=document.getElementById("surveyVisitDate").value;
  const visitTime=document.getElementById("surveyVisitTime").value;
  if(!visitDate){toast("Select Survey Visit Date");return}
  if(!visitTime){toast("Select Survey Visit Time");return}
  const entry={
    id,
    createdAt:new Date().toISOString(),
    unitKey:key,zone:u.zone,block:u.block,floor:u.floor,unit:u.unit,unitDisplay:unitDisplay(u.floor,u.unit),
    ownerName:document.getElementById("surveyOwner").value.trim(),
    contact:document.getElementById("surveyContact").value.trim(),
    visitDate,visitTime,
    remarks:document.getElementById("surveyRemarks").value.trim()
  };
  const idx=state.surveys.findIndex(s=>s.id===id);
  if(idx>=0)state.surveys[idx]=entry;else state.surveys.push(entry);
  resetSurveyForm();
  save(idx>=0?"Survey visit updated":"Survey visit saved")
});
function editSurvey(id){
  const s=state.surveys.find(x=>x.id===id);if(!s)return;
  setView("survey");
  document.getElementById("surveyZone").value=String(s.zone);syncSurveyBlocks();
  document.getElementById("surveyBlock").value=String(s.block);syncSurveyUnits();
  document.getElementById("surveyUnit").value=s.unitKey;
  document.getElementById("surveyOwner").value=s.ownerName||"";
  document.getElementById("surveyContact").value=s.contact||"";
  document.getElementById("surveyVisitDate").value=s.visitDate||s.followUpDate||"";
  document.getElementById("surveyVisitTime").value=s.visitTime||"";
  document.getElementById("surveyRemarks").value=s.remarks||"";
  document.getElementById("surveyEditId").value=String(s.id);
  document.getElementById("surveySaveBtn").textContent="Update Survey Visit";
  document.getElementById("surveyCancelEdit").classList.remove("hidden");
  window.scrollTo({top:0,behavior:"smooth"})
}
function deleteSurvey(id){
  if(!confirm("Delete this survey visit?"))return;
  state.surveys=state.surveys.filter(x=>x.id!==id);
  save("Survey visit deleted")
}
function renderSurveyTable(){
  const today=isoTodaySG(),all=[...state.surveys];
  const upcoming=all.filter(s=>(s.visitDate||s.followUpDate||"")>=today).sort((a,b)=>(a.visitDate||a.followUpDate||"").localeCompare(b.visitDate||b.followUpDate||"")||String(a.visitTime||"").localeCompare(String(b.visitTime||""))||Number(a.block)-Number(b.block));
  const past=all.filter(s=>(s.visitDate||s.followUpDate||"")<today).sort((a,b)=>(b.visitDate||b.followUpDate||"").localeCompare(a.visitDate||a.followUpDate||"")||String(b.visitTime||"").localeCompare(String(a.visitTime||"")));
  const r=[...upcoming,...past];
  document.getElementById("surveyTable").innerHTML=r.length?`<table><thead><tr><th>Visit Date</th><th>Time</th><th>Block / Unit</th><th>Owner</th><th>Contact</th><th>Visit Note</th><th>Action</th></tr></thead><tbody>${r.map(s=>{const vd=s.visitDate||s.followUpDate||"";return`<tr><td><strong>${safeDate(vd)||"—"}</strong></td><td>${esc(s.visitTime||"—")}</td><td>Blk ${s.block}<br><strong>${esc(s.unitDisplay)}</strong></td><td>${esc(s.ownerName||"—")}</td><td>${esc(s.contact||"—")}</td><td>${esc(s.remarks||"—")}</td><td><div class="action-set"><button class="table-action" data-survey-book="${s.id}">Appointment</button><button class="table-action" data-survey-edit="${s.id}">Edit</button><button class="table-action delete" data-survey-delete="${s.id}">Delete</button></div></td></tr>`}).join("")}</tbody></table>`:`<div class="empty-state">No survey visits yet.</div>`
}
function startAppointmentFromSurvey(id){
  const s=state.surveys.find(x=>x.id===id);if(!s)return;
  setView("appointments");resetAppointmentForm();
  document.getElementById("appointmentZone").value=String(s.zone);syncAppointmentBlocks();
  document.getElementById("appointmentBlock").value=String(s.block);syncPairUnits("appointment");
  document.getElementById("appointmentUnit").value=s.unitKey;autofillPair("appointment");
  if(s.ownerName)document.getElementById("appointmentOwner").value=s.ownerName;
  if(s.contact)document.getElementById("appointmentContact").value=s.contact;
  window.scrollTo({top:0,behavior:"smooth"})
}
document.getElementById("surveyTable").addEventListener("click",e=>{
  let b=e.target.closest("[data-survey-book]");if(b)return startAppointmentFromSurvey(Number(b.dataset.surveyBook));
  b=e.target.closest("[data-survey-edit]");if(b)return editSurvey(Number(b.dataset.surveyEdit));
  b=e.target.closest("[data-survey-delete]");if(b)deleteSurvey(Number(b.dataset.surveyDelete))
});

function currentAppointmentYear(){
  return isoTodaySG().slice(0,4)
}
function configureAppointmentYearInputs(){
  const y=currentAppointmentYear();
  ["appointmentDate","teamDate"].forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    el.min=`${y}-01-01`;
    el.max=`${y}-12-31`;
  })
}
function appointmentYearIsValid(date){
  return Boolean(date&&date.slice(0,4)===currentAppointmentYear())
}

function resetAppointmentForm(){
  document.getElementById("appointmentEditId").value="";
  document.getElementById("appointmentSaveBtn").textContent="Save Appointment";
  document.getElementById("appointmentCancelEdit").classList.add("hidden");
  configureAppointmentYearInputs();
  document.getElementById("appointmentDate").value=isoTodaySG();
  document.getElementById("appointmentSlot").value=SLOTS[0];
  document.getElementById("appointmentTeam").value="Team 1";
  document.getElementById("appointmentCustomStart").value="";
  document.getElementById("appointmentCustomEnd").value="";
  toggleAppointmentCustomTime();autofillPair("appointment")
}
document.getElementById("appointmentCancelEdit").addEventListener("click",resetAppointmentForm);

function optOutAppointmentUnit(){
  const key=document.getElementById("appointmentUnit").value,u=getUnit(key);if(!u)return;
  const ownerName=document.getElementById("appointmentOwner").value.trim()||u.ownerName||"";
  const contact=document.getElementById("appointmentContact").value.trim()||u.contact||"";
  const remarks=document.getElementById("appointmentRemarks").value.trim();

  if(!confirm(`Save Blk ${u.block} · ${unitDisplay(u.floor,u.unit)} as D · Opt-Out?`))return;

  const decisionId=Date.now();
  state.appointments.push({
    id:decisionId,
    unitKey:key,zone:u.zone,block:u.block,floor:u.floor,unit:u.unit,
    unitDisplay:unitDisplay(u.floor,u.unit),
    ownerName,contact,date:"",slot:"",team:"",
    remarks,userRemarks:true,source:"Manual",
    scheduleState:"OptOut",workStatus:"Pending"
  });
  setManualStatusDecision(key,"D","Latest user edit: Opt-Out");
  if(state.statusOverrides[key])state.statusOverrides[key].decisionId=decisionId;

  resetAppointmentForm();
  save("D · Opt-Out saved · latest user edit will remain until you explicitly change it")
}
document.getElementById("appointmentOptOutBtn").addEventListener("click",optOutAppointmentUnit);

function saveDirectAppointment(){
  const key=document.getElementById("appointmentUnit").value,u=getUnit(key);if(!u)return;
  const date=document.getElementById("appointmentDate").value,slot=appointmentSlotValue(),team=document.getElementById("appointmentTeam").value;
  const ownerName=document.getElementById("appointmentOwner").value.trim(),contact=document.getElementById("appointmentContact").value.trim(),remarks=document.getElementById("appointmentRemarks").value.trim();
  const editId=Number(document.getElementById("appointmentEditId").value||0);
  if(!date){toast("Select appointment date");return}
  if(!appointmentYearIsValid(date)){toast(`Appointment year must be ${currentAppointmentYear()} · please correct the date`);return}
  if(!slot){toast("Enter custom Start and End time");return}

  if(editId){
    const a=state.appointments.find(x=>x.id===editId);if(!a)return;
    if(isInactiveSchedule(a)){toast("History record cannot be edited as an active booking. Create a new appointment instead.");return}
    const changed=a.date!==date||a.slot!==slot||a.unitKey!==key;
    if(changed){
      state.appointments.push({...a,id:Date.now()+1,scheduleState:"Rescheduled",source:"Appointment History"});
      state.appointments.filter(x=>x.id!==editId&&x.unitKey===key&&!isInactiveSchedule(x)&&x.workStatus!=="Completed"&&!appointmentHasEnded(x)).forEach(x=>x.scheduleState="Rescheduled");
    }
    applyLaterAppointmentEdit(key,"Appointment Schedule update");
    a.unitKey=key;a.zone=u.zone;a.block=u.block;a.floor=u.floor;a.unit=u.unit;a.unitDisplay=unitDisplay(u.floor,u.unit);
    a.ownerName=ownerName;a.contact=contact;a.date=date;a.slot=slot;a.team=team;a.remarks=remarks;a.userRemarks=true;a.source="Manual";a.scheduleState="Active";
    a.workStatus=appointmentHasEnded(a)?"Completed":"Pending";
    resetAppointmentForm();save(changed?"Appointment rescheduled · old booking kept in history":"Appointment updated · Planner and Unit Register synced");return
  }

  const active=state.appointments.filter(x=>x.unitKey===key&&!isInactiveSchedule(x)&&x.workStatus!=="Completed"&&!appointmentHasEnded(x));
  const exact=active.find(x=>x.date===date&&x.slot===slot);
  if(exact){
    applyLaterAppointmentEdit(key,"Appointment Schedule update");
    exact.ownerName=ownerName;exact.contact=contact;exact.team=team;exact.remarks=remarks;exact.userRemarks=true;exact.source="Manual";exact.scheduleState="Active";
    resetAppointmentForm();save("Appointment updated · no duplicate created");return
  }

  if(active.length){
    const desc=active.map(x=>`${safeDate(x.date)} · ${x.slot}`).join(", ");
    if(!confirm(`This unit already has an active booking: ${desc}. Reschedule it to ${safeDate(date)} · ${slot}?`))return;
    active.forEach(x=>x.scheduleState="Rescheduled");
  }

  applyLaterAppointmentEdit(key,"Appointment Schedule booking");
  const a={id:Date.now(),unitKey:key,zone:u.zone,block:u.block,floor:u.floor,unit:u.unit,unitDisplay:unitDisplay(u.floor,u.unit),ownerName,contact,date,slot,team,remarks,userRemarks:true,source:"Manual",scheduleState:"Active",workStatus:"Pending"};
  a.workStatus=appointmentHasEnded(a)?"Completed":"Pending";state.appointments.push(a);
  resetAppointmentForm();save(active.length?"Appointment rescheduled · old booking moved to history":"Appointment saved · Planner and Unit Register synced")
}
document.getElementById("appointmentForm").addEventListener("submit",e=>{e.preventDefault();saveDirectAppointment()});

function editAppointment(id,reschedule=false){
  const a=state.appointments.find(x=>x.id===id);if(!a)return;
  if(isInactiveSchedule(a)){toast("This is a history record. Create a new appointment if the resident books again.");return}
  setView("appointments");
  document.getElementById("appointmentEditId").value=String(a.id);
  document.getElementById("appointmentZone").value=String(a.zone||zoneOfBlock(a.block));syncAppointmentBlocks();
  document.getElementById("appointmentBlock").value=String(a.block);syncPairUnits("appointment");
  document.getElementById("appointmentUnit").value=a.unitKey;
  document.getElementById("appointmentOwner").value=a.ownerName||getUnit(a.unitKey)?.ownerName||"";
  document.getElementById("appointmentContact").value=a.contact||getUnit(a.unitKey)?.contact||"";
  document.getElementById("appointmentRemarks").value=a.remarks||"";
  fillAppointmentScheduleInputs(a);
  document.getElementById("appointmentSaveBtn").textContent=reschedule?"Save Reschedule":"Update Appointment";
  document.getElementById("appointmentCancelEdit").classList.remove("hidden");
  renderAppointmentPlan(a);window.scrollTo({top:0,behavior:"smooth"})
}
function cancelAppointment(id){
  const a=state.appointments.find(x=>x.id===id);if(!a||isInactiveSchedule(a))return;
  if(!confirm(`Cancel appointment for Blk ${a.block} · ${a.unitDisplay} on ${safeDate(a.date)} · ${a.slot}?`))return;
  const cancelledAt=new Date().toISOString();
  state.appointments
    .filter(x=>x.unitKey===a.unitKey&&x.date===a.date&&!isInactiveSchedule(x))
    .forEach(x=>{x.scheduleState="Cancelled";x.cancelledAt=cancelledAt;x.userScheduleOverride=true});
  if(Number(document.getElementById("appointmentEditId").value)===id)resetAppointmentForm();
  if(Number(document.getElementById("plannerEditId").value)===id)resetPlannerForm();
  save("Appointment cancelled · this unit/date removed from active schedule · status recalculated")
}
function deleteAppointment(id){
  if(!confirm("Delete this appointment record permanently?"))return;
  state.appointmentTombstones=Array.isArray(state.appointmentTombstones)?state.appointmentTombstones:[];
  const sid=String(id);
  if(!state.appointmentTombstones.map(String).includes(sid))state.appointmentTombstones.push(sid);
  state.appointments=state.appointments.filter(x=>String(x.id)!==sid);
  save("Appointment permanently deleted · it will not return after reload")
}

document.getElementById("appointmentZoneFilter").addEventListener("change",()=>{const z=document.getElementById("appointmentZoneFilter").value;document.getElementById("appointmentBlockFilter").innerHTML=filterBlockOptions(z,true);renderAppointmentTable()});
document.getElementById("appointmentBlockFilter").addEventListener("change",renderAppointmentTable);
document.getElementById("appointmentUnitSearch").addEventListener("input",renderAppointmentTable);
function appointmentDisplayForUnit(u){
  const live=currentUnitAppointmentState(u.key),a=live.appointment;
  return {
    appointment:a,
    status:live.status,
    schedule:live.active?"Active":live.completed?"Completed":live.status==="D"?"Opt-Out":live.status==="P"?"Pending Confirmation":"No Appointment",
    scheduleClass:live.active?"confirmed":live.completed?"completed":live.status==="D"?"d":live.status==="P"?"p":"pending",
    active:live.active,
    completed:live.completed
  }
}

function startAppointmentForUnit(key){
  const u=getUnit(key);if(!u)return;
  setView("appointments");
  resetAppointmentForm();
  document.getElementById("appointmentZone").value=String(u.zone);syncAppointmentBlocks();
  document.getElementById("appointmentBlock").value=String(u.block);syncPairUnits("appointment");
  document.getElementById("appointmentUnit").value=u.key;autofillPair("appointment");
  window.scrollTo({top:0,behavior:"smooth"});
}

function renderAppointmentTable(){
  const zf=document.getElementById("appointmentZoneFilter").value,
        bf=document.getElementById("appointmentBlockFilter").value,
        q=String(document.getElementById("appointmentUnitSearch")?.value||"").trim().toLowerCase().replace(/^#/,"");
  let units=unitsArray();

  if(zf!=="all")units=units.filter(u=>u.zone===Number(zf));
  if(bf!=="all")units=units.filter(u=>u.block===Number(bf));
  if(q){
    units=units.filter(u=>{
      const display=unitDisplay(u.floor,u.unit).replace(/^#/,"").toLowerCase();
      const compact=display.replace(/[^0-9]/g,"");
      const queryCompact=q.replace(/[^0-9]/g,"");
      return display.includes(q)||String(u.unit).includes(q)||String(u.floor).includes(q)||(queryCompact&&compact.includes(queryCompact));
    });
  }

  units.sort((a,b)=>a.zone-b.zone||a.block-b.block||b.floor-a.floor||a.unit-b.unit);

  const count=document.getElementById("appointmentUnitCount");
  if(count)count.textContent=units.length.toLocaleString();

  const row=u=>{
    const d=appointmentDisplayForUnit(u),a=d.appointment;
    const owner=a?.ownerName||u.ownerName||"—";
    const contact=a?.contact||u.contact||"—";
    const actions=d.active
      ? `<button class="table-action" data-appt-edit="${a.id}">Edit</button><button class="table-action" data-appt-reschedule="${a.id}">Reschedule</button><button class="table-action cancel" data-appt-cancel="${a.id}">Cancel</button><button class="table-action delete" data-appt-delete="${a.id}">Delete</button>`
      : d.completed
        ? (a
            ? `<span class="register-done-note">Completed</span><button class="table-action" data-appt-edit="${a.id}">Edit</button><button class="table-action delete" data-appt-delete="${a.id}">Delete</button>`
            : `<span class="register-done-note">Completed</span>`)
        : d.status==="D"
          ? `<span class="register-optout-note">Opt-Out · Latest Edit</span><button class="table-action" data-appt-book="${u.key}">Appointment</button>`
          : `<button class="table-action" data-appt-book="${u.key}">Appointment</button>`;

    return `<tr>
      <td>Blk ${u.block}</td>
      <td><strong>${esc(unitDisplay(u.floor,u.unit))}</strong></td>
      <td>${statusPill(d.status)}</td>
      <td>${a?.date?safeDate(a.date):"—"}</td>
      <td>${esc(a?.slot||"—")}</td>
      <td>${esc(owner)}</td>
      <td>${esc(contact)}</td>
      <td>${esc(a?.team||"—")}</td>
      <td><span class="pill ${d.scheduleClass}">${esc(d.schedule)}</span></td>
      <td>${a?`<span class="pill ${String(a.source||"").includes("Excel")?"confirmed":"pending"}">${esc(a.source||"Manual")}</span>`:"—"}</td>
      <td><div class="action-set">${actions}</div></td>
    </tr>`
  };

  const table=x=>`<div class="table-shell zone-table-shell"><table>
    <thead><tr><th>Block</th><th>Unit</th><th>Status</th><th>Date</th><th>Slot</th><th>Owner</th><th>Contact</th><th>Team</th><th>Schedule</th><th>Source</th><th>Action</th></tr></thead>
    <tbody>${x.map(row).join("")}</tbody>
  </table></div>`;

  if(!units.length){
    document.getElementById("appointmentTable").innerHTML=`<div class="empty-state">No units found for this filter.</div>`;
    return
  }

  document.getElementById("appointmentTable").innerHTML=(zf==="all"&&bf==="all")
    ? `<div class="zone-record-stack">${[1,2,3,4,5,6].map(z=>[z,units.filter(u=>u.zone===z)]).filter(([,x])=>x.length).map(([z,x])=>`<section class="zone-record-group">${zoneGroupHeader(z,x.length,"units")}${table(x)}</section>`).join("")}</div>`
    : table(units)
}
document.getElementById("appointmentTable").addEventListener("click",e=>{let b=e.target.closest("[data-appt-book]");if(b)return startAppointmentForUnit(b.dataset.apptBook);b=e.target.closest("[data-appt-reschedule]");if(b)return editAppointment(Number(b.dataset.apptReschedule),true);b=e.target.closest("[data-appt-cancel]");if(b)return cancelAppointment(Number(b.dataset.apptCancel));b=e.target.closest("[data-appt-edit]");if(b)return editAppointment(Number(b.dataset.apptEdit));b=e.target.closest("[data-appt-delete]");if(b)deleteAppointment(Number(b.dataset.apptDelete))});

document.getElementById("unitSearch").addEventListener("input",renderUnitTable);
document.getElementById("unitZoneFilter").addEventListener("change",()=>{const z=document.getElementById("unitZoneFilter").value;document.getElementById("unitBlockFilter").innerHTML=filterBlockOptions(z,true);renderUnitTable()});
document.getElementById("unitBlockFilter").addEventListener("change",renderUnitTable);
function renderUnitTable(){
  const q=document.getElementById("unitSearch").value.trim().toLowerCase(),zf=document.getElementById("unitZoneFilter").value,bf=document.getElementById("unitBlockFilter").value;let r=unitsArray();
  if(zf!=="all")r=r.filter(u=>u.zone===Number(zf));if(bf!=="all")r=r.filter(u=>u.block===Number(bf));if(q)r=r.filter(u=>`blk ${u.block} ${unitDisplay(u.floor,u.unit)} ${u.ownerName} ${u.contact}`.toLowerCase().includes(q));
  r.sort((a,b)=>a.zone-b.zone||a.block-b.block||b.floor-a.floor||a.unit-b.unit);
  const row=u=>`<tr><td>Blk ${u.block}</td><td><strong>${unitDisplay(u.floor,u.unit)}</strong></td><td>${statusPill(u.response)}</td><td>${esc(u.ownerName||"—")}</td><td>${esc(u.contact||"—")}</td><td>${safeDate(u.appointmentDate)||"—"}</td><td>${esc(u.appointmentSlot||"—")}</td><td>${esc(u.remarks||"—")}</td></tr>`;
  const table=x=>`<div class="table-shell unit-register-shell"><table class="unit-register-table"><colgroup><col style="width:8%"><col style="width:10%"><col style="width:14%"><col style="width:17%"><col style="width:14%"><col style="width:12%"><col style="width:11%"><col style="width:14%"></colgroup><thead><tr><th>Block</th><th>Unit</th><th>Status</th><th>Owner Name</th><th>Contact</th><th>Appointment Date</th><th>Slot</th><th>Remarks</th></tr></thead><tbody>${x.map(row).join("")}</tbody></table></div>`;
  if(!r.length){document.getElementById("unitTable").innerHTML=`<div class="empty-state">No matching unit records.</div>`;return}
  document.getElementById("unitTable").innerHTML=(zf==="all"&&bf==="all")?`<div class="zone-record-stack">${[1,2,3,4,5,6].map(z=>[z,r.filter(u=>u.zone===z)]).filter(([,x])=>x.length).map(([z,x])=>`<section class="zone-record-group unit-zone-group">${zoneGroupHeader(z,x.length,"units")}${table(x)}</section>`).join("")}</div>`:table(r)
}

function resetComplaintForm(){document.getElementById("complaintEditId").value="";document.getElementById("complaintSaveBtn").textContent="Save Complaint";document.getElementById("complaintCancelEdit").classList.add("hidden");document.getElementById("complaintText").value="";document.getElementById("complaintRemarks").value="";document.getElementById("complaintDate").value=isoTodaySG();document.getElementById("complaintStatus").value="Open";autofillPair("complaint")}
document.getElementById("complaintCancelEdit").addEventListener("click",resetComplaintForm);
document.getElementById("complaintForm").addEventListener("submit",e=>{
  e.preventDefault();const key=document.getElementById("complaintUnit").value,u=getUnit(key);if(!u)return;const id=Number(document.getElementById("complaintEditId").value)||Date.now();
  const entry={id,unitKey:key,zone:u.zone,block:u.block,floor:u.floor,unit:u.unit,unitDisplay:unitDisplay(u.floor,u.unit),ownerName:u.ownerName,contact:u.contact,date:document.getElementById("complaintDate").value,status:document.getElementById("complaintStatus").value,complaint:document.getElementById("complaintText").value.trim(),remarks:document.getElementById("complaintRemarks").value.trim()};
  const idx=state.complaints.findIndex(c=>c.id===id);if(idx>=0)state.complaints[idx]=entry;else state.complaints.push(entry);resetComplaintForm();save(idx>=0?"Complaint updated":"Complaint saved separately");
});
function editComplaint(id){const c=state.complaints.find(x=>x.id===id);if(!c)return;setView("complaints");document.getElementById("complaintZone").value=String(c.zone||zoneOfBlock(c.block));syncComplaintBlocks();document.getElementById("complaintBlock").value=String(c.block);syncPairUnits("complaint");document.getElementById("complaintUnit").value=c.unitKey;autofillPair("complaint");document.getElementById("complaintDate").value=c.date;document.getElementById("complaintStatus").value=c.status;document.getElementById("complaintText").value=c.complaint;document.getElementById("complaintRemarks").value=c.remarks||"";document.getElementById("complaintEditId").value=String(c.id);document.getElementById("complaintSaveBtn").textContent="Update Complaint";document.getElementById("complaintCancelEdit").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"})}
function deleteComplaint(id){if(!confirm("Delete this complaint entry?"))return;state.complaints=state.complaints.filter(x=>x.id!==id);save("Complaint deleted")}
function renderComplaintTable(){
  const zf=document.getElementById("complaintZoneFilter").value,bf=document.getElementById("complaintBlockFilter").value;let r=[...state.complaints].sort((a,b)=>b.id-a.id);if(zf!=="all")r=r.filter(c=>Number(c.zone||zoneOfBlock(c.block))===Number(zf));if(bf!=="all")r=r.filter(c=>Number(c.block)===Number(bf));
  const row=c=>`<tr><td>${safeDate(c.date)}</td><td>Blk ${c.block}<br><strong>${esc(c.unitDisplay)}</strong></td><td>${esc(c.ownerName||"—")}</td><td>${esc(c.contact||"—")}</td><td>${esc(c.complaint)}</td><td><span class="pill ${c.status==="Closed"?"completed":c.status==="Open"?"d":"pending"}">${esc(c.status)}</span></td><td>${esc(c.remarks||"—")}</td><td><div class="action-set"><button class="table-action" data-comp-edit="${c.id}">Edit</button><button class="table-action delete" data-comp-delete="${c.id}">Delete</button></div></td></tr>`;
  const table=x=>`<div class="table-shell zone-table-shell"><table><thead><tr><th>Date</th><th>Block / Unit</th><th>Owner</th><th>Contact</th><th>Complaint</th><th>Status</th><th>Remarks</th><th>Action</th></tr></thead><tbody>${x.map(row).join("")}</tbody></table></div>`;
  if(!r.length){document.getElementById("complaintTable").innerHTML=`<div class="empty-state">No complaints yet.</div>`;return}
  document.getElementById("complaintTable").innerHTML=(zf==="all"&&bf==="all")?`<div class="zone-record-stack">${[1,2,3,4,5,6].map(z=>[z,r.filter(c=>Number(c.zone||zoneOfBlock(c.block))===z)]).filter(([,x])=>x.length).map(([z,x])=>`<section class="zone-record-group">${zoneGroupHeader(z,x.length,"complaints")}${table(x)}</section>`).join("")}</div>`:table(r)
}
document.getElementById("complaintZoneFilter").addEventListener("change",()=>{const z=document.getElementById("complaintZoneFilter").value;document.getElementById("complaintBlockFilter").innerHTML=filterBlockOptions(z,true);renderComplaintTable()});
document.getElementById("complaintBlockFilter").addEventListener("change",renderComplaintTable);
document.getElementById("complaintTable").addEventListener("click",e=>{let b=e.target.closest("[data-comp-edit]");if(b)return editComplaint(Number(b.dataset.compEdit));b=e.target.closest("[data-comp-delete]");if(b)deleteComplaint(Number(b.dataset.compDelete))});

function addDaysISO(date,days){const d=new Date(date+"T12:00:00+08:00");d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function plannerDateLabel(date){const d=new Date(date+"T00:00:00+08:00");return new Intl.DateTimeFormat("en-SG",{timeZone:"Asia/Singapore",weekday:"short",day:"2-digit",month:"2-digit",year:"2-digit"}).format(d)}
function plannerDateShort(date){const d=new Date(date+"T00:00:00+08:00");return new Intl.DateTimeFormat("en-SG",{timeZone:"Asia/Singapore",weekday:"short",day:"2-digit",month:"2-digit",year:"2-digit"}).format(d)}
function appointmentForPlanner(a){const u=getUnit(a.unitKey);return {...a,ownerName:u?.ownerName||a.ownerName||"",contact:u?.contact||a.contact||""}}
function plannerEntries(date,team,slot){return state.appointments.filter(a=>!isInactiveSchedule(a)&&a.date===date&&a.team===team&&a.slot===slot).map(appointmentForPlanner)}
function plannerRemarks(entries){return entries.map(a=>a.remarks||"").filter(Boolean).join(" · ")||"—"}
function plannerTeamCell(entries,team,slot,zone){if(!entries.length)return `<div class="planner-empty-cell">—</div><button class="planner-add-cell" data-planner-prefill="${esc(team)}|${esc(slot)}|${zone}">+ Add</button>`;return entries.map(a=>`<div class="planner-team-entry"><div><strong>${esc(a.unitDisplay)}</strong><small>Blk ${a.block}</small></div><div class="planner-entry-actions"><button class="planner-mini-action" data-planner-edit="${a.id}">Edit</button><button class="planner-mini-action cancel" data-planner-cancel="${a.id}">Cancel</button></div></div>`).join("")+`<button class="planner-add-cell" data-planner-prefill="${esc(team)}|${esc(slot)}|${zone}">+ Add</button>`}
let plannerDisplayMode="day";
function renderPlanner(){
  const start=document.getElementById("teamDate").value||isoTodaySG();
  const zoneFilter=document.getElementById("plannerViewZone").value||"all";
  const dates=plannerDisplayMode==="week"?Array.from({length:7},(_,i)=>addDaysISO(start,i)):[start];

  let rows=state.appointments.filter(a=>
    liveScheduleRecord(a)&&dates.includes(a.date)&&
    (zoneFilter==="all"||Number(a.zone||zoneOfBlock(a.block))===Number(zoneFilter))
  );

  const latest=new Map();
  for(const a of rows){
    const k=`${a.date}|${a.unitKey}`;
    const old=latest.get(k);
    if(!old||Number(a.id||0)>Number(old.id||0))latest.set(k,a)
  }

  rows=[...latest.values()].sort((a,b)=>
    a.date.localeCompare(b.date)||
    String(a.team||"").localeCompare(String(b.team||""))||
    slotStartMinutes(a.slot)-slotStartMinutes(b.slot)||
    Number(a.zone||zoneOfBlock(a.block))-Number(b.zone||zoneOfBlock(b.block))||
    Number(a.block)-Number(b.block)||
    Number(b.floor||0)-Number(a.floor||0)||
    Number(a.unit||0)-Number(b.unit||0)
  );

  document.getElementById("plannerDateTitle").textContent=plannerDisplayMode==="week"
    ? `${safeDate(start)} → ${safeDate(addDaysISO(start,6))} appointments`
    : `${plannerDateLabel(start)} appointments`;

  const badge=document.getElementById("plannerCountBadge");
  if(badge)badge.textContent=`${rows.length} appointment${rows.length===1?"":"s"}`;

  if(!rows.length){
    document.getElementById("plannerTable").innerHTML=`<div class="empty-state">No appointments for this ${plannerDisplayMode==="week"?"7-day period":"date"}${zoneFilter==="all"?"":` in Zone ${zoneFilter}`}.</div>`;
    document.getElementById("plannerSpecialTimes").innerHTML="";
    document.getElementById("plannerUnassigned").innerHTML="";
    return
  }

  document.getElementById("plannerTable").innerHTML=`<table>
    <thead><tr><th>Date</th><th>Zone</th><th>Team</th><th>Time</th><th>Block</th><th>Unit</th><th>Owner / Contact</th><th>Remarks</th><th>Open</th></tr></thead>
    <tbody>${rows.map(a=>{
      const u=getUnit(a.unitKey),owner=a.ownerName||u?.ownerName||"—",contact=a.contact||u?.contact||"—";
      return `<tr>
        <td><strong>${safeDate(a.date)}</strong></td>
        <td>Zone ${a.zone||zoneOfBlock(a.block)}</td>
        <td>${esc(a.team||"—")}</td>
        <td>${esc(a.slot||"—")}</td>
        <td>Blk ${a.block}</td>
        <td><strong>${esc(a.unitDisplay||unitDisplay(a.floor,a.unit))}</strong></td>
        <td><div class="planner-person"><strong>${esc(owner)}</strong><span>${esc(contact)}</span></div></td>
        <td>${esc(a.remarks||"—")}</td>
        <td><button class="table-action" type="button" data-planner-open="${a.id}">Open Appointment</button></td>
      </tr>`
    }).join("")}</tbody>
  </table>`;

  document.getElementById("plannerSpecialTimes").innerHTML="";
  document.getElementById("plannerUnassigned").innerHTML="";
}
function renderTodayTeamBoard(){
  const date=isoTodaySG(),active=state.appointments.filter(a=>!isInactiveSchedule(a)&&a.date===date);
  const zoneCards=[1,2,3,4,5,6].map(z=>{
    const za=active.filter(a=>Number(a.zone||zoneOfBlock(a.block))===z);if(!za.length)return"";
    const custom=[...new Set(za.map(a=>a.slot).filter(s=>s&&!SLOTS.includes(s)))];
    const slots=[...new Set([...SLOTS,...custom])].sort((a,b)=>slotStartMinutes(a)-slotStartMinutes(b)||String(a).localeCompare(String(b)));
    const teamCol=team=>{const ta=za.filter(a=>a.team===team);return `<div class="today-team-col"><div class="today-team-head"><strong>${team}</strong><span>${ta.length} appointment${ta.length===1?"":"s"}</span></div>${slots.map(slot=>{const arr=ta.filter(a=>a.slot===slot).map(appointmentForPlanner);return `<div class="today-slot ${!SLOTS.includes(slot)?"today-custom-slot":""}"><div class="today-slot-time">${esc(slot)}</div><div class="today-slot-work">${arr.length?arr.map(a=>`<div class="today-appt-chip"><strong>Blk ${a.block} · ${esc(a.unitDisplay)}</strong>${a.remarks?` · ${esc(a.remarks)}`:""}</div>`).join(""):`<div class="today-empty">No appointment</div>`}</div></div>`}).join("")}</div>`};
    return `<section class="today-zone-card"><div class="today-zone-head"><div><span>ZONE ${z}</span><strong>Blocks ${(ZONE_BLOCKS[z]||[]).join(", ")}</strong></div><em>${za.length} today</em></div><div class="today-zone-teams">${teamCol("Team 1")}${teamCol("Team 2")}</div></section>`
  }).filter(Boolean).join("");
  document.getElementById("todayTeamBoard").innerHTML=zoneCards||`<div class="empty-state">No team appointments scheduled for today.</div>`;
}
function togglePlannerCustomTime(){
  const row=document.getElementById("plannerCustomTimeRow");
  row.classList.toggle("hidden",document.getElementById("plannerSlot").value!=="CUSTOM")
}
function plannerSlotValue(){
  const sel=document.getElementById("plannerSlot");
  if(sel.value!=="CUSTOM")return sel.value;
  const start=document.getElementById("plannerCustomStart").value,end=document.getElementById("plannerCustomEnd").value;
  if(!start||!end)return "";
  return customSlotLabel(start,end)
}

function resetPlannerForm(){
  document.getElementById("plannerEditId").value="";
  document.getElementById("plannerSaveBtn").textContent="Add to Planner";
  document.getElementById("plannerSaveBtn").classList.remove("editing");
  document.getElementById("plannerCancelEdit").classList.add("hidden");
  document.getElementById("plannerRemarks").value="";
  document.getElementById("plannerCustomStart").value="";
  document.getElementById("plannerCustomEnd").value="";
  document.getElementById("plannerSlot").value=SLOTS[0];
  togglePlannerCustomTime()
}
function editPlannerAppointment(id){
  const a=state.appointments.find(x=>x.id===id);if(!a)return;
  document.getElementById("teamDate").value=a.date;
  document.getElementById("plannerZone").value=String(a.zone||zoneOfBlock(a.block));
  syncPlannerBlocks();
  document.getElementById("plannerBlock").value=String(a.block);
  syncPlannerUnits();
  document.getElementById("plannerUnit").value=a.unitKey;
  document.getElementById("plannerTeam").value=a.team||"Team 1";
  if(SLOTS.includes(a.slot)){
    document.getElementById("plannerSlot").value=a.slot;
    document.getElementById("plannerCustomStart").value="";
    document.getElementById("plannerCustomEnd").value="";
  }else{
    document.getElementById("plannerSlot").value="CUSTOM";
    const t=slotToCustomTimes(a.slot);
    document.getElementById("plannerCustomStart").value=t.start;
    document.getElementById("plannerCustomEnd").value=t.end;
  }
  togglePlannerCustomTime();
  document.getElementById("plannerRemarks").value=a.remarks||"";
  document.getElementById("plannerEditId").value=String(a.id);
  document.getElementById("plannerSaveBtn").textContent="Update Planner";
  document.getElementById("plannerSaveBtn").classList.add("editing");
  document.getElementById("plannerCancelEdit").classList.remove("hidden");
  renderPlanner();
  document.getElementById("plannerBlock").focus()
}
function removePlannerAppointment(id){cancelAppointment(id)}
function savePlannerAppointment(){
  const date=document.getElementById("teamDate").value||isoTodaySG(),key=document.getElementById("plannerUnit").value,u=getUnit(key);if(!u)return;
  const team=document.getElementById("plannerTeam").value,slot=plannerSlotValue(),remarks=document.getElementById("plannerRemarks").value.trim(),editId=Number(document.getElementById("plannerEditId").value||0);
  configureAppointmentYearInputs();
  if(!appointmentYearIsValid(date)){toast(`Planning year must be ${currentAppointmentYear()} · please correct the date`);return}
  if(!slot){toast("Enter custom Start and End time");return}

  if(editId){
    const a=state.appointments.find(x=>x.id===editId);if(!a)return;
    const changed=a.date!==date||a.slot!==slot||a.unitKey!==key;
    if(changed){
      state.appointments.push({...a,id:Date.now()+1,scheduleState:"Rescheduled",source:"Planner History"});
    }
    state.appointments.filter(x=>x.id!==editId&&x.unitKey===key&&!isInactiveSchedule(x)&&x.workStatus!=="Completed"&&!appointmentHasEnded(x)).forEach(x=>x.scheduleState="Rescheduled");
    applyLaterAppointmentEdit(key,"Planner update");
    a.unitKey=key;a.zone=u.zone;a.block=u.block;a.floor=u.floor;a.unit=u.unit;a.unitDisplay=unitDisplay(u.floor,u.unit);
    a.date=date;a.slot=slot;a.team=team;a.remarks=remarks;a.source="Planner";a.scheduleState="Active";a.workStatus=appointmentHasEnded(a)?"Completed":"Pending";
    if(!a.ownerName)a.ownerName=u.ownerName||"";if(!a.contact)a.contact=u.contact||"";
    resetPlannerForm();save(changed?"Appointment rescheduled · old booking kept in history":"Planner appointment updated");return
  }

  const exact=state.appointments.find(x=>x.unitKey===key&&x.date===date&&x.slot===slot&&!isInactiveSchedule(x));
  if(exact){
    applyLaterAppointmentEdit(key,"Planner update");
    exact.team=team;exact.remarks=remarks||exact.remarks;exact.source=exact.source||"Planner";exact.scheduleState="Active";
    exact.workStatus=appointmentHasEnded(exact)?"Completed":"Pending";
    resetPlannerForm();save("Planner updated");return
  }

  const existing=state.appointments.filter(x=>x.unitKey===key&&!isInactiveSchedule(x)&&x.workStatus!=="Completed"&&!appointmentHasEnded(x));
  if(existing.length){
    const desc=existing.map(x=>`${safeDate(x.date)} · ${x.slot}`).join(", ");
    if(!confirm(`This unit already has an active booking: ${desc}. Reschedule it to ${safeDate(date)} · ${slot}?`))return;
    existing.forEach(x=>x.scheduleState="Rescheduled");
  }

  applyLaterAppointmentEdit(key,"Planner booking");
  state.appointments.push({id:Date.now(),unitKey:key,zone:u.zone,block:u.block,floor:u.floor,unit:u.unit,unitDisplay:unitDisplay(u.floor,u.unit),ownerName:u.ownerName,contact:u.contact,date,slot,team,remarks,source:"Planner",scheduleState:"Active",workStatus:"Pending"});
  resetPlannerForm();save(existing.length?"Appointment rescheduled · old booking moved to history":"Planner updated · Master Data synced")
}

document.getElementById("plannerForm").addEventListener("submit",e=>{e.preventDefault();savePlannerAppointment()});
document.getElementById("plannerCancelEdit").addEventListener("click",resetPlannerForm);
document.getElementById("plannerViewZone").addEventListener("change",()=>{document.getElementById("plannerViewBlock").value="all";renderPlanner()});
document.getElementById("plannerViewBlock").addEventListener("change",renderPlanner);
document.getElementById("teamDate").addEventListener("change",()=>{plannerDisplayMode="day";renderPlanner()});
document.getElementById("plannerPrevDay").addEventListener("click",()=>{plannerDisplayMode="day";document.getElementById("teamDate").value=addDaysISO(document.getElementById("teamDate").value||isoTodaySG(),-1);renderPlanner()});
document.getElementById("plannerNextDay").addEventListener("click",()=>{plannerDisplayMode="day";document.getElementById("teamDate").value=addDaysISO(document.getElementById("teamDate").value||isoTodaySG(),1);renderPlanner()});
document.getElementById("plannerToday").addEventListener("click",()=>{plannerDisplayMode="day";document.getElementById("teamDate").value=isoTodaySG();renderPlanner()});
document.getElementById("plannerTomorrow").addEventListener("click",()=>{plannerDisplayMode="day";document.getElementById("teamDate").value=addDaysISO(isoTodaySG(),1);renderPlanner()});
document.getElementById("plannerNext7").addEventListener("click",()=>{plannerDisplayMode="week";document.getElementById("teamDate").value=isoTodaySG();renderPlanner()});
document.getElementById("plannerTable").addEventListener("click",e=>{const b=e.target.closest("[data-planner-open]");if(b)return editAppointment(Number(b.dataset.plannerOpen))});
document.getElementById("plannerSpecialTimes").addEventListener("click",e=>{let b=e.target.closest("[data-planner-edit]");if(b)return editPlannerAppointment(Number(b.dataset.plannerEdit));b=e.target.closest("[data-planner-cancel]");if(b)return cancelAppointment(Number(b.dataset.plannerCancel))});
document.getElementById("plannerUnassigned").addEventListener("click",e=>{let b=e.target.closest("[data-assign-team]");if(b){const a=state.appointments.find(x=>x.id===Number(b.dataset.apptId));if(a){a.team=b.dataset.assignTeam;save(`${a.unitDisplay} assigned to ${a.team}`)}return}b=e.target.closest("[data-planner-edit]");if(b)return editPlannerAppointment(Number(b.dataset.plannerEdit));b=e.target.closest("[data-planner-cancel]");if(b)return cancelAppointment(Number(b.dataset.plannerCancel))});

function buildReportRows(zoneFilter="all",blockFilter="all"){
  const rows=[];Object.keys(ZONE_BLOCKS).forEach(z=>{if(zoneFilter!=="all"&&String(z)!==String(zoneFilter))return;ZONE_BLOCKS[z].forEach(block=>{if(blockFilter!=="all"&&String(block)!==String(blockFilter))return;const u=getBlockUnits(block),total=u.length,agree=u.filter(x=>x.response==="A"||x.response==="C").length,done=u.filter(x=>x.workStatus==="Completed").length,p=u.filter(x=>x.response==="P").length,d=u.filter(x=>x.response==="D").length,nr=u.filter(x=>x.response==="NR").length;rows.push({zone:Number(z),block,total,agree,agreePct:total?agree/total*100:0,done,donePct:total?done/total*100:0,p,pPct:total?p/total*100:0,d,dPct:total?d/total*100:0,nr,nrPct:total?nr/total*100:0})})});return rows
}
function reportTotals(rows){
  const t=rows.reduce((o,r)=>{o.total+=r.total;o.agree+=r.agree;o.done+=r.done;o.p+=r.p;o.d+=r.d;o.nr+=r.nr;return o},{total:0,agree:0,done:0,p:0,d:0,nr:0});
  return{...t,agreePct:t.total?t.agree/t.total*100:0,donePct:t.total?t.done/t.total*100:0,pPct:t.total?t.p/t.total*100:0,dPct:t.total?t.d/t.total*100:0,nrPct:t.total?t.nr/t.total*100:0}
}
function pct(v){return`${v.toFixed(1)}%`}
function renderReport(){
  const z=document.getElementById("reportZoneFilter").value,b=document.getElementById("reportBlockFilter").value,rows=buildReportRows(z,b),t=reportTotals(rows);
  document.getElementById("reportSummaryCards").innerHTML=`<div class="report-mini-card"><span>Total Units</span><strong>${t.total}</strong></div><div class="report-mini-card"><span>Opt-In A+C</span><strong>${t.agree}</strong></div><div class="report-mini-card"><span>Completed</span><strong>${t.done}</strong></div><div class="report-mini-card pending-card"><span>Pending P</span><strong>${t.p}</strong></div><div class="report-mini-card"><span>Opt-Out D</span><strong>${t.d}</strong></div><div class="report-mini-card"><span>No Response NR</span><strong>${t.nr}</strong></div>`;
  document.getElementById("reportBlockChart").innerHTML=rows.length?`<div class="report-cluster-yaxis"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div><div class="report-cluster-scroll"><div class="report-cluster-grid">${rows.map(r=>{const vals=[["agree",r.agreePct],["done",r.donePct],["p",r.pPct],["d",r.dPct],["nr",r.nrPct]];return`<div class="report-cluster-group"><div class="report-cluster-bars">${vals.map(v=>`<div class="report-cluster-bar-wrap"><b style="bottom:calc(${Math.max(0,Math.min(100,v[1])).toFixed(1)}% + 2px)">${v[1].toFixed(1)}</b><i class="report-cluster-bar ${v[0]}" style="height:${Math.max(0,Math.min(100,v[1])).toFixed(1)}%"></i></div>`).join("")}</div><strong>Blk ${r.block}</strong></div>`}).join("")}</div></div>`:`<div class="empty-state">No blocks for this filter.</div>`;
  document.getElementById("reportTable").innerHTML=`<table class="weekly-table"><thead><tr><th>S/N</th><th>BLK</th><th>TOTAL</th><th>A+C</th><th>A+C %</th><th>DONE</th><th>DONE %</th><th>P</th><th>P %</th><th>D</th><th>D %</th><th>NR</th><th>NR %</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td><strong>${r.block}</strong></td><td>${r.total}</td><td>${r.agree}</td><td>${pct(r.agreePct)}</td><td>${r.done}</td><td>${pct(r.donePct)}</td><td>${r.p}</td><td>${pct(r.pPct)}</td><td>${r.d}</td><td>${pct(r.dPct)}</td><td>${r.nr}</td><td>${pct(r.nrPct)}</td></tr>`).join("")}<tr class="total-row"><td colspan="2">TOTAL DU</td><td>${t.total}</td><td>${t.agree}</td><td>${pct(t.agreePct)}</td><td>${t.done}</td><td>${pct(t.donePct)}</td><td>${t.p}</td><td>${pct(t.pPct)}</td><td>${t.d}</td><td>${pct(t.dPct)}</td><td>${t.nr}</td><td>${pct(t.nrPct)}</td></tr></tbody></table>`;
  renderResponseSummary();
}
document.getElementById("reportZoneFilter").addEventListener("change",()=>{const z=document.getElementById("reportZoneFilter").value;document.getElementById("reportBlockFilter").innerHTML=filterBlockOptions(z,true);renderReport()});
document.getElementById("reportBlockFilter").addEventListener("change",renderReport);

function responseSummaryUnitList(units){
  return [...units]
    .sort((a,b)=>b.floor-a.floor||a.unit-b.unit)
    .map(u=>unitDisplay(u.floor,u.unit))
    .join(", ")
}
function responseSummaryPendingRemark(u){
  const latest=latestById(state.appointments.filter(a=>a.unitKey===u.key));
  const note=String(latest?.remarks||"").trim();
  return `${unitDisplay(u.floor,u.unit)}: ${note||"Awaiting confirmation"}`
}
function buildResponseSummaryRows(zoneFilter="all"){
  const rows=[];
  Object.keys(ZONE_BLOCKS).map(Number).sort((a,b)=>a-b).forEach(zone=>{
    if(zoneFilter!=="all"&&String(zoneFilter)!==String(zone))return;
    (ZONE_BLOCKS[zone]||[]).forEach(block=>{
      const units=getBlockUnits(block);
      const total=units.length;
      const nrUnits=units.filter(u=>u.response==="NR");
      const dUnits=units.filter(u=>u.response==="D");
      const pUnits=units.filter(u=>u.response==="P");
      const optInUnits=units.filter(u=>u.response==="A"||u.response==="C");
      const nr=nrUnits.length,d=dUnits.length,p=pUnits.length,optIn=optInUnits.length;
      const respond=total-nr;
      rows.push({
        zone,block,total,respond,
        respondPct:total?respond/total*100:0,
        optIn,optInPct:total?optIn/total*100:0,
        d,dPct:total?d/total*100:0,
        dDetails:responseSummaryUnitList(dUnits),
        nr,nrDetails:responseSummaryUnitList(nrUnits),
        p,pDetails:responseSummaryUnitList(pUnits),
        pRemarks:pUnits.map(responseSummaryPendingRemark).join(" · ")
      })
    })
  });
  return rows
}
function responseSummaryTotals(rows){
  const t=rows.reduce((o,r)=>{
    o.total+=r.total;o.respond+=r.respond;o.optIn+=r.optIn;o.d+=r.d;o.nr+=r.nr;o.p+=r.p;return o
  },{total:0,respond:0,optIn:0,d:0,nr:0,p:0});
  return {
    ...t,
    respondPct:t.total?t.respond/t.total*100:0,
    optInPct:t.total?t.optIn/t.total*100:0,
    dPct:t.total?t.d/t.total*100:0
  }
}
function responseSummaryCountPct(count,pctValue){
  return `${count} (${Math.round(pctValue)}%)`
}
function responseSummaryTableHtml(rows,includeTotal=true){
  const t=responseSummaryTotals(rows);
  const body=rows.map((r,i)=>`<tr>
      <td>${i+1}</td>
      <td><strong>${r.block}</strong> <span class="response-zone-tag">(Zone ${r.zone})</span></td>
      <td>${r.total}</td>
      <td>${responseSummaryCountPct(r.respond,r.respondPct)}</td>
      <td>${responseSummaryCountPct(r.optIn,r.optInPct)}</td>
      <td>${responseSummaryCountPct(r.d,r.dPct)}</td>
      <td class="response-detail-cell">${esc(r.dDetails||"")}</td>
      <td class="response-pending-cell">${r.p?`<strong>${r.p}</strong>${r.pDetails?` · ${esc(r.pDetails)}`:""}`:"0"}</td>
      <td>${r.nr}</td>
      <td class="response-detail-cell">${esc(r.nrDetails||"")}</td>
      <td class="response-remarks-cell">${esc(r.pRemarks||"")}</td>
    </tr>`).join("");
  const totalRow=includeTotal?`<tr class="response-summary-total">
      <td></td><td>TOTAL</td><td>${t.total}</td>
      <td>${responseSummaryCountPct(t.respond,t.respondPct)}</td>
      <td>${responseSummaryCountPct(t.optIn,t.optInPct)}</td>
      <td>${responseSummaryCountPct(t.d,t.dPct)}</td>
      <td></td><td>${t.p}</td><td>${t.nr}</td><td></td><td></td>
    </tr>`:"";
  return `<table class="response-summary-table">
    <colgroup>
      <col class="rs-sn"><col class="rs-block"><col class="rs-total"><col class="rs-respond"><col class="rs-optin">
      <col class="rs-optout"><col class="rs-optout-details"><col class="rs-pending"><col class="rs-nr"><col class="rs-nr-details"><col class="rs-remarks">
    </colgroup>
    <thead><tr>
      <th>S/N</th>
      <th>BLOCK (ZONE)</th>
      <th>Total Unit</th>
      <th>Respond Unit</th>
      <th>Opt-In</th>
      <th>Opt-Out</th>
      <th>Opt-Out Unit Details</th>
      <th>Pending Confirmation</th>
      <th>Non-Respond Unit</th>
      <th>NR Unit Details</th>
      <th>Remarks</th>
    </tr></thead>
    <tbody>${body}${totalRow}</tbody>
  </table>`
}
function renderResponseSummary(){
  const select=document.getElementById("responseSummaryZoneFilter");
  const table=document.getElementById("responseSummaryTable");
  if(!select||!table)return;
  const rows=buildResponseSummaryRows(select.value);
  table.innerHTML=rows.length?responseSummaryTableHtml(rows):`<div class="empty-state">No summary data for this zone.</div>`
}
document.getElementById("responseSummaryZoneFilter").addEventListener("change",renderResponseSummary);

function exportResponseSummaryCSV(){
  const zone=document.getElementById("responseSummaryZoneFilter").value;
  const rows=buildResponseSummaryRows(zone),t=responseSummaryTotals(rows);
  if(!rows.length){toast("No response summary data");return}
  const csv=[
    ["S/N","BLOCK","ZONE","TOTAL UNIT","RESPOND UNIT","RESPOND %","OPT-IN","OPT-IN %","OPT-OUT","OPT-OUT %","OPT-OUT UNIT DETAILS","PENDING CONFIRMATION","PENDING UNIT DETAILS","NON-RESPOND UNIT","NR UNIT DETAILS","REMARKS"],
    ...rows.map((r,i)=>[
      i+1,r.block,`Zone ${r.zone}`,r.total,r.respond,`${Math.round(r.respondPct)}%`,
      r.optIn,`${Math.round(r.optInPct)}%`,r.d,`${Math.round(r.dPct)}%`,r.dDetails,
      r.p,r.pDetails,r.nr,r.nrDetails,r.pRemarks
    ]),
    ["","TOTAL","",t.total,t.respond,`${Math.round(t.respondPct)}%`,t.optIn,`${Math.round(t.optInPct)}%`,t.d,`${Math.round(t.dPct)}%`,"",t.p,"",t.nr,"",""]
  ];
  download(`ELU_Response_Summary_${zone==="all"?"All_Zones":"Zone_"+zone}_${isoTodaySG()}.csv`,toCSV(csv));
  toast("Response Summary CSV downloaded")
}
function exportResponseSummaryPrint(){
  rebuildAllMasters();
  renderResponseSummary();
  const zone=document.getElementById("responseSummaryZoneFilter").value;
  const rows=buildResponseSummaryRows(zone);
  if(!rows.length){toast("No response summary data to print");return}
  const stamp=new Date().toLocaleString("en-SG",{year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"});
  const zoneLabel=zone==="all"?"All Zones":`Zone ${zone}`;
  const win=window.open("","_blank","width=1500,height=950");
  if(!win){toast("Allow pop-ups to print or save the Summary");return}
  win.document.open();
  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>ELU Response Summary - ${zoneLabel}</title>
<style>
  @page{size:A4 landscape;margin:7mm}
  *{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  body{margin:0;background:#fff;color:#000;font-family:Arial,Helvetica,sans-serif}
  .print-head{display:flex;justify-content:space-between;align-items:flex-end;margin:0 0 7px}
  .print-head h1{font-size:15px;margin:0 0 2px}
  .print-head p{font-size:8px;margin:0;color:#333}
  .stamp{text-align:right;font-size:7px;line-height:1.45;color:#444}
  .summary-title{background:#fff600;border:1px solid #000;border-bottom:0;text-align:center;font-size:10px;font-weight:700;padding:5px;text-decoration:underline}
  table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:7.2px}
  th,td{border:1px solid #000;padding:4px 3px;vertical-align:top;line-height:1.3;word-break:break-word}
  th{background:#8eeff0;text-align:center;font-weight:700;vertical-align:middle}
  td:nth-child(1),td:nth-child(3),td:nth-child(4),td:nth-child(5),td:nth-child(6),td:nth-child(8),td:nth-child(9){text-align:center;vertical-align:middle}
  .zone-tag{font-size:6.7px;font-weight:700;white-space:nowrap}
  .total-row td{font-weight:700;background:#f3f3f3}
  col.sn{width:3%} col.block{width:9%} col.total{width:6%} col.respond{width:8%} col.optin{width:7%}
  col.optout{width:7%} col.odetails{width:15%} col.pending{width:14%} col.nr{width:7%} col.nrdetails{width:11%} col.remarks{width:13%}
  col.rs-sn{width:3%} col.rs-block{width:9%} col.rs-total{width:6%} col.rs-respond{width:8%} col.rs-optin{width:7%}
  col.rs-optout{width:7%} col.rs-optout-details{width:15%} col.rs-pending{width:14%} col.rs-nr{width:7%} col.rs-nr-details{width:11%} col.rs-remarks{width:13%}
  thead{display:table-header-group}
  tr{break-inside:avoid}
  .note{font-size:7px;margin:5px 0 0;color:#333}
</style>
</head>
<body>
  <div class="print-head">
    <div><h1>ELU Upgrading · ${zoneLabel}</h1><p>Live block-wise resident response summary</p></div>
    <div class="stamp">Generated ${stamp}<br>A4 Landscape · Print / Save as PDF</div>
  </div>
  <div class="summary-title">(Summary of Opt In, Opt Out &amp; NR Unit Details)</div>
  ${responseSummaryTableHtml(rows).replace(/response-zone-tag/g,"zone-tag").replace(/response-summary-total/g,"total-row")}
  <div class="note">Respond Unit includes Opt-In (A+C), Opt-Out (D) and Pending Confirmation (P). NR is excluded. Pending reason uses the latest Appointment Note; when no note exists, it shows Awaiting confirmation.</div>
  <script>
    window.addEventListener("load",function(){setTimeout(function(){window.focus();window.print()},250)});
  <\/script>
</body>
</html>`);
  win.document.close();
  toast("Response Summary print / PDF opened")
}
document.getElementById("responseSummaryCsvBtn").addEventListener("click",exportResponseSummaryCSV);
document.getElementById("responseSummaryPrintBtn").addEventListener("click",exportResponseSummaryPrint);


function managerReportData(){
  const zone=document.getElementById("reportZoneFilter").value,block=document.getElementById("reportBlockFilter").value;
  const rows=buildReportRows(zone,block),totals=reportTotals(rows);
  const unitRows=unitsArray().filter(u=>(zone==="all"||String(u.zone)===String(zone))&&(block==="all"||String(u.block)===String(block)));
  const status={a:unitRows.filter(u=>u.response==="A").length,c:unitRows.filter(u=>u.response==="C").length,p:unitRows.filter(u=>u.response==="P").length,d:unitRows.filter(u=>u.response==="D").length,nr:unitRows.filter(u=>u.response==="NR").length};
  const zones=[...new Set(rows.map(r=>r.zone))].sort((a,b)=>a-b).map(z=>{const zr=rows.filter(r=>r.zone===z),t=reportTotals(zr);return{zone:z,...t,blocks:zr.length}});
  const scope=zone==="all"?"All Zones":`Zone ${zone}${block!=="all"?` · Block ${block}`:""}`;
  const stamp=new Intl.DateTimeFormat("en-SG",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date());
  return{zone,block,scope,stamp,rows,totals,status,zones}
}
function downloadBlob(name,blob){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200)}
function reportSafeFileScope(r){return r.zone==="all"?"All_Zones":`Zone_${r.zone}${r.block!=="all"?`_Block_${r.block}`:""}`}

/* ---------- Native PDF generator: aggregate manager report only; no PII ---------- */
function pdfAscii(v){return String(v??"").replace(/[–—]/g,"-").replace(/[•·]/g,"-").replace(/[^\x20-\x7E]/g,"")}
function pdfEsc(v){return pdfAscii(v).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)")}
function pdfText(x,top,size,text,bold=false,color=[0.10,0.22,0.31]){const y=595-top-size;return `${color.map(n=>n.toFixed(3)).join(" ")} rg BT /${bold?"F2":"F1"} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${pdfEsc(text)}) Tj ET\n`}
function pdfRect(x,top,w,h,fill=[1,1,1],stroke=null){const y=595-top-h;let s=`${fill.map(n=>n.toFixed(3)).join(" ")} rg ${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f\n`;if(stroke)s+=`${stroke.map(n=>n.toFixed(3)).join(" ")} RG ${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re S\n`;return s}
function pdfLine(x1,t1,x2,t2,color=[0.84,0.89,0.93],width=.7){return`${color.map(n=>n.toFixed(3)).join(" ")} RG ${width} w ${x1.toFixed(1)} ${(595-t1).toFixed(1)} m ${x2.toFixed(1)} ${(595-t2).toFixed(1)} l S\n`}
function buildPdfBlob(pageContents){
  const objects={1:"<< /Type /Catalog /Pages 2 0 R >>",3:"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",4:"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"};
  const kids=[];let next=5;
  pageContents.forEach(content=>{const pageId=next++,contentId=next++;kids.push(`${pageId} 0 R`);objects[contentId]=`<< /Length ${content.length} >>\nstream\n${content}\nendstream`;objects[pageId]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`});
  objects[2]=`<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${kids.length} >>`;
  let pdf="%PDF-1.4\n",offsets=[0];const max=Math.max(...Object.keys(objects).map(Number));
  for(let i=1;i<=max;i++){offsets[i]=pdf.length;pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`}
  const xref=pdf.length;pdf+=`xref\n0 ${max+1}\n0000000000 65535 f \n`;for(let i=1;i<=max;i++)pdf+=`${String(offsets[i]).padStart(10,"0")} 00000 n \n`;pdf+=`trailer\n<< /Size ${max+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([new TextEncoder().encode(pdf)],{type:"application/pdf"})
}
function managerPdfPages(r){
  const pages=[],blue=[0.08,0.40,0.62],ink=[0.09,0.21,0.30],muted=[0.39,0.49,0.57],soft=[0.94,0.97,0.99],green=[0.15,0.57,0.35],pink=[0.83,0.11,0.51],yellow=[0.90,0.66,0.10],red=[0.78,0.12,0.19];
  let c="";c+=pdfRect(0,0,842,74,[0.92,0.97,1]);c+=pdfText(38,24,22,"ELU UPGRADING - MANAGER PROGRESS REPORT",true,ink);c+=pdfText(38,53,9,`${r.scope} | Generated ${r.stamp}`,false,muted);c+=pdfText(625,28,9,"NO RESIDENT PERSONAL DATA",true,blue);
  const cards=[['Total Units',r.totals.total,blue],['Opt-In A+C',r.totals.agree,green],['Completed',r.totals.done,green],['Opt-Out D',r.totals.d,yellow],['No Response NR',r.totals.nr,red]];
  cards.forEach((x,i)=>{const xx=38+i*154;c+=pdfRect(xx,94,142,58,soft,[0.85,0.91,0.95]);c+=pdfText(xx+12,108,8,x[0],true,muted);c+=pdfText(xx+12,128,19,String(x[1]),true,x[2])});
  c+=pdfText(38,181,14,"Status & Completion Snapshot",true,ink);
  const bars=[['Opt-In A+C',r.totals.agree,r.totals.total,green],['Work Completed',r.totals.done,r.totals.total,blue],['Opt-Out D',r.totals.d,r.totals.total,yellow],['No Response NR',r.totals.nr,r.totals.total,red]];
  bars.forEach((b,i)=>{const top=210+i*40,p=b[2]?b[1]/b[2]*100:0;c+=pdfText(38,top,9,b[0],true,ink);c+=pdfRect(165,top-2,480,16,[0.92,0.94,0.96]);c+=pdfRect(165,top-2,480*Math.min(1,p/100),16,b[3]);c+=pdfText(660,top,9,`${b[1]} (${p.toFixed(1)}%)`,true,ink)});
  c+=pdfText(38,385,14,"Zone Progress",true,ink);const cols=[38,110,210,315,425,535,650,770];['Zone','Blocks','Units','A+C','Completed','D','NR','Done %'].forEach((h,i)=>c+=pdfText(cols[i],412,8,h,true,muted));c+=pdfLine(38,430,804,430);
  r.zones.forEach((z,i)=>{const top=443+i*21;c+=pdfText(cols[0],top,8,`Zone ${z.zone}`,true,ink);[z.blocks,z.total,z.agree,z.done,z.d,z.nr,`${z.donePct.toFixed(1)}%`].forEach((v,j)=>c+=pdfText(cols[j+1],top,8,String(v),false,ink))});
  pages.push(c);

  const blockChunks=[];for(let i=0;i<r.rows.length;i+=18)blockChunks.push(r.rows.slice(i,i+18));
  blockChunks.forEach((chunk,ci)=>{let p="";p+=pdfText(38,28,18,`Block Completion Progress${blockChunks.length>1?` - ${ci+1}/${blockChunks.length}`:""}`,true,ink);p+=pdfText(38,51,9,`${r.scope} | Work Completed / Total Units`,false,muted);chunk.forEach((x,i)=>{const top=82+i*27,pc=x.donePct;p+=pdfText(42,top,8,`Blk ${x.block}`,true,ink);p+=pdfRect(100,top-2,610,13,[0.92,0.94,0.96]);p+=pdfRect(100,top-2,610*Math.min(1,pc/100),13,blue);p+=pdfText(725,top,8,`${x.done}/${x.total}  ${pc.toFixed(1)}%`,true,ink)});pages.push(p)});

  const tableChunks=[];for(let i=0;i<r.rows.length;i+=13)tableChunks.push(r.rows.slice(i,i+13));
  tableChunks.forEach((chunk,ci)=>{let p="";p+=pdfText(38,28,18,`Weekly Meeting Progress Summary${tableChunks.length>1?` - ${ci+1}/${tableChunks.length}`:""}`,true,ink);p+=pdfText(38,51,9,`${r.scope} | A+C = Opt-In Agree`,false,muted);const xs=[38,84,145,220,296,374,456,530,606,680,758],heads=['S/N','Block','Total','A+C','A+C %','Done','Done %','D','D %','NR','NR %'];p+=pdfRect(34,72,774,30,[0.90,0.95,0.99]);heads.forEach((h,i)=>p+=pdfText(xs[i],84,7,h,true,ink));chunk.forEach((x,i)=>{const top=112+i*30;if(i%2===1)p+=pdfRect(34,top-7,774,25,[0.97,0.98,0.99]);const vals=[ci*13+i+1,x.block,x.total,x.agree,x.agreePct.toFixed(1)+'%',x.done,x.donePct.toFixed(1)+'%',x.d,x.dPct.toFixed(1)+'%',x.nr,x.nrPct.toFixed(1)+'%'];vals.forEach((v,j)=>p+=pdfText(xs[j],top,7,String(v),j===1,ink));p+=pdfLine(34,top+12,808,top+12)});if(ci===tableChunks.length-1){const top=112+chunk.length*30+4;p+=pdfRect(34,top-8,774,27,[0.90,0.95,0.99]);p+=pdfText(84,top,8,'TOTAL DU',true,ink);[r.totals.total,r.totals.agree,r.totals.agreePct.toFixed(1)+'%',r.totals.done,r.totals.donePct.toFixed(1)+'%',r.totals.d,r.totals.dPct.toFixed(1)+'%',r.totals.nr,r.totals.nrPct.toFixed(1)+'%'].forEach((v,j)=>p+=pdfText(xs[j+2],top,7,String(v),true,ink))}pages.push(p)});
  return pages
}
function exportManagerPDF(){const r=managerReportData();if(!r.rows.length){toast("No report data for this filter");return}const blob=buildPdfBlob(managerPdfPages(r));downloadBlob(`ELU_Manager_Report_${reportSafeFileScope(r)}_${isoTodaySG()}.pdf`,blob);toast("Manager PDF downloaded")}

/* ---------- Native PPTX generator: OOXML + uncompressed ZIP, no external library ---------- */
function xmlEsc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}
const PPT_EMU=914400;function emu(v){return Math.round(v*PPT_EMU)}
function pptShape(id,x,y,w,h,text,opt={}){const fill=opt.fill===null?'<a:noFill/>':`<a:solidFill><a:srgbClr val="${opt.fill||'FFFFFF'}"/></a:solidFill>`,line=opt.line===null?'<a:ln><a:noFill/></a:ln>':`<a:ln w="${opt.lineWidth||9525}"><a:solidFill><a:srgbClr val="${opt.line||opt.fill||'FFFFFF'}"/></a:solidFill></a:ln>`,paras=String(text??'').split(/\n/).map(t=>`<a:p><a:pPr algn="${opt.align||'l'}"/><a:r><a:rPr lang="en-SG" sz="${Math.round((opt.fontSize||18)*100)}"${opt.bold?' b="1"':''}><a:solidFill><a:srgbClr val="${opt.color||'17384E'}"/></a:solidFill></a:rPr><a:t>${xmlEsc(t)}</a:t></a:r><a:endParaRPr lang="en-SG" sz="${Math.round((opt.fontSize||18)*100)}"/></a:p>`).join('');return`<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Shape ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm><a:prstGeom prst="${opt.radius?'roundRect':'rect'}"><a:avLst/></a:prstGeom>${fill}${line}</p:spPr><p:txBody><a:bodyPr wrap="square" anchor="${opt.valign||'mid'}" lIns="${emu(.08)}" rIns="${emu(.08)}" tIns="${emu(.04)}" bIns="${emu(.04)}"/><a:lstStyle/>${paras}</p:txBody></p:sp>`}
function pptSlideXml(shapes){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${shapes}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`}
function pptTitle(sh,idRef,title,sub){let id=idRef.value;sh.push(pptShape(id++,.45,.32,12.4,.52,title,{fontSize:24,bold:true,color:'17384E',fill:null,line:null}));sh.push(pptShape(id++,.47,.85,12.1,.34,sub,{fontSize:9,color:'718795',fill:null,line:null}));sh.push(pptShape(id++,.45,1.27,12.4,.03,'',{fill:'D7E6F2',line:null}));idRef.value=id}
function pptFooter(sh,idRef,page){sh.push(pptShape(idRef.value++,.5,7.08,12.2,.22,`ELU Upgrading · Manager Report · ${page}`,{fontSize:7,color:'8AA0AE',fill:null,line:null,align:'r'}))}
function managerPptSlides(r){
  const slides=[],C={ink:'17384E',muted:'60798A',blue:'1474AD',pending:'3F7FD1',green:'278F5E',yellow:'C79012',red:'C42131',soft:'F5FAFE',line:'DCE9F2',grid:'DDE7EE',white:'FFFFFF'};
  const legend=(sh,id,y)=>{const items=[['A+C',C.green],['Completed',C.blue],['P',C.pending],['D',C.yellow],['NR',C.red]];let x=6.65;items.forEach(it=>{sh.push(pptShape(id.value++,x,y,.16,.16,'',{fill:it[1],line:null}));sh.push(pptShape(id.value++,x+.20,y-.03,.82,.22,it[0],{fontSize:7,bold:true,color:C.ink,fill:null,line:null}));x+=it[0]==='Completed'?1.30:.80})};
  {const sh=[],id={value:2};sh.push(pptShape(id.value++,0,0,13.333,7.5,'',{fill:C.soft,line:null}));sh.push(pptShape(id.value++,.62,.75,1.05,1.05,'ELU',{fontSize:23,bold:true,color:C.white,fill:C.blue,line:null,radius:true,align:'ctr'}));sh.push(pptShape(id.value++,.64,2.05,11.9,.8,'ELU UPGRADING',{fontSize:34,bold:true,color:C.ink,fill:null,line:null}));sh.push(pptShape(id.value++,.64,2.83,11.9,.56,'Manager Progress Report',{fontSize:22,bold:true,color:C.blue,fill:null,line:null}));sh.push(pptShape(id.value++,.66,3.55,11.6,.38,`${r.scope} · Generated ${r.stamp}`,{fontSize:11,color:C.muted,fill:null,line:null}));sh.push(pptShape(id.value++,.66,4.35,7.6,.58,'A / C / P / D / NR status · Zone progress · Weekly meeting table',{fontSize:12,color:'294B61',fill:C.white,line:'D7E6F2',radius:true}));sh.push(pptShape(id.value++,.66,5.18,5.8,.52,'Resident names and contact numbers are excluded',{fontSize:10,bold:true,color:C.blue,fill:'EAF5FC',line:'CFE4F2',radius:true}));pptFooter(sh,id,1);slides.push(pptSlideXml(sh.join('')))}
  {const sh=[],id={value:2};pptTitle(sh,id,'Executive Summary',`${r.scope} · No personal data`);const cards=[['TOTAL',r.totals.total,C.blue],['OPT-IN A+C',r.totals.agree,C.green],['COMPLETED',r.totals.done,C.blue],['PENDING P',r.totals.p,C.pending],['OPT-OUT D',r.totals.d,C.yellow],['NO RESPONSE',r.totals.nr,C.red]];cards.forEach((c,i)=>{const x=.35+i*2.13;sh.push(pptShape(id.value++,x,1.48,1.95,.92,'',{fill:C.white,line:C.line,radius:true}));sh.push(pptShape(id.value++,x+.12,1.62,1.70,.20,c[0],{fontSize:7.2,bold:true,color:'718795',fill:null,line:null}));sh.push(pptShape(id.value++,x+.12,1.90,1.70,.34,String(c[1]),{fontSize:21,bold:true,color:c[2],fill:null,line:null}))});sh.push(pptShape(id.value++,.62,2.70,3.2,.28,'OVERALL STATUS %',{fontSize:11,bold:true,color:C.ink,fill:null,line:null}));legend(sh,id,2.72);const top=3.18,bottom=6.35,h=bottom-top,x0=1.1,x1=12.1,w=x1-x0;[0,25,50,75,100].forEach(v=>{const y=bottom-h*v/100;sh.push(pptShape(id.value++,x0,y,w,.012,'',{fill:C.grid,line:null}));sh.push(pptShape(id.value++,.55,y-.09,.45,.20,`${v}%`,{fontSize:6.5,color:C.muted,fill:null,line:null,align:'r'}))});const vals=[['A+C',r.totals.agreePct,C.green],['Completed',r.totals.donePct,C.blue],['P',r.totals.pPct,C.pending],['D',r.totals.dPct,C.yellow],['NR',r.totals.nrPct,C.red]];vals.forEach((v,i)=>{const bw=.62,x=1.65+i*2.12,val=Math.max(0,Math.min(100,v[1])),bh=h*val/100;sh.push(pptShape(id.value++,x,bottom-bh,bw,bh,'',{fill:v[2],line:null}));sh.push(pptShape(id.value++,x-.04,Math.max(3.03,bottom-bh-.27),.72,.22,val.toFixed(1),{fontSize:7.5,bold:true,color:C.ink,fill:null,line:null,align:'ctr'}));sh.push(pptShape(id.value++,x-.34,6.46,1.3,.25,v[0],{fontSize:7.5,bold:true,color:C.ink,fill:null,line:null,align:'ctr'}))});pptFooter(sh,id,2);slides.push(pptSlideXml(sh.join('')))}
  {const sh=[],id={value:2};pptTitle(sh,id,'Zone Progress',`${r.scope} · work completed by zone`);const cols=[.35,1.65,2.75,3.85,4.95,6.05,7.15,8.25,9.35],heads=['ZONE','BLOCKS','UNITS','A+C','DONE','P','D','NR','DONE %'];heads.forEach((h,i)=>sh.push(pptShape(id.value++,cols[i],1.58,i===0?1.18:.96,.35,h,{fontSize:6.6,bold:true,color:C.muted,fill:'EDF6FC',line:C.line,align:'ctr'})));r.zones.forEach((z,i)=>{const y=2.05+i*.68,vals=[`Zone ${z.zone}`,z.blocks,z.total,z.agree,z.done,z.p,z.d,z.nr,`${z.donePct.toFixed(1)}%`];vals.forEach((v,j)=>sh.push(pptShape(id.value++,cols[j],y,j===0?1.18:.96,.38,String(v),{fontSize:8.5,bold:j===0,color:C.ink,fill:i%2?'F8FBFD':C.white,line:'E5EEF4',align:'ctr'})))});pptFooter(sh,id,3);slides.push(pptSlideXml(sh.join('')))}
  const chunks=[];for(let i=0;i<r.rows.length;i+=7)chunks.push(r.rows.slice(i,i+7));
  chunks.forEach((chunk,ci)=>{const sh=[],id={value:2};pptTitle(sh,id,`Block Status % Comparison${chunks.length>1?` ${ci+1}/${chunks.length}`:''}`,`${r.scope} · P = Pending Confirmation`);legend(sh,id,1.42);const top=1.95,bottom=6.35,h=bottom-top,x0=.9,x1=12.75,w=x1-x0;[0,25,50,75,100].forEach(v=>{const y=bottom-h*v/100;sh.push(pptShape(id.value++,x0,y,w,.012,'',{fill:C.grid,line:null}));sh.push(pptShape(id.value++,.40,y-.08,.42,.20,`${v}%`,{fontSize:6.5,color:C.muted,fill:null,line:null,align:'r'}))});const groupW=w/chunk.length,barW=Math.min(.21,groupW*.11),gap=.038,series=[['agreePct',C.green],['donePct',C.blue],['pPct',C.pending],['dPct',C.yellow],['nrPct',C.red]];chunk.forEach((x,gi)=>{const totalBars=barW*5+gap*4,start=x0+gi*groupW+(groupW-totalBars)/2;series.forEach((s,si)=>{const val=Math.max(0,Math.min(100,Number(x[s[0]])||0)),bh=h*val/100,bx=start+si*(barW+gap);if(bh>0)sh.push(pptShape(id.value++,bx,bottom-bh,barW,bh,'',{fill:s[1],line:null}));sh.push(pptShape(id.value++,bx-.04,Math.max(1.76,bottom-bh-.25),barW+.08,.20,val.toFixed(1),{fontSize:5.8,bold:true,color:C.ink,fill:null,line:null,align:'ctr'}))});sh.push(pptShape(id.value++,x0+gi*groupW,6.45,groupW,.24,`Blk ${x.block}`,{fontSize:7.5,bold:true,color:C.ink,fill:null,line:null,align:'ctr'}))});pptFooter(sh,id,4+ci);slides.push(pptSlideXml(sh.join('')))});
  const tableChunks=[];for(let i=0;i<r.rows.length;i+=12)tableChunks.push(r.rows.slice(i,i+12));
  tableChunks.forEach((chunk,ci)=>{const sh=[],id={value:2};pptTitle(sh,id,`Weekly Meeting Summary${tableChunks.length>1?` ${ci+1}/${tableChunks.length}`:''}`,`${r.scope} · P = Pending Confirmation`);const xs=[.25,.75,1.38,2.00,2.78,3.55,4.28,5.00,5.66,6.32,6.92,7.54,8.18],ws=[.45,.58,.58,.72,.72,.68,.68,.58,.58,.58,.58,.58,.70],heads=['S/N','BLK','TOTAL','A+C','A+C%','DONE','DONE%','P','P%','D','D%','NR','NR%'];heads.forEach((h,i)=>sh.push(pptShape(id.value++,xs[i],1.50,ws[i],.34,h,{fontSize:5.8,bold:true,color:'315F8B',fill:'E7F3FC',line:'CFE2F3',align:'ctr'})));chunk.forEach((x,i)=>{const y=1.90+i*.39,vals=[ci*12+i+1,x.block,x.total,x.agree,x.agreePct.toFixed(1)+'%',x.done,x.donePct.toFixed(1)+'%',x.p,x.pPct.toFixed(1)+'%',x.d,x.dPct.toFixed(1)+'%',x.nr,x.nrPct.toFixed(1)+'%'];vals.forEach((v,j)=>sh.push(pptShape(id.value++,xs[j],y,ws[j],.34,String(v),{fontSize:6.4,bold:j===1,color:'294B61',fill:i%2?'F8FBFD':C.white,line:'E5EEF4',align:'ctr'})))});if(ci===tableChunks.length-1){const y=1.90+chunk.length*.39+.12;sh.push(pptShape(id.value++,.25,y,1.08,.36,'TOTAL DU',{fontSize:6.8,bold:true,color:'315F8B',fill:'E7F3FC',line:'CFE2F3',align:'ctr'}));const vals=[r.totals.total,r.totals.agree,r.totals.agreePct.toFixed(1)+'%',r.totals.done,r.totals.donePct.toFixed(1)+'%',r.totals.p,r.totals.pPct.toFixed(1)+'%',r.totals.d,r.totals.dPct.toFixed(1)+'%',r.totals.nr,r.totals.nrPct.toFixed(1)+'%'];for(let j=0;j<vals.length;j++)sh.push(pptShape(id.value++,xs[j+2],y,ws[j+2],.36,String(vals[j]),{fontSize:6.2,bold:true,color:'315F8B',fill:'E7F3FC',line:'CFE2F3',align:'ctr'}))}pptFooter(sh,id,4+chunks.length+ci);slides.push(pptSlideXml(sh.join('')))});
  return slides
}
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0}
function le16(n){return[n&255,(n>>>8)&255]}function le32(n){return[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]}
function concatBytes(parts){let n=0;parts.forEach(p=>n+=p.length);const out=new Uint8Array(n);let o=0;parts.forEach(p=>{out.set(p,o);o+=p.length});return out}
function zipStore(files){const enc=new TextEncoder(),locals=[],centrals=[];let offset=0;const now=new Date(),dt=((now.getHours()<<11)|(now.getMinutes()<<5)|Math.floor(now.getSeconds()/2))&0xffff,dd=(((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate())&0xffff;Object.entries(files).forEach(([name,content])=>{const nb=enc.encode(name),db=typeof content==='string'?enc.encode(content):content,crc=crc32(db),lh=new Uint8Array([80,75,3,4,20,0,0,8,0,0,...le16(dt),...le16(dd),...le32(crc),...le32(db.length),...le32(db.length),...le16(nb.length),0,0]);locals.push(lh,nb,db);const ch=new Uint8Array([80,75,1,2,20,0,20,0,0,8,0,0,...le16(dt),...le16(dd),...le32(crc),...le32(db.length),...le32(db.length),...le16(nb.length),0,0,0,0,0,0,0,0,0,0,0,0,...le32(offset)]);centrals.push(ch,nb);offset+=lh.length+nb.length+db.length});const local=concatBytes(locals),central=concatBytes(centrals),count=Object.keys(files).length,end=new Uint8Array([80,75,5,6,0,0,0,0,...le16(count),...le16(count),...le32(central.length),...le32(local.length),0,0]);return concatBytes([local,central,end])}
function pptxPackage(slides,r){const files={};files['[Content_Types].xml']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${slides.map((_,i)=>`<Override PartName="/ppt/slides/slide${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}</Types>`;files['_rels/.rels']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;files['docProps/core.xml']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>ELU Upgrading Manager Progress Report</dc:title><dc:creator>ELU Upgrading</dc:creator><cp:lastModifiedBy>ELU Upgrading</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified></cp:coreProperties>`;files['docProps/app.xml']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>ELU Upgrading</Application><PresentationFormat>Widescreen</PresentationFormat><Slides>${slides.length}</Slides><Company></Company></Properties>`;files['ppt/presentation.xml']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides.map((_,i)=>`<p:sldId id="${256+i}" r:id="rId${i+2}"/>`).join('')}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`;files['ppt/_rels/presentation.xml.rels']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${slides.map((_,i)=>`<Relationship Id="rId${i+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i+1}.xml"/>`).join('')}</Relationships>`;files['ppt/slideMasters/slideMaster1.xml']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld name="ELU Master"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/><p:sldLayoutIdLst><p:sldLayoutId id="1" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`;files['ppt/slideMasters/_rels/slideMaster1.xml.rels']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`;files['ppt/slideLayouts/slideLayout1.xml']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;files['ppt/slideLayouts/_rels/slideLayout1.xml.rels']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`;files['ppt/theme/theme1.xml']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="ELU Theme"><a:themeElements><a:clrScheme name="ELU"><a:dk1><a:srgbClr val="17384E"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="294B61"/></a:dk2><a:lt2><a:srgbClr val="F5FAFE"/></a:lt2><a:accent1><a:srgbClr val="1474AD"/></a:accent1><a:accent2><a:srgbClr val="278F5E"/></a:accent2><a:accent3><a:srgbClr val="C79012"/></a:accent3><a:accent4><a:srgbClr val="C42131"/></a:accent4><a:accent5><a:srgbClr val="D91B83"/></a:accent5><a:accent6><a:srgbClr val="60798A"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="ELU"><a:majorFont><a:latin typeface="Aptos Display"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="ELU"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;slides.forEach((s,i)=>{files[`ppt/slides/slide${i+1}.xml`]=s;files[`ppt/slides/_rels/slide${i+1}.xml.rels`]=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`});return zipStore(files)}
function exportManagerPPT(){const r=managerReportData();if(!r.rows.length){toast("No report data for this filter");return}try{const bytes=pptxPackage(managerPptSlides(r),r),blob=new Blob([bytes],{type:"application/vnd.openxmlformats-officedocument.presentationml.presentation"});downloadBlob(`ELU_Manager_Report_${reportSafeFileScope(r)}_${isoTodaySG()}.pptx`,blob);toast("Manager PPT downloaded")}catch(err){console.error(err);toast("PPT export failed")}}


/* ---------- V7.27 manager-safe exports ---------- */
function pdfScoreRail(top,label,value,total,color=[0.08,0.40,0.62]){
  const ink=[0.09,0.21,0.30],muted=[0.39,0.49,0.57],track=[0.91,0.94,0.96];
  const p=total?Math.max(0,Math.min(100,value/total*100)):0,x=128,w=635,h=22;
  let s="";s+=pdfText(38,top-4,10,label,true,ink);s+=pdfRect(x,top,w,h,track);s+=pdfRect(x,top,w*p/100,h,color);
  [0,25,50,75,100].forEach(t=>{const xx=x+w*t/100;s+=pdfLine(xx,top-4,xx,top+h+8,[0.72,0.79,0.84],.5);s+=pdfText(xx-(t===100?18:7),top+h+12,7,`${t}%`,false,muted)});
  const mx=x+w*p/100;s+=pdfRect(Math.max(x,Math.min(x+w-3,mx-2)),top-5,4,h+10,[0.05,0.26,0.43]);s+=pdfText(668,top-25,17,`${p.toFixed(1)}%`,true,color);s+=pdfText(668,top-4,8,`${value} / ${total}`,true,ink);return s
}
function managerPdfPagesV727(r){
  const pages=[],blue=[0.08,0.40,0.62],pending=[0.25,0.50,0.82],ink=[0.09,0.21,0.30],muted=[0.39,0.49,0.57],soft=[0.94,0.97,0.99],green=[0.15,0.57,0.35],yellow=[0.90,0.66,0.10],red=[0.78,0.12,0.19],grid=[0.87,0.91,0.94];
  let c="";
  c+=pdfRect(0,0,842,74,[0.92,0.97,1]);c+=pdfText(38,24,22,"ELU UPGRADING - MANAGER PROGRESS REPORT",true,ink);c+=pdfText(38,53,9,`${r.scope} | Generated ${r.stamp}`,false,muted);c+=pdfText(625,28,9,"NO RESIDENT PERSONAL DATA",true,blue);
  const cards=[['Total Units',r.totals.total,blue],['Opt-In A+C',r.totals.agree,green],['Completed',r.totals.done,blue],['Pending P',r.totals.p,pending],['Opt-Out D',r.totals.d,yellow],['No Response NR',r.totals.nr,red]];
  cards.forEach((x,i)=>{const xx=38+i*128;c+=pdfRect(xx,94,118,58,soft,[0.85,0.91,0.95]);c+=pdfText(xx+9,108,7.4,x[0],true,muted);c+=pdfText(xx+9,128,18,String(x[1]),true,x[2])});
  c+=pdfText(38,181,14,"Overall Status %",true,ink);
  const overall=[["A+C",r.totals.agreePct,green],["Completed",r.totals.donePct,blue],["P",r.totals.pPct,pending],["D",r.totals.dPct,yellow],["NR",r.totals.nrPct,red]];
  const obottom=350,otop=215,oh=obottom-otop;
  [0,25,50,75,100].forEach(v=>{const yy=obottom-oh*v/100;c+=pdfLine(70,yy,580,yy,grid,.4);c+=pdfText(38,yy-4,7,`${v}%`,false,muted)});
  overall.forEach((s,i)=>{const x=105+i*92,val=Math.max(0,Math.min(100,s[1])),bh=oh*val/100;c+=pdfRect(x,obottom-bh,38,bh,s[2]);c+=pdfText(x+3,Math.max(196,obottom-bh-13),7,val.toFixed(1),true,ink);c+=pdfText(x,365,7,s[0],true,ink)});
  c+=pdfText(615,204,12,"Colour Code",true,ink);overall.forEach((s,i)=>{c+=pdfRect(618,230+i*25,11,11,s[2]);c+=pdfText(637,230+i*25,7.5,s[0],true,ink)});
  c+=pdfText(38,405,13,"Zone Progress",true,ink);const cols=[38,102,178,260,342,424,506,588,674],heads=['Zone','Blocks','Units','A+C','Done','P','D','NR','Done %'];heads.forEach((h,i)=>c+=pdfText(cols[i],430,7.3,h,true,muted));c+=pdfLine(38,447,804,447);
  r.zones.slice(0,6).forEach((z,i)=>{const top=462+i*18;c+=pdfText(cols[0],top,7.2,`Zone ${z.zone}`,true,ink);[z.blocks,z.total,z.agree,z.done,z.p,z.d,z.nr,`${z.donePct.toFixed(1)}%`].forEach((v,j)=>c+=pdfText(cols[j+1],top,7.2,String(v),false,ink))});
  pages.push(c);pages.push(...blockChartPdfPages(r,false));
  const tableChunks=[];for(let i=0;i<r.rows.length;i+=13)tableChunks.push(r.rows.slice(i,i+13));
  tableChunks.forEach((chunk,ci)=>{let p="";p+=pdfText(38,28,18,`Weekly Meeting Progress Summary${tableChunks.length>1?` - ${ci+1}/${tableChunks.length}`:""}`,true,ink);p+=pdfText(38,51,9,`${r.scope} | P = Pending Confirmation`,false,muted);const xs=[34,72,118,172,226,284,338,396,448,500,552,604,664],heads=['S/N','Blk','Total','A+C','A+C%','Done','Done%','P','P%','D','D%','NR','NR%'];p+=pdfRect(30,72,780,30,[0.90,0.95,0.99]);heads.forEach((h,i)=>p+=pdfText(xs[i],84,6.2,h,true,ink));chunk.forEach((x,i)=>{const top=112+i*30;if(i%2===1)p+=pdfRect(30,top-7,780,25,[0.97,0.98,0.99]);const vals=[ci*13+i+1,x.block,x.total,x.agree,x.agreePct.toFixed(1)+'%',x.done,x.donePct.toFixed(1)+'%',x.p,x.pPct.toFixed(1)+'%',x.d,x.dPct.toFixed(1)+'%',x.nr,x.nrPct.toFixed(1)+'%'];vals.forEach((v,j)=>p+=pdfText(xs[j],top,6.3,String(v),j===1,ink));p+=pdfLine(30,top+12,810,top+12)});if(ci===tableChunks.length-1){const top=112+chunk.length*30+4;p+=pdfRect(30,top-8,780,27,[0.90,0.95,0.99]);p+=pdfText(72,top,7.4,'TOTAL DU',true,ink);[r.totals.total,r.totals.agree,r.totals.agreePct.toFixed(1)+'%',r.totals.done,r.totals.donePct.toFixed(1)+'%',r.totals.p,r.totals.pPct.toFixed(1)+'%',r.totals.d,r.totals.dPct.toFixed(1)+'%',r.totals.nr,r.totals.nrPct.toFixed(1)+'%'].forEach((v,j)=>p+=pdfText(xs[j+2],top,6.3,String(v),true,ink))}pages.push(p)});
  return pages
}
function blockChartPdfPages(r,standalone=true){
  const pages=[],ink=[0.09,0.21,0.30],muted=[0.39,0.49,0.57],green=[0.15,0.57,0.35],blue=[0.08,0.40,0.62],pending=[0.25,0.50,0.82],yellow=[0.90,0.66,0.10],red=[0.78,0.12,0.19],grid=[0.87,0.91,0.94];
  const series=[["A+C",green,"agreePct"],["Completed",blue,"donePct"],["P",pending,"pPct"],["D",yellow,"dPct"],["NR",red,"nrPct"]];
  const chunks=[];for(let i=0;i<r.rows.length;i+=8)chunks.push(r.rows.slice(i,i+8));
  chunks.forEach((chunk,ci)=>{let p="";p+=pdfText(38,28,18,`Block Status % Chart${chunks.length>1?` - ${ci+1}/${chunks.length}`:""}`,true,ink);p+=pdfText(38,51,9,`${r.scope} | P = Pending Confirmation`,false,muted);let lx=330;series.forEach(s=>{p+=pdfRect(lx,66,10,10,s[1]);p+=pdfText(lx+15,67,7,s[0],true,ink);lx+=s[0]==="Completed"?98:64});const x0=68,x1=812,top=112,bottom=516,h=bottom-top,w=x1-x0;[0,25,50,75,100].forEach(v=>{const yy=bottom-h*v/100;p+=pdfLine(x0,yy,x1,yy,grid,.45);p+=pdfText(35,yy-4,7,`${v}%`,false,muted)});const groupW=w/chunk.length,barW=Math.min(11,groupW*.11),gap=Math.min(3,groupW*.025);chunk.forEach((x,gi)=>{const totalBars=barW*5+gap*4,start=x0+gi*groupW+(groupW-totalBars)/2;series.forEach((s,si)=>{const val=Math.max(0,Math.min(100,Number(x[s[2]])||0)),bh=h*val/100,bTop=bottom-bh,bx=start+si*(barW+gap);if(bh>0)p+=pdfRect(bx,bTop,barW,bh,s[1]);p+=pdfText(bx-1,Math.max(91,bTop-11),5.2,val.toFixed(1),true,ink)});p+=pdfText(x0+gi*groupW+groupW/2-18,536,7,`Blk ${x.block}`,true,ink)});pages.push(p)});
  return pages
}
function unitSummaryRowsForReport(){
  const z=document.getElementById("reportZoneFilter").value,b=document.getElementById("reportBlockFilter").value;
  return unitsArray().filter(u=>(z==="all"||String(u.zone)===String(z))&&(b==="all"||String(u.block)===String(b))).sort((a,b)=>a.zone-b.zone||a.block-b.block||a.floor-b.floor||a.unit-b.unit)
}
function unitSummaryPdfPages(){
  const units=unitSummaryRowsForReport(),pages=[],ink=[0.09,0.21,0.30],muted=[0.39,0.49,0.57],blue=[0.08,0.40,0.62],soft=[0.94,0.97,0.99];
  const chunks=[];for(let i=0;i<units.length;i+=20)chunks.push(units.slice(i,i+20));
  chunks.forEach((chunk,ci)=>{let p="";p+=pdfText(38,28,18,`Unit Summary - No Personal Data${chunks.length>1?` - ${ci+1}/${chunks.length}`:""}`,true,ink);p+=pdfText(38,51,9,"Owner Name, Contact and free-text Remarks are excluded",false,muted);const xs=[38,83,132,205,305,430,548,658,752],heads=['Zone','Block','Unit','Status','Work','Appt Date','Slot','Team','Source'];p+=pdfRect(34,72,774,28,[0.90,0.95,0.99]);heads.forEach((h,i)=>p+=pdfText(xs[i],83,7,h,true,ink));chunk.forEach((u,i)=>{const top=110+i*23;if(i%2===1)p+=pdfRect(34,top-6,774,20,soft);const a=preferredMasterAppointment(u.key),source=a?String(a.source||'Manual'):'-';const vals=[u.zone,u.block,unitDisplay(u.floor,u.unit),statusLabel(u.response),u.workStatus||'-',u.appointmentDate?safeDate(u.appointmentDate):'-',u.appointmentSlot||'-',u.team||'-',source.includes('Excel')?'Imported':'Manual'];vals.forEach((v,j)=>p+=pdfText(xs[j],top,6.7,String(v),j===2,ink))});pages.push(p)});return pages
}
function exportManagerPDFV727(){const r=managerReportData();if(!r.rows.length){toast("No report data for this filter");return}downloadBlob(`ELU_Manager_Report_${reportSafeFileScope(r)}_${isoTodaySG()}.pdf`,buildPdfBlob(managerPdfPagesV727(r)));toast("Manager PDF downloaded")}

function exportBlockBoardPrint(){
  rebuildAllMasters();
  renderBlockBoard();
  const board=document.getElementById("floorBoard");
  if(!board||!board.children.length||/No units match this filter/i.test(board.textContent||"")){
    toast("No Block Board data to print");
    return;
  }
  const zone=document.getElementById("boardZone").value;
  const block=document.getElementById("boardBlock").value;
  const floor=document.getElementById("boardFloor").value;
  const floorLabel=floor==="all"?"All floors":`Floor ${floor}`;
  const legend=document.querySelector("#blockboard .legend").outerHTML;
  const boardHtml=board.outerHTML;
  const stamp=new Date().toLocaleString("en-SG",{year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"});
  const baseHref=location.href.replace(/[^/]*$/,"");
  const title=`ELU Block Board - Zone ${zone} Block ${block}`;
  const win=window.open("","_blank","width=1400,height=900");
  if(!win){
    toast("Allow pop-ups to print or save the Block Board");
    return;
  }
  win.document.open();
  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<base href="${baseHref}">
<link rel="stylesheet" href="styles.css?v=7.47">
<style>
  @page{size:A4 landscape;margin:5mm}
  html,body{margin:0;padding:0;background:#fff}
  body{font-family:Inter,Segoe UI,Arial,sans-serif;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .a4-page{width:287mm;height:198mm;overflow:hidden;background:#fff;box-sizing:border-box}
  .a4-fit{transform-origin:top left;width:1120px}
  .board-print-head{display:flex;justify-content:space-between;align-items:flex-end;margin:0 0 8px;padding:0 2px}
  .board-print-head h1{margin:0;font-size:21px;color:#17384e}
  .board-print-head p{margin:3px 0 0;font-size:10px;font-weight:800;color:#60798a}
  .board-print-note{font-size:8px;line-height:1.4;text-align:right;color:#718795;font-weight:700}
  .legend{margin:4px 0 8px!important;gap:10px!important;font-size:9px!important}
  .floor-board{gap:5px!important}
  .floor-row{gap:6px!important;padding:5px!important;border-radius:8px!important;break-inside:avoid!important}
  .floor-label{width:42px!important;min-width:42px!important;border-radius:7px!important}
  .floor-label strong{font-size:15px!important}
  .floor-label span{font-size:7px!important}
  .unit-grid{gap:4px!important}
  .unit-card{min-height:42px!important;padding:5px 4px!important;border-radius:7px!important;border-width:1px!important;box-shadow:none!important}
  .u-no{font-size:10px!important}
  .u-status{font-size:6.6px!important;line-height:1.1!important;margin-top:2px!important}
  .u-date{font-size:6px!important;margin-top:2px!important;gap:2px!important}
  .u-date span{font-size:5.7px!important}
  button.unit-card{appearance:none;-webkit-appearance:none}
  /* Explicit print-safe status fills. These mirror the live Block Board palette. */
  #blockboard .unit-card.status-a{
    background:#d5f4e5!important;border-color:#53c58e!important;box-shadow:inset 5px 0 0 #239d68!important
  }
  #blockboard .unit-card.status-c{
    background:#f8bfdc!important;border-color:#e260a1!important;box-shadow:inset 5px 0 0 #d91b83!important
  }
  #blockboard .unit-card.status-p{
    background:#dbe9ff!important;border-color:#6e9de2!important;box-shadow:inset 5px 0 0 #3f7fd1!important
  }
  #blockboard .unit-card.status-out{
    background:#f7e99b!important;border-color:#d3af21!important;box-shadow:inset 5px 0 0 #c99f10!important
  }
  #blockboard .unit-card.status-nr{
    background:#f5b8bd!important;border-color:#df4d5d!important;box-shadow:inset 5px 0 0 #c91f31!important
  }
  #blockboard .unit-card.status-a .u-no,#blockboard .unit-card.status-a .u-status{color:#126b4b!important}
  #blockboard .unit-card.status-c .u-no,#blockboard .unit-card.status-c .u-status{color:#8f0d56!important}
  #blockboard .unit-card.status-p .u-no,#blockboard .unit-card.status-p .u-status{color:#23589c!important}
  #blockboard .unit-card.status-out .u-no,#blockboard .unit-card.status-out .u-status{color:#735a05!important}
  #blockboard .unit-card.status-nr .u-no,#blockboard .unit-card.status-nr .u-status{color:#8f1724!important}
  #blockboard .legend .dot.optin{background:#239d68!important}
  #blockboard .legend .dot.confirm{background:#d91b83!important}
  #blockboard .legend .dot.pending-confirm{background:#3f7fd1!important}
  #blockboard .legend .dot.optout{background:#c99f10!important}
  #blockboard .legend .dot.nr{background:#c91f31!important}
  @media print{
    .a4-page{width:287mm;height:198mm}
    body{overflow:hidden}
  }
</style>
</head>
<body class="board-print-page">
  <div class="a4-page" id="printPage">
    <div class="a4-fit" id="printFit"><div id="blockboard">
      <div class="board-print-head">
        <div>
          <h1>ELU Block Board · Block ${block}</h1>
          <p>Zone ${zone} · ${floorLabel}</p>
        </div>
        <div class="board-print-note">Generated ${stamp}<br>A4 Landscape · One Page</div>
      </div>
      ${legend}
      ${boardHtml}
      </div>
    </div>
  </div>
  <script>
    function fitBoardToA4(){
      const page=document.getElementById("printPage"),fit=document.getElementById("printFit");
      if(!page||!fit)return;
      fit.style.transform="none";
      const naturalW=fit.scrollWidth,naturalH=fit.scrollHeight;
      const targetW=page.clientWidth,targetH=page.clientHeight;
      const scale=Math.min(1,targetW/naturalW,targetH/naturalH);
      fit.style.transform="scale("+scale+")";
      fit.style.width=(naturalW)+"px";
    }
    window.addEventListener("load",function(){
      setTimeout(function(){
        fitBoardToA4();
        setTimeout(function(){window.focus();window.print()},250);
      },350);
    });
  <\/script>
</body>
</html>`);
  win.document.close();
  toast("A4 one-page Block Board opened");
}

function exportBlockChartPDF(){const r=managerReportData();if(!r.rows.length){toast("No block data for this filter");return}downloadBlob(`ELU_Block_Chart_${reportSafeFileScope(r)}_${isoTodaySG()}.pdf`,buildPdfBlob(blockChartPdfPages(r,true)));toast("Block Chart PDF downloaded")}
function exportUnitSummaryPDF(){const pages=unitSummaryPdfPages();if(!pages.length){toast("No units for this filter");return}const r=managerReportData();downloadBlob(`ELU_Unit_Summary_${reportSafeFileScope(r)}_${isoTodaySG()}.pdf`,buildPdfBlob(pages));toast("Unit Summary PDF downloaded")}

async function exportManagerPPTV727(){return exportManagerPPT()}

document.getElementById("exportManagerPdfBtn").addEventListener("click",exportManagerPDFV727);
document.getElementById("exportManagerPptBtn").addEventListener("click",exportManagerPPT);
document.getElementById("exportUnitSummaryPdfBtn").addEventListener("click",exportUnitSummaryPDF);
document.getElementById("exportBlockChartPdfBtn").addEventListener("click",exportBlockChartPDF);

function csvCell(v){return`"${String(v??"").replace(/"/g,'""')}"`}function toCSV(rows){return rows.map(r=>r.map(csvCell).join(",")).join("\n")}function download(name,content,type="text/csv;charset=utf-8"){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
document.getElementById("exportProgressBtn").addEventListener("click",()=>{const z=document.getElementById("reportZoneFilter").value,b=document.getElementById("reportBlockFilter").value,r=buildReportRows(z,b),t=reportTotals(r);download(`ELU_Weekly_Progress_${z==="all"?"All_Zones":"Zone_"+z}.csv`,toCSV([["S/N","BLK NO.","TOTAL UNITS","OPT-IN A+C","OPT-IN %","WORK COMPLETED","COMPLETED %","PENDING P","P %","OPT-OUT D","D %","NO RESPONSE NR","NR %"],...r.map((x,i)=>[i+1,x.block,x.total,x.agree,pct(x.agreePct),x.done,pct(x.donePct),x.p,pct(x.pPct),x.d,pct(x.dPct),x.nr,pct(x.nrPct)]),["","TOTAL DU",t.total,t.agree,pct(t.agreePct),t.done,pct(t.donePct),t.p,pct(t.pPct),t.d,pct(t.dPct),t.nr,pct(t.nrPct)] ]))});
document.getElementById("exportUnitsBtn").addEventListener("click",()=>{const r=managerReportData(),rows=unitSummaryRowsForReport();download(`ELU_Unit_Summary_${reportSafeFileScope(r)}_${isoTodaySG()}.csv`,toCSV([["Zone","Block No","Unit No","Status","Work Status","Appointment Date","Appointment Slot","Team"],...rows.map(u=>[u.zone,u.block,unitDisplay(u.floor,u.unit),u.response||"",u.workStatus||"",u.appointmentDate||"",u.appointmentSlot||"",u.team||""])]));});
document.getElementById("exportBackupBtn").addEventListener("click",()=>{if(!confirm("Backup contains resident and appointment data. Keep it private. Continue?"))return;download(`ELU_Backup_${isoTodaySG()}.json`,JSON.stringify({surveys:state.surveys,appointments:state.appointments,complaints:state.complaints,statusOverrides:state.statusOverrides||{},statusAudit:state.statusAudit||[],statusDecisionSchema:2},null,2),"application/json")});


/* V7.45 — Master Schedule + integrated Photo Inbox */
function cycleForDate(iso){
  const m=String(iso||isoTodaySG()).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)return null;
  let y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]);
  let sy=y,sm=mo,ey=y,em=mo;
  if(d>=22){
    sm=mo;sy=y;em=mo+1;ey=y;if(em===13){em=1;ey++}
  }else{
    em=mo;ey=y;sm=mo-1;sy=y;if(sm===0){sm=12;sy--}
  }
  const start=`${sy}-${String(sm).padStart(2,"0")}-22`;
  const end=`${ey}-${String(em).padStart(2,"0")}-21`;
  return {start,end,id:`${start}_to_${end}`,cleanup:`${ey}-${String(em).padStart(2,"0")}-25`}
}
function inCycle(date,cycle){return Boolean(date&&cycle&&date>=cycle.start&&date<=cycle.end)}
function formatCycle(c){return c?`${safeDate(c.start)} → ${safeDate(c.end)}`:"—"}

function masterSlotValue(){
  const v=document.getElementById("masterSlot").value;
  if(v!=="CUSTOM")return v;
  return customSlotLabel(document.getElementById("masterCustomStart").value,document.getElementById("masterCustomEnd").value)
}
function syncMasterBlocks(){
  const z=document.getElementById("masterZone").value;
  document.getElementById("masterBlock").innerHTML=blockOptions(z);
  syncMasterUnits()
}
function syncMasterUnits(){
  document.getElementById("masterUnit").innerHTML=unitOptionsForBlock(document.getElementById("masterBlock").value)
}
function toggleMasterCustom(){
  document.getElementById("masterCustomRow").classList.toggle("hidden",document.getElementById("masterSlot").value!=="CUSTOM")
}
function initMasterSchedule(){
  const z=document.getElementById("masterZone"),zf=document.getElementById("masterZoneFilter");
  z.innerHTML=zoneOptions();zf.innerHTML=zoneOptions(true);
  z.value="1";zf.value="all";
  document.getElementById("masterDate").value=isoTodaySG();
  document.getElementById("masterCycleDate").value=isoTodaySG();
  syncMasterBlocks();toggleMasterCustom()
}
function appointmentBlockedByLaterCancellation(a){
  if(!a?.unitKey||!a?.date)return false;
  const latestCancelMs=Math.max(0,...state.appointments
    .filter(x=>x.unitKey===a.unitKey&&x.date===a.date&&x.scheduleState==="Cancelled")
    .map(x=>Date.parse(x.cancelledAt||"")||Number(x.id)||0));
  if(!latestCancelMs)return false;
  return Number(a.id||0)<latestCancelMs
}
function liveScheduleRecord(a){
  return !isInactiveSchedule(a)&&!appointmentBlockedByLaterCancellation(a)
}

function masterScheduleRows(){
  const c=cycleForDate(document.getElementById("masterCycleDate").value||isoTodaySG());
  const zf=document.getElementById("masterZoneFilter").value;
  return state.appointments.filter(a=>{
    if(!liveScheduleRecord(a)||!a.date||!inCycle(a.date,c))return false;
    const z=Number(a.zone||zoneOfBlock(a.block));
    return zf==="all"||z===Number(zf)
  }).sort((a,b)=>a.date.localeCompare(b.date)||(Number(a.zone||zoneOfBlock(a.block))-Number(b.zone||zoneOfBlock(b.block)))||
    String(a.team||"").localeCompare(String(b.team||""))||slotStartMinutes(a.slot)-slotStartMinutes(b.slot)||
    Number(a.block)-Number(b.block)||Number(b.floor)-Number(a.floor)||Number(a.unit)-Number(b.unit))
}
function renderMasterSchedule(){
  const table=document.getElementById("masterScheduleTable");if(!table)return;
  const c=cycleForDate(document.getElementById("masterCycleDate").value||isoTodaySG());
  document.getElementById("masterCycleTitle").textContent=`${formatCycle(c)} Schedule`;
  const rows=masterScheduleRows();
  if(!rows.length){table.innerHTML=`<div class="empty-state">No appointments in this cycle / zone yet.</div>`;return}
  table.innerHTML=`<table class="master-schedule-table"><thead><tr><th>Date</th><th>Zone</th><th>Team</th><th>Time</th><th>Block</th><th>Unit</th><th>Remarks</th><th>Action</th></tr></thead><tbody>
  ${rows.map(a=>`<tr><td>${safeDate(a.date)}</td><td>Zone ${a.zone||zoneOfBlock(a.block)}</td><td>${esc(a.team||"—")}</td><td>${esc(a.slot||"—")}</td><td>Blk ${a.block}</td><td><strong>${esc(a.unitDisplay||unitDisplay(a.floor,a.unit))}</strong></td><td>${esc(a.remarks||"")}</td><td><button class="table-action" data-master-open="${a.id}">Open</button><button class="table-action delete" data-master-delete="${a.id}">Delete</button></td></tr>`).join("")}
  </tbody></table>`
}
function saveMasterScheduleEntry(){
  const date=document.getElementById("masterDate").value,key=document.getElementById("masterUnit").value,u=getUnit(key);
  if(!date||!u){toast("Select date and unit");return}
  if(!appointmentYearIsValid(date)){toast(`Appointment year must be ${currentAppointmentYear()}`);return}
  const slot=masterSlotValue();if(!slot){toast("Enter custom start and end time");return}
  const team=document.getElementById("masterTeam").value,remarks=document.getElementById("masterRemarks").value.trim();
  const active=state.appointments.filter(x=>x.unitKey===key&&!isInactiveSchedule(x)&&x.workStatus!=="Completed"&&!appointmentHasEnded(x));
  const exact=active.find(x=>x.date===date&&x.slot===slot);
  if(exact){
    applyLaterAppointmentEdit(key,"Master Schedule update");
    exact.team=team;exact.remarks=remarks;exact.source="Master Schedule";exact.scheduleState="Active";
  }else{
    if(active.length){
      if(!confirm(`This unit already has an active booking. Reschedule to ${safeDate(date)} · ${slot}?`))return;
      active.forEach(x=>x.scheduleState="Rescheduled")
    }
    applyLaterAppointmentEdit(key,"Master Schedule booking");
    state.appointments.push({id:Date.now(),unitKey:key,zone:u.zone,block:u.block,floor:u.floor,unit:u.unit,unitDisplay:unitDisplay(u.floor,u.unit),
      ownerName:u.ownerName||"",contact:u.contact||"",date,slot,team,remarks,source:"Master Schedule",scheduleState:"Active",workStatus:"Pending"})
  }
  document.getElementById("masterRemarks").value="";
  save("Master Schedule updated")
}
document.getElementById("masterScheduleForm").addEventListener("submit",e=>{e.preventDefault();saveMasterScheduleEntry()});
document.getElementById("masterZone").addEventListener("change",syncMasterBlocks);
document.getElementById("masterBlock").addEventListener("change",syncMasterUnits);
document.getElementById("masterSlot").addEventListener("change",toggleMasterCustom);
document.getElementById("masterCycleDate").addEventListener("change",renderMasterSchedule);
document.getElementById("masterZoneFilter").addEventListener("change",renderMasterSchedule);
document.getElementById("masterScheduleTable").addEventListener("click",e=>{
  let b=e.target.closest("[data-master-open]");
  if(b){
    const a=state.appointments.find(x=>x.id===Number(b.dataset.masterOpen));if(!a)return;
    document.getElementById("teamDate").value=a.date;setView("teams");renderPlanner();return
  }
  b=e.target.closest("[data-master-delete]");if(b)deleteAppointment(Number(b.dataset.masterDelete))
});

/* Photo IndexedDB */
const PHOTO_DB_NAME="ELU_Photo_Inbox_V1",PHOTO_DB_VERSION=2;
function photoDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(PHOTO_DB_NAME,PHOTO_DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains("photos"))db.createObjectStore("photos",{keyPath:"id"});
      if(!db.objectStoreNames.contains("meta"))db.createObjectStore("meta",{keyPath:"key"});
      if(!db.objectStoreNames.contains("schedule"))db.createObjectStore("schedule",{keyPath:"id"})
    };
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)
  })
}
async function photoDbPut(store,value){
  const db=await photoDb();return new Promise((res,rej)=>{
    const tx=db.transaction(store,"readwrite");tx.objectStore(store).put(value);tx.oncomplete=()=>{db.close();res()};tx.onerror=()=>{db.close();rej(tx.error)}
  })
}
async function photoDbAll(store){
  const db=await photoDb();return new Promise((res,rej)=>{
    const tx=db.transaction(store,"readonly"),req=tx.objectStore(store).getAll();
    req.onsuccess=()=>res(req.result||[]);req.onerror=()=>rej(req.error);tx.oncomplete=()=>db.close()
  })
}
async function photoDbDelete(store,key){
  const db=await photoDb();return new Promise((res,rej)=>{
    const tx=db.transaction(store,"readwrite");tx.objectStore(store).delete(key);tx.oncomplete=()=>{db.close();res()};tx.onerror=()=>{db.close();rej(tx.error)}
  })
}
async function photoDbDeleteWhere(store,pred){
  const all=await photoDbAll(store);for(const x of all)if(pred(x))await photoDbDelete(store,x.id||x.key)
}
function photoScheduleRowId(date,unitKey){return `${date}|${unitKey}`}

async function photoSchedule(date,zone){
  const rows=(await photoDbAll("schedule")).filter(r=>r.date===date&&Number(r.zone)===Number(zone));
  return rows.sort((a,b)=>String(a.team||"").localeCompare(String(b.team||""))||
    slotStartMinutes(a.slot||"")-slotStartMinutes(b.slot||"")||
    Number(a.block)-Number(b.block)||Number(b.floor)-Number(a.floor)||Number(a.unit)-Number(b.unit))
}

async function photoDisplayRows(date,zone){
  const schedule=await photoSchedule(date,zone);
  const photos=(await photoDbAll("photos")).filter(p=>p.date===date&&Number(p.zone)===Number(zone));
  const byUnit=new Map(schedule.map(r=>[r.unitKey,{...r,photoOnly:false}]));
  for(const p of photos){
    if(byUnit.has(p.unitKey))continue;
    const u=getUnit(p.unitKey);
    byUnit.set(p.unitKey,{
      id:photoScheduleRowId(date,p.unitKey),date,zone:Number(p.zone||zone),
      block:Number(p.block||u?.block||0),floor:Number(u?.floor||0),unit:Number(u?.unit||0),
      unitKey:p.unitKey,unitDisplay:p.unitDisplay||(u?unitDisplay(u.floor,u.unit):p.unitKey),
      team:p.team||"",slot:p.slot||"",photoOnly:true
    })
  }
  return [...byUnit.values()].sort((a,b)=>String(a.team||"").localeCompare(String(b.team||""))||
    slotStartMinutes(a.slot||"")-slotStartMinutes(b.slot||"")||
    Number(a.block)-Number(b.block)||Number(b.floor)-Number(a.floor)||Number(a.unit)-Number(b.unit))
}

function syncPhotoScheduleBlocks(){
  const z=document.getElementById("photoZone").value||"1";
  const block=document.getElementById("photoScheduleBlock");
  if(!block)return;
  const old=block.value;
  block.innerHTML=blockOptions(z);
  if([...block.options].some(o=>o.value===old))block.value=old;
  syncPhotoScheduleUnits()
}

function syncPhotoScheduleUnits(){
  const block=document.getElementById("photoScheduleBlock")?.value;
  const unit=document.getElementById("photoScheduleUnit");
  if(unit&&block)unit.innerHTML=unitOptionsForBlock(block)
}

async function renderPhotoScheduleTable(){
  const box=document.getElementById("photoScheduleTable");if(!box)return;
  const date=document.getElementById("photoDate").value||isoTodaySG();
  const zone=Number(document.getElementById("photoZone").value||1);

  const rows=(await photoDbAll("schedule"))
    .filter(r=>r.date===date&&Number(r.zone)===zone)
    .sort((a,b)=>String(a.team||"").localeCompare(String(b.team||""))||
      slotStartMinutes(a.slot||"")-slotStartMinutes(b.slot||"")||
      Number(a.block)-Number(b.block)||Number(b.floor)-Number(a.floor)||Number(a.unit)-Number(b.unit));

  const photos=await photoDbAll("photos");
  const count=document.getElementById("photoScheduleCount");
  if(count)count.textContent=`${rows.length} unit${rows.length===1?"":"s"}`;

  const title=document.getElementById("photoScheduleContextTitle");
  if(title)title.textContent=`${safeDate(date)} · Zone ${zone} Daily Photo Schedule`;

  if(!rows.length){
    box.innerHTML=`<div class="empty-state">No units entered for ${safeDate(date)} · Zone ${zone}.</div>`;
    return
  }

  box.innerHTML=`<table>
    <thead><tr><th>Block</th><th>Unit</th><th>Team</th><th>Time</th><th>Photos</th><th>Action</th></tr></thead>
    <tbody>${rows.map(r=>{
      const n=photos.filter(p=>p.date===r.date&&p.unitKey===r.unitKey).length;
      return `<tr>
        <td>Blk ${r.block}</td>
        <td><strong>${esc(r.unitDisplay)}</strong></td>
        <td>${esc(r.team||"")}</td>
        <td>${esc(r.slot||"—")}</td>
        <td><span class="photo-count-chip ${n>=3?"ready":""}">${n}</span></td>
        <td><button class="table-action delete" type="button" data-photo-schedule-delete="${esc(r.id)}">Remove</button></td>
      </tr>`
    }).join("")}</tbody>
  </table>`
}

function syncPhotoZoneTabs(){
  const zone=String(document.getElementById("photoZone").value||"1");
  document.querySelectorAll("[data-photo-zone-tab]").forEach(b=>b.classList.toggle("active",b.dataset.photoZoneTab===zone))
}

async function syncPhotoTargetUnits(){
  const zone=Number(document.getElementById("photoZone").value||1);
  const date=document.getElementById("photoDate").value||isoTodaySG();
  const sel=document.getElementById("photoTargetUnit"),prev=sel?.value||"";
  const rows=await photoDisplayRows(date,zone);

  syncPhotoZoneTabs();
  syncPhotoScheduleBlocks();

  if(sel){
    sel.innerHTML=`<option value="">Auto detect from Photo Daily Register</option>`+
      rows.map(a=>`<option value="${a.unitKey}">Blk ${a.block} ${a.unitDisplay||unitDisplay(a.floor,a.unit)}${a.photoOnly?" · stored photos":` · ${a.team||""} ${a.slot||""}`}</option>`).join("");
    if(rows.some(r=>r.unitKey===prev))sel.value=prev
  }

  await renderPhotoScheduleTable();
  await renderPhotoCenter()
}

async function savePhotoScheduleEntry(){
  const date=document.getElementById("photoDate").value||isoTodaySG();
  const zone=Number(document.getElementById("photoZone").value||1);
  const key=document.getElementById("photoScheduleUnit").value;
  const u=getUnit(key);
  if(!date||!u){toast("Select Date and Unit");return}

  const row={
    id:photoScheduleRowId(date,key),
    date,zone,block:u.block,floor:u.floor,unit:u.unit,unitKey:key,
    unitDisplay:unitDisplay(u.floor,u.unit),
    team:document.getElementById("photoScheduleTeam").value||"Team 1",
    slot:document.getElementById("photoScheduleTime").value.trim(),
    updatedAt:new Date().toISOString()
  };

  await photoDbPut("schedule",row);
  document.getElementById("photoScheduleTime").value="";
  await syncPhotoTargetUnits();
  document.getElementById("photoTargetUnit").value=key;
  toast("Unit added to this day's Photo Register")
}

function parsePhotoZipName(name){
  const s=String(name||"");
  let date="";
  let m=s.match(/(20\d{2})[-_. ]?(\d{2})[-_. ]?(\d{2})/);if(m)date=`${m[1]}-${m[2]}-${m[3]}`;
  if(!date){m=s.match(/(\d{2})[-_. ](\d{2})[-_. ](20\d{2})/);if(m)date=`${m[3]}-${m[2]}-${m[1]}`}
  const blockMatch=s.match(/(?:blk|block|b)?\s*([5][3-6][0-9])/i);
  const unitMatch=s.match(/#?\s*(\d{1,2})[-_ ](\d{2,3})(?!\d)/);
  return {date,block:blockMatch?Number(blockMatch[1]):0,floor:unitMatch?Number(unitMatch[1]):0,unit:unitMatch?Number(unitMatch[2]):0}
}
async function compressPhotoBlob(bytes,name){
  const type=/\.png$/i.test(name)?"image/png":"image/jpeg",blob=new Blob([bytes],{type}),url=URL.createObjectURL(blob),img=new Image();
  await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url});
  const max=1600,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
  const c=document.createElement("canvas");c.width=w;c.height=h;const ctx=c.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);URL.revokeObjectURL(url);
  const out=await new Promise(res=>c.toBlob(res,"image/jpeg",.84));return {blob:out,width:w,height:h}
}
async function importPhotoZip(){
  const file=document.getElementById("photoZipInput").files[0];if(!file){toast("Choose a photo ZIP");return}
  if(typeof JSZip==="undefined"){toast("Photo ZIP library not loaded");return}
  const zone=Number(document.getElementById("photoZone").value),selectedDate=document.getElementById("photoDate").value||isoTodaySG();
  const parsed=parsePhotoZipName(file.name),date=parsed.date||selectedDate;
  if(date!==selectedDate&&!confirm(`ZIP filename date looks like ${safeDate(date)}, but selected date is ${safeDate(selectedDate)}. Use ZIP date?`))return;
  const schedule=await photoDisplayRows(date,zone);
  if(!schedule.length){toast("Add the unit to Photo Daily Register first");return}
  let targetKey=document.getElementById("photoTargetUnit").value;
  if(!targetKey&&parsed.block&&parsed.floor&&parsed.unit){
    const key=unitKey(parsed.block,parsed.floor,parsed.unit);
    if(schedule.some(a=>a.unitKey===key))targetKey=key
  }
  if(!targetKey&&parsed.block){
    const c=schedule.filter(a=>Number(a.block)===parsed.block);if(c.length===1)targetKey=c[0].unitKey
  }
  if(!targetKey&&schedule.length===1)targetKey=schedule[0].unitKey;
  if(!targetKey){toast("Select Target Unit, or include Block + Unit in ZIP filename");return}
  const appt=schedule.find(a=>a.unitKey===targetKey);if(!appt){toast("Selected target is not in the Photo Daily Register / stored photo list");return}
  const zip=await JSZip.loadAsync(file);
  const entries=Object.values(zip.files).filter(x=>!x.dir&&/\.(jpe?g|png)$/i.test(x.name)&&!/(^|\/)__MACOSX\//i.test(x.name))
    .sort((a,b)=>String(a.name).localeCompare(String(b.name),undefined,{numeric:true,sensitivity:"base"}));
  if(!entries.length){toast("No JPG / PNG photos found in ZIP");return}
  const cycle=cycleForDate(date),existing=(await photoDbAll("photos")).filter(p=>p.date===date&&p.unitKey===targetKey);
  let order=existing.length;
  document.getElementById("photoImportStatus").textContent=`Importing ${entries.length} photo(s)…`;
  for(const e of entries){
    const bytes=await e.async("uint8array"),c=await compressPhotoBlob(bytes,e.name);
    order++;
    await photoDbPut("photos",{id:`${Date.now()}_${Math.random().toString(36).slice(2)}`,cycleId:cycle.id,date,zone,block:appt.block,unitKey:targetKey,
      unitDisplay:appt.unitDisplay||unitDisplay(appt.floor,appt.unit),team:appt.team||"",slot:appt.slot||"",order,name:e.name.split("/").pop(),blob:c.blob,width:c.width,height:c.height,importedAt:new Date().toISOString()})
  }
  document.getElementById("photoZipInput").value="";
  document.getElementById("photoImportStatus").textContent=`Imported ${entries.length} photo(s) → Blk ${appt.block} ${appt.unitDisplay||unitDisplay(appt.floor,appt.unit)}`;
  await renderPhotoCenter();toast("Photo ZIP imported")
}

function photoReportOrder(photos){
  return [...(photos||[])].sort((a,b)=>Number(a.order||0)-Number(b.order||0)).slice(0,3)
}
async function savePhotoManualOrder(date,unitKey,orderedIds){
  const all=await photoDbAll("photos"),rows=all.filter(p=>p.date===date&&p.unitKey===unitKey);
  const byId=new Map(rows.map(p=>[p.id,p]));
  const ordered=orderedIds.map(id=>byId.get(id)).filter(Boolean);
  rows.filter(p=>!orderedIds.includes(p.id)).sort((a,b)=>Number(a.order||0)-Number(b.order||0)).forEach(p=>ordered.push(p));
  for(let i=0;i<ordered.length;i++){
    const p=ordered[i];p.order=i+1;
    if("reportFirst" in p)delete p.reportFirst;
    await photoDbPut("photos",p)
  }
}

async function renderPhotoCenter(){
  const board=document.getElementById("photoDailyBoard");if(!board)return;
  const zone=Number(document.getElementById("photoZone").value||1),date=document.getElementById("photoDate").value||isoTodaySG(),cycle=cycleForDate(document.getElementById("photoCycleDate").value||date);
  document.getElementById("photoDailyTitle").textContent=`${safeDate(date)} · Zone ${zone}`;
  document.getElementById("photoCycleTitle").textContent=`${formatCycle(cycle)} · Zone ${zone}`;
  document.getElementById("photoRetentionNote").innerHTML=`Photos for this cycle are eligible for automatic cleanup on <strong>${safeDate(cycle.cleanup)}</strong>, but only after a Word or PDF report has been generated successfully.`;
  const all=await photoDbAll("photos"),sched=await photoDisplayRows(date,zone);
  if(!sched.length){board.innerHTML=`<div class="empty-state">No Photo Daily Register units or stored photos for this Zone / Date.</div>`}
  else board.innerHTML=sched.map(a=>{
    const ps=all.filter(p=>p.date===date&&p.unitKey===a.unitKey).sort((x,y)=>x.order-y.order);
    const report=photoReportOrder(ps),role=new Map(report.map((p,i)=>[p.id,i]));
    return `<section class="photo-unit-card ${ps.length>=3?"ready":""}" data-photo-date="${date}" data-photo-unit="${a.unitKey}">
      <div class="photo-unit-head"><div><strong>Blk ${a.block} ${a.unitDisplay||unitDisplay(a.floor,a.unit)}</strong><span>${a.photoOnly?`Stored photos · Daily Register row missing`:`${esc(a.team||"")} · ${esc(a.slot||"")}`} · Drag photos to set print order</span></div><em>${ps.length} photo${ps.length===1?"":"s"}${ps.length>=3?" · Ready":""}</em></div>
      <div class="photo-thumb-grid">${ps.map(p=>{
        const pos=role.has(p.id)?role.get(p.id):-1;
        const label=pos===0?"1 · Closed DB":pos===1?"2 · BEFORE":pos===2?"3 · AFTER":"Extra";
        return `<div class="photo-thumb ${pos>=0?"used":"extra"}" draggable="true" data-photo-drag="${p.id}"><img src="${URL.createObjectURL(p.blob)}" alt=""><span>${label}</span><button class="photo-delete-btn" type="button" data-photo-delete="${p.id}">×</button></div>`
      }).join("")||`<div class="photo-empty">No photos yet</div>`}</div>
    </section>`
  }).join("");
  const cyclePhotos=all.filter(p=>p.cycleId===cycle.id&&p.zone===zone),units=new Set(cyclePhotos.map(p=>`${p.date}|${p.unitKey}`));
  const ready=[...units].filter(k=>cyclePhotos.filter(p=>`${p.date}|${p.unitKey}`===k).length>=3).length;
  document.getElementById("photoMonthlySummary").innerHTML=`<span>${cyclePhotos.length} photos stored</span><span>${units.size} unit-days</span><span>${ready} ready with 3+ photos</span>`;
}
document.getElementById("photoImportBtn").addEventListener("click",()=>importPhotoZip().catch(e=>{console.error(e);toast("Photo import failed")}));
document.getElementById("photoScheduleForm").addEventListener("submit",e=>{e.preventDefault();savePhotoScheduleEntry().catch(err=>{console.error(err);toast("Photo Daily Register save failed")})});
document.getElementById("photoScheduleBlock").addEventListener("change",syncPhotoScheduleUnits);
document.getElementById("photoScheduleTable").addEventListener("click",async e=>{
  const b=e.target.closest("[data-photo-schedule-delete]");if(!b)return;
  if(!confirm("Remove this unit from this day's Photo Register? Stored photos will NOT be deleted."))return;
  await photoDbDelete("schedule",b.dataset.photoScheduleDelete);
  await syncPhotoTargetUnits();
  toast("Daily photo schedule line removed")
});
document.getElementById("photoZoneTabs").addEventListener("click",e=>{
  const b=e.target.closest("[data-photo-zone-tab]");if(!b)return;
  document.getElementById("photoZone").value=b.dataset.photoZoneTab;
  syncPhotoTargetUnits()
});
document.getElementById("photoZone").addEventListener("change",syncPhotoTargetUnits);
document.getElementById("photoDate").addEventListener("change",syncPhotoTargetUnits);
document.getElementById("photoCycleDate").addEventListener("change",()=>{
  const cycle=cycleForDate(document.getElementById("photoCycleDate").value||isoTodaySG());
  document.getElementById("photoBlockReportFrom").value=cycle.start;
  document.getElementById("photoBlockReportTo").value=cycle.end;
  renderPhotoCenter();
  renderBlockPhotoSummary().catch(console.error)
});
document.getElementById("photoDailyBoard").addEventListener("click",async e=>{
  const b=e.target.closest("[data-photo-delete]");if(!b)return;
  if(!confirm("Delete this stored photo?"))return;await photoDbDelete("photos",b.dataset.photoDelete);await renderPhotoCenter()
});
let photoDragId="";
document.getElementById("photoDailyBoard").addEventListener("dragstart",e=>{
  const card=e.target.closest("[data-photo-drag]");if(!card)return;
  photoDragId=card.dataset.photoDrag||"";card.classList.add("dragging");
  if(e.dataTransfer){e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",photoDragId)}
});
document.getElementById("photoDailyBoard").addEventListener("dragend",e=>{
  const card=e.target.closest("[data-photo-drag]");if(card)card.classList.remove("dragging");
  document.querySelectorAll(".photo-thumb.drag-over").forEach(x=>x.classList.remove("drag-over"));photoDragId=""
});
document.getElementById("photoDailyBoard").addEventListener("dragover",e=>{
  const target=e.target.closest("[data-photo-drag]");if(!target||!photoDragId||target.dataset.photoDrag===photoDragId)return;
  const src=document.querySelector(`[data-photo-drag="${CSS.escape(photoDragId)}"]`);if(!src)return;
  const srcUnit=src.closest(".photo-unit-card"),dstUnit=target.closest(".photo-unit-card");if(!srcUnit||srcUnit!==dstUnit)return;
  e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect="move";
  document.querySelectorAll(".photo-thumb.drag-over").forEach(x=>x.classList.remove("drag-over"));target.classList.add("drag-over")
});
document.getElementById("photoDailyBoard").addEventListener("drop",async e=>{
  const target=e.target.closest("[data-photo-drag]");if(!target||!photoDragId||target.dataset.photoDrag===photoDragId)return;
  const src=document.querySelector(`[data-photo-drag="${CSS.escape(photoDragId)}"]`),unitCard=target.closest(".photo-unit-card");if(!src||!unitCard||src.closest(".photo-unit-card")!==unitCard)return;
  e.preventDefault();
  const grid=unitCard.querySelector(".photo-thumb-grid"),cards=[...grid.querySelectorAll("[data-photo-drag]")],srcIndex=cards.indexOf(src),dstIndex=cards.indexOf(target);
  if(srcIndex<0||dstIndex<0)return;
  cards.splice(srcIndex,1);cards.splice(dstIndex,0,src);
  await savePhotoManualOrder(unitCard.dataset.photoDate,unitCard.dataset.photoUnit,cards.map(x=>x.dataset.photoDrag));
  await renderPhotoCenter();toast("Photo print order saved")
});

function photoFitEmu(p,maxW,maxH){
  const ratio=p.width/p.height;let w=maxW,h=w/ratio;if(h>maxH){h=maxH;w=h*ratio}return {cx:Math.round(w*914400),cy:Math.round(h*914400)}
}
function photoEscXml(s){return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}
function photoRun(text,bold=false,size=16){return `<w:r><w:rPr>${bold?"<w:b/>":""}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr><w:t xml:space="preserve">${photoEscXml(text)}</w:t></w:r>`}
function photoP(text,bold=false,size=16,align="center"){return `<w:p><w:pPr><w:jc w:val="${align}"/><w:spacing w:before="0" w:after="0"/></w:pPr>${photoRun(text,bold,size)}</w:p>`}
function photoImageP(p,rId,docId,maxW,maxH){
  const d=photoFitEmu(p,maxW,maxH);return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${d.cx}" cy="${d.cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${docId}" name="Photo ${docId}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${docId}" name="image${docId}.jpg"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${d.cx}" cy="${d.cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`
}
function photoTc(width,content){return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>${content}</w:tc>`}
function photoPageTable(rows,refs){
  const w=[1032,2580,3909,3909];let x=`<w:tbl><w:tblPr><w:tblW w:w="11430" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="000000"/><w:left w:val="single" w:sz="4" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:color="000000"/><w:right w:val="single" w:sz="4" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:color="000000"/></w:tblBorders></w:tblPr><w:tblGrid>${w.map(n=>`<w:gridCol w:w="${n}"/>`).join("")}</w:tblGrid>`;
  for(let i=0;i<6;i++){const r=rows[i];if(r){x+=`<w:tr><w:trPr><w:trHeight w:val="306" w:hRule="exact"/></w:trPr>${photoTc(w[0],photoP("DATE",true,15))}${photoTc(w[1],photoP(`Blk${r.block}${r.unitDisplay}`,true,15))}${photoTc(w[2],photoP("BEFORE",true,15))}${photoTc(w[3],photoP("AFTER",true,15))}</w:tr>`;
    const rr=refs[i]||[],p1=rr[0]?photoImageP(rr[0].photo,rr[0].rId,rr[0].docId,1.70,1.38):photoP(""),p2=rr[1]?photoImageP(rr[1].photo,rr[1].rId,rr[1].docId,2.62,1.38):photoP(""),p3=rr[2]?photoImageP(rr[2].photo,rr[2].rId,rr[2].docId,2.62,1.38):photoP("");
    x+=`<w:tr><w:trPr><w:trHeight w:val="2110" w:hRule="exact"/></w:trPr>${photoTc(w[0],photoP(safeDate(r.date),true,14))}${photoTc(w[1],p1)}${photoTc(w[2],p2)}${photoTc(w[3],p3)}</w:tr>`}
  }
  return x+"</w:tbl>"
}
async function monthlyPhotoGroups(zone,cycle){
  const all=(await photoDbAll("photos")).filter(p=>p.zone===zone&&p.cycleId===cycle.id);
  const schedule=await photoDbAll("schedule"),scheduleMap=new Map(schedule.map(r=>[`${r.date}|${r.unitKey}`,r]));
  const map=new Map();
  for(const p of all){const k=`${p.date}|${p.unitKey}`;if(!map.has(k))map.set(k,[]);map.get(k).push(p)}
  const groups=[];
  for(const [k,ps] of map){
    ps.sort((a,b)=>a.order-b.order);const a=scheduleMap.get(k);
    groups.push({date:ps[0].date,unitKey:ps[0].unitKey,block:ps[0].block,unitDisplay:ps[0].unitDisplay,team:a?.team||ps[0].team||"",slot:a?.slot||ps[0].slot||"",photos:photoReportOrder(ps)})
  }
  return groups.sort((a,b)=>a.date.localeCompare(b.date)||String(a.team).localeCompare(String(b.team))||slotStartMinutes(a.slot)-slotStartMinutes(b.slot)||a.block-b.block||a.unitDisplay.localeCompare(b.unitDisplay,undefined,{numeric:true}))
}

function photoBlockOptions(zone){
  return (ZONE_BLOCKS[zone]||[]).filter(b=>Boolean(PROJECT_LAYOUT[String(b)]||PROJECT_LAYOUT[b]))
    .map(b=>`<option value="${b}">Blk ${b}</option>`).join("")
}
function syncPhotoBlockReportBlocks(){
  const zone=document.getElementById("photoBlockReportZone").value;
  const block=document.getElementById("photoBlockReportBlock");
  const previous=block.value;
  block.innerHTML=photoBlockOptions(zone);
  if([...block.options].some(o=>o.value===previous))block.value=previous;
  renderBlockPhotoSummary().catch(console.error)
}
async function blockPhotoGroups(block,fromDate,toDate){
  const all=(await photoDbAll("photos")).filter(p=>Number(p.block)===Number(block)&&p.date>=fromDate&&p.date<=toDate);
  const map=new Map();
  for(const p of all){const k=`${p.date}|${p.unitKey}`;if(!map.has(k))map.set(k,[]);map.get(k).push(p)}
  const groups=[];
  for(const ps of map.values()){
    ps.sort((a,b)=>Number(a.order||0)-Number(b.order||0));
    groups.push({date:ps[0].date,unitKey:ps[0].unitKey,block:Number(ps[0].block),unitDisplay:ps[0].unitDisplay,
      photos:photoReportOrder(ps),storedCount:ps.length})
  }
  return groups.sort((a,b)=>a.date.localeCompare(b.date)||a.unitDisplay.localeCompare(b.unitDisplay,undefined,{numeric:true}))
}
async function renderBlockPhotoSummary(){
  const box=document.getElementById("photoBlockSummary");if(!box)return;
  const block=Number(document.getElementById("photoBlockReportBlock").value||0);
  const from=document.getElementById("photoBlockReportFrom").value,to=document.getElementById("photoBlockReportTo").value;
  if(!block||!from||!to){box.innerHTML="";return}
  const groups=await blockPhotoGroups(block,from,to),photos=groups.reduce((n,g)=>n+g.storedCount,0),ready=groups.filter(g=>g.photos.length>=3).length;
  box.innerHTML=`<div><strong>Blk ${block}</strong><span>${groups.length} unit-day${groups.length===1?"":"s"}</span></div>
  <div><strong>${photos}</strong><span>stored photos</span></div><div><strong>${ready}</strong><span>ready with 3+</span></div>
  <div><strong>${safeDate(from)} → ${safeDate(to)}</strong><span>report range</span></div>`
}
async function buildBlockPhotoDocx(groups,block,from,to){
  const zip=new JSZip(),rels=[],media=[];let rn=2,docId=1;const pages=[];
  for(let p=0;p<groups.length;p+=6){
    const rows=groups.slice(p,p+6),refs=[];
    for(let i=0;i<rows.length;i++){refs[i]=[];for(let j=0;j<3;j++){
      const ph=rows[i].photos[j];if(!ph){refs[i][j]=null;continue}
      const rId=`rId${rn++}`,n=media.length+1;rels.push({rId,target:`media/image${n}.jpg`});media.push({target:`media/image${n}.jpg`,blob:ph.blob});
      refs[i][j]={photo:ph,rId,docId:docId++}
    }}
    pages.push(photoP(`ELECTRICAL LOAD UPGRADING WORKS (ELU) AT BLOCK ${block} PASIR RIS STREET 51 · ${safeDate(from)} TO ${safeDate(to)}`,true,18)+photoPageTable(rows,refs));
    if(p+6<groups.length)pages.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
  }
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${pages.join("")}<w:sectPr><w:pgSz w:w="11907" w:h="16839"/><w:pgMar w:top="255" w:right="238" w:bottom="255" w:left="238"/></w:sectPr></w:body></w:document>`;
  const dr=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${rels.map(r=>`<Relationship Id="${r.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${r.target}"/>`).join("")}</Relationships>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="16"/></w:rPr></w:style></w:styles>`;
  const types=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
  const rr=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  zip.file("[Content_Types].xml",types);zip.folder("_rels").file(".rels",rr);zip.folder("word").file("document.xml",doc);zip.folder("word").file("styles.xml",styles);zip.folder("word").folder("_rels").file("document.xml.rels",dr);
  for(const m of media)zip.folder("word").file(m.target,m.blob);
  return zip.generateAsync({type:"blob",compression:"DEFLATE"})
}
async function generateBlockPhotoWord(){
  const block=Number(document.getElementById("photoBlockReportBlock").value),from=document.getElementById("photoBlockReportFrom").value,to=document.getElementById("photoBlockReportTo").value;
  if(!block||!from||!to){toast("Select Block, From and To dates");return} if(from>to){toast("From date cannot be after To date");return}
  const groups=await blockPhotoGroups(block,from,to);if(!groups.length){toast(`No stored photos for Blk ${block} in this date range`);return}
  if(groups.some(g=>g.photos.length<3)&&!confirm("Some units have fewer than 3 photos. Generate Word with blank cells?"))return;
  const blob=await buildBlockPhotoDocx(groups,block,from,to),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`ELU_Photo_Report_Blk${block}_${from}_to_${to}.docx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast(`Block ${block} Word report downloaded`)
}
async function generateBlockPhotoPdf(){
  const block=Number(document.getElementById("photoBlockReportBlock").value),from=document.getElementById("photoBlockReportFrom").value,to=document.getElementById("photoBlockReportTo").value;
  if(!block||!from||!to){toast("Select Block, From and To dates");return} if(from>to){toast("From date cannot be after To date");return}
  const groups=await blockPhotoGroups(block,from,to);if(!groups.length){toast(`No stored photos for Blk ${block} in this date range`);return}
  const win=window.open("","_blank","width=1100,height=900");if(!win){toast("Allow pop-ups for Print / PDF");return}
  const urls=[],cards=groups.map(g=>`<div class="r"><div class="h"><b>${safeDate(g.date)}</b><b>Blk${g.block}${g.unitDisplay}</b><b>BEFORE</b><b>AFTER</b></div><div class="p"><div>${safeDate(g.date)}</div>${[0,1,2].map(i=>{if(!g.photos[i])return"<div></div>";const u=URL.createObjectURL(g.photos[i].blob);urls.push(u);return `<div><img src="${u}"></div>`}).join("")}</div></div>`).join("");
  win.document.write(`<!doctype html><html><head><title>ELU Blk ${block} Photo Report</title><style>@page{size:A4 portrait;margin:5mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact}body{font-family:Arial;margin:0}.title{text-align:center;font-weight:700;font-size:10px;margin:2px 0}.sub{text-align:center;font-size:8px;margin-bottom:4px}.r{break-inside:avoid}.h,.p{display:grid;grid-template-columns:9% 23% 34% 34%}.h>*,.p>*{border:1px solid #000;padding:2px;text-align:center;font-size:8px}.p>*{height:43mm;display:flex;align-items:center;justify-content:center}.p img{max-width:100%;max-height:100%;object-fit:contain}</style></head><body><div class="title">ELECTRICAL LOAD UPGRADING WORKS (ELU) AT BLOCK ${block} PASIR RIS STREET 51</div><div class="sub">${safeDate(from)} TO ${safeDate(to)}</div>${cards}<script>onload=()=>setTimeout(()=>print(),400)<\/script></body></html>`);win.document.close();setTimeout(()=>urls.forEach(URL.revokeObjectURL),60000)
}

async function markPhotoExport(zone,cycle,type){
  await photoDbPut("meta",{key:`export:${zone}:${cycle.id}`,zone,cycleId:cycle.id,cycleStart:cycle.start,cycleEnd:cycle.end,cleanup:cycle.cleanup,type,exportedAt:new Date().toISOString()})
}
async function generateMonthlyPhotoWord(){
  const zone=Number(document.getElementById("photoZone").value),cycle=cycleForDate(document.getElementById("photoCycleDate").value||isoTodaySG()),groups=await monthlyPhotoGroups(zone,cycle);
  if(!groups.length){toast("No stored photos for this Zone / Cycle");return}
  if(groups.some(g=>g.photos.length<3)&&!confirm("Some units have fewer than 3 photos. Generate Word with blank cells?"))return;
  const zip=new JSZip(),rels=[],media=[];let rn=2,docId=1;const pages=[];
  for(let p=0;p<groups.length;p+=6){const rows=groups.slice(p,p+6),refs=[];
    for(let i=0;i<rows.length;i++){refs[i]=[];for(let j=0;j<3;j++){const ph=rows[i].photos[j];if(!ph){refs[i][j]=null;continue}const rId=`rId${rn++}`,n=media.length+1;rels.push({rId,target:`media/image${n}.jpg`});media.push({target:`media/image${n}.jpg`,blob:ph.blob});refs[i][j]={photo:ph,rId,docId:docId++}}}
    pages.push(photoP("ELECTRICAL LOAD UPGRADING WORKS (ELU) AT BLOCKS 531 - 569 PASIR RIS STREET 51",true,18)+photoPageTable(rows,refs));if(p+6<groups.length)pages.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
  }
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${pages.join("")}<w:sectPr><w:pgSz w:w="11907" w:h="16839"/><w:pgMar w:top="255" w:right="238" w:bottom="255" w:left="238"/></w:sectPr></w:body></w:document>`;
  const dr=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${rels.map(r=>`<Relationship Id="${r.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${r.target}"/>`).join("")}</Relationships>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="16"/></w:rPr></w:style></w:styles>`;
  const types=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
  const rr=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  zip.file("[Content_Types].xml",types);zip.folder("_rels").file(".rels",rr);zip.folder("word").file("document.xml",doc);zip.folder("word").file("styles.xml",styles);zip.folder("word").folder("_rels").file("document.xml.rels",dr);
  for(const m of media)zip.folder("word").file(m.target,m.blob);
  const blob=await zip.generateAsync({type:"blob",compression:"DEFLATE"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`ELU_Photo_Report_Zone${zone}_${cycle.start}_to_${cycle.end}.docx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
  await markPhotoExport(zone,cycle,"Word");await renderPhotoCenter();toast("Monthly Word report downloaded")
}
async function generateMonthlyPhotoPdf(){
  const zone=Number(document.getElementById("photoZone").value),cycle=cycleForDate(document.getElementById("photoCycleDate").value||isoTodaySG()),groups=await monthlyPhotoGroups(zone,cycle);
  if(!groups.length){toast("No stored photos for this Zone / Cycle");return}
  const win=window.open("","_blank","width=1100,height=900");if(!win){toast("Allow pop-ups for Print / PDF");return}
  const cards=groups.map(g=>`<div class="r"><div class="h"><b>${safeDate(g.date)}</b><b>Blk${g.block}${g.unitDisplay}</b><b>BEFORE</b><b>AFTER</b></div><div class="p"><div>${safeDate(g.date)}</div>${[0,1,2].map(i=>g.photos[i]?`<div><img src="${URL.createObjectURL(g.photos[i].blob)}"></div>`:`<div></div>`).join("")}</div></div>`).join("");
  win.document.write(`<!doctype html><html><head><title>ELU Photo Report</title><style>@page{size:A4 portrait;margin:5mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact}body{font-family:Arial;margin:0}.title{text-align:center;font-weight:700;font-size:10px;margin:2px 0 4px}.r{break-inside:avoid}.h,.p{display:grid;grid-template-columns:9% 23% 34% 34%}.h>*,.p>*{border:1px solid #000;padding:2px;text-align:center;font-size:8px}.p>*{height:43mm;display:flex;align-items:center;justify-content:center}.p img{max-width:100%;max-height:100%;object-fit:contain}</style></head><body><div class="title">ELECTRICAL LOAD UPGRADING WORKS (ELU) AT BLOCKS 531 - 569 PASIR RIS STREET 51 · Zone ${zone}</div>${cards}<script>onload=()=>setTimeout(()=>print(),300)<\/script></body></html>`);win.document.close();
  await markPhotoExport(zone,cycle,"PDF");await renderPhotoCenter()
}
document.getElementById("photoWordBtn").addEventListener("click",()=>generateMonthlyPhotoWord().catch(e=>{console.error(e);toast("Word report generation failed")}));
document.getElementById("photoPdfBtn").addEventListener("click",()=>generateMonthlyPhotoPdf().catch(e=>{console.error(e);toast("PDF report generation failed")}));
document.getElementById("photoBlockWordBtn").addEventListener("click",()=>generateBlockPhotoWord().catch(e=>{console.error(e);toast("Block Word report generation failed")}));
document.getElementById("photoBlockPdfBtn").addEventListener("click",()=>generateBlockPhotoPdf().catch(e=>{console.error(e);toast("Block PDF report generation failed")}));
document.getElementById("photoBlockReportZone").addEventListener("change",syncPhotoBlockReportBlocks);
["photoBlockReportBlock","photoBlockReportFrom","photoBlockReportTo"].forEach(id=>document.getElementById(id).addEventListener("change",()=>renderBlockPhotoSummary().catch(console.error)));

async function photoAutoCleanup(){
  try{
    const today=isoTodaySG(),meta=await photoDbAll("meta"),eligible=meta.filter(m=>m.key?.startsWith("export:")&&m.cleanup&&today>=m.cleanup);
    for(const m of eligible){
      await photoDbDeleteWhere("photos",p=>p.zone===m.zone&&p.cycleId===m.cycleId);
      await photoDbDelete("meta",m.key)
    }
    if(eligible.length&&document.getElementById("photos")?.classList.contains("active")){await renderPhotoCenter();toast(`Old exported photo cycle cleaned: ${eligible.length}`)}
  }catch(e){console.error("Photo cleanup",e)}
}
function initPhotoCenter(){
  document.getElementById("photoZone").innerHTML=zoneOptions();
  document.getElementById("photoZone").value="1";
  document.getElementById("photoDate").value=isoTodaySG();
  document.getElementById("photoCycleDate").value=isoTodaySG();
  const cycle=cycleForDate(isoTodaySG()),blockZone=document.getElementById("photoBlockReportZone");
  if(blockZone){
    blockZone.innerHTML=zoneOptions();
    blockZone.value="1";
    document.getElementById("photoBlockReportFrom").value=cycle.start;
    document.getElementById("photoBlockReportTo").value=cycle.end;
    syncPhotoBlockReportBlocks()
  }
  syncPhotoZoneTabs();
  syncPhotoScheduleBlocks();
  syncPhotoTargetUnits();
  renderBlockPhotoSummary().catch(console.error)
}

function renderAll(){rebuildAllMasters();renderDashboard();renderBlockBoard();renderSurveyTable();renderAppointmentTable();renderUnitTable();renderComplaintTable();renderPlanner();renderMasterSchedule();renderReport();if(document.getElementById("photos")?.classList.contains("active"))renderPhotoCenter()}
function startApp(){
  if(appStarted)return;
  appStarted=true;
  document.getElementById("todayChip").textContent=fmtDate.format(new Date());
  document.getElementById("complaintDate").value=isoTodaySG();
  document.getElementById("teamDate").value=isoTodaySG();
  configureAppointmentYearInputs();
  initSelectors();
  initMasterSchedule();
  initPhotoCenter();
  togglePlannerCustomTime();
  toggleAppointmentCustomTime();
  resetAppointmentForm();
  rebuildAllMasters();
  renderAll();
  autoCompleteAppointments();
  photoAutoCleanup();
  autoCompleteTimer=setInterval(()=>autoCompleteAppointments(true),60000)
}
initSecurityGate();
