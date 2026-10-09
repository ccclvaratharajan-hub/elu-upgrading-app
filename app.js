const LEGACY_STORAGE_KEY="elu_premium_v13";
const PREV_STORAGE_KEY="elu_premium_v12";
const SECURE_STATE_KEY="elu_secure_state_v3";
const AUTO_LOCK_MS=15*60*1000;
const ZONE_BLOCKS={1:[564,565,566,567,568,569],2:[544,545,546,547,548,549,550],3:[531,532,533,534,535,536],4:[557,558,559,560,561,562],5:[537,538,539,540,541,542,543],6:[551,552,553,554,555,556]};
const ZONE1_REQUESTED_CORRECTIONS={
  "565-9-120":"NR","566-2-106":"NR","568-11-82":"NR",
  "569-2-70":"NR","569-3-72":"NR","566-4-114":"A",
  "569-2-66":"A","568-6-78":"D"
};
const ZONE1_OPT_IN_REASON="Zone 1 requested Opt-In correction (status only)";
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
  return {units,surveys:[],appointments:seedAppointments(),appointmentTombstones:[],complaints:[],statusOverrides:{},statusAudit:[],zone1CorrectionsApplied:[],zone6ImportData:null,statusDecisionSchema:2,createdAt:new Date().toISOString()};
}
function applyZone6ImportSeed(records){
  for(const [key,entry] of Object.entries(records||{})){
    const [b,f,u]=key.split("-").map(Number);
    if(!ZONE_BLOCKS[6].includes(b)||!PROJECT_LAYOUT[b]?.floors?.[f]?.includes(u))continue;
    const seed=PROJECT_LAYOUT[b].seed||(PROJECT_LAYOUT[b].seed={});
    seed[`${f}-${u}`]={...(seed[`${f}-${u}`]||{}),response:entry.status,ownerName:entry.ownerName||seed[`${f}-${u}`]?.ownerName||"",contact:entry.contact||seed[`${f}-${u}`]?.contact||"",completed:entry.completed,legacySchedule:entry.legacySchedule||seed[`${f}-${u}`]?.legacySchedule||"",legacyRemark:seed[`${f}-${u}`]?.legacyRemark||""};
  }
}
function isUserAppointment(a){
  return ["Planner","Manual","Planner History","Zone6 Survey Import"].includes(String(a?.source||""))||Number(a?.id)>1000000000000
}
function mergeSavedIntoFresh(saved){
  if(saved?.zone6ImportData)applyZone6ImportSeed(saved.zone6ImportData);
  const fresh=makeInitialState();
  if(!saved)return fresh;
  fresh.zone6ImportData=saved.zone6ImportData||null;

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
        source:o?.source==="Zone6 Survey Import"?"Zone6 Survey Import":"Manual",
        reason:o?.reason||"Manual latest status",
        updatedAt:o?.updatedAt||new Date().toISOString(),
        decisionId:o?.decisionId||null
      }
    })
  }
  fresh.statusAudit=Array.isArray(saved.statusAudit)?[...saved.statusAudit]:[];
  fresh.zone1CorrectionsApplied=Array.isArray(saved.zone1CorrectionsApplied)?[...saved.zone1CorrectionsApplied]:[];

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
let state={units:{},surveys:[],appointments:[],complaints:[],statusOverrides:{},statusAudit:[],zone1CorrectionsApplied:[],zone6ImportData:null,statusDecisionSchema:2,createdAt:""};
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
  return {surveys:state.surveys,appointments:state.appointments,appointmentTombstones:state.appointmentTombstones||[],complaints:state.complaints,statusOverrides:state.statusOverrides||{},statusAudit:state.statusAudit||[],zone1CorrectionsApplied:state.zone1CorrectionsApplied||[],zone6ImportData:state.zone6ImportData||null,statusDecisionSchema:2,createdAt:state.createdAt}
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
  applyZone1RequestedCorrections();
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
  if(a?.requiresExplicitCompletion)return false;
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
    // This requested A means Opt-In; it does not assert that work was completed.
    const completed=manual.status==="A"&&manual.reason!==ZONE1_OPT_IN_REASON&&manual.reason!=="Zone 6 survey Opt-In (status only)";
    return {appointment:null,status:manual.status,workStatus:completed?"Completed":manual.status==="A"?"Opt-In":"Pending",active:false,completed,manualOverride:manual}
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

function applyZone1RequestedCorrections(){
  state.zone1CorrectionsApplied=Array.isArray(state.zone1CorrectionsApplied)?state.zone1CorrectionsApplied:[];
  state.statusAudit=Array.isArray(state.statusAudit)?state.statusAudit:[];
  // Earlier ZIPs placed four units under the wrong block. Remove only those
  // version-generated decisions, preserving any later user edit on a unit.
  const misplaced=[
    ["565-2-106","NR","Zone 1 requested No Response correction"],
    ["568-2-70","NR","Zone 1 requested No Response correction"],
    ["568-3-72","NR","Zone 1 requested No Response correction"],
    ["565-4-114","A",ZONE1_OPT_IN_REASON]
  ];
  for(const [oldKey,oldStatus,oldReason] of misplaced){
    const oldAudit=state.statusAudit.find(e=>e.id===`zone1-requested-20260926-${oldKey}`);
    if(!oldAudit&&!state.zone1CorrectionsApplied.includes(oldKey))continue;
    const oldOverride=state.statusOverrides[oldKey];
    if(oldOverride?.status===oldStatus&&oldOverride.reason===oldReason&&(!oldAudit||oldOverride.updatedAt===oldAudit.at)){
      delete state.statusOverrides[oldKey]
    }
    state.zone1CorrectionsApplied=state.zone1CorrectionsApplied.filter(key=>key!==oldKey);
    const undoId=`zone1-block-fix-20260926-${oldKey}`;
    if(!state.statusAudit.some(e=>e.id===undoId))state.statusAudit.push({
      id:undoId,unitKey:oldKey,from:oldStatus,to:state.units[oldKey]?currentUnitAppointmentState(oldKey).status:"",
      action:"corrected-block-number",source:"Manual",at:new Date().toISOString()
    })
  }
  for(const [key,status] of Object.entries(ZONE1_REQUESTED_CORRECTIONS)){
    if(state.zone1CorrectionsApplied.includes(key))continue;
    const auditId=`zone1-requested-20260926-${key}`;
    if(state.statusAudit.some(event=>event.id===auditId)){
      state.zone1CorrectionsApplied.push(key);
      continue
    }
    const unit=state.units[key];
    if(!unit||unit.zone!==1){console.warn("Zone 1 correction unit not found",key);continue}
    const before=currentUnitAppointmentState(key).status;
    const at=new Date().toISOString();
    state.statusOverrides[key]={
      status,source:"Manual",
      reason:status==="A"?ZONE1_OPT_IN_REASON:status==="D"?"Zone 1 requested Opt-Out correction":"Zone 1 requested No Response correction",
      updatedAt:at,decisionId:null
    };
    state.statusAudit.push({id:auditId,unitKey:key,from:before,to:status,
      action:"user-requested-zone1-correction",source:"Manual",at});
    state.zone1CorrectionsApplied.push(key)
  }
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
reports:["Weekly Meeting Report","Progress Summary calculated directly from the read-only Unit Register."],
sitefiles:["Site Report Files","Download the Block Chart, Response Details and NR Tracking Excel reports by zone."]
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
const dashboardDetailPanels={today:document.getElementById("todayTeamPanel"),visits:document.getElementById("upcomingVisitsPanel")};
function showDashboardDetail(key){
  const dashboard=document.getElementById("dashboard"),tray=document.getElementById("dashboardDetailTray");
  const selected=dashboardDetailPanels[key]?key:null;
  tray.hidden=!selected;
  dashboard.classList.toggle("has-open-detail",!!selected);
  Object.entries(dashboardDetailPanels).forEach(([name,panel])=>{panel.hidden=name!==selected});
  dashboard.querySelectorAll("[data-dashboard-detail]").forEach(button=>button.setAttribute("aria-expanded",String(button.dataset.dashboardDetail===selected)));
}
document.getElementById("dashboard").addEventListener("click",e=>{
  const button=e.target.closest("[data-dashboard-detail]");
  if(button){showDashboardDetail(button.getAttribute("aria-expanded")==="true"?null:button.dataset.dashboardDetail);return}
  if(e.target.closest("[data-dashboard-close]"))showDashboardDetail(null);
});
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
function syncQuickJumpBlocks(){
  const block=document.getElementById("quickJumpBlock");
  block.innerHTML=blockOptions(document.getElementById("quickJumpZone").value);
  syncQuickJumpUnits();
}
function syncQuickJumpUnits(){
  const unit=document.getElementById("quickJumpUnit");
  unit.innerHTML=unitOptionsForBlock(document.getElementById("quickJumpBlock").value);
  document.getElementById("quickJumpUnitBtn").disabled=!unit.options.length;
}
function closeQuickJump(){
  document.getElementById("quickJumpBackdrop").hidden=true;
  document.getElementById("quickJumpBtn").focus();
}
function openQuickJump(){
  if(document.body.classList.contains("secure-locked"))return;
  const currentZone=document.getElementById("boardZone").value;
  const zone=document.getElementById("quickJumpZone");
  zone.value=currentZone||"1";
  syncQuickJumpBlocks();
  const currentBlock=document.getElementById("boardBlock").value;
  if([...document.getElementById("quickJumpBlock").options].some(o=>o.value===currentBlock)){
    document.getElementById("quickJumpBlock").value=currentBlock;
    syncQuickJumpUnits();
  }
  document.getElementById("quickJumpBackdrop").hidden=false;
  zone.focus();
}
function jumpToQuickBlock(openUnit){
  const zone=document.getElementById("quickJumpZone").value;
  const block=document.getElementById("quickJumpBlock").value;
  const key=document.getElementById("quickJumpUnit").value;
  if(!ZONE_BLOCKS[zone]?.includes(Number(block)))return;
  document.getElementById("boardZone").value=zone;
  syncBoardBlocks();
  document.getElementById("boardBlock").value=block;
  renderBoardFloorOptions();
  document.getElementById("boardFloor").value="all";
  document.getElementById("boardSearch").value="";
  selectedBoardUnitKey=openUnit&&getUnit(key)?.block===Number(block)?key:"";
  closeQuickJump();
  setView("blockboard");
  if(openUnit&&selectedBoardUnitKey)openDrawer(selectedBoardUnitKey);
}
document.getElementById("quickJumpBtn").addEventListener("click",openQuickJump);
document.getElementById("quickJumpClose").addEventListener("click",closeQuickJump);
document.getElementById("quickJumpBackdrop").addEventListener("click",e=>{if(e.target===e.currentTarget)closeQuickJump()});
document.getElementById("quickJumpZone").addEventListener("change",syncQuickJumpBlocks);
document.getElementById("quickJumpBlock").addEventListener("change",syncQuickJumpUnits);
document.getElementById("quickJumpBlockBtn").addEventListener("click",()=>jumpToQuickBlock(false));
document.getElementById("quickJumpUnitBtn").addEventListener("click",()=>jumpToQuickBlock(true));
document.getElementById("mapJumpBtn").addEventListener("click",()=>{
  if(document.body.classList.contains("secure-locked"))return;
  setView("dashboard");
  requestAnimationFrame(()=>document.getElementById("zoneMapPanel").scrollIntoView({behavior:"smooth",block:"start"}));
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&!document.getElementById("quickJumpBackdrop").hidden){e.preventDefault();closeQuickJump();return}
  if(e.key!=="/"||e.altKey||e.ctrlKey||e.metaKey||e.target.closest("input,textarea,select,[contenteditable]"))return;
  e.preventDefault();openQuickJump();
});
function initSelectors(){
  document.getElementById("quickJumpZone").innerHTML=zoneOptions();
  document.getElementById("quickJumpZone").value="1";
  syncQuickJumpBlocks();
  ["boardZone","surveyZone","appointmentZone","complaintZone","plannerZone"].forEach(id=>document.getElementById(id).innerHTML=zoneOptions());
  ["unitZoneFilter","appointmentZoneFilter","complaintZoneFilter","surveyZoneFilter","plannerViewZone","reportZoneFilter","responseSummaryZoneFilter"].forEach(id=>document.getElementById(id).innerHTML=zoneOptions(true));
  ["boardZone","surveyZone","appointmentZone","complaintZone","plannerZone"].forEach(id=>document.getElementById(id).value="1");
  ["unitZoneFilter","appointmentZoneFilter","complaintZoneFilter","surveyZoneFilter","plannerViewZone","reportZoneFilter","responseSummaryZoneFilter"].forEach(id=>document.getElementById(id).value="all");
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
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)tiles+=`<img alt="" loading="eager" src="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}" onerror="this.onerror=null;this.src='https://www.onemap.gov.sg/maps/tiles/Night/${zoom}/${x}/${y}.png'" style="left:${Math.round(x*256-left)}px;top:${Math.round(y*256-top)}px">`;
  layer.innerHTML=tiles;
}
function layoutMapBuildings(blocks,stage){
  const positions=blocks.map(b=>{const loc=BLOCK_MAP_LOCATION[b],p=mapPixel(loc[0],loc[1],stage);return{block:b,x:p.x,y:p.y}});
  const mobile=stage.clientWidth<650,sepX=mobile?58:72,sepY=mobile?48:58;
  const minX=36,maxX=Math.max(minX,stage.clientWidth-minX),minY=mobile?75:65,maxY=Math.max(minY,stage.clientHeight-62);
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
    const p=mapPixel(lat,lon,stage),safeX=Math.max(76,Math.min(stage.clientWidth-76,p.x)),safeY=Math.max(60,Math.min(stage.clientHeight-60,p.y));
    return `<button class="map-zone-pin map-zone-pin-${z}" type="button" data-map-zone="${z}" style="left:${safeX}px;top:${safeY}px" aria-label="Show Zone ${z} blocks"><span>ZONE ${z}</span><small>${ZONE_BLOCKS[z].length} blocks · ${s.pct}% done</small></button>`;
  }).join("");
  document.getElementById("mapZoneToolbar").innerHTML=nav;
  document.getElementById("zoneMap").innerHTML=markers;
  if(satellite3DMap)updateSatellite3DMarkers(u);
  else ensureSatellite3DMap();
}
let satellite3DMap=null,satellite3DLoading=false,satellite3DMarkers=[],satellite3DZone=null;
function updateSatellite3DMarkers(u){
  if(!satellite3DMap)return;
  satellite3DMap.resize();
  satellite3DMarkers.forEach(marker=>marker.remove());
  satellite3DMarkers=[];
  const Marker=satellite3DMap._eluMarkerClass;
  if(activeMapZone==="all"){
    Object.keys(ZONE_BLOCKS).forEach(z=>{
      const points=ZONE_BLOCKS[z].map(b=>BLOCK_MAP_LOCATION[b]);
      const lat=points.reduce((n,p)=>n+p[0],0)/points.length,lon=points.reduce((n,p)=>n+p[1],0)/points.length;
      const button=document.createElement("button");
      button.type="button";button.className="satellite-map-marker satellite-zone-marker";
      button.dataset.mapZone=z;button.textContent=`ZONE ${z}`;button.setAttribute("aria-label",`Show Zone ${z} blocks`);
      satellite3DMarkers.push(new Marker({element:button,anchor:"bottom"}).setLngLat([lon,lat]).addTo(satellite3DMap));
    });
  }else{
    ZONE_BLOCKS[activeMapZone].forEach(b=>{
      const [lat,lon,street]=BLOCK_MAP_LOCATION[b],button=document.createElement("button");
      button.type="button";button.className="satellite-map-marker satellite-block-marker";
      button.dataset.mapZone=activeMapZone;button.dataset.mapBlock=b;
      button.textContent=`BLK ${b}`;button.title=`Open Blk ${b} · ${street}`;
      button.setAttribute("aria-label",`Open Block ${b} in Zone ${activeMapZone}`);
      satellite3DMarkers.push(new Marker({element:button,anchor:"bottom"}).setLngLat([lon,lat]).addTo(satellite3DMap));
    });
  }
  if(satellite3DZone!==activeMapZone){
    const blocks=activeMapZone==="all"?Object.values(ZONE_BLOCKS).flat():ZONE_BLOCKS[activeMapZone];
    const points=blocks.map(b=>BLOCK_MAP_LOCATION[b]);
    const west=Math.min(...points.map(p=>p[1])),east=Math.max(...points.map(p=>p[1]));
    const south=Math.min(...points.map(p=>p[0])),north=Math.max(...points.map(p=>p[0]));
    satellite3DMap.fitBounds([[west,south],[east,north]],{
      padding:activeMapZone==="all"?18:12,maxZoom:activeMapZone==="all"?17.15:18.5,
      pitch:0,bearing:0,duration:satellite3DZone===null?0:650,linear:true
    });
    satellite3DZone=activeMapZone;
  }
}
async function ensureSatellite3DMap(){
  const container=document.getElementById("satellite3DMap");
  if(satellite3DMap||satellite3DLoading||!container||!container.clientWidth)return;
  satellite3DLoading=true;
  try{
    const maplibregl=await import("https://unpkg.com/maplibre-gl@6.13.0/dist/maplibre-gl.mjs");
    const map=new maplibregl.Map({
      container,center:[ZONE_MAP_CENTER[1],ZONE_MAP_CENTER[0]],zoom:16.6,pitch:0,bearing:0,
      maxPitch:70,antialias:true,attributionControl:true,
      style:{version:8,sources:{
        imagery:{type:"raster",tiles:["https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],tileSize:256,attribution:"Imagery © Esri, Maxar, Earthstar Geographics and the GIS User Community"}
      },layers:[
        {id:"satellite-imagery",type:"raster",source:"imagery"}
      ]}
    });
    map._eluMarkerClass=maplibregl.Marker;
    map.addControl(new maplibregl.NavigationControl({showCompass:false}),"top-right");
    map.on("load",()=>{
      satellite3DMap=map;
      document.getElementById("zoneMapPanel").classList.add("has-satellite-3d");
      updateSatellite3DMarkers(unitsArray());
      map.resize();
    });
    map.on("error",e=>{console.warn("Satellite 3D map:",e.error||e)});
  }catch(error){
    console.warn("Satellite 3D unavailable; keeping satellite map.",error);
  }
}
let zoneMapResizeTimer;
window.addEventListener("resize",()=>{clearTimeout(zoneMapResizeTimer);zoneMapResizeTimer=setTimeout(()=>renderZoneMap(unitsArray()),140)});
function renderDashboard(){
  const u=unitsArray(),rows=buildReportRows("all","all"),rt=reportTotals(rows),total=rt.total,agree=rt.agree,p=rt.p,d=rt.d,nr=rt.nr,done=rt.done;
  const c=rows.reduce((sum,r)=>sum+(blockHasFieldActivity(r.block,getBlockUnits(r.block))?getBlockUnits(r.block).filter(x=>x.response==="C").length:0),0);
  const noResponse=nr+p,openFollowups=upcomingSurveyVisits().length,donePct=total?Math.round(done/total*100):0;
  document.getElementById("heroTotalUnits").textContent=total.toLocaleString();const tag=document.getElementById("heroTagUnits");if(tag)tag.textContent=`${total.toLocaleString()} Units`;const orbit=document.getElementById("heroOrbit");if(orbit)orbit.style.setProperty("--pct",`${donePct*3.6}deg`);const orbitText=document.getElementById("heroCompletionPct");if(orbitText)orbitText.textContent=`${donePct}%`;
  document.getElementById("kpiOptIn").textContent=agree.toLocaleString();document.getElementById("kpiOptInPct").textContent=`${total?Math.round(agree/total*100):0}% · A + C`;
  document.getElementById("kpiAppointments").textContent=c.toLocaleString();
  document.getElementById("kpiPending").textContent=p.toLocaleString();
  document.getElementById("kpiCompleted").textContent=done.toLocaleString();document.getElementById("kpiCompletedPct").textContent=`${donePct}% project`;
  document.getElementById("kpiNR").textContent=noResponse.toLocaleString();document.getElementById("kpiOptOut").textContent=d.toLocaleString();document.getElementById("kpiFollowups").textContent=openFollowups.toLocaleString();
  document.getElementById("zoneProgress").innerHTML=Object.keys(ZONE_BLOCKS).map(z=>{const zu=u.filter(x=>x.zone===Number(z)),zc=zu.filter(x=>x.workStatus==="Completed").length,za=zu.filter(x=>x.response==="A"||x.response==="C").length,zp=zu.filter(x=>x.response==="P").length,pct=zu.length?Math.round(zc/zu.length*100):0;return`<div class="zone-line"><div><div><div class="zone-name">Zone ${z}</div><div class="zone-pct">${pct}% complete</div></div><div class="zone-mini">${zc}/${zu.length}<br>${za} opt-in · ${zp} pending</div></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div>`}).join("");
  renderZoneMap(u);
  const upcoming=state.appointments.filter(x=>!isInactiveSchedule(x)&&x.workStatus!=="Completed"&&!appointmentHasEnded(x)&&x.date>=isoTodaySG()).sort((a,b)=>a.date.localeCompare(b.date)||slotStartMinutes(a.slot)-slotStartMinutes(b.slot)||Number(a.block)-Number(b.block)).slice(0,6);
  document.getElementById("upcomingAppointments").innerHTML=upcoming.length?upcoming.map(x=>`<div class="compact-item"><div><strong>Blk ${x.block} · ${esc(x.unitDisplay)}</strong><span>${esc(getUnit(x.unitKey)?.ownerName||"Owner not entered")} · ${esc(x.team||"Unassigned")}</span></div><small>C · ${safeDate(x.date)}<br>${esc(x.slot)}</small></div>`).join(""):`<div class="empty-state">No upcoming confirmations.</div>`;
  const follow=upcomingSurveyVisits().slice(0,6);
  document.getElementById("followupAttention").innerHTML=follow.length?follow.map(s=>`<div class="attention-card"><strong>Blk ${s.block} · ${esc(s.unitDisplay)}</strong><span>${esc(s.ownerName||"Name not entered")} · ${esc(s.contact||"No contact")}</span><b>${safeDate(s.visitDate)}${s.visitTime?` · ${esc(s.visitTime)}`:""}</b></div>`).join(""):`<div class="empty-state">No upcoming survey visits.</div>`;
  renderTodayTeamBoard();
}
let selectedBoardUnitKey="";
function classicBlockBoardHtml(units,floorFilter,q){
  const floors=[...new Set(units.map(x=>x.floor))].sort((a,b)=>b-a).filter(f=>floorFilter==="all"||Number(floorFilter)===f);
  return floors.map(f=>{const fu=units.filter(x=>x.floor===f).filter(x=>!q||unitDisplay(x.floor,x.unit).toLowerCase().includes(q)||String(x.unit).includes(q));if(!fu.length)return"";return`<div class="floor-row"><div class="floor-label"><strong>${f}</strong><span>Floor</span></div><div class="unit-grid">${fu.map(x=>{const sc=x.response==="A"?"status-a":x.response==="C"?"status-c":x.response==="P"?"status-p":x.response==="D"?"status-out":x.response==="NR"?"status-nr":"";const dateLine=x.appointmentDate&&(x.response==="A"||x.response==="C")?`<div class="u-date ${x.response==="A"?"done-date":"appt-date"}"><span>${x.response==="A"?"Done":"Appt"}</span>${esc(shortBoardDate(x.appointmentDate))}</div>`:"";const pendingIcon=x.response==="P"?'<span class="pending-inline-icon">◷</span>':"";return`<button class="unit-card ${sc}" data-unit-key="${x.key}"><div class="u-no">${unitDisplay(x.floor,x.unit)}</div><div class="u-status">${pendingIcon}${esc(statusLabel(x.response))}</div>${dateLine}</button>`}).join("")}</div></div>`}).join("")||`<div class="empty-state">No units match this filter.</div>`;
}
function renderBlockBoard(){
  const block=Number(document.getElementById("boardBlock").value),floorFilter=document.getElementById("boardFloor").value,q=document.getElementById("boardSearch").value.trim().toLowerCase(),raw=getBlockUnits(block);
  const zone=Number(document.getElementById("boardZone").value)||Number(PROJECT_LAYOUT[block]?.zone||0);
  const zoneBlocks=ZONE_BLOCKS[zone]||[];
  const zoneUnits=zoneBlocks.flatMap(b=>getBlockUnits(b)).map(x=>{const live=currentUnitAppointmentState(x.key);return{...x,response:live.status,workStatus:live.workStatus}});
  const zTotal=zoneUnits.length,zOptIn=zoneUnits.filter(x=>x.response==="A"||x.response==="C").length,zAppointments=zoneUnits.filter(x=>x.response==="C").length,zPending=zoneUnits.filter(x=>x.response==="P").length,zCompleted=zoneUnits.filter(x=>x.workStatus==="Completed").length,zOptOut=zoneUnits.filter(x=>x.response==="D").length,zNR=zoneUnits.filter(x=>x.response==="NR"||x.response==="P").length,zVisits=state.surveys.filter(v=>Number(v.zone||zoneOfBlock(v.block))===zone).length,zPct=n=>zTotal?Math.round(n/zTotal*100):0;
  const zh=document.getElementById("zoneHeadline");
  if(zh)zh.innerHTML=`<div class="zone-summary-title"><span>ZONE ${zone} SUMMARY</span><strong>${zoneBlocks.map(b=>`Blk ${b}`).join(" · ")}</strong><small>Live Block Board totals</small></div><div class="zone-summary-grid"><div class="zone-summary-tile total"><span>Total Units</span><strong>${zTotal}</strong><small>100%</small></div><div class="zone-summary-tile optin"><span>Opt-In · A + C</span><strong>${zOptIn}</strong><small>${zPct(zOptIn)}%</small></div><div class="zone-summary-tile appt"><span>Appointments · C</span><strong>${zAppointments}</strong><small>${zPct(zAppointments)}%</small></div><div class="zone-summary-tile pending"><span>Pending · P</span><strong>${zPending}</strong><small>${zPct(zPending)}%</small></div><div class="zone-summary-tile completed"><span>Completed</span><strong>${zCompleted}</strong><small>${zPct(zCompleted)}%</small></div><div class="zone-summary-tile nr"><span>NR · P + NR</span><strong>${zNR}</strong><small>${zPct(zNR)}%</small></div><div class="zone-summary-tile optout"><span>Opt-Out · D</span><strong>${zOptOut}</strong><small>${zPct(zOptOut)}%</small></div><div class="zone-summary-tile visits"><span>Total Visits</span><strong>${zVisits}</strong><small>Register</small></div></div>`;
  const u=raw.map(x=>{const live=currentUnitAppointmentState(x.key),a=live.appointment;return{...x,response:live.status,workStatus:live.workStatus,appointmentDate:a?.date||"",appointmentSlot:a?.slot||"",team:a?.team||""}});
  const total=u.length,a=u.filter(x=>x.response==="A").length,c=u.filter(x=>x.response==="C").length,p=u.filter(x=>x.response==="P").length,d=u.filter(x=>x.response==="D").length,nr=u.filter(x=>x.response==="NR").length,pct=n=>total?Math.round(n/total*100):0;
  document.getElementById("blockHeadline").innerHTML=`<div class="block-title-wrap"><span class="block-zone-tag">ZONE ${PROJECT_LAYOUT[block].zone}</span><h2>Block ${block}</h2><p>${total} exact project units · live appointment status</p></div><div class="block-summary-grid"><div class="summary-tile total"><span>Total Units</span><strong>${total}</strong><small>100%</small></div><div class="summary-tile a"><span>A · Opt-In</span><strong>${a}</strong><small>${pct(a)}%</small></div><div class="summary-tile c"><span>C · Confirmed</span><strong>${c}</strong><small>${pct(c)}%</small></div><div class="summary-tile p"><span>◷ P · Pending</span><strong>${p}</strong><small>${pct(p)}%</small></div><div class="summary-tile d"><span>D · Opt-Out</span><strong>${d}</strong><small>${pct(d)}%</small></div><div class="summary-tile nr"><span>NR · No Response</span><strong>${nr}</strong><small>${pct(nr)}%</small></div></div>`;
  const floors=[...new Set(u.map(x=>x.floor))].sort((a,b)=>b-a).filter(f=>floorFilter==="all"||Number(floorFilter)===f);
  document.getElementById("floorBoard").innerHTML=floors.map(f=>{const fu=u.filter(x=>x.floor===f).filter(x=>!q||unitDisplay(x.floor,x.unit).toLowerCase().includes(q)||String(x.unit).includes(q));if(!fu.length)return"";return`<div class="floor-row"><div class="floor-label"><strong>${f}</strong><span>Floor</span></div><div class="unit-grid">${fu.map(x=>{const sc=x.response==="A"?"status-a":x.response==="C"?"status-c":x.response==="P"?"status-p":x.response==="D"?"status-out":x.response==="NR"?"status-nr":"";const dateLine=x.appointmentDate&&(x.response==="A"||x.response==="C")?`<div class="u-date ${x.response==="A"?"done-date":"appt-date"}"><span>${x.response==="A"?"Done":"Appt"}</span>${esc(shortBoardDate(x.appointmentDate))}</div>`:"";const pendingIcon=x.response==="P"?'<span class="pending-inline-icon">◷</span>':"";return`<button class="unit-card ${sc}" data-unit-key="${x.key}"><div class="u-no">${unitDisplay(x.floor,x.unit)}</div><div class="u-status">${pendingIcon}${esc(statusLabel(x.response))}</div>${dateLine}</button>`}).join("")}</div></div>`}).join("")||`<div class="empty-state">No units match this filter.</div>`;
}
document.getElementById("floorBoard").addEventListener("click",e=>{const b=e.target.closest("[data-unit-key]");if(b)openDrawer(b.dataset.unitKey)});

function latestAppointment(key){return preferredMasterAppointment(key)||latestById(state.appointments.filter(a=>a.unitKey===key&&!isInactiveSchedule(a)))}
let unit360PhotoUrls=[];
let unit360RenderToken=0;
function clearUnit360Photos(){unit360PhotoUrls.forEach(URL.revokeObjectURL);unit360PhotoUrls=[]}
function openDrawer(key){
  const u=getUnit(key);if(!u)return;const a=latestAppointment(key);
  ++unit360RenderToken;clearUnit360Photos();
  document.getElementById("drawerUnitKey").value=key;document.getElementById("drawerUnitTitle").textContent=`Blk ${u.block} · ${unitDisplay(u.floor,u.unit)}`;document.getElementById("drawerUnitMeta").textContent=`Zone ${u.zone} · Floor ${u.floor}`;
  const survey=latestById(state.surveys.filter(s=>s.unitKey===key));
  const surveyVisit=survey?.visitDate?`${safeDate(survey.visitDate)}${survey.visitTime?` · ${survey.visitTime}`:""}`:"—";
  document.getElementById("drawerStatusText").textContent=statusLabel(u.response);document.getElementById("drawerOwnerText").textContent=u.ownerName||"—";document.getElementById("drawerContactText").textContent=u.contact||"—";document.getElementById("drawerFollowupText").textContent=surveyVisit;document.getElementById("drawerRemarksText").textContent=u.remarks||"—";document.getElementById("drawerAppointmentText").textContent=u.appointmentDate?`${safeDate(u.appointmentDate)} · ${u.appointmentSlot}`:"—";document.getElementById("drawerTeamText").textContent=u.team||"—";
  const legacy=document.getElementById("drawerLegacy"),txt=[u.legacySchedule&&`Imported schedule: ${u.legacySchedule}`,u.legacyRemark&&`Imported Excel remark: ${u.legacyRemark}`].filter(Boolean).join("<br>");legacy.innerHTML=txt;legacy.classList.toggle("show",!!txt);
  renderUnit360(key);
  document.getElementById("drawerBackdrop").classList.add("open");document.getElementById("unitDrawer").classList.add("open");
}
function unit360Rows(target,rows,format){
  document.getElementById(target).innerHTML=rows.length?rows.slice(0,12).map(format).join(""):'<p class="unit360-empty">No record for this unit.</p>'
}
function renderUnit360(key){
  const token=unit360RenderToken;
  const date=v=>esc(safeDate(v)||v||"—"),line=(title,detail)=>`<div class="unit360-row"><strong>${esc(title)}</strong><span>${esc(detail||"—")}</span></div>`;
  unit360Rows("drawerAppointmentsHistory",state.appointments.filter(x=>x.unitKey===key).sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))||Number(b.id)-Number(a.id)),x=>line(`${safeDate(x.date)||x.date||"—"} · ${x.slot||"—"}`,`${x.team||"Team —"} · ${x.scheduleState||"Active"} · ${x.workStatus||"Pending"}`));
  unit360Rows("drawerSurveysHistory",state.surveys.filter(x=>x.unitKey===key).sort((a,b)=>Number(b.id)-Number(a.id)),x=>line(`${safeDate(x.visitDate||x.followUpDate)||"—"} · ${x.visitTime||"—"}`,x.remarks||"Survey visit"));
  unit360Rows("drawerComplaintsHistory",state.complaints.filter(x=>x.unitKey===key).sort((a,b)=>Number(b.id)-Number(a.id)),x=>line(`${safeDate(x.date)||"—"} · ${x.status||"—"}`,x.complaint||x.remarks||"Complaint"));
  unit360Rows("drawerStatusHistory",(state.statusAudit||[]).filter(x=>x.unitKey===key).slice().reverse(),x=>line(`${x.to?statusLabel(x.to):x.action||"Decision"} · ${x.at?new Date(x.at).toLocaleDateString("en-SG"):"—"}`,x.detail||x.action||x.source||"—"));
  const el=document.getElementById("drawerPhotoSummary");el.textContent="Loading photos…";
  Promise.all([photoDbAll("photos"),photoDbAll("schedule")]).then(([photos,schedule])=>{
    if(token!==unit360RenderToken||document.getElementById("drawerUnitKey").value!==key||!document.getElementById("unitDrawer").classList.contains("open"))return;
    const items=photos.filter(p=>p.unitKey===key),visits=schedule.filter(s=>s.unitKey===key);
    const latest=items.slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))||Number(b.order||0)-Number(a.order||0)).slice(0,3);
    const thumbnails=latest.filter(p=>p.blob instanceof Blob).map(p=>{const url=URL.createObjectURL(p.blob);unit360PhotoUrls.push(url);return `<img src="${url}" alt="Stored unit photo from ${esc(safeDate(p.date)||p.date||"unknown date")}" loading="lazy">`}).join("");
    el.innerHTML=`<div class="unit360-row"><strong>${items.length} stored photo${items.length===1?"":"s"}</strong><span>${visits.length} photo register date${visits.length===1?"":"s"}${items.length?` · Latest ${date(items.map(p=>p.date).sort().at(-1))}`:""}</span></div>${thumbnails?`<div class="unit360-photos">${thumbnails}</div>`:""}`
  }).catch(()=>{if(token===unit360RenderToken&&document.getElementById("drawerUnitKey").value===key)el.textContent="Photo register unavailable on this browser."})
}
function closeDrawer(){++unit360RenderToken;document.getElementById("drawerBackdrop").classList.remove("open");document.getElementById("unitDrawer").classList.remove("open");clearUnit360Photos()}
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
let surveyRecentOnly=true;
document.getElementById("surveyShowAllBtn").addEventListener("click",()=>{surveyRecentOnly=!surveyRecentOnly;renderSurveyTable()});
document.getElementById("surveyZoneFilter").addEventListener("change",renderSurveyTable);
function surveyHasLaterAppointment(s){
  return state.appointments.some(a=>a.unitKey===s.unitKey&&Number(a.id)>Number(s.id)&&Boolean(a.date)&&!isInactiveSchedule(a))
}
function upcomingSurveyVisits(zone="all"){
  const today=isoTodaySG();
  return state.surveys.filter(s=>(zone==="all"||Number(s.zone||zoneOfBlock(s.block))===Number(zone))&&(s.visitDate||s.followUpDate||"")>=today&&!surveyHasLaterAppointment(s))
    .sort((a,b)=>(a.visitDate||a.followUpDate||"").localeCompare(b.visitDate||b.followUpDate||"")||String(a.visitTime||"").localeCompare(String(b.visitTime||""))||Number(a.block)-Number(b.block))
}
function renderSurveyTable(){
  const today=isoTodaySG(),zone=document.getElementById("surveyZoneFilter").value,all=state.surveys.filter(s=>zone==="all"||Number(s.zone||zoneOfBlock(s.block))===Number(zone));
  const upcoming=upcomingSurveyVisits(zone);
  const history=all.filter(s=>!upcoming.includes(s)).sort((a,b)=>(b.visitDate||b.followUpDate||"").localeCompare(a.visitDate||a.followUpDate||"")||String(b.visitTime||"").localeCompare(String(a.visitTime||"")));
  const r=surveyRecentOnly?upcoming:[...upcoming,...history];
  document.getElementById("surveyShowAllBtn").textContent=surveyRecentOnly?"Show all":"Upcoming only";
  document.getElementById("surveyScopeNote").textContent=surveyRecentOnly?`${r.length} upcoming survey visit${r.length===1?"":"s"} without a later appointment. Past and booked visits are in Show all.`:`All ${all.length} survey visits shown, including past and booked visits.`;
  document.getElementById("surveyTable").innerHTML=r.length?`<table><thead><tr><th>Visit Date</th><th>Time</th><th>Block / Unit</th><th>Owner</th><th>Contact</th><th>Visit Note</th><th>Latest Appointment</th><th>Action</th></tr></thead><tbody>${r.map(s=>{const vd=s.visitDate||s.followUpDate||"";return`<tr><td><strong>${safeDate(vd)||"—"}</strong></td><td>${esc(s.visitTime||"—")}</td><td>Blk ${s.block}<br><strong>${esc(s.unitDisplay)}</strong></td><td>${esc(s.ownerName||"—")}</td><td>${esc(s.contact||"—")}</td><td>${esc(s.remarks||"—")}</td><td>${(()=>{const a=latestAppointment(s.unitKey);return a?.date?`<strong>${esc(safeDate(a.date))}</strong><br>${esc(a.slot||"—")}<br><small>${esc(a.workStatus==="Completed"?"Completed":a.scheduleState||"Active")}</small>`:"—"})()}</td><td><div class="action-set"><button class="table-action" data-survey-book="${s.id}">Appointment</button><button class="table-action" data-survey-edit="${s.id}">Edit</button><button class="table-action delete" data-survey-delete="${s.id}">Delete</button></div></td></tr>`}).join("")}</tbody></table>`:`<div class="empty-state">${surveyRecentOnly?"No survey visits scheduled from today onward. Use Show all for past records.":"No survey visits recorded."}</div>`
}
function printSurveyRegister(mode){
  const zone=document.getElementById("surveyZoneFilter").value;
  const selectedDate=document.getElementById("surveyPrintDate").value;
  if(mode==="date"&&!selectedDate){toast("Choose a survey print date");return}
  const all=state.surveys.filter(s=>zone==="all"||Number(s.zone||zoneOfBlock(s.block))===Number(zone));
  const visits=(mode==="upcoming"?upcomingSurveyVisits(zone):mode==="date"?all.filter(s=>(s.visitDate||s.followUpDate||"")===selectedDate):all)
    .slice().sort((a,b)=>(a.visitDate||a.followUpDate||"").localeCompare(b.visitDate||b.followUpDate||"")||Number(a.zone||zoneOfBlock(a.block))-Number(b.zone||zoneOfBlock(b.block))||Number(a.block)-Number(b.block)||String(a.visitTime||"").localeCompare(String(b.visitTime||""))||Number(a.floor)-Number(b.floor)||Number(a.unit)-Number(b.unit));
  if(!visits.length){toast(mode==="date"?"No survey visits on this date":mode==="full"?"No survey visits to print":"No upcoming survey visits to print");return}
  const scope=zone==="all"?"All Zones":`Zone ${zone}`;
  const printScope=mode==="date"?`Survey date ${safeDate(selectedDate)}`:mode==="full"?"Full register":"Upcoming visits";
  const blockColors=[
    {ink:"#155a99",tint:"#e5f1ff"},{ink:"#a34e13",tint:"#fff0df"},
    {ink:"#7041a1",tint:"#f2eaff"},{ink:"#087369",tint:"#def6ee"},
    {ink:"#a72d58",tint:"#ffe7ef"},{ink:"#786012",tint:"#fff5d4"},
    {ink:"#16647f",tint:"#e0f5fb"}
  ];
  const perPage=16,groups=[];
  for(let i=0;i<visits.length;i+=perPage)groups.push(visits.slice(i,i+perPage));
  const pages=groups.map((group,page)=>{
    const rows=group.map((s,i)=>{
      const z=String(s.zone||zoneOfBlock(s.block)),blockIndex=(ZONE_BLOCKS[z]||[]).indexOf(Number(s.block));
      const color=blockColors[(blockIndex<0?Number(s.block):blockIndex)%blockColors.length];
      return `<tr><td>${page*perPage+i+1}</td><td class="block-cell" style="--block-color:${color.ink};--block-tint:${color.tint}"><strong>Zone ${esc(z)} · Blk ${esc(s.block)}</strong></td><td><strong>${esc(s.unitDisplay)}</strong></td><td>${esc(safeDate(s.visitDate||s.followUpDate||""))}<br>${esc(s.visitTime||"")}</td><td>${esc(s.ownerName||"")}</td><td>${esc(s.contact||"")}</td><td></td></tr>`
    }).join("");
    return `<section class="sheet"><header><h1>ELU · SURVEY VISIT REGISTER</h1><div class="meta"><span>${esc(scope)} · ${esc(printScope)} · ${visits.length} visits</span><span>Printed ${esc(safeDate(isoTodaySG()))} · Page ${page+1}/${groups.length}</span></div></header><table><thead><tr><th>S/N</th><th>ZONE / BLOCK</th><th>UNIT</th><th>SURVEY DATE / TIME</th><th>OWNER</th><th>CONTACT</th><th>APPOINTMENT DATE / TIME</th></tr></thead><tbody>${rows}</tbody></table></section>`
  }).join("");
  const win=window.open("","_blank","width=1200,height=900");if(!win){toast("Allow pop-ups to print Survey Register");return}
  const printCss=`
    @page{size:A4 landscape;margin:10mm}
    *{box-sizing:border-box}
    html,body{width:auto;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;color:#14283e;background:#fff}
    .sheet{width:274mm;max-width:100%;margin:0 auto;break-after:page;page-break-after:always}
    .sheet:last-child{break-after:auto;page-break-after:auto}
    header{background:#174f89;color:#fff;border:1px solid #103e70;border-radius:5px;padding:7px 10px;margin-bottom:8px}
    h1{text-align:center;font-size:19px;letter-spacing:.03em;color:#fff;margin:0 0 5px;font-weight:900}
    .meta{display:flex;justify-content:space-between;gap:10px;color:#f0f8ff;font-size:11px;font-weight:800}
    table{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;font-size:12px;border:1.5px solid #4b6d8d}
    th,td{border:0;border-right:1px solid #6285a6;border-bottom:1px solid #6285a6;text-align:left;vertical-align:middle;padding:4px 5px;overflow-wrap:anywhere;background:#fff}
    tr>:last-child{border-right:0}tbody tr:last-child td{border-bottom:0}
    th{height:9mm;background:#d4e8fa;color:#103e70;font-size:11px;font-weight:900}
    td{height:9.5mm;color:#102c47;font-weight:650}
    .block-cell{border-left:5px solid var(--block-color);background:var(--block-tint);color:var(--block-color);font-weight:900}
    th:nth-child(1){width:6%}th:nth-child(2){width:15%}th:nth-child(3){width:10%}
    th:nth-child(4){width:17%}th:nth-child(5){width:17%}th:nth-child(6){width:17%}th:nth-child(7){width:18%}
    thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}
    @media print{header,th,.block-cell{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  `;
  win.document.open();win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>ELU Survey Register · ${esc(scope)} · ${esc(printScope)}</title><style>${printCss}</style></head><body>${pages}<script>onload=()=>setTimeout(()=>print(),300)<\/script></body></html>`);win.document.close()
}
document.getElementById("surveyPrintBtn").addEventListener("click",()=>printSurveyRegister("upcoming"));
document.getElementById("surveyPrintDateBtn").addEventListener("click",()=>printSurveyRegister("date"));
document.getElementById("surveyPrintFullBtn").addEventListener("click",()=>printSurveyRegister("full"));
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
    schedule:live.active?"Active":live.completed?"Completed":live.status==="A"?"Opt-In":live.status==="D"?"Opt-Out":live.status==="P"?"Pending Confirmation":"No Appointment",
    scheduleClass:live.active?"confirmed":live.completed?"completed":live.status==="A"?"a":live.status==="D"?"d":live.status==="P"?"p":"pending",
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

function complaintEvents(c){return Array.isArray(c.visits)&&c.visits.length?c.visits:[{id:`legacy-${c.id}`,date:c.date||"",time:"",outcome:c.status||"Open",action:c.remarks||"Complaint recorded",attendedBy:"",appointmentDate:"",legacy:true}]}
function complaintOrderForUnit(key){return state.complaints.filter(c=>c.unitKey===key).sort((a,b)=>(a.date||"").localeCompare(b.date||"")||Number(a.id)-Number(b.id))}
function isComplaintOpening(v){return String(v.id).startsWith("opened-")||String(v.id).startsWith("legacy-")}
function visitOrderForUnit(key){return complaintOrderForUnit(key).flatMap(c=>complaintEvents(c).filter(v=>!isComplaintOpening(v)).map(v=>({caseId:c.id,...v}))).sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.time||"").localeCompare(b.time||"")||String(a.id).localeCompare(String(b.id)))}
function complaintLatest(c){return [...complaintEvents(c)].sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.time||"").localeCompare(a.time||"")||String(b.id).localeCompare(String(a.id)))[0]}
function complaintState(c){return complaintLatest(c)?.outcome||c.status||"Open"}
function resetComplaintForm(){document.getElementById("complaintEditId").value="";document.getElementById("complaintSaveBtn").textContent="Save Complaint";document.getElementById("complaintCancelEdit").classList.add("hidden");document.getElementById("complaintText").value="";document.getElementById("complaintRemarks").value="";document.getElementById("complaintPhotos").value="";document.getElementById("complaintDate").value=isoTodaySG();document.getElementById("complaintStatus").value="Open";document.getElementById("complaintSource").value="Resident / Owner";document.getElementById("complaintType").value="";autofillPair("complaint")}
document.getElementById("complaintCancelEdit").addEventListener("click",()=>{resetComplaintForm();document.getElementById("complaintEntryPanel").classList.add("hidden")});
document.getElementById("complaintNewBtn").addEventListener("click",()=>{resetComplaintForm();document.getElementById("complaintEntryPanel").classList.remove("hidden");document.getElementById("complaintEntryPanel").scrollIntoView({behavior:"smooth",block:"start"})});
document.getElementById("complaintForm").addEventListener("submit",async e=>{
  e.preventDefault();const key=document.getElementById("complaintUnit").value,u=getUnit(key);if(!u)return;const id=Number(document.getElementById("complaintEditId").value)||Date.now();
  const idx=state.complaints.findIndex(c=>c.id===id),old=idx>=0?state.complaints[idx]:null;
  if(old&&old.unitKey!==key){toast("This complaint belongs to its original unit; open a new complaint for another unit");return}
  const date=document.getElementById("complaintDate").value,status=document.getElementById("complaintStatus").value,remarks=document.getElementById("complaintRemarks").value.trim();
  const visits=old?complaintEvents(old).map(v=>({...v})):[];
  if(!old)visits.push({id:`opened-${id}`,date,time:"",outcome:status,action:remarks||"Complaint received",attendedBy:"",appointmentDate:""});
  else if(visits.length===1){visits[0].date=date;visits[0].outcome=status;visits[0].action=remarks||visits[0].action}
  const entry={...old,id,unitKey:key,zone:u.zone,block:u.block,floor:u.floor,unit:u.unit,unitDisplay:unitDisplay(u.floor,u.unit),ownerName:u.ownerName,contact:u.contact,date,status:visits.length>1?complaintState({...old,visits}):status,complaint:document.getElementById("complaintText").value.trim(),remarks,source:document.getElementById("complaintSource").value,type:document.getElementById("complaintType").value,visits};
  const files=[...document.getElementById("complaintPhotos").files],button=document.getElementById("complaintSaveBtn"),stored=[];button.disabled=true;
  try{
    for(const file of files){if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw new Error("Unsupported photo format");const p={id:`complaint-${Date.now()}-${Math.random().toString(36).slice(2)}`,caseId:id,visitId:`opened-${id}`,unitKey:key,date,name:file.name,blob:file};await photoDbPut("complaintPhotos",p);stored.push(p.id)}
    if(idx>=0)state.complaints[idx]=entry;else state.complaints.push(entry);
    resetComplaintForm();document.getElementById("complaintEntryPanel").classList.add("hidden");save(idx>=0?"Complaint updated":"Complaint recorded");openComplaintHistory(id)
  }catch(error){for(const photoId of stored)await photoDbDelete("complaintPhotos",photoId);console.error(error);toast("Complaint photo save failed; record unchanged")}finally{button.disabled=false}
});
function editComplaint(id){const c=state.complaints.find(x=>x.id===id);if(!c)return;setView("complaints");document.getElementById("complaintEntryPanel").classList.remove("hidden");document.getElementById("complaintZone").value=String(c.zone||zoneOfBlock(c.block));syncComplaintBlocks();document.getElementById("complaintBlock").value=String(c.block);syncPairUnits("complaint");document.getElementById("complaintUnit").value=c.unitKey;autofillPair("complaint");document.getElementById("complaintDate").value=c.date;document.getElementById("complaintStatus").value=complaintState(c);document.getElementById("complaintSource").value=c.source||"Resident / Owner";document.getElementById("complaintType").value=c.type||"Other";document.getElementById("complaintText").value=c.complaint;document.getElementById("complaintRemarks").value=c.remarks||"";document.getElementById("complaintEditId").value=String(c.id);document.getElementById("complaintSaveBtn").textContent="Update Complaint";document.getElementById("complaintCancelEdit").classList.remove("hidden");document.getElementById("complaintEntryPanel").scrollIntoView({behavior:"smooth",block:"start"})}
async function deleteComplaint(id){if(!confirm("Delete this complaint case and its visit photos?"))return;try{await photoDbDeleteWhere("complaintPhotos",p=>p.caseId===id);state.complaints=state.complaints.filter(x=>x.id!==id);if(activeComplaintCaseId===id)closeComplaintHistory();save("Complaint deleted")}catch(error){console.error(error);toast("Could not delete complaint photos")}}
let activeComplaintCaseId=null,complaintPhotoUrls=[];
function closeComplaintHistory(){activeComplaintCaseId=null;complaintPhotoUrls.forEach(URL.revokeObjectURL);complaintPhotoUrls=[];document.getElementById("complaintHistoryPanel").classList.add("hidden")}
document.getElementById("complaintHistoryClose").addEventListener("click",closeComplaintHistory);
function openComplaintHistory(id){activeComplaintCaseId=id;document.getElementById("complaintHistoryPanel").classList.remove("hidden");document.getElementById("complaintVisitCaseId").value=String(id);document.getElementById("complaintVisitForm").reset();document.getElementById("complaintVisitDate").value=isoTodaySG();renderComplaintHistory();document.getElementById("complaintHistoryPanel").scrollIntoView({behavior:"smooth",block:"start"})}
async function renderComplaintHistory(){
  const id=activeComplaintCaseId,c=state.complaints.find(x=>x.id===id);if(!c)return;
  const unitCases=complaintOrderForUnit(c.unitKey),unitVisits=visitOrderForUnit(c.unitKey),caseNumbers=new Map(unitCases.map((x,i)=>[x.id,i+1]));
  document.getElementById("complaintHistoryTitle").textContent=`Blk ${c.block} ${c.unitDisplay||unitDisplay(c.floor,c.unit)}`;
  document.getElementById("complaintHistorySummary").textContent=`${unitCases.length} complaint${unitCases.length===1?"":"s"} · ${unitVisits.length} visit${unitVisits.length===1?"":"s"} · Dates and photos retained`;
  document.getElementById("complaintVisitFormTitle").textContent=`Record a visit for Complaint ${caseNumbers.get(id)}`;
  complaintPhotoUrls.forEach(URL.revokeObjectURL);complaintPhotoUrls=[];
  try{
    const photos=(await photoDbAll("complaintPhotos")).filter(p=>p.unitKey===c.unitKey);
    if(activeComplaintCaseId!==id)return;
    const photoCards=(caseId,eventId,label)=>photos.filter(p=>p.caseId===caseId&&p.visitId===eventId).map(p=>{const url=URL.createObjectURL(p.blob);complaintPhotoUrls.push(url);return `<a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${label}" loading="lazy"></a>`}).join("");
    const detailText=(value,limit=160)=>{const t=String(value||"—");return t.length>limit?`<details class="complaint-read-more"><summary>${esc(t.slice(0,limit))}… <b>Read full note</b></summary><p>${esc(t)}</p></details>`:`<p class="complaint-card-text">${esc(t)}</p>`};
    const complaintColumn=unitCases.map((k,i)=>{
      const cp=photoCards(k.id,`opened-${k.id}`,`Complaint ${i+1} photo`);
      return `<article class="complaint-ledger-card ${k.id===id?"selected":""}"><div class="complaint-ledger-card-top"><b>Complaint ${i+1}</b><span class="pill ${complaintState(k)==="Closed"?"completed":"d"}">${esc(complaintState(k))}</span></div><small>${esc(safeDate(k.date))} · ${esc(k.type||"Other")} · ${esc(k.source||"Resident / Owner")}</small>${detailText(k.complaint)}${cp?`<div class="complaint-visit-images">${cp}</div>`:""}<div class="complaint-ledger-actions"><button type="button" class="table-action" data-case-followup="${k.id}">+ Visit for Complaint ${i+1}</button><button type="button" class="table-action" data-comp-edit="${k.id}">Edit</button></div></article>`
    }).join("");
    const visitColumn=unitVisits.map((v,i)=>{
      const vp=photoCards(v.caseId,v.id,`Visit ${i+1} photo`);
      return `<article class="complaint-ledger-card"><div class="complaint-ledger-card-top"><b>Visit ${i+1}</b><span class="pill ${v.outcome==="Closed"?"completed":"pending"}">${esc(v.outcome||"Open")}</span></div><small>${esc(safeDate(v.date))}${v.time?` · ${esc(v.time)}`:""} · For Complaint ${caseNumbers.get(v.caseId)}</small>${detailText(v.action,190)}${v.attendedBy?`<small>Attended by ${esc(v.attendedBy)}</small>`:""}${v.appointmentDate?`<small>Appointment ${esc(safeDate(v.appointmentDate))}</small>`:""}${vp?`<div class="complaint-visit-images">${vp}</div>`:""}</article>`
    }).join("");
    document.getElementById("complaintCaseTimeline").innerHTML=`<div class="complaint-ledger-toolbar"><button type="button" class="primary-btn" data-comp-new="${id}">+ New complaint for this unit</button></div><div class="complaint-ledger-columns"><section><h4>Resident complaints <span>${unitCases.length}</span></h4>${complaintColumn}</section><section><h4>Site visits & rectification <span>${unitVisits.length}</span></h4>${visitColumn||'<p class="complaint-no-visits">No visit recorded yet.</p>'}</section></div>`;
  }catch(error){console.error(error);document.getElementById("complaintCaseTimeline").textContent="Could not load complaint / visit photos."}
}
document.getElementById("complaintCaseTimeline").addEventListener("click",e=>{
  let edit=e.target.closest("[data-comp-edit]");if(edit){editComplaint(Number(edit.dataset.compEdit));return}
  let b=e.target.closest("[data-case-followup]");if(b){activeComplaintCaseId=Number(b.dataset.caseFollowup);document.getElementById("complaintVisitCaseId").value=b.dataset.caseFollowup;renderComplaintHistory();document.getElementById("complaintVisitForm").scrollIntoView({behavior:"smooth",block:"start"});return}
  b=e.target.closest("[data-comp-new]");if(!b)return;const c=state.complaints.find(x=>x.id===Number(b.dataset.compNew));if(!c)return;
  resetComplaintForm();document.getElementById("complaintEntryPanel").classList.remove("hidden");document.getElementById("complaintZone").value=String(c.zone);syncComplaintBlocks();document.getElementById("complaintBlock").value=String(c.block);syncPairUnits("complaint");document.getElementById("complaintUnit").value=c.unitKey;autofillPair("complaint");document.getElementById("complaintEntryPanel").scrollIntoView({behavior:"smooth",block:"start"})
});
document.getElementById("complaintVisitForm").addEventListener("submit",async e=>{
  e.preventDefault();const form=e.currentTarget,button=document.getElementById("complaintVisitSave"),id=Number(document.getElementById("complaintVisitCaseId").value),c=state.complaints.find(x=>x.id===id);if(!c)return;
  const date=document.getElementById("complaintVisitDate").value,action=document.getElementById("complaintVisitAction").value.trim();if(!date||!action)return;if(date<c.date){toast("Visit date cannot be before complaint date");return}
  const visit={id:`visit-${Date.now()}-${Math.random().toString(36).slice(2)}`,date,time:document.getElementById("complaintVisitTime").value,outcome:document.getElementById("complaintVisitOutcome").value,action,attendedBy:document.getElementById("complaintVisitBy").value.trim(),appointmentDate:document.getElementById("complaintVisitAppointment").value};
  const files=[...document.getElementById("complaintVisitPhotos").files];button.disabled=true;
  const stored=[];
  try{
    for(const file of files){if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw new Error("Select JPEG, PNG or WebP images only.");const p={id:`complaint-${Date.now()}-${Math.random().toString(36).slice(2)}`,caseId:id,visitId:visit.id,unitKey:c.unitKey,date,name:file.name,blob:file};await photoDbPut("complaintPhotos",p);stored.push(p.id)}
    c.visits=complaintEvents(c).map(v=>({...v}));c.visits.push(visit);c.status=complaintState(c);save("Visit added to complaint history");form.reset();document.getElementById("complaintVisitCaseId").value=String(id);document.getElementById("complaintVisitDate").value=isoTodaySG();await renderComplaintHistory();
  }catch(error){for(const photoId of stored)await photoDbDelete("complaintPhotos",photoId);console.error(error);toast("Visit could not be saved; previous records unchanged")}finally{button.disabled=false}
});
function renderComplaintTable(){
  const zf=document.getElementById("complaintZoneFilter").value,bf=document.getElementById("complaintBlockFilter").value;
  let cases=[...state.complaints];if(zf!=="all")cases=cases.filter(c=>Number(c.zone||zoneOfBlock(c.block))===Number(zf));if(bf!=="all")cases=cases.filter(c=>Number(c.block)===Number(bf));
  const grouped=new Map();for(const c of cases){if(!grouped.has(c.unitKey))grouped.set(c.unitKey,[]);grouped.get(c.unitKey).push(c)}
  const units=[...grouped.values()].map(rows=>{const ordered=rows.sort((a,b)=>(a.date||"").localeCompare(b.date||"")||a.id-b.id),latest=ordered.at(-1),visits=ordered.flatMap(c=>complaintEvents(c).filter(v=>!isComplaintOpening(v)));return {latest,ordered,visits}}).sort((a,b)=>(b.latest.date||"").localeCompare(a.latest.date||"")||a.latest.block-b.latest.block);
  const row=({latest:c,ordered,visits})=>{const open=ordered.filter(k=>complaintState(k)!=="Closed").length,summary=String(c.complaint||"—");return `<tr><td><strong>Zone ${esc(c.zone||zoneOfBlock(c.block))}</strong></td><td><button type="button" class="complaint-unit-link" data-comp-open="${c.id}">Blk ${esc(c.block)} <strong>${esc(c.unitDisplay||unitDisplay(c.floor,c.unit))}</strong></button></td><td><b>${ordered.length}</b></td><td><b>${visits.length}</b></td><td class="complaint-summary-cell" title="${esc(summary)}">${esc(summary.length>96?summary.slice(0,96)+"…":summary)}</td><td>${esc(safeDate(c.date))}</td><td><span class="pill ${open?"d":"completed"}">${open?`${open} Open`:"Closed"}</span></td><td><button class="table-action" data-comp-open="${c.id}">Open record</button></td></tr>`};
  const table=x=>`<div class="table-shell zone-table-shell complaint-register-shell"><table><thead><tr><th>Zone</th><th>Block / Unit</th><th>Complaints</th><th>Visits</th><th>Latest complaint</th><th>Latest date</th><th>Status</th><th>Record</th></tr></thead><tbody>${x.map(row).join("")}</tbody></table></div>`;
  if(!units.length){document.getElementById("complaintTable").innerHTML=`<div class="empty-state">No complaint records for this filter.</div>`;return}
  document.getElementById("complaintTable").innerHTML=(zf==="all"&&bf==="all")?`<div class="zone-record-stack">${[1,2,3,4,5,6].map(z=>[z,units.filter(x=>Number(x.latest.zone||zoneOfBlock(x.latest.block))===z)]).filter(([,x])=>x.length).map(([z,x])=>`<section class="zone-record-group">${zoneGroupHeader(z,x.length,"units")}${table(x)}</section>`).join("")}</div>`:table(units)
}
document.getElementById("complaintZoneFilter").addEventListener("change",()=>{const z=document.getElementById("complaintZoneFilter").value;document.getElementById("complaintBlockFilter").innerHTML=filterBlockOptions(z,true);renderComplaintTable()});
document.getElementById("complaintBlockFilter").addEventListener("change",renderComplaintTable);
document.getElementById("complaintTable").addEventListener("click",e=>{let b=e.target.closest("[data-comp-open]");if(b)return openComplaintHistory(Number(b.dataset.compOpen));b=e.target.closest("[data-comp-edit]");if(b)return editComplaint(Number(b.dataset.compEdit));b=e.target.closest("[data-comp-delete]");if(b)deleteComplaint(Number(b.dataset.compDelete))});

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

function blockHasFieldActivity(block,units){
  const keys=new Set(units.map(u=>u.key));
  if(state.surveys.some(s=>keys.has(s.unitKey))||
     state.appointments.some(a=>keys.has(a.unitKey))||
     state.complaints.some(c=>keys.has(c.unitKey))||
     Object.keys(state.statusOverrides||{}).some(key=>keys.has(key)))return true;
  const layout=PROJECT_LAYOUT[String(block)]||PROJECT_LAYOUT[block];
  return units.some(u=>{
    const seed=(layout?.seed||{})[`${u.floor}-${u.unit}`]||{};
    // A default NR label alone is not evidence that work has started.
    return ["A","C","P","D"].includes(normalizeStatus(seed.response))||
      Boolean(String(seed.ownerName||"").trim()||String(seed.contact||"").trim()||
              String(seed.legacySchedule||"").trim()||String(seed.legacyRemark||"").trim()||seed.completed);
  });
}
function buildReportRows(zoneFilter="all",blockFilter="all"){
  const rows=[];Object.keys(ZONE_BLOCKS).forEach(z=>{if(zoneFilter!=="all"&&String(z)!==String(zoneFilter))return;ZONE_BLOCKS[z].forEach(block=>{if(blockFilter!=="all"&&String(block)!==String(blockFilter))return;const u=getBlockUnits(block),started=blockHasFieldActivity(block,u),total=u.length,agree=started?u.filter(x=>x.response==="A"||x.response==="C").length:0,done=started?u.filter(x=>x.workStatus==="Completed").length:0,p=started?u.filter(x=>x.response==="P").length:0,d=started?u.filter(x=>x.response==="D").length:0,nr=started?u.filter(x=>x.response==="NR").length:0;rows.push({zone:Number(z),block,total,agree,agreePct:total?agree/total*100:0,done,donePct:total?done/total*100:0,p,pPct:total?p/total*100:0,d,dPct:total?d/total*100:0,nr,nrPct:total?nr/total*100:0})})});return rows
}
function reportTotals(rows){
  const t=rows.reduce((o,r)=>{o.total+=r.total;o.agree+=r.agree;o.done+=r.done;o.p+=r.p;o.d+=r.d;o.nr+=r.nr;return o},{total:0,agree:0,done:0,p:0,d:0,nr:0});
  return{...t,agreePct:t.total?t.agree/t.total*100:0,donePct:t.total?t.done/t.total*100:0,pPct:t.total?t.p/t.total*100:0,dPct:t.total?t.d/t.total*100:0,nrPct:t.total?t.nr/t.total*100:0}
}
function pct(v){return`${v.toFixed(1)}%`}
function meetingSheetHtml(rows){
  const t=reportTotals(rows),whole=v=>`${Math.round(v)}%`;
  const line=(r,i)=>`<tr><td>${i+1}</td><td class="sheet-block">${r.block}</td><td>${r.total}</td><td class="sheet-agree">${r.agree}</td><td class="sheet-agree">${whole(r.agreePct)}</td><td class="sheet-done">${r.done}</td><td class="sheet-done">${whole(r.donePct)}</td><td class="sheet-out">${r.d}</td><td class="sheet-out">${whole(r.dPct)}</td><td class="sheet-nr">${r.nr+r.p}</td><td class="sheet-nr">${r.total?whole((r.nr+r.p)/r.total*100):"0%"}</td></tr>`;
  return `<table class="meeting-sheet-table"><thead><tr><th rowspan="2">S/N</th><th rowspan="2">BLK NO.</th><th rowspan="2">TOTAL UNITS</th><th colspan="2">UNITS OPT-IN<br>(Agree)</th><th colspan="2">UNITS OPT-IN<br>(10mmsq Work Completed at site)</th><th colspan="2">UNITS OPT-OUT<br>(Disagree)</th><th colspan="2">UNITS NO RESPONSE</th></tr><tr><th>Number</th><th>%</th><th>Number</th><th>%</th><th>Number</th><th>%</th><th>Number</th><th>%</th></tr></thead><tbody>${rows.map(line).join("")}<tr class="meeting-sheet-total"><td colspan="2">TOTAL DU</td><td>${t.total}</td><td>${t.agree}</td><td>${t.total?whole(t.agree/t.total*100):"0%"}</td><td>${t.done}</td><td>${t.total?whole(t.done/t.total*100):"0%"}</td><td>${t.d}</td><td>${t.total?whole(t.d/t.total*100):"0%"}</td><td>${t.nr+t.p}</td><td>${t.total?whole((t.nr+t.p)/t.total*100):"0%"}</td></tr></tbody></table>`
}
function renderReport(){
  const z=document.getElementById("reportZoneFilter").value,b=document.getElementById("reportBlockFilter").value,rows=buildReportRows(z,b),t=reportTotals(rows);
  document.getElementById("reportSummaryCards").innerHTML=`<div class="report-mini-card"><span>Total Units</span><strong>${t.total}</strong></div><div class="report-mini-card"><span>Opt-In A+C</span><strong>${t.agree}</strong></div><div class="report-mini-card"><span>Completed</span><strong>${t.done}</strong></div><div class="report-mini-card pending-card"><span>Pending P</span><strong>${t.p}</strong></div><div class="report-mini-card"><span>Opt-Out D</span><strong>${t.d}</strong></div><div class="report-mini-card"><span>No Response NR + P</span><strong>${t.nr+t.p}</strong></div>`;
  document.getElementById("reportBlockChart").innerHTML=rows.length?`<div class="report-cluster-scroll"><div class="report-cluster-grid" style="--chart-total:${rows.length}">${rows.map(r=>{const vals=[["agree",r.agreePct],["done",r.donePct],["p",r.pPct],["d",r.dPct],["nr",r.nrPct]];return`<div class="report-cluster-group"><div class="report-cluster-bars">${vals.map(v=>`<div class="report-cluster-bar-wrap"><b style="bottom:calc(${Math.max(0,Math.min(100,v[1])).toFixed(1)}% + 6px)">${Math.round(v[1])}%</b><i class="report-cluster-bar ${v[0]}" style="height:${Math.max(0,Math.min(100,v[1])).toFixed(1)}%"></i></div>`).join("")}</div><strong>Blk ${r.block}</strong><span>${r.total} units</span></div>`}).join("")}</div></div>`:`<div class="empty-state">No blocks for this filter.</div>`;
  document.getElementById("meetingSheetScope").textContent=`${z==="all"?"All Zones":`Zone ${z}`}${b==="all"?"":` · Blk ${b}`}`;
  document.getElementById("meetingSheetTable").innerHTML=meetingSheetHtml(rows);
  document.getElementById("reportTable").innerHTML=`<table class="weekly-table"><thead><tr><th>S/N</th><th>BLK</th><th>TOTAL</th><th>A+C</th><th>A+C %</th><th>DONE</th><th>DONE %</th><th>P</th><th>P %</th><th>D</th><th>D %</th><th>NR</th><th>NR %</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td><strong>${r.block}</strong></td><td>${r.total}</td><td>${r.agree}</td><td>${pct(r.agreePct)}</td><td>${r.done}</td><td>${pct(r.donePct)}</td><td>${r.p}</td><td>${pct(r.pPct)}</td><td>${r.d}</td><td>${pct(r.dPct)}</td><td>${r.nr}</td><td>${pct(r.nrPct)}</td></tr>`).join("")}<tr class="total-row"><td colspan="2">TOTAL DU</td><td>${t.total}</td><td>${t.agree}</td><td>${pct(t.agreePct)}</td><td>${t.done}</td><td>${pct(t.donePct)}</td><td>${t.p}</td><td>${pct(t.pPct)}</td><td>${t.d}</td><td>${pct(t.dPct)}</td><td>${t.nr}</td><td>${pct(t.nrPct)}</td></tr></tbody></table>`;
  renderResponseSummary();
}
document.getElementById("reportZoneFilter").addEventListener("change",()=>{const z=document.getElementById("reportZoneFilter").value;document.getElementById("reportBlockFilter").innerHTML=filterBlockOptions(z,true);renderReport()});
document.getElementById("reportBlockFilter").addEventListener("change",renderReport);
function setReportView(view){
  const reports=document.getElementById("reports");reports.dataset.reportView=view;
  reports.querySelectorAll("[data-report-view]").forEach(button=>{const active=button.dataset.reportView===view;button.classList.toggle("active",active);button.setAttribute("aria-selected",String(active))});
  if(view==="response")renderResponseSummary()
}
document.querySelectorAll("[data-report-view]").forEach(button=>button.addEventListener("click",()=>setReportView(button.dataset.reportView)));
setReportView("chart");
document.getElementById("meetingSheetPrintBtn").addEventListener("click",()=>{
  rebuildAllMasters();const zone=document.getElementById("reportZoneFilter").value,block=document.getElementById("reportBlockFilter").value,rows=buildReportRows(zone,block);
  if(!rows.length){toast("No meeting sheet data");return}
  const scope=`${zone==="all"?"All Zones":`Zone ${zone}`}${block==="all"?"":` · Blk ${block}`}`;
  const win=window.open("","_blank","width=1500,height=950");if(!win){toast("Allow pop-ups to print the Meeting Sheet");return}
  win.document.open();win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>ELU Meeting Sheet · ${scope}</title><style>@page{size:A4 landscape;margin:9mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body{font-family:Arial,sans-serif;margin:0;color:#111}h1{font-size:16px;margin:0 0 3px}p{font-size:10px;margin:0 0 8px}.meeting-sheet-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9px}.meeting-sheet-table th,.meeting-sheet-table td{border:1px solid #333;text-align:center;vertical-align:middle;padding:6px 3px}.meeting-sheet-table th{background:#e8f3fa;font-weight:800}.meeting-sheet-table td{font-weight:700}.sheet-agree{color:#1738be}.sheet-done{color:#078541}.sheet-out{color:#8b4806}.sheet-nr{color:#bb1425}.meeting-sheet-total td{background:#e7f2f9;font-weight:900}.meeting-zone-scope{font-size:15px;font-weight:900;color:#17384e;margin:0 0 10px}thead{display:table-header-group}tr{break-inside:avoid}</style></head><body><h1>Electrical Load Upgrading · Block Progress Summary</h1><p class="meeting-zone-scope">WEEKLY PROGRESS MEETING · ${scope}</p>${meetingSheetHtml(rows)}<p style="margin-top:8px">Meeting view: Pending Confirmation (P) is shown together with No Response. Unit Register statuses remain unchanged.</p><script>onload=()=>setTimeout(()=>print(),300)<\/script></body></html>`);win.document.close()
});

function responseSummaryUnitList(units){
  return [...units]
    .sort((a,b)=>b.floor-a.floor||a.unit-b.unit)
    .map(u=>unitDisplay(u.floor,u.unit))
    .join(", ")
}
// Field-confirmed sites whose imported baseline must not turn untouched units
// into No Response on the Response Summary. New user work activates a site.
const RESPONSE_SUMMARY_NOT_STARTED=new Set([557,558,559,560,561,562,538,539,540,541,542,543,555,556]);
const RESPONSE_SUMMARY_STARTED=new Set([537,554]);
function responseSummaryStarted(block,units){
  if(RESPONSE_SUMMARY_STARTED.has(block))return true;
  if(!RESPONSE_SUMMARY_NOT_STARTED.has(block))return blockHasFieldActivity(block,units);
  const keys=new Set(units.map(u=>u.key));
  return state.surveys.some(s=>keys.has(s.unitKey))||
    state.complaints.some(c=>keys.has(c.unitKey))||
    state.appointments.some(a=>keys.has(a.unitKey)&&Number(a.id)>1000000000000)||
    Object.keys(state.statusOverrides||{}).some(key=>keys.has(key));
}
function buildResponseSummaryRows(zoneFilter="all"){
  const rows=[];
  Object.keys(ZONE_BLOCKS).map(Number).sort((a,b)=>a-b).forEach(zone=>{
    if(zoneFilter!=="all"&&String(zoneFilter)!==String(zone))return;
    (ZONE_BLOCKS[zone]||[]).forEach(block=>{
      const units=getBlockUnits(block);
      const started=responseSummaryStarted(block,units);
      const total=started?units.length:0;
      // Meeting response summary only: a confirmed dated appointment (C)
      // counts with A under Opt-In. Unconfirmed P remains with NR.
      // Unit records and the operational registers keep their actual status.
      const nrUnits=started?units.filter(u=>!(["A","C","D"].includes(u.response))):[];
      const dUnits=started?units.filter(u=>u.response==="D"):[];
      const optInUnits=started?units.filter(u=>u.response==="A"||u.response==="C"):[];
      const nr=nrUnits.length,d=dUnits.length,optIn=optInUnits.length;
      const respond=optIn+d;
      rows.push({
        zone,block,total,respond,
        respondPct:total?respond/total*100:0,
        optIn,optInPct:total?optIn/total*100:0,
        d,dPct:total?d/total*100:0,
        dDetails:responseSummaryUnitList(dUnits),
        nr,nrDetails:responseSummaryUnitList(nrUnits)
      })
    })
  });
  return rows
}
function responseSummaryTotals(rows){
  const t=rows.reduce((o,r)=>{
    o.total+=r.total;o.respond+=r.respond;o.optIn+=r.optIn;o.d+=r.d;o.nr+=r.nr;return o
  },{total:0,respond:0,optIn:0,d:0,nr:0});
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
      <td>${r.nr}</td>
      <td class="response-detail-cell">${esc(r.nrDetails||"")}</td>
    </tr>`).join("");
  const totalRow=includeTotal?`<tr class="response-summary-total">
      <td></td><td>TOTAL</td><td>${t.total}</td>
      <td>${responseSummaryCountPct(t.respond,t.respondPct)}</td>
      <td>${responseSummaryCountPct(t.optIn,t.optInPct)}</td>
      <td>${responseSummaryCountPct(t.d,t.dPct)}</td>
      <td></td><td>${t.nr}</td><td></td>
    </tr>`:"";
  return `<table class="response-summary-table">
    <colgroup>
      <col class="rs-sn"><col class="rs-block"><col class="rs-total"><col class="rs-respond"><col class="rs-optin">
      <col class="rs-optout"><col class="rs-optout-details"><col class="rs-nr"><col class="rs-nr-details">
    </colgroup>
    <thead><tr>
      <th>S/N</th>
      <th>BLOCK (ZONE)</th>
      <th>Total Unit</th>
      <th>Respond Unit</th>
      <th>Opt-In (A+C)</th>
      <th>Opt-Out</th>
      <th>Opt-Out Unit Details</th>
      <th>Non-Respond Unit</th>
      <th>NR Unit Details</th>
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
    ["S/N","BLOCK","ZONE","TOTAL UNIT","RESPOND UNIT","RESPOND %","OPT-IN A+C","OPT-IN %","OPT-OUT","OPT-OUT %","OPT-OUT UNIT DETAILS","NON-RESPOND UNIT","NR UNIT DETAILS"],
    ...rows.map((r,i)=>[
      i+1,r.block,`Zone ${r.zone}`,r.total,r.respond,`${Math.round(r.respondPct)}%`,
      r.optIn,`${Math.round(r.optInPct)}%`,r.d,`${Math.round(r.dPct)}%`,r.dDetails,
      r.nr,r.nrDetails
    ]),
    ["","TOTAL","",t.total,t.respond,`${Math.round(t.respondPct)}%`,t.optIn,`${Math.round(t.optInPct)}%`,t.d,`${Math.round(t.dPct)}%`,"",t.nr,""]
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
  td:nth-child(1),td:nth-child(3),td:nth-child(4),td:nth-child(5),td:nth-child(6),td:nth-child(8){text-align:center;vertical-align:middle}
  .zone-tag{font-size:6.7px;font-weight:700;white-space:nowrap}
  .total-row td{font-weight:700;background:#f3f3f3}
  col.rs-sn{width:3%} col.rs-block{width:10%} col.rs-total{width:8%} col.rs-respond{width:10%} col.rs-optin{width:9%}
  col.rs-optout{width:8%} col.rs-optout-details{width:22%} col.rs-nr{width:9%} col.rs-nr-details{width:21%}
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
  <div class="note">For this meeting summary, Opt-In includes A and confirmed C. P remains with NR. Unit records remain unchanged.</div>
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
  let c="";c+=pdfRect(0,0,842,74,[0.92,0.97,1]);c+=pdfText(38,24,22,"ELU UPGRADING - PROGRESS REPORT",true,ink);c+=pdfText(38,53,9,`${r.scope} | Generated ${r.stamp}`,false,muted);
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
function exportManagerPDF(){const r=managerReportData();if(!r.rows.length){toast("No report data for this filter");return}const blob=buildPdfBlob(managerPdfPages(r));downloadBlob(`ELU_Progress_Report_${reportSafeFileScope(r)}_${isoTodaySG()}.pdf`,blob);toast("Progress PDF downloaded")}

/* ---------- Native PPTX generator: OOXML + uncompressed ZIP, no external library ---------- */
function xmlEsc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}
const PPT_EMU=914400;function emu(v){return Math.round(v*PPT_EMU)}
function pptShape(id,x,y,w,h,text,opt={}){const fill=opt.fill===null?'<a:noFill/>':`<a:solidFill><a:srgbClr val="${opt.fill||'FFFFFF'}"/></a:solidFill>`,line=opt.line===null?'<a:ln><a:noFill/></a:ln>':`<a:ln w="${opt.lineWidth||9525}"><a:solidFill><a:srgbClr val="${opt.line||opt.fill||'FFFFFF'}"/></a:solidFill></a:ln>`,paras=String(text??'').split(/\n/).map(t=>`<a:p><a:pPr algn="${opt.align||'l'}"/><a:r><a:rPr lang="en-SG" sz="${Math.round((opt.fontSize||18)*100)}"${opt.bold?' b="1"':''}><a:solidFill><a:srgbClr val="${opt.color||'17384E'}"/></a:solidFill></a:rPr><a:t>${xmlEsc(t)}</a:t></a:r><a:endParaRPr lang="en-SG" sz="${Math.round((opt.fontSize||18)*100)}"/></a:p>`).join('');return`<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Shape ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm><a:prstGeom prst="${opt.radius?'roundRect':'rect'}"><a:avLst/></a:prstGeom>${fill}${line}</p:spPr><p:txBody><a:bodyPr wrap="square" anchor="${opt.valign||'mid'}" lIns="${emu(.08)}" rIns="${emu(.08)}" tIns="${emu(.04)}" bIns="${emu(.04)}"/><a:lstStyle/>${paras}</p:txBody></p:sp>`}
function pptSlideXml(shapes){return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${shapes}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`}
function pptTitle(sh,idRef,title,sub){let id=idRef.value;sh.push(pptShape(id++,.45,.32,12.4,.52,title,{fontSize:24,bold:true,color:'17384E',fill:null,line:null}));sh.push(pptShape(id++,.47,.85,12.1,.34,sub,{fontSize:9,color:'718795',fill:null,line:null}));sh.push(pptShape(id++,.45,1.27,12.4,.03,'',{fill:'D7E6F2',line:null}));idRef.value=id}
function pptFooter(sh,idRef,page){sh.push(pptShape(idRef.value++,.5,7.08,12.2,.22,`ELU Upgrading · Progress Report · ${page}`,{fontSize:7,color:'8AA0AE',fill:null,line:null,align:'r'}))}
function managerPptSlides(r){
  const slides=[],C={ink:'17384E',muted:'60798A',blue:'1474AD',pending:'3F7FD1',green:'278F5E',yellow:'C79012',red:'C42131',soft:'F5FAFE',line:'DCE9F2',grid:'DDE7EE',white:'FFFFFF'};
  const legend=(sh,id,y)=>{const items=[['A+C',C.green],['Completed',C.blue],['P',C.pending],['D',C.yellow],['NR',C.red]];let x=6.65;items.forEach(it=>{sh.push(pptShape(id.value++,x,y,.16,.16,'',{fill:it[1],line:null}));sh.push(pptShape(id.value++,x+.20,y-.03,.82,.22,it[0],{fontSize:7,bold:true,color:C.ink,fill:null,line:null}));x+=it[0]==='Completed'?1.30:.80})};
  {const sh=[],id={value:2};sh.push(pptShape(id.value++,0,0,13.333,7.5,'',{fill:C.soft,line:null}));sh.push(pptShape(id.value++,.62,.75,1.05,1.05,'ELU',{fontSize:23,bold:true,color:C.white,fill:C.blue,line:null,radius:true,align:'ctr'}));sh.push(pptShape(id.value++,.64,2.05,11.9,.8,'ELU UPGRADING',{fontSize:34,bold:true,color:C.ink,fill:null,line:null}));sh.push(pptShape(id.value++,.64,2.83,11.9,.56,'Progress Report',{fontSize:22,bold:true,color:C.blue,fill:null,line:null}));sh.push(pptShape(id.value++,.66,3.55,11.6,.38,`${r.scope} · Generated ${r.stamp}`,{fontSize:11,color:C.muted,fill:null,line:null}));sh.push(pptShape(id.value++,.66,4.35,7.6,.58,'A / C / P / D / NR status · Zone progress · Weekly meeting table',{fontSize:12,color:'294B61',fill:C.white,line:'D7E6F2',radius:true}));sh.push(pptShape(id.value++,.66,5.18,5.8,.52,'Zone and block status overview',{fontSize:10,bold:true,color:C.blue,fill:'EAF5FC',line:'CFE4F2',radius:true}));pptFooter(sh,id,1);slides.push(pptSlideXml(sh.join('')))}
  {const sh=[],id={value:2};pptTitle(sh,id,'Executive Summary',`${r.scope} · Status overview`);const cards=[['TOTAL',r.totals.total,C.blue],['OPT-IN A+C',r.totals.agree,C.green],['COMPLETED',r.totals.done,C.blue],['PENDING P',r.totals.p,C.pending],['OPT-OUT D',r.totals.d,C.yellow],['NO RESPONSE',r.totals.nr,C.red]];cards.forEach((c,i)=>{const x=.35+i*2.13;sh.push(pptShape(id.value++,x,1.48,1.95,.92,'',{fill:C.white,line:C.line,radius:true}));sh.push(pptShape(id.value++,x+.12,1.62,1.70,.20,c[0],{fontSize:7.2,bold:true,color:'718795',fill:null,line:null}));sh.push(pptShape(id.value++,x+.12,1.90,1.70,.34,String(c[1]),{fontSize:21,bold:true,color:c[2],fill:null,line:null}))});sh.push(pptShape(id.value++,.62,2.70,3.2,.28,'OVERALL STATUS %',{fontSize:11,bold:true,color:C.ink,fill:null,line:null}));legend(sh,id,2.72);const top=3.18,bottom=6.35,h=bottom-top,x0=1.1,x1=12.1,w=x1-x0;[0,25,50,75,100].forEach(v=>{const y=bottom-h*v/100;sh.push(pptShape(id.value++,x0,y,w,.012,'',{fill:C.grid,line:null}));sh.push(pptShape(id.value++,.55,y-.09,.45,.20,`${v}%`,{fontSize:6.5,color:C.muted,fill:null,line:null,align:'r'}))});const vals=[['A+C',r.totals.agreePct,C.green],['Completed',r.totals.donePct,C.blue],['P',r.totals.pPct,C.pending],['D',r.totals.dPct,C.yellow],['NR',r.totals.nrPct,C.red]];vals.forEach((v,i)=>{const bw=.62,x=1.65+i*2.12,val=Math.max(0,Math.min(100,v[1])),bh=h*val/100;sh.push(pptShape(id.value++,x,bottom-bh,bw,bh,'',{fill:v[2],line:null}));sh.push(pptShape(id.value++,x-.04,Math.max(3.03,bottom-bh-.27),.72,.22,val.toFixed(1),{fontSize:7.5,bold:true,color:C.ink,fill:null,line:null,align:'ctr'}));sh.push(pptShape(id.value++,x-.34,6.46,1.3,.25,v[0],{fontSize:7.5,bold:true,color:C.ink,fill:null,line:null,align:'ctr'}))});pptFooter(sh,id,2);slides.push(pptSlideXml(sh.join('')))}
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
function pptxPackage(slides,r){const files={};files['[Content_Types].xml']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${slides.map((_,i)=>`<Override PartName="/ppt/slides/slide${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}</Types>`;files['_rels/.rels']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;files['docProps/core.xml']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>ELU Upgrading Progress Report</dc:title><dc:creator>ELU Upgrading</dc:creator><cp:lastModifiedBy>ELU Upgrading</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified></cp:coreProperties>`;files['docProps/app.xml']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>ELU Upgrading</Application><PresentationFormat>Widescreen</PresentationFormat><Slides>${slides.length}</Slides><Company></Company></Properties>`;files['ppt/presentation.xml']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides.map((_,i)=>`<p:sldId id="${256+i}" r:id="rId${i+2}"/>`).join('')}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`;files['ppt/_rels/presentation.xml.rels']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${slides.map((_,i)=>`<Relationship Id="rId${i+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i+1}.xml"/>`).join('')}</Relationships>`;files['ppt/slideMasters/slideMaster1.xml']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld name="ELU Master"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/><p:sldLayoutIdLst><p:sldLayoutId id="1" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`;files['ppt/slideMasters/_rels/slideMaster1.xml.rels']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`;files['ppt/slideLayouts/slideLayout1.xml']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;files['ppt/slideLayouts/_rels/slideLayout1.xml.rels']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`;files['ppt/theme/theme1.xml']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="ELU Theme"><a:themeElements><a:clrScheme name="ELU"><a:dk1><a:srgbClr val="17384E"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="294B61"/></a:dk2><a:lt2><a:srgbClr val="F5FAFE"/></a:lt2><a:accent1><a:srgbClr val="1474AD"/></a:accent1><a:accent2><a:srgbClr val="278F5E"/></a:accent2><a:accent3><a:srgbClr val="C79012"/></a:accent3><a:accent4><a:srgbClr val="C42131"/></a:accent4><a:accent5><a:srgbClr val="D91B83"/></a:accent5><a:accent6><a:srgbClr val="60798A"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="ELU"><a:majorFont><a:latin typeface="Aptos Display"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="ELU"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;slides.forEach((s,i)=>{files[`ppt/slides/slide${i+1}.xml`]=s;files[`ppt/slides/_rels/slide${i+1}.xml.rels`]=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`});return zipStore(files)}
/* PPT uses the live meeting-sheet rows and its P + NR display rule. No records are changed. */
async function exportManagerPPT(){
  const selected=managerReportData();
  if(!selected.rows.length){toast("No report data for this filter");return}
  if(typeof PptxGenJS!=="function"){toast("PPT library did not load. Refresh and try again.");return}
  try{
    const pptx=new PptxGenJS();
    pptx.layout="LAYOUT_WIDE";
    pptx.author="ELU Upgrading";
    pptx.subject="Weekly Progress Meeting";
    pptx.title="Electrical Load Upgrading - Block Progress Summary";
    pptx.lang="en-SG";
    const zones=selected.zone==="all"?[...new Set(selected.rows.map(row=>row.zone))].sort((a,b)=>a-b):[Number(selected.zone)];
    const W=13.333,H=7.5,edge="667A86";
    const widths=[.45,.79,1.05,1.03,.61,1.13,.62,1.05,.62,1.12,.69].map(w=>w*12.43/9.16);
    const xs=[.45];widths.forEach(w=>xs.push(xs[xs.length-1]+w));
    const cell=(slide,value,col,y,h,options={})=>{
      const isHeader=!!options.header,fill=options.fill||"FFFFFF";
      slide.addShape(pptx.ShapeType.rect,{x:xs[col],y,w:widths[col],h,line:{color:edge,width:0.6},fill:{color:fill}});
      if(value!==null&&value!==undefined)slide.addText(String(value),{x:xs[col]+.035,y:y+.018,w:widths[col]-.07,h:h-.036,margin:0,
        fontFace:"Arial",fontSize:options.fontSize||(isHeader?9:12),bold:options.bold!==false,
        color:options.color||(isHeader?"133E56":"101820"),align:"center",valign:"mid",breakLine:false,
        fit:"shrink",transparency:0});
    };
    zones.forEach((zone,slideIndex)=>{
      const rows=selected.rows.filter(row=>Number(row.zone)===zone),t=reportTotals(rows);
      if(!rows.length)return;
      const slide=pptx.addSlide();slide.background={color:"FFFFFF"};
      slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:W,h:.12,line:{color:"12658D",transparency:100},fill:{color:"12658D"}});
      slide.addText("WEEKLY PROGRESS MEETING",{x:.45,y:.28,w:7.2,h:.25,fontFace:"Arial",fontSize:11,bold:true,color:"1B6685",margin:0});
      slide.addText("Electrical Load Upgrading · Block Progress Summary",{x:.45,y:.59,w:12.25,h:.48,fontFace:"Arial",fontSize:22,bold:true,color:"123E60",margin:0,fit:"shrink"});
      slide.addText(`ZONE ${zone}${selected.block==="all"?"":` · BLK ${selected.block}`}`,{x:.45,y:1.12,w:7,h:.28,fontFace:"Arial",fontSize:16,bold:true,color:"1B6685",margin:0});
      slide.addText(`Generated ${selected.stamp}`,{x:9.2,y:1.12,w:3.65,h:.25,fontFace:"Arial",fontSize:8,color:"516D7D",align:"right",margin:0});
      const top=1.60,first=.54,second=.38,rowH=Math.min(.62,(6.23-top-first-second-.57)/Math.max(1,rows.length));
      const heading=(text,col,span=1)=>{
        let width=0;for(let i=col;i<col+span;i++)width+=widths[i];
        slide.addShape(pptx.ShapeType.rect,{x:xs[col],y:top,w:width,h:first,line:{color:edge,width:.7},fill:{color:"E1F0F7"}});
        slide.addText(text,{x:xs[col]+.035,y:top+.02,w:width-.07,h:first-.04,margin:0,fontFace:"Arial",fontSize:8.3,bold:true,color:"133E56",align:"center",valign:"mid",fit:"shrink"});
      };
      heading("S/N",0);heading("BLK NO.",1);heading("TOTAL UNITS",2);
      heading("UNITS OPT-IN\n(Agree)",3,2);heading("UNITS OPT-IN\n(10mmsq Work Completed at site)",5,2);
      heading("UNITS OPT-OUT\n(Disagree)",7,2);heading("UNITS NO RESPONSE",9,2);
      widths.forEach((_,j)=>cell(slide,j<3?"":j%2===1?"Number":"%",j,top+first,second,{header:true,fill:"F2F8FB",fontSize:8}));
      rows.forEach((r,i)=>{
        const y=top+first+second+i*rowH,base=i%2?"F8FBFD":"FFFFFF";
        const nr=r.nr+r.p,percentage=r.total?`${Math.round(nr/r.total*100)}%`:"0%";
        const vals=[i+1,r.block,r.total,r.agree,`${Math.round(r.agreePct)}%`,r.done,`${Math.round(r.donePct)}%`,r.d,`${Math.round(r.dPct)}%`,nr,percentage];
        vals.forEach((v,j)=>cell(slide,v,j,y,rowH,{fill:base,color:j===1?"123E60":j===3||j===4?"153AC2":j===5||j===6?"048647":j===7||j===8?"8C4B09":j>=9?"C52234":"101820",fontSize:j===1?13:11}));
      });
      const totalY=top+first+second+rows.length*rowH,totalH=.53;
      const totalVals=[t.total,t.agree,`${Math.round(t.agreePct)}%`,t.done,`${Math.round(t.donePct)}%`,t.d,`${Math.round(t.dPct)}%`,t.nr+t.p,t.total?`${Math.round((t.nr+t.p)/t.total*100)}%`:"0%"];
      slide.addShape(pptx.ShapeType.rect,{x:xs[0],y:totalY,w:widths[0]+widths[1],h:totalH,line:{color:edge,width:.7},fill:{color:"DDECF5"}});
      slide.addText("TOTAL DU",{x:xs[0]+.04,y:totalY+.02,w:widths[0]+widths[1]-.08,h:totalH-.04,margin:0,fontFace:"Arial",fontSize:11,bold:true,color:"143E57",align:"center",valign:"mid"});
      totalVals.forEach((v,j)=>cell(slide,v,j+2,totalY,totalH,{fill:"DDECF5",color:"143E57",fontSize:11}));
      slide.addText("Meeting view: Pending Confirmation (P) is shown together with No Response. Unit records remain unchanged.",
        {x:.45,y:Math.min(6.95,totalY+totalH+.25),w:12.3,h:.25,fontFace:"Arial",fontSize:9,bold:true,color:"516D7D",margin:0,fit:"shrink"});
      slide.addText(`${slideIndex+1} / ${zones.length} · ELU Upgrading`,{x:10.35,y:7.12,w:2.52,h:.18,fontFace:"Arial",fontSize:7,color:"758A98",align:"right",margin:0});
    });
    const blob=await pptx.write({outputType:"blob"});
    downloadBlob(`ELU_Progress_Report_${reportSafeFileScope(selected)}_${isoTodaySG()}.pptx`,blob);
    toast("Meeting PPT downloaded");
  }catch(err){console.error("Meeting PPT export",err);toast("PPT export failed - please try again")}
}


/* ---------- V7.27 manager-safe exports ---------- */
function pdfScoreRail(top,label,value,total,color=[0.08,0.40,0.62]){
  const ink=[0.09,0.21,0.30],muted=[0.39,0.49,0.57],track=[0.91,0.94,0.96];
  const p=total?Math.max(0,Math.min(100,value/total*100)):0,x=128,w=635,h=22;
  let s="";s+=pdfText(38,top-4,10,label,true,ink);s+=pdfRect(x,top,w,h,track);s+=pdfRect(x,top,w*p/100,h,color);
  [0,25,50,75,100].forEach(t=>{const xx=x+w*t/100;s+=pdfLine(xx,top-4,xx,top+h+8,[0.72,0.79,0.84],.5);s+=pdfText(xx-(t===100?18:7),top+h+12,7,`${t}%`,false,muted)});
  const mx=x+w*p/100;s+=pdfRect(Math.max(x,Math.min(x+w-3,mx-2)),top-5,4,h+10,[0.05,0.26,0.43]);s+=pdfText(668,top-25,17,`${p.toFixed(1)}%`,true,color);s+=pdfText(668,top-4,8,`${value} / ${total}`,true,ink);return s
}
function compactBlockChartPdf(rows,scope,top){
  const ink=[0.09,0.21,0.30],muted=[0.39,0.49,0.57],grid=[0.82,0.88,0.91];
  const series=[["A+C","agreePct",[0.15,0.57,0.35]],["Done","donePct",[0.08,0.40,0.62]],["P","pPct",[0.25,0.50,0.82]],["D","dPct",[0.90,0.66,0.10]],["NR","nrPct",[0.78,0.12,0.19]]];
  let p=pdfText(38,top,14,"Block Status % Chart",true,ink)+pdfText(38,top+21,8,`${scope} | 5 status measures for each block`,false,muted);
  let lx=444;series.forEach(s=>{p+=pdfRect(lx,top+5,10,10,s[2]);p+=pdfText(lx+14,top+5,8,s[0],true,ink);lx+=s[0]==="Done"?71:57});
  const x0=73,x1=804,plotTop=top+58,bottom=top+193,h=bottom-plotTop,w=x1-x0;
  [0,50,100].forEach(value=>{const y=bottom-h*value/100;p+=pdfLine(x0,y,x1,y,grid,value===0?.8:.35);p+=pdfText(39,y-5,8,`${value}%`,false,muted)});
  const groupW=w/rows.length,gap=Math.min(7,groupW*.065),barW=Math.min(18,(groupW-gap*4-12)/5);
  rows.forEach((row,gi)=>{
    const start=x0+gi*groupW+(groupW-(barW*5+gap*4))/2;
    series.forEach((s,si)=>{const v=Math.max(0,Math.min(100,Number(row[s[1]])||0)),height=h*v/100,x=start+si*(barW+gap);if(height>0){p+=pdfRect(x,bottom-height,barW,height,s[2]);p+=pdfText(x-3,Math.max(plotTop-(si===1?25:13),bottom-height-(si===1?25:13)),7.4,v.toFixed(1),true,ink)}});
    p+=pdfText(x0+gi*groupW+groupW/2-21,bottom+10,10,`Blk ${row.block}`,true,ink)
  });
  return p
}
function balancedChartGroups(rows,maxPerChart=8){
  const count=Math.ceil(rows.length/maxPerChart),base=Math.floor(rows.length/count),extra=rows.length%count,groups=[];
  let at=0;for(let i=0;i<count;i++){const size=base+(i<extra?1:0);groups.push(rows.slice(at,at+size));at+=size}
  return groups
}
function responseSummaryPdfPages(r){
  const selected=buildResponseSummaryRows(r.zone).filter(x=>r.block==="all"||String(x.block)===String(r.block));
  const total=responseSummaryTotals(selected),pages=[],ink=[0.09,0.21,0.30],muted=[0.32,0.43,0.51],head=[0.87,0.95,0.97],line=[0.57,0.69,0.75];
  const widths=[30,55,55,72,70,66,150,54,220],xs=[30];widths.forEach(w=>xs.push(xs.at(-1)+w));
  const wrap=(value,limit)=>{const words=String(value||"").split(/,\s*/).filter(Boolean),result=[];let current="";words.forEach(word=>{if(current&&`${current}, ${word}`.length>limit){result.push(current);current=word}else current+=(current?", ":"")+word});if(current)result.push(current);return result.length?result:["-"]};
  const header=(index)=>{let p=pdfText(30,25,16,`Response Summary Sheet${index?` - ${index+1}`:""}`,true,ink);p+=pdfText(30,48,9,`${r.scope} | Opt-In includes A and confirmed C; P remains with NR`,false,muted);p+=pdfRect(30,72,772,26,[0.88,0.96,0.95]);p+=pdfText(206,77,10,"Summary of Opt In, Opt Out & NR Unit Details",true,ink);
    const labels=["S/N","BLK","TOTAL","RESPOND","OPT-IN A+C","OPT-OUT","OPT-OUT UNITS","NR","NR UNITS"];
    labels.forEach((label,i)=>{p+=pdfRect(xs[i],101,widths[i],32,head,line);p+=pdfText(xs[i]+3,112,7.1,label,true,ink)});return p};
  let page=header(0),y=133;
  selected.forEach((row,i)=>{const dLines=wrap(row.dDetails,36),nrLines=wrap(row.nrDetails,54),height=Math.max(37,Math.max(dLines.length,nrLines.length)*10+12);
    if(y+height>535){pages.push(page);page=header(pages.length);y=133}
    const values=[i+1,row.block,row.total,responseSummaryCountPct(row.respond,row.respondPct),responseSummaryCountPct(row.optIn,row.optInPct),responseSummaryCountPct(row.d,row.dPct),null,row.nr,null];
    values.forEach((value,j)=>{page+=pdfRect(xs[j],y,widths[j],height,i%2?[0.97,0.985,0.99]:[1,1,1],line);if(value!==null)page+=pdfText(xs[j]+4,y+10,j===1?8:7.2,String(value),j===1,ink)});
    dLines.forEach((text,k)=>page+=pdfText(xs[6]+4,y+7+k*10,6.9,text,false,ink));nrLines.forEach((text,k)=>page+=pdfText(xs[8]+4,y+7+k*10,6.9,text,false,ink));y+=height
  });
  if(y+38>535){pages.push(page);page=header(pages.length);y=133}
  const totals=["", "TOTAL",total.total,responseSummaryCountPct(total.respond,total.respondPct),responseSummaryCountPct(total.optIn,total.optInPct),responseSummaryCountPct(total.d,total.dPct),"",total.nr,""];
  totals.forEach((v,i)=>{page+=pdfRect(xs[i],y,widths[i],38,[0.88,0.94,0.97],line);page+=pdfText(xs[i]+4,y+12,7.4,String(v),true,ink)});
  page+=pdfText(30,555,8,"Meeting summary only. Unit Register and appointment statuses remain unchanged.",false,muted);pages.push(page);return pages
}
function managerPdfPagesV727(r){
  const pages=[],blue=[0.08,0.40,0.62],pending=[0.25,0.50,0.82],ink=[0.09,0.21,0.30],muted=[0.39,0.49,0.57],soft=[0.94,0.97,0.99],green=[0.15,0.57,0.35],yellow=[0.90,0.66,0.10],red=[0.78,0.12,0.19],grid=[0.87,0.91,0.94];
  let c="";
  c+=pdfRect(0,0,842,74,[0.92,0.97,1]);c+=pdfText(38,24,22,"ELU UPGRADING - PROGRESS REPORT",true,ink);c+=pdfText(38,53,9,`${r.scope} | Generated ${r.stamp}`,false,muted);
  const cards=[['Total Units',r.totals.total,blue],['Opt-In A+C',r.totals.agree,green],['Completed',r.totals.done,blue],['Pending P',r.totals.p,pending],['Opt-Out D',r.totals.d,yellow],['No Response NR',r.totals.nr,red]];
  cards.forEach((x,i)=>{const xx=38+i*128;c+=pdfRect(xx,94,118,58,soft,[0.85,0.91,0.95]);c+=pdfText(xx+9,108,7.4,x[0],true,muted);c+=pdfText(xx+9,128,18,String(x[1]),true,x[2])});
  const chartGroups=balancedChartGroups(r.rows);
  c+=compactBlockChartPdf(chartGroups[0],r.scope,178);
  c+=pdfText(38,435,13,"Zone Progress",true,ink);const cols=[38,102,178,260,342,424,506,588,674],heads=['Zone','Blocks','Units','A+C','Done','P','D','NR','Done %'];heads.forEach((h,i)=>c+=pdfText(cols[i],457,7.3,h,true,muted));c+=pdfLine(38,473,804,473);
  r.zones.slice(0,6).forEach((z,i)=>{const top=484+i*17;c+=pdfText(cols[0],top,7.2,`Zone ${z.zone}`,true,ink);[z.blocks,z.total,z.agree,z.done,z.p,z.d,z.nr,`${z.donePct.toFixed(1)}%`].forEach((v,j)=>c+=pdfText(cols[j+1],top,7.2,String(v),false,ink))});
  pages.push(c);
  for(let i=1;i<chartGroups.length;i+=2){let extra="";extra+=compactBlockChartPdf(chartGroups[i],r.scope,26);if(chartGroups[i+1])extra+=compactBlockChartPdf(chartGroups[i+1],r.scope,297);pages.push(extra)}
  const tableChunks=[];for(let i=0;i<r.rows.length;i+=13)tableChunks.push(r.rows.slice(i,i+13));
  tableChunks.forEach((chunk,ci)=>{let p="";const rowH=chunk.length<=7?42:30,font=chunk.length<=7?8.2:6.5;p+=pdfText(38,28,18,`Weekly Meeting Progress Summary${tableChunks.length>1?` - ${ci+1}/${tableChunks.length}`:""}`,true,ink);p+=pdfText(38,51,9,`${r.scope} | P = Pending Confirmation`,false,muted);const xs=[34,72,118,172,226,284,338,396,448,500,552,604,664],heads=['S/N','Blk','Total','A+C','A+C%','Done','Done%','P','P%','D','D%','NR','NR%'];p+=pdfRect(30,72,780,34,[0.90,0.95,0.99]);heads.forEach((h,i)=>p+=pdfText(xs[i],85,7.2,h,true,ink));chunk.forEach((x,i)=>{const top=119+i*rowH;if(i%2===1)p+=pdfRect(30,top-9,780,rowH-4,[0.97,0.98,0.99]);const vals=[ci*13+i+1,x.block,x.total,x.agree,x.agreePct.toFixed(1)+'%',x.done,x.donePct.toFixed(1)+'%',x.p,x.pPct.toFixed(1)+'%',x.d,x.dPct.toFixed(1)+'%',x.nr,x.nrPct.toFixed(1)+'%'];vals.forEach((v,j)=>p+=pdfText(xs[j],top,font,String(v),j===1,ink));p+=pdfLine(30,top+rowH-14,810,top+rowH-14)});if(ci===tableChunks.length-1){const top=119+chunk.length*rowH+3;p+=pdfRect(30,top-8,780,30,[0.90,0.95,0.99]);p+=pdfText(72,top,8.2,'TOTAL DU',true,ink);[r.totals.total,r.totals.agree,r.totals.agreePct.toFixed(1)+'%',r.totals.done,r.totals.donePct.toFixed(1)+'%',r.totals.p,r.totals.pPct.toFixed(1)+'%',r.totals.d,r.totals.dPct.toFixed(1)+'%',r.totals.nr,r.totals.nrPct.toFixed(1)+'%'].forEach((v,j)=>p+=pdfText(xs[j+2],top,font,String(v),true,ink))}pages.push(p)});
  pages.push(...responseSummaryPdfPages(r));
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
  chunks.forEach((chunk,ci)=>{let p="";p+=pdfText(38,28,18,`Unit Summary${chunks.length>1?` - ${ci+1}/${chunks.length}`:""}`,true,ink);p+=pdfText(38,51,9,"Zone, block and unit work status",false,muted);const xs=[38,83,132,205,305,430,548,658,752],heads=['Zone','Block','Unit','Status','Work','Appt Date','Slot','Team','Source'];p+=pdfRect(34,72,774,28,[0.90,0.95,0.99]);heads.forEach((h,i)=>p+=pdfText(xs[i],83,7,h,true,ink));chunk.forEach((u,i)=>{const top=110+i*23;if(i%2===1)p+=pdfRect(34,top-6,774,20,soft);const a=preferredMasterAppointment(u.key),source=a?String(a.source||'Manual'):'-';const vals=[u.zone,u.block,unitDisplay(u.floor,u.unit),statusLabel(u.response),u.workStatus||'-',u.appointmentDate?safeDate(u.appointmentDate):'-',u.appointmentSlot||'-',u.team||'-',source.includes('Excel')?'Imported':'Manual'];vals.forEach((v,j)=>p+=pdfText(xs[j],top,6.7,String(v),j===2,ink))});pages.push(p)});return pages
}
function exportManagerPDFV727(){const r=managerReportData();if(!r.rows.length){toast("No report data for this filter");return}downloadBlob(`ELU_Progress_Report_${reportSafeFileScope(r)}_${isoTodaySG()}.pdf`,buildPdfBlob(managerPdfPagesV727(r)));toast("Progress PDF downloaded")}

function exportBlockBoardPrint(){
  rebuildAllMasters();
  renderBlockBoard();
  const zone=document.getElementById("boardZone").value;
  const block=document.getElementById("boardBlock").value;
  const floor=document.getElementById("boardFloor").value;
  const q=document.getElementById("boardSearch").value.trim().toLowerCase();
  const classic=classicBlockBoardHtml(getBlockUnits(block),floor,q);
  if(/No units match this filter/i.test(classic)){
    toast("No Block Board data to print");
    return;
  }
  const floorLabel=floor==="all"?"All floors":`Floor ${floor}`;
  const legend=document.querySelector("#blockboard .legend").outerHTML;
  const boardHtml=`<div class="floor-board">${classic}</div>`;
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
<link rel="stylesheet" href="styles.css?v=7.81">
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
document.getElementById("exportProgressBtn").addEventListener("click",()=>{const z=document.getElementById("reportZoneFilter").value,b=document.getElementById("reportBlockFilter").value,r=buildReportRows(z,b),t=reportTotals(r);download(`ELU_Weekly_Progress_${z==="all"?"All_Zones":"Zone_"+z}.csv`,toCSV([["S/N","BLK NO.","TOTAL UNITS","OPT-IN A+C","OPT-IN %","WORK COMPLETED","COMPLETED %","PENDING P","P %","OPT-OUT D","D %","NO RESPONSE NR + P","NR %"],...r.map((x,i)=>[i+1,x.block,x.total,x.agree,pct(x.agreePct),x.done,pct(x.donePct),x.p,pct(x.pPct),x.d,pct(x.dPct),x.nr+x.p,pct(x.total?(x.nr+x.p)/x.total*100:0)]),["","TOTAL DU",t.total,t.agree,pct(t.agreePct),t.done,pct(t.donePct),t.p,pct(t.pPct),t.d,pct(t.dPct),t.nr+t.p,pct(t.total?(t.nr+t.p)/t.total*100:0)] ]))});
document.getElementById("exportUnitsBtn").addEventListener("click",()=>{const r=managerReportData(),rows=unitSummaryRowsForReport();download(`ELU_Unit_Summary_${reportSafeFileScope(r)}_${isoTodaySG()}.csv`,toCSV([["Zone","Block No","Unit No","Status","Work Status","Appointment Date","Appointment Slot","Team"],...rows.map(u=>[u.zone,u.block,unitDisplay(u.floor,u.unit),u.response||"",u.workStatus||"",u.appointmentDate||"",u.appointmentSlot||"",u.team||""])]));});
document.getElementById("exportBackupBtn").addEventListener("click",()=>{if(!confirm("Backup contains resident and appointment data. Keep it private. Continue?"))return;download(`ELU_Backup_${isoTodaySG()}.json`,JSON.stringify({surveys:state.surveys,appointments:state.appointments,complaints:state.complaints,statusOverrides:state.statusOverrides||{},statusAudit:state.statusAudit||[],zone1CorrectionsApplied:state.zone1CorrectionsApplied||[],zone6ImportData:state.zone6ImportData||null,statusDecisionSchema:2},null,2),"application/json")});


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
const PHOTO_DB_NAME="ELU_Photo_Inbox_V1",PHOTO_DB_VERSION=3;
function photoDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(PHOTO_DB_NAME,PHOTO_DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains("photos"))db.createObjectStore("photos",{keyPath:"id"});
      if(!db.objectStoreNames.contains("meta"))db.createObjectStore("meta",{keyPath:"key"});
      if(!db.objectStoreNames.contains("schedule"))db.createObjectStore("schedule",{keyPath:"id"});
      if(!db.objectStoreNames.contains("complaintPhotos"))db.createObjectStore("complaintPhotos",{keyPath:"id"})
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
const FULL_BACKUP_FORMAT="ELU_FULL_BACKUP",FULL_BACKUP_VERSION=2;
let selectedFullBackup=null,safetyCopyDownloaded=false,backupBusy=false;
async function fullBackupBlob(){
  await securePersistChain;
  const [photos,schedule,meta,complaintPhotos]=await Promise.all([photoDbAll("photos"),photoDbAll("schedule"),photoDbAll("meta"),photoDbAll("complaintPhotos")]);
  const zip=new JSZip(),entries=[],complaintEntries=[];
  for(const [index,photo] of photos.entries()){
    const {blob,...details}=photo;
    if(!(blob instanceof Blob))throw new Error("A stored photo is missing its image data. Backup stopped.");
    const path=`images/${String(index).padStart(6,"0")}.bin`;
    zip.file(path,await blob.arrayBuffer(),{compression:"STORE"});entries.push({...details,blobPath:path,blobType:blob.type||"image/jpeg",blobSize:blob.size})
  }
  for(const [index,photo] of complaintPhotos.entries()){
    const {blob,...details}=photo;if(!(blob instanceof Blob))throw new Error("A complaint photo is missing its image data. Backup stopped.");
    const path=`complaint-images/${String(index).padStart(6,"0")}.bin`;
    zip.file(path,await blob.arrayBuffer(),{compression:"STORE"});complaintEntries.push({...details,blobPath:path,blobType:blob.type||"image/jpeg",blobSize:blob.size})
  }
  const snapshot=secureSnapshot();
  zip.file("manifest.json",JSON.stringify({format:FULL_BACKUP_FORMAT,version:FULL_BACKUP_VERSION,createdAt:new Date().toISOString(),counts:{surveys:snapshot.surveys.length,appointments:snapshot.appointments.length,complaints:snapshot.complaints.length,photos:photos.length,schedule:schedule.length,meta:meta.length,complaintPhotos:complaintPhotos.length}}));
  zip.file("records.json",JSON.stringify(snapshot));
  zip.file("photos.json",JSON.stringify(entries));
  zip.file("photo-schedule.json",JSON.stringify(schedule));
  zip.file("photo-meta.json",JSON.stringify(meta));
  zip.file("complaint-photos.json",JSON.stringify(complaintEntries));
  return zip.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:4}})
}
async function downloadFullBackup(){
  const blob=await fullBackupBlob();
  downloadBlob(`ELU_Full_Backup_${isoTodaySG()}.zip`,blob);
  toast("Full backup downloaded · records and photos")
}
function showBackupError(error){console.error("Full backup / restore failed",error);document.getElementById("backupPreview").textContent=error?.message||"Backup operation failed.";toast("Backup operation failed — current data unchanged")}
async function runFullBackup(button,markSafety=false){
  if(backupBusy)return;backupBusy=true;button.disabled=true;
  const label=button.textContent;button.textContent="Preparing ZIP…";
  try{await downloadFullBackup();if(markSafety){safetyCopyDownloaded=true;document.getElementById("backupCommitBtn").disabled=!selectedFullBackup}}
  catch(error){showBackupError(error)}finally{button.textContent=label;button.disabled=false;backupBusy=false}
}
document.getElementById("fullBackupBtn").addEventListener("click",e=>runFullBackup(e.currentTarget));
function closeBackupDialog(){document.getElementById("backupBackdrop").hidden=true;selectedFullBackup=null;safetyCopyDownloaded=false;document.getElementById("backupFile").value="";document.getElementById("backupCommitBtn").disabled=true}
document.getElementById("restoreBackupBtn").addEventListener("click",()=>{document.getElementById("backupBackdrop").hidden=false;document.getElementById("backupPreview").textContent="No backup selected."});
document.getElementById("backupClose").addEventListener("click",closeBackupDialog);
document.getElementById("backupSafetyBtn").addEventListener("click",e=>runFullBackup(e.currentTarget,true));
function validateBackupRecords(records,manifest,photos,schedule,meta,complaintPhotos=[]){
  if(!records||typeof records!=="object"||Array.isArray(records))throw new Error("Invalid records in backup.");
  for(const k of ["surveys","appointments","complaints","statusAudit","zone1CorrectionsApplied"])if(!Array.isArray(records[k]))throw new Error(`Missing ${k} records.`);
  if(!records.statusOverrides||typeof records.statusOverrides!=="object"||Array.isArray(records.statusOverrides))throw new Error("Invalid status decisions.");
  if(![photos,schedule,meta,complaintPhotos].every(Array.isArray))throw new Error("Invalid photo register.");
  const counts=manifest.counts||{};
  for(const [key,actual] of Object.entries({surveys:records.surveys.length,appointments:records.appointments.length,complaints:records.complaints.length,photos:photos.length,schedule:schedule.length,meta:meta.length}))if(counts[key]!==actual)throw new Error(`Backup count mismatch: ${key}.`);
  if(manifest.version===2&&counts.complaintPhotos!==complaintPhotos.length)throw new Error("Backup count mismatch: complaint photos.");
  for(const [items,key] of [[photos,"id"],[schedule,"id"],[meta,"key"],[complaintPhotos,"id"]]){
    const ids=new Set();for(const row of items){if(!row||typeof row!=="object"||row[key]==null||ids.has(row[key]))throw new Error(`Invalid or duplicate photo ${key}.`);ids.add(row[key])}
  }
  if(photos.some(p=>typeof p.blobPath!=="string"||!/^images\/\d{6}\.bin$/.test(p.blobPath)||!Number.isSafeInteger(p.blobSize)||p.blobSize<0))throw new Error("Invalid photo images in backup.");
  if(complaintPhotos.some(p=>typeof p.blobPath!=="string"||!/^complaint-images\/\d{6}\.bin$/.test(p.blobPath)||!Number.isSafeInteger(p.blobSize)||p.blobSize<0||!records.complaints.some(c=>c.id===p.caseId)))throw new Error("Invalid complaint photo in backup.");
}
async function readFullBackup(file,withImages=false){
  if(typeof JSZip==="function"&&file.size>2*1024*1024*1024)throw new Error("Backup is too large for this browser.");
  const zip=await JSZip.loadAsync(await file.arrayBuffer());
  const required=["manifest.json","records.json","photos.json","photo-schedule.json","photo-meta.json"];
  if(required.some(name=>!zip.file(name)))throw new Error("This is not an ELU full backup ZIP.");
  const [manifest,records,photos,schedule,meta]=await Promise.all(required.map(async name=>JSON.parse(await zip.file(name).async("string"))));
  if(manifest.format!==FULL_BACKUP_FORMAT||![1,2].includes(manifest.version))throw new Error("Unsupported backup version.");
  const complaintPhotos=manifest.version===2?JSON.parse(await zip.file("complaint-photos.json")?.async("string")||"null"):[];
  validateBackupRecords(records,manifest,photos,schedule,meta,complaintPhotos);
  if([...photos,...complaintPhotos].some(p=>!zip.file(p.blobPath)))throw new Error("A photo image is missing from the backup.");
  if(withImages){
    for(const row of [...photos,...complaintPhotos]){const bytes=await zip.file(row.blobPath).async("uint8array");if(bytes.length!==row.blobSize)throw new Error(`Photo image size mismatch: ${row.blobPath}`);row.blob=new Blob([bytes],{type:row.blobType||"image/jpeg"});delete row.blobPath;delete row.blobType;delete row.blobSize}
  }
  return {manifest,records,photos,schedule,meta,complaintPhotos}
}
document.getElementById("backupFile").addEventListener("change",async e=>{
  selectedFullBackup=null;safetyCopyDownloaded=false;document.getElementById("backupCommitBtn").disabled=true;
  const file=e.target.files[0],preview=document.getElementById("backupPreview");if(!file){preview.textContent="No backup selected.";return}
  preview.textContent="Checking backup…";
  try{const result=await readFullBackup(file);selectedFullBackup=file;const c=result.manifest.counts;preview.textContent=`Saved ${new Date(result.manifest.createdAt).toLocaleString("en-SG")} · ${c.surveys} surveys · ${c.appointments} appointments · ${c.complaints} complaints · ${c.photos} photos · ${c.schedule} photo register entries. Download the current safety copy to enable restore.`}
  catch(error){preview.textContent=error?.message||"Could not read backup."}
});
async function replacePhotoStores(data){
  const db=await photoDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(["photos","schedule","meta","complaintPhotos"],"readwrite");
    for(const name of ["photos","schedule","meta","complaintPhotos"]){const store=tx.objectStore(name);store.clear();data[name].forEach(row=>store.put(row))}
    tx.oncomplete=()=>{db.close();resolve()};tx.onabort=()=>{db.close();reject(tx.error||new Error("Photo restore transaction failed."))};tx.onerror=()=>{}
  })
}
document.getElementById("backupCommitBtn").addEventListener("click",async e=>{
  if(backupBusy||!selectedFullBackup||!safetyCopyDownloaded||!secureSessionKey)return;
  backupBusy=true;const button=e.currentTarget;button.disabled=true;button.textContent="Validating images…";
  let original=null;
  try{
    const imported=await readFullBackup(selectedFullBackup,true);
    // Validate against the loaded project register before changing browser storage.
    for(const row of [...imported.records.surveys,...imported.records.appointments,...imported.records.complaints,...imported.photos,...imported.schedule])if(row.unitKey&&!getUnit(row.unitKey))throw new Error(`Unknown project unit in backup: ${row.unitKey}`);
    for(const key of Object.keys(imported.records.statusOverrides))if(!getUnit(key))throw new Error(`Unknown status unit in backup: ${key}`);
    await securePersistChain;
    const encrypted=await encryptPayload(imported.records,secureSessionKey);
    original={stored:localStorage.getItem(SECURE_STATE_KEY),photos:await photoDbAll("photos"),schedule:await photoDbAll("schedule"),meta:await photoDbAll("meta"),complaintPhotos:await photoDbAll("complaintPhotos")};
    button.textContent="Restoring…";
    await replacePhotoStores(imported);
    try{localStorage.setItem(SECURE_STATE_KEY,JSON.stringify(encrypted))}
    catch(error){await replacePhotoStores(original);throw error}
    appStarted=false;location.reload()
  }catch(error){showBackupError(error);button.disabled=false;button.textContent="Restore selected backup"}
  finally{backupBusy=false}
});
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
function photoReportCells(photos){
  const ordered=photoReportOrder(photos);
  return ordered.length===2?[ordered[0],null,ordered[1]]:[ordered[0]||null,ordered[1]||null,ordered[2]||null]
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
    const report=photoReportCells(ps),role=new Map(report.filter(Boolean).map((p,i)=>[p.id,report.indexOf(p)]));
    return `<section class="photo-unit-card ${ps.length>=2?"ready":""}" data-photo-date="${date}" data-photo-unit="${a.unitKey}">
      <div class="photo-unit-head"><div><strong>Blk ${a.block} ${a.unitDisplay||unitDisplay(a.floor,a.unit)}</strong><span>${a.photoOnly?`Stored photos · Daily Register row missing`:`${esc(a.team||"")} · ${esc(a.slot||"")}`} · Drag photos to set print order</span></div><em>${ps.length} photo${ps.length===1?"":"s"}${ps.length>=2?" · Ready":""}</em></div>
      <div class="photo-thumb-grid">${ps.map(p=>{
        const pos=role.has(p.id)?role.get(p.id):-1;
        const label=pos===0?"1 · Closed DB":pos===1?"2 · BEFORE":pos===2?"3 · AFTER":"Extra";
        return `<div class="photo-thumb ${pos>=0?"used":"extra"}" draggable="true" data-photo-drag="${p.id}"><img src="${URL.createObjectURL(p.blob)}" alt=""><span>${label}</span><button class="photo-delete-btn" type="button" data-photo-delete="${p.id}">×</button></div>`
      }).join("")||`<div class="photo-empty">No photos yet</div>`}</div>
    </section>`
  }).join("");
  const cyclePhotos=all.filter(p=>p.cycleId===cycle.id&&p.zone===zone),units=new Set(cyclePhotos.map(p=>`${p.date}|${p.unitKey}`));
  const ready=[...units].filter(k=>cyclePhotos.filter(p=>`${p.date}|${p.unitKey}`===k).length>=2).length;
  document.getElementById("photoMonthlySummary").innerHTML=`<span>${cyclePhotos.length} photos stored</span><span>${units.size} unit-days</span><span>${ready} ready with 2+ photos</span>`;
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
function photoTc(width,content,heading=false){return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:vAlign w:val="center"/>${heading?'<w:shd w:fill="DCECF4"/>':''}<w:tcMar><w:top w:w="45" w:type="dxa"/><w:left w:w="45" w:type="dxa"/><w:bottom w:w="45" w:type="dxa"/><w:right w:w="45" w:type="dxa"/></w:tcMar></w:tcPr>${content}</w:tc>`}
function photoPageTable(rows,refs){
  const w=[1032,2580,3909,3909];let x=`<w:tbl><w:tblPr><w:tblW w:w="11430" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="5" w:color="94B7CB"/><w:left w:val="single" w:sz="5" w:color="94B7CB"/><w:bottom w:val="single" w:sz="5" w:color="94B7CB"/><w:right w:val="single" w:sz="5" w:color="94B7CB"/><w:insideH w:val="single" w:sz="4" w:color="BAD2DF"/><w:insideV w:val="single" w:sz="4" w:color="BAD2DF"/></w:tblBorders></w:tblPr><w:tblGrid>${w.map(n=>`<w:gridCol w:w="${n}"/>`).join("")}</w:tblGrid>`;
  for(let i=0;i<6;i++){const r=rows[i];if(r){x+=`<w:tr><w:trPr><w:trHeight w:val="330" w:hRule="exact"/></w:trPr>${photoTc(w[0],photoP("DATE",true,16),true)}${photoTc(w[1],photoP(`Blk ${r.block} ${r.unitDisplay}`,true,16),true)}${photoTc(w[2],photoP("BEFORE",true,16),true)}${photoTc(w[3],photoP("AFTER",true,16),true)}</w:tr>`;
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
  return '<option value="all">All blocks</option>'+(ZONE_BLOCKS[zone]||[]).filter(b=>Boolean(PROJECT_LAYOUT[String(b)]||PROJECT_LAYOUT[b]))
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
async function blockPhotoGroups(block,fromDate,toDate,zone){
  const allowed=new Set(ZONE_BLOCKS[zone]||[]);
  const all=(await photoDbAll("photos")).filter(p=>(block==='all'?allowed.has(Number(p.block)):Number(p.block)===Number(block))&&p.date>=fromDate&&p.date<=toDate);
  const map=new Map();
  for(const p of all){const k=`${p.date}|${p.unitKey}`;if(!map.has(k))map.set(k,[]);map.get(k).push(p)}
  const groups=[];
  for(const ps of map.values()){
    ps.sort((a,b)=>Number(a.order||0)-Number(b.order||0));
    groups.push({date:ps[0].date,unitKey:ps[0].unitKey,block:Number(ps[0].block),unitDisplay:ps[0].unitDisplay,
      photos:photoReportOrder(ps),storedCount:ps.length})
  }
  return groups.sort((a,b)=>block==='all'?a.block-b.block||a.unitDisplay.localeCompare(b.unitDisplay,undefined,{numeric:true})||a.date.localeCompare(b.date):a.date.localeCompare(b.date)||a.unitDisplay.localeCompare(b.unitDisplay,undefined,{numeric:true}))
}
async function renderBlockPhotoSummary(){
  const box=document.getElementById("photoBlockSummary");if(!box)return;
  const block=document.getElementById("photoBlockReportBlock").value,zone=Number(document.getElementById("photoBlockReportZone").value);
  const from=document.getElementById("photoBlockReportFrom").value,to=document.getElementById("photoBlockReportTo").value;
  if(!block||!from||!to){box.innerHTML="";return}
  const groups=await blockPhotoGroups(block,from,to,zone),photos=groups.reduce((n,g)=>n+g.storedCount,0),ready=groups.filter(g=>g.photos.length>=2).length;
  box.innerHTML=`<div><strong>${block==='all'?`Zone ${zone} · All blocks`:`Blk ${block}`}</strong><span>${groups.length} unit-day${groups.length===1?"":"s"}</span></div>
  <div><strong>${photos}</strong><span>stored photos</span></div><div><strong>${ready}</strong><span>ready with 2+</span></div>
  <div><strong>${safeDate(from)} → ${safeDate(to)}</strong><span>report range</span></div>`
}
async function buildBlockPhotoDocx(groups,block,from,to){
  const zip=new JSZip(),rels=[],media=[];let rn=2,docId=1;const pages=[];
  for(let p=0;p<groups.length;p+=6){
    const rows=groups.slice(p,p+6),refs=[];
    for(let i=0;i<rows.length;i++){refs[i]=[];for(let j=0;j<3;j++){
      const ph=photoReportCells(rows[i].photos)[j];if(!ph){refs[i][j]=null;continue}
      const rId=`rId${rn++}`,n=media.length+1;rels.push({rId,target:`media/image${n}.jpg`});media.push({target:`media/image${n}.jpg`,blob:ph.blob});
      refs[i][j]={photo:ph,rId,docId:docId++}
    }}
    pages.push(photoP(`ELECTRICAL LOAD UPGRADING WORKS (ELU) AT ${block} PASIR RIS STREET 51 · ${safeDate(from)} TO ${safeDate(to)}`,true,18)+photoPageTable(rows,refs));
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
  const block=document.getElementById("photoBlockReportBlock").value,zone=Number(document.getElementById("photoBlockReportZone").value),from=document.getElementById("photoBlockReportFrom").value,to=document.getElementById("photoBlockReportTo").value;
  if(!block||!from||!to){toast("Select Block, From and To dates");return} if(from>to){toast("From date cannot be after To date");return}
  const groups=await blockPhotoGroups(block,from,to,zone);if(!groups.length){toast("No stored photos in this date range");return}
  if(groups.some(g=>g.photos.length<2)&&!confirm("Some units have only one photo. Generate Word with blank cells?"))return;
  const label=block==='all'?`Zone ${zone} · All blocks`:`Block ${block}`;
  const blob=await buildBlockPhotoDocx(groups,label,from,to),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`ELU_Photo_Report_${block==='all'?`Zone${zone}_All_Blocks`:`Blk${block}`}_${from}_to_${to}.docx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast(`${label} Word report downloaded`)
}
async function generateBlockPhotoPdf(){
  const block=document.getElementById("photoBlockReportBlock").value,zone=Number(document.getElementById("photoBlockReportZone").value),from=document.getElementById("photoBlockReportFrom").value,to=document.getElementById("photoBlockReportTo").value;
  if(!block||!from||!to){toast("Select Block, From and To dates");return} if(from>to){toast("From date cannot be after To date");return}
  const groups=await blockPhotoGroups(block,from,to,zone);if(!groups.length){toast("No stored photos in this date range");return}
  const win=window.open("","_blank","width=1100,height=900");if(!win){toast("Allow pop-ups for Print / PDF");return}
  const label=block==='all'?`ZONE ${zone} · ALL BLOCKS`:`BLOCK ${block}`;
  const urls=[],cards=groups.map(g=>`<div class="r"><div class="h"><b>${safeDate(g.date)}</b><b>Blk${g.block}${g.unitDisplay}</b><b>BEFORE</b><b>AFTER</b></div><div class="p"><div>${safeDate(g.date)}</div>${photoReportCells(g.photos).map(ph=>{if(!ph)return"<div></div>";const u=URL.createObjectURL(ph.blob);urls.push(u);return `<div><img src="${u}"></div>`}).join("")}</div></div>`).join("");
  win.document.write(`<!doctype html><html><head><title>ELU ${label} Photo Report</title><style>@page{size:A4 portrait;margin:5mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact}body{font-family:Arial;margin:0}.title{text-align:center;font-weight:700;font-size:10px;margin:2px 0}.sub{text-align:center;font-size:8px;margin-bottom:4px}.r{break-inside:avoid}.h,.p{display:grid;grid-template-columns:9% 23% 34% 34%}.h>*,.p>*{border:1px solid #000;padding:2px;text-align:center;font-size:8px}.p>*{height:43mm;display:flex;align-items:center;justify-content:center}.p img{max-width:100%;max-height:100%;object-fit:contain}</style></head><body><div class="title">ELECTRICAL LOAD UPGRADING WORKS (ELU) AT ${label} PASIR RIS STREET 51</div><div class="sub">${safeDate(from)} TO ${safeDate(to)}</div>${cards}<script>onload=()=>setTimeout(()=>print(),400)<\/script></body></html>`);win.document.close();setTimeout(()=>urls.forEach(URL.revokeObjectURL),60000)
}

async function markPhotoExport(zone,cycle,type){
  await photoDbPut("meta",{key:`export:${zone}:${cycle.id}`,zone,cycleId:cycle.id,cycleStart:cycle.start,cycleEnd:cycle.end,cleanup:cycle.cleanup,type,exportedAt:new Date().toISOString()})
}
async function generateMonthlyPhotoWord(){
  const zone=Number(document.getElementById("photoZone").value),cycle=cycleForDate(document.getElementById("photoCycleDate").value||isoTodaySG()),groups=await monthlyPhotoGroups(zone,cycle);
  if(!groups.length){toast("No stored photos for this Zone / Cycle");return}
  if(groups.some(g=>g.photos.length<2)&&!confirm("Some units have only one photo. Generate Word with blank cells?"))return;
  const zip=new JSZip(),rels=[],media=[];let rn=2,docId=1;const pages=[];
  for(let p=0;p<groups.length;p+=6){const rows=groups.slice(p,p+6),refs=[];
    for(let i=0;i<rows.length;i++){refs[i]=[];for(let j=0;j<3;j++){const ph=photoReportCells(rows[i].photos)[j];if(!ph){refs[i][j]=null;continue}const rId=`rId${rn++}`,n=media.length+1;rels.push({rId,target:`media/image${n}.jpg`});media.push({target:`media/image${n}.jpg`,blob:ph.blob});refs[i][j]={photo:ph,rId,docId:docId++}}}
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
  const cards=groups.map(g=>`<div class="r"><div class="h"><b>${safeDate(g.date)}</b><b>Blk${g.block}${g.unitDisplay}</b><b>BEFORE</b><b>AFTER</b></div><div class="p"><div>${safeDate(g.date)}</div>${photoReportCells(g.photos).map(ph=>ph?`<div><img src="${URL.createObjectURL(ph.blob)}"></div>`:`<div></div>`).join("")}</div></div>`).join("");
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
  document.getElementById("surveyPrintDate").value=isoTodaySG();
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
let scenePeekTimer;
const scenePeekBtn=document.getElementById("scenePeekBtn");
function closeScenePeek(){
  clearTimeout(scenePeekTimer);
  document.body.classList.remove("scene-peek");
  scenePeekBtn.setAttribute("aria-pressed","false");
  scenePeekBtn.querySelector("span").textContent="View Lighting";
}
scenePeekBtn.addEventListener("click",()=>{
  if(document.body.classList.contains("scene-peek")){closeScenePeek();return}
  document.body.classList.add("scene-peek");
  scenePeekBtn.setAttribute("aria-pressed","true");
  scenePeekBtn.querySelector("span").textContent="Return to Workspace";
  scenePeekTimer=setTimeout(closeScenePeek,12000);
});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeScenePeek()});
document.getElementById("nav").addEventListener("click",closeScenePeek);
const LIGHTING_MODE_KEY="elu_visual_lighting_v1";
function applyLightingMode(mode,remember=true){
  const night=mode==="dark";
  document.body.classList.toggle("theme-night",night);
  document.querySelectorAll("[data-lighting-mode]").forEach(button=>{
    const selected=button.dataset.lightingMode===(night?"dark":"light");
    button.classList.toggle("selected",selected);
    button.setAttribute("aria-pressed",String(selected))
  });
  if(remember)try{localStorage.setItem(LIGHTING_MODE_KEY,night?"dark":"light")}catch{}
}
document.querySelectorAll("[data-lighting-mode]").forEach(button=>button.addEventListener("click",()=>applyLightingMode(button.dataset.lightingMode)));
let initialLighting="light";try{initialLighting=localStorage.getItem(LIGHTING_MODE_KEY)==="dark"?"dark":"light"}catch{}
applyLightingMode(initialLighting,false);
initSecurityGate();
