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
function normalizeStatus(v){v=String(v||"").trim().toUpperCase();if(v==="OPT_OUT")return"D";if(v==="DL")return"NR";return["A","C","D","NR"].includes(v)?v:""}
function statusLabel(v){v=normalizeStatus(v);return v==="A"?"A · Opt-In":v==="C"?"C · Confirmation":v==="D"?"D · Opt-Out":v==="NR"?"NR · No Response":""}
function statusPill(v){v=normalizeStatus(v);const c=v==="A"?"a":v==="C"?"c":v==="D"?"d":v==="NR"?"nr":"pending";return `<span class="pill ${c}">${esc(statusLabel(v))}</span>`}

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
  return {units,surveys:[],appointments:seedAppointments(),complaints:[],createdAt:new Date().toISOString()};
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

  (saved.appointments||[]).filter(a=>a.status!=="Cancelled").forEach(a=>{
    const clean={...a,status:undefined,scheduleState:a.scheduleState||"Active",workStatus:a.workStatus||"Pending",source:a.source||"Manual"};
    const idx=fresh.appointments.findIndex(x=>x.unitKey===clean.unitKey&&x.date===clean.date&&x.slot===clean.slot);
    if(idx>=0){
      const seed=fresh.appointments[idx];
      fresh.appointments[idx]={
        ...seed,
        ownerName:clean.ownerName||seed.ownerName||"",
        contact:clean.contact||seed.contact||"",
        remarks:(clean.userRemarks||isUserAppointment(clean))?(clean.remarks||""):"",
        userRemarks:Boolean(clean.userRemarks||isUserAppointment(clean)),
        source:isUserAppointment(clean)?clean.source:seed.source,
        team:clean.team||seed.team||"",
        scheduleState:isUserAppointment(clean)?(clean.scheduleState||seed.scheduleState||"Active"):(seed.scheduleState||"Active"),
        workStatus:isUserAppointment(clean)?(clean.workStatus||seed.workStatus||"Pending"):(seed.workStatus||"Pending")
      };
    }else if(isUserAppointment(clean)){
      fresh.appointments.push(clean);
    }
  });
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
let state={units:{},surveys:[],appointments:[],complaints:[],createdAt:""};
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
  return {surveys:state.surveys,appointments:state.appointments,complaints:state.complaints,createdAt:state.createdAt}
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
  const seed=await decryptPayload(SECURE_SEED_PAYLOAD,key);
  PROJECT_LAYOUT=seed.PROJECT_LAYOUT||{};
  SOURCE_APPOINTMENTS=seed.SOURCE_APPOINTMENTS||[];
  SECURE_PROFILE_NAME=seed.profileName||"Secure User";

  let saved=null;
  if(localStorage.getItem(SECURE_STATE_KEY)){
    saved=await loadEncryptedRuntimeState(key);
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
      showSecurityMessage("Wrong username or password.");
      input.select()
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
function isInactiveSchedule(a){return ["Rescheduled","Cancelled","History"].includes(a?.scheduleState)}
function activeAppointmentsForUnit(key){return state.appointments.filter(a=>a.unitKey===key&&!isInactiveSchedule(a))}
function preferredMasterAppointment(key){
  const arr=activeAppointmentsForUnit(key);if(!arr.length)return null;
  const pending=arr.filter(a=>a.workStatus!=="Completed"&&!appointmentHasEnded(a));
  if(pending.length){
    const manual=pending.filter(a=>a.source==="Planner"||a.source==="Manual");
    const pool=manual.length?manual:pending;
    return [...pool].sort((a,b)=>b.date.localeCompare(a.date)||slotStartMinutes(b.slot)-slotStartMinutes(a.slot)||Number(b.id)-Number(a.id))[0]
  }
  return [...arr].sort((a,b)=>b.date.localeCompare(a.date)||slotStartMinutes(b.slot)-slotStartMinutes(a.slot)||Number(b.id)-Number(a.id))[0]
}
function normalizeManualOverrides(){
  const by={};
  state.appointments.forEach(a=>{
    if(isInactiveSchedule(a)||a.workStatus==="Completed"||appointmentHasEnded(a))return;
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
  if(latestSurvey&&latestSurvey.contact&&!base.contact){
    base.contact=latestSurvey.contact;
  }
  const latestIdentityAppt=latestById(state.appointments.filter(a=>a.unitKey===key&&(a.ownerName||a.contact)));
  if(latestIdentityAppt){
    if(latestIdentityAppt.ownerName)base.ownerName=latestIdentityAppt.ownerName;
    if(latestIdentityAppt.contact)base.contact=latestIdentityAppt.contact;
  }
  const latestAppt=preferredMasterAppointment(key);
  if(latestAppt){
    const userAppt=isUserAppointment(latestAppt);
    const importedExcel=String(latestAppt.source||"").includes("Excel");
    const showImportedSchedule=!["D","NR",""] .includes(base.response);
    if(userAppt||showImportedSchedule){
      base.appointmentDate=latestAppt.date||"";
      base.appointmentSlot=latestAppt.slot||"";
      base.team=latestAppt.team||"";
    }
    if(latestAppt.ownerName)base.ownerName=latestAppt.ownerName;
    if(latestAppt.contact)base.contact=latestAppt.contact;
    if(latestAppt.remarks&&(userAppt||latestAppt.userRemarks)){
      const parts=[base.remarks,latestAppt.remarks].map(v=>String(v||"").trim()).filter(Boolean);
      base.remarks=[...new Set(parts)].join(" · ");
    }
    if(userAppt){
      if(latestAppt.workStatus==="Completed"||appointmentHasEnded(latestAppt)){
        latestAppt.workStatus="Completed";base.workStatus="Completed";base.response="A";
      }else{
        base.response="C";
      }
    }else if(!importedExcel){
      if(latestAppt.workStatus==="Completed"||appointmentHasEnded(latestAppt)){
        latestAppt.workStatus="Completed";base.workStatus="Completed";base.response="A";
      }else{base.response="C"}
    }
  }
  state.units[key]=base;
}
function rebuildAllMasters(){Object.keys(state.units).forEach(rebuildUnitMaster)}
function persist(){queueSecurePersist()}
function save(msg){rebuildAllMasters();persist();renderAll();if(msg)toast(msg)}
function autoCompleteAppointments(showToast=false){
  let changed=0;
  state.appointments.forEach(a=>{
    if(!isInactiveSchedule(a)&&a.workStatus!=="Completed"&&appointmentHasEnded(a)){a.workStatus="Completed";changed++}
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
teams:["Appointment Planner","Zone-first Team 1 / Team 2 planning. Standard and custom times stay together in one daily sheet."],
reports:["Weekly Meeting Report","Progress Summary calculated directly from the read-only Unit Register."]
}[view]}
function setView(view){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));document.getElementById(view).classList.add("active");
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  const [t,s]=viewTitle(view);document.getElementById("pageTitle").textContent=t;document.getElementById("pageSubtitle").textContent=s;window.scrollTo({top:0,behavior:"smooth"});
}
document.getElementById("nav").addEventListener("click",e=>{const b=e.target.closest(".nav-item");if(b)setView(b.dataset.view)});
document.body.addEventListener("click",e=>{const b=e.target.closest("[data-go]");if(b)setView(b.dataset.go)});

function zoneOptions(includeAll=false){return(includeAll?`<option value="all">All Zones</option>`:"")+Object.keys(ZONE_BLOCKS).map(z=>`<option value="${z}">Zone ${z}</option>`).join("")}
function blockOptions(zone){return(ZONE_BLOCKS[zone]||[]).map(b=>`<option value="${b}">Blk ${b}</option>`).join("")}
function allBlockOptions(includeAll=true){const h=includeAll?`<option value="all">All Blocks</option>`:"";return h+Object.values(ZONE_BLOCKS).flat().map(b=>`<option value="${b}">Blk ${b}</option>`).join("")}
function filterBlockOptions(zone,includeAll=true){if(zone==="all")return allBlockOptions(includeAll);const h=includeAll?`<option value="all">All Blocks</option>`:"";return h+blockOptions(zone)}
function zoneOfBlock(block){return Number(Object.keys(ZONE_BLOCKS).find(z=>(ZONE_BLOCKS[z]||[]).includes(Number(block)))||0)}
function zoneGroupHeader(zone,count,label){return `<div class="zone-group-head"><div><span>ZONE ${zone}</span><strong>Blocks ${(ZONE_BLOCKS[zone]||[]).join(", ")}</strong></div><em>${count} ${label}</em></div>`}
function unitOptionsForBlock(block){return getBlockUnits(block).map(u=>`<option value="${u.key}">${unitDisplay(u.floor,u.unit)}</option>`).join("")}
function initSelectors(){
  ["boardZone","surveyZone","appointmentZone","complaintZone","plannerZone"].forEach(id=>document.getElementById(id).innerHTML=zoneOptions());
  ["unitZoneFilter","appointmentZoneFilter","complaintZoneFilter","plannerViewZone","reportZoneFilter"].forEach(id=>document.getElementById(id).innerHTML=zoneOptions(true));
  ["boardZone","surveyZone","appointmentZone","complaintZone","plannerZone"].forEach(id=>document.getElementById(id).value="1");
  ["unitZoneFilter","appointmentZoneFilter","complaintZoneFilter","plannerViewZone","reportZoneFilter"].forEach(id=>document.getElementById(id).value="all");
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
document.getElementById("surveyZone").addEventListener("change",syncSurveyBlocks);document.getElementById("surveyBlock").addEventListener("change",syncSurveyUnits);document.getElementById("surveyUnit").addEventListener("change",autofillSurvey);
document.getElementById("appointmentZone").addEventListener("change",syncAppointmentBlocks);document.getElementById("appointmentBlock").addEventListener("change",()=>syncPairUnits("appointment"));document.getElementById("appointmentUnit").addEventListener("change",()=>autofillPair("appointment"));
document.getElementById("complaintZone").addEventListener("change",syncComplaintBlocks);document.getElementById("complaintBlock").addEventListener("change",()=>syncPairUnits("complaint"));document.getElementById("complaintUnit").addEventListener("change",()=>autofillPair("complaint"));
document.getElementById("plannerZone").addEventListener("change",syncPlannerBlocks);document.getElementById("plannerBlock").addEventListener("change",syncPlannerUnits);
document.getElementById("plannerSlot").addEventListener("change",togglePlannerCustomTime);
document.getElementById("appointmentSlot").addEventListener("change",toggleAppointmentCustomTime);

function renderDashboard(){
  const u=unitsArray(),total=u.length,a=u.filter(x=>x.response==="A").length,c=u.filter(x=>x.response==="C").length,d=u.filter(x=>x.response==="D").length,nr=u.filter(x=>x.response==="NR").length,done=u.filter(x=>x.workStatus==="Completed").length;
  const agree=a+c,openFollowups=state.surveys.filter(s=>s.visitDate&&s.visitDate>=isoTodaySG()).length,donePct=total?Math.round(done/total*100):0;
  document.getElementById("heroTotalUnits").textContent=total.toLocaleString();const tag=document.getElementById("heroTagUnits");if(tag)tag.textContent=`${total.toLocaleString()} Units`;const orbit=document.getElementById("heroOrbit");if(orbit)orbit.style.setProperty("--pct",`${donePct*3.6}deg`);const orbitText=document.getElementById("heroCompletionPct");if(orbitText)orbitText.textContent=`${donePct}%`;
  document.getElementById("kpiOptIn").textContent=agree.toLocaleString();document.getElementById("kpiOptInPct").textContent=`${Math.round(agree/total*100)}% · A + C`;
  document.getElementById("kpiAppointments").textContent=c.toLocaleString();
  document.getElementById("kpiCompleted").textContent=done.toLocaleString();document.getElementById("kpiCompletedPct").textContent=`${donePct}% project`;
  document.getElementById("kpiNR").textContent=nr.toLocaleString();document.getElementById("kpiOptOut").textContent=d.toLocaleString();document.getElementById("kpiFollowups").textContent=openFollowups.toLocaleString();
  document.getElementById("zoneProgress").innerHTML=Object.keys(ZONE_BLOCKS).map(z=>{const zu=u.filter(x=>x.zone===Number(z)),zc=zu.filter(x=>x.workStatus==="Completed").length,za=zu.filter(x=>x.response==="A"||x.response==="C").length,pct=Math.round(zc/zu.length*100);return`<div class="zone-line"><div><div><div class="zone-name">Zone ${z}</div><div class="zone-pct">${pct}% complete</div></div><div class="zone-mini">${zc}/${zu.length}<br>${za} opt-in</div></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div>`}).join("");
  const upcoming=state.appointments.filter(x=>!isInactiveSchedule(x)&&x.workStatus!=="Completed"&&!appointmentHasEnded(x)&&x.date>=isoTodaySG()).sort((a,b)=>a.date.localeCompare(b.date)||slotStartMinutes(a.slot)-slotStartMinutes(b.slot)||Number(a.block)-Number(b.block)).slice(0,6);
  document.getElementById("upcomingAppointments").innerHTML=upcoming.length?upcoming.map(x=>`<div class="compact-item"><div><strong>Blk ${x.block} · ${esc(x.unitDisplay)}</strong><span>${esc(getUnit(x.unitKey)?.ownerName||"Owner not entered")} · ${esc(x.team||"Unassigned")}</span></div><small>C · ${safeDate(x.date)}<br>${esc(x.slot)}</small></div>`).join(""):`<div class="empty-state">No upcoming confirmations.</div>`;
  const follow=state.surveys.filter(s=>s.visitDate&&s.visitDate>=isoTodaySG()).sort((a,b)=>a.visitDate.localeCompare(b.visitDate)||String(a.visitTime||"").localeCompare(String(b.visitTime||""))).slice(0,6);
  document.getElementById("followupAttention").innerHTML=follow.length?follow.map(s=>`<div class="attention-card"><strong>Blk ${s.block} · ${esc(s.unitDisplay)}</strong><span>${esc(s.ownerName||"Name not entered")} · ${esc(s.contact||"No contact")}</span><b>${safeDate(s.visitDate)}${s.visitTime?` · ${esc(s.visitTime)}`:""}</b></div>`).join(""):`<div class="empty-state">No upcoming survey visits.</div>`;
  renderTodayTeamBoard();
}
function renderBlockBoard(){
  const block=Number(document.getElementById("boardBlock").value),floorFilter=document.getElementById("boardFloor").value,q=document.getElementById("boardSearch").value.trim().toLowerCase(),u=getBlockUnits(block);
  const total=u.length,a=u.filter(x=>x.response==="A").length,c=u.filter(x=>x.response==="C").length,d=u.filter(x=>x.response==="D").length,nr=u.filter(x=>x.response==="NR").length,pct=n=>total?Math.round(n/total*100):0;
  document.getElementById("blockHeadline").innerHTML=`<div class="block-title-wrap"><span class="block-zone-tag">ZONE ${PROJECT_LAYOUT[block].zone}</span><h2>Block ${block}</h2><p>${total} exact project units · floor-by-floor live status</p></div><div class="block-summary-grid"><div class="summary-tile total"><span>Total Units</span><strong>${total}</strong><small>100%</small></div><div class="summary-tile a"><span>A · Opt-In</span><strong>${a}</strong><small>${pct(a)}%</small></div><div class="summary-tile c"><span>C · Confirmed</span><strong>${c}</strong><small>${pct(c)}%</small></div><div class="summary-tile d"><span>D · Opt-Out</span><strong>${d}</strong><small>${pct(d)}%</small></div><div class="summary-tile nr"><span>NR · No Response</span><strong>${nr}</strong><small>${pct(nr)}%</small></div></div>`;
  const floors=[...new Set(u.map(x=>x.floor))].sort((a,b)=>b-a).filter(f=>floorFilter==="all"||Number(floorFilter)===f);
  document.getElementById("floorBoard").innerHTML=floors.map(f=>{const fu=u.filter(x=>x.floor===f).filter(x=>!q||unitDisplay(x.floor,x.unit).toLowerCase().includes(q)||String(x.unit).includes(q));if(!fu.length)return"";return`<div class="floor-row"><div class="floor-label"><strong>${f}</strong><span>Floor</span></div><div class="unit-grid">${fu.map(x=>{const sc=x.response==="A"?"status-a":x.response==="C"?"status-c":x.response==="D"?"status-out":x.response==="NR"?"status-nr":"";const dateLine=x.appointmentDate&&(x.response==="A"||x.response==="C")?`<div class="u-date ${x.response==="A"?"done-date":"appt-date"}"><span>${x.response==="A"?"Done":"Appt"}</span>${esc(shortBoardDate(x.appointmentDate))}</div>`:"";return`<button class="unit-card ${sc}" data-unit-key="${x.key}"><div class="u-no">${unitDisplay(x.floor,x.unit)}</div><div class="u-status">${esc(statusLabel(x.response))}</div>${dateLine}</button>`}).join("")}</div></div>`}).join("")||`<div class="empty-state">No units match this filter.</div>`;
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

function resetAppointmentForm(){
  document.getElementById("appointmentEditId").value="";
  document.getElementById("appointmentSaveBtn").textContent="Save Appointment";
  document.getElementById("appointmentCancelEdit").classList.add("hidden");
  document.getElementById("appointmentDate").value=isoTodaySG();
  document.getElementById("appointmentSlot").value=SLOTS[0];
  document.getElementById("appointmentTeam").value="Team 1";
  document.getElementById("appointmentCustomStart").value="";
  document.getElementById("appointmentCustomEnd").value="";
  toggleAppointmentCustomTime();autofillPair("appointment")
}
document.getElementById("appointmentCancelEdit").addEventListener("click",resetAppointmentForm);

function saveDirectAppointment(){
  const key=document.getElementById("appointmentUnit").value,u=getUnit(key);if(!u)return;
  const date=document.getElementById("appointmentDate").value,slot=appointmentSlotValue(),team=document.getElementById("appointmentTeam").value;
  const ownerName=document.getElementById("appointmentOwner").value.trim(),contact=document.getElementById("appointmentContact").value.trim(),remarks=document.getElementById("appointmentRemarks").value.trim();
  const editId=Number(document.getElementById("appointmentEditId").value||0);
  if(!date){toast("Select appointment date");return}
  if(!slot){toast("Enter custom Start and End time");return}

  if(editId){
    const a=state.appointments.find(x=>x.id===editId);if(!a)return;
    if(isInactiveSchedule(a)){toast("History record cannot be edited as an active booking. Create a new appointment instead.");return}
    const changed=a.date!==date||a.slot!==slot||a.unitKey!==key;
    if(changed){
      state.appointments.push({...a,id:Date.now()+1,scheduleState:"Rescheduled",source:"Appointment History"});
      state.appointments.filter(x=>x.id!==editId&&x.unitKey===key&&!isInactiveSchedule(x)&&x.workStatus!=="Completed"&&!appointmentHasEnded(x)).forEach(x=>x.scheduleState="Rescheduled");
    }
    a.unitKey=key;a.zone=u.zone;a.block=u.block;a.floor=u.floor;a.unit=u.unit;a.unitDisplay=unitDisplay(u.floor,u.unit);
    a.ownerName=ownerName;a.contact=contact;a.date=date;a.slot=slot;a.team=team;a.remarks=remarks;a.userRemarks=true;a.source="Manual";a.scheduleState="Active";
    a.workStatus=appointmentHasEnded(a)?"Completed":"Pending";
    resetAppointmentForm();save(changed?"Appointment rescheduled · old booking kept in history":"Appointment updated · Planner and Unit Register synced");return
  }

  const active=state.appointments.filter(x=>x.unitKey===key&&!isInactiveSchedule(x)&&x.workStatus!=="Completed"&&!appointmentHasEnded(x));
  const exact=active.find(x=>x.date===date&&x.slot===slot);
  if(exact){
    exact.ownerName=ownerName;exact.contact=contact;exact.team=team;exact.remarks=remarks;exact.userRemarks=true;exact.source="Manual";exact.scheduleState="Active";
    resetAppointmentForm();save("Appointment updated · no duplicate created");return
  }

  if(active.length){
    const desc=active.map(x=>`${safeDate(x.date)} · ${x.slot}`).join(", ");
    if(!confirm(`This unit already has an active booking: ${desc}. Reschedule it to ${safeDate(date)} · ${slot}?`))return;
    active.forEach(x=>x.scheduleState="Rescheduled");
  }

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
  a.scheduleState="Cancelled";a.cancelledAt=new Date().toISOString();
  if(Number(document.getElementById("appointmentEditId").value)===id)resetAppointmentForm();
  if(Number(document.getElementById("plannerEditId").value)===id)resetPlannerForm();
  save("Appointment cancelled · active slot cleared · history retained")
}
function deleteAppointment(id){if(!confirm("Delete this appointment record permanently?"))return;state.appointments=state.appointments.filter(x=>x.id!==id);save("Appointment deleted · Unit Register recalculated")}
document.getElementById("appointmentFilterDate").addEventListener("change",renderAppointmentTable);document.getElementById("appointmentMode").addEventListener("change",renderAppointmentTable);
document.getElementById("appointmentZoneFilter").addEventListener("change",()=>{const z=document.getElementById("appointmentZoneFilter").value;document.getElementById("appointmentBlockFilter").innerHTML=filterBlockOptions(z,true);renderAppointmentTable()});
document.getElementById("appointmentBlockFilter").addEventListener("change",renderAppointmentTable);
function renderAppointmentTable(){
  const f=document.getElementById("appointmentFilterDate").value,mode=document.getElementById("appointmentMode").value,zf=document.getElementById("appointmentZoneFilter").value,bf=document.getElementById("appointmentBlockFilter").value;let r=[...state.appointments];
  const imported=r.filter(a=>String(a.source||"").includes("Excel")).length;const ic=document.getElementById("importedScheduleCount");if(ic)ic.textContent=imported.toLocaleString();
  if(zf!=="all")r=r.filter(a=>Number(a.zone||zoneOfBlock(a.block))===Number(zf));if(bf!=="all")r=r.filter(a=>Number(a.block)===Number(bf));
  if(f)r=r.filter(a=>a.date===f);else if(mode==="upcoming")r=r.filter(a=>!isInactiveSchedule(a)&&a.workStatus!=="Completed"&&!appointmentHasEnded(a)&&a.date>=isoTodaySG());else if(mode==="completed")r=r.filter(a=>isInactiveSchedule(a)||a.workStatus==="Completed"||appointmentHasEnded(a));
  r.sort((a,b)=>mode==="completed"?b.date.localeCompare(a.date)||slotStartMinutes(b.slot)-slotStartMinutes(a.slot):a.date.localeCompare(b.date)||slotStartMinutes(a.slot)-slotStartMinutes(b.slot));
  const row=a=>{const u=getUnit(a.unitKey),st=a.scheduleState||"Active",sc=st==="Cancelled"?"cancelled":st==="Rescheduled"?"rescheduled":st==="History"?"history":a.workStatus==="Completed"?"completed":"confirmed",active=!isInactiveSchedule(a)&&a.workStatus!=="Completed"&&!appointmentHasEnded(a);const actions=active?`<button class="table-action" data-appt-edit="${a.id}">Edit</button><button class="table-action" data-appt-reschedule="${a.id}">Reschedule</button><button class="table-action cancel" data-appt-cancel="${a.id}">Cancel</button><button class="table-action delete" data-appt-delete="${a.id}">Delete</button>`:`<button class="table-action delete" data-appt-delete="${a.id}">Delete</button>`;return`<tr><td>${safeDate(a.date)}</td><td>${esc(a.slot)}</td><td>Blk ${a.block}<br><strong>${esc(a.unitDisplay)}</strong></td><td>${esc(u?.ownerName||a.ownerName||"—")}</td><td>${esc(u?.contact||a.contact||"—")}</td><td>${esc(a.team||"Unassigned")}</td><td><span class="pill ${sc}">${esc(st==="Active"?(a.workStatus==="Completed"?"Completed":"Active"):st)}</span></td><td>${statusPill(u?.response)}</td><td><span class="pill ${String(a.source||"").includes("Excel")?"confirmed":"pending"}">${esc(a.source||"Manual")}</span></td><td><div class="action-set">${actions}</div></td></tr>`};
  const table=x=>`<div class="table-shell zone-table-shell"><table><thead><tr><th>Date</th><th>Slot</th><th>Block / Unit</th><th>Owner</th><th>Contact</th><th>Team</th><th>Schedule</th><th>Unit Status</th><th>Source</th><th>Action</th></tr></thead><tbody>${x.map(row).join("")}</tbody></table></div>`;
  if(!r.length){document.getElementById("appointmentTable").innerHTML=`<div class="empty-state">No appointments found.</div>`;return}
  document.getElementById("appointmentTable").innerHTML=(zf==="all"&&bf==="all")?`<div class="zone-record-stack">${[1,2,3,4,5,6].map(z=>[z,r.filter(a=>Number(a.zone||zoneOfBlock(a.block))===z)]).filter(([,x])=>x.length).map(([z,x])=>`<section class="zone-record-group">${zoneGroupHeader(z,x.length,"appointments")}${table(x)}</section>`).join("")}</div>`:table(r)
}
document.getElementById("appointmentTable").addEventListener("click",e=>{let b=e.target.closest("[data-appt-reschedule]");if(b)return editAppointment(Number(b.dataset.apptReschedule),true);b=e.target.closest("[data-appt-cancel]");if(b)return cancelAppointment(Number(b.dataset.apptCancel));b=e.target.closest("[data-appt-edit]");if(b)return editAppointment(Number(b.dataset.apptEdit));b=e.target.closest("[data-appt-delete]");if(b)deleteAppointment(Number(b.dataset.apptDelete))});

document.getElementById("unitSearch").addEventListener("input",renderUnitTable);
document.getElementById("unitZoneFilter").addEventListener("change",()=>{const z=document.getElementById("unitZoneFilter").value;document.getElementById("unitBlockFilter").innerHTML=filterBlockOptions(z,true);renderUnitTable()});
document.getElementById("unitBlockFilter").addEventListener("change",renderUnitTable);
function renderUnitTable(){
  const q=document.getElementById("unitSearch").value.trim().toLowerCase(),zf=document.getElementById("unitZoneFilter").value,bf=document.getElementById("unitBlockFilter").value;let r=unitsArray();
  if(zf!=="all")r=r.filter(u=>u.zone===Number(zf));if(bf!=="all")r=r.filter(u=>u.block===Number(bf));if(q)r=r.filter(u=>`blk ${u.block} ${unitDisplay(u.floor,u.unit)} ${u.ownerName} ${u.contact}`.toLowerCase().includes(q));
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
function renderPlanner(){
  const date=document.getElementById("teamDate").value||isoTodaySG(),zv=document.getElementById("plannerViewZone").value,bv=document.getElementById("plannerViewBlock").value;
  document.getElementById("plannerDateTitle").textContent=`${plannerDateLabel(date)} unit appointments`;
  const visible=a=>!isInactiveSchedule(a)&&a.date===date&&(zv==="all"||Number(a.zone||zoneOfBlock(a.block))===Number(zv))&&(bv==="all"||Number(a.block)===Number(bv));
  const zones=zv==="all"?[1,2,3,4,5,6]:[Number(zv)];
  const section=z=>{
    const za=state.appointments.filter(a=>visible(a)&&Number(a.zone||zoneOfBlock(a.block))===z);
    const custom=[...new Set(za.map(a=>a.slot).filter(s=>s&&!SLOTS.includes(s)))];
    const slots=[...new Set([...SLOTS,...custom])].sort((a,b)=>slotStartMinutes(a)-slotStartMinutes(b)||String(a).localeCompare(String(b)));
    const rows=slots.map((slot,i)=>{
      const t1=za.filter(a=>a.team==="Team 1"&&a.slot===slot).map(appointmentForPlanner),t2=za.filter(a=>a.team==="Team 2"&&a.slot===slot).map(appointmentForPlanner);
      const isCustom=!SLOTS.includes(slot);
      return `<tr class="${isCustom?"custom-slot-row":""}">${i===0?`<td class="date-cell" rowspan="${slots.length}"><strong>Zone ${z}</strong><br><small>${esc(plannerDateShort(date))}</small></td>`:""}<td class="slot-cell">${isCustom?`<span class="custom-slot-dot">Custom</span>`:""}${esc(slot)}</td><td class="team-cell">${plannerTeamCell(t1,"Team 1",slot,z)}</td><td class="remarks-cell">${esc(plannerRemarks(t1))}</td><td class="slot-cell team2-start">${isCustom?`<span class="custom-slot-dot">Custom</span>`:""}${esc(slot)}</td><td class="team-cell">${plannerTeamCell(t2,"Team 2",slot,z)}</td><td class="remarks-cell">${esc(plannerRemarks(t2))}</td></tr>`
    }).join("");
    return `<section class="planner-zone-section">${zoneGroupHeader(z,za.length,"appointments")}<div class="planner-zone-blocks">${bv==="all"?`Blocks ${(ZONE_BLOCKS[z]||[]).join(", ")}`:`Block ${bv}`}</div><div class="planner-table-wrap"><table class="planner-table"><thead><tr><th>Zone / Date</th><th>Time</th><th>Team 1</th><th>Remarks</th><th class="team2-start">Time</th><th>Team 2</th><th>Remarks</th></tr></thead><tbody>${rows}</tbody></table></div></section>`
  };
  document.getElementById("plannerTable").innerHTML=zones.map(section).join("");
  document.getElementById("plannerSpecialTimes").innerHTML="";
  const un=state.appointments.filter(a=>visible(a)&&!a.team).sort((a,b)=>Number(a.zone||zoneOfBlock(a.block))-Number(b.zone||zoneOfBlock(b.block))||slotStartMinutes(a.slot)-slotStartMinutes(b.slot)||a.block-b.block);
  document.getElementById("plannerUnassigned").innerHTML=un.length?un.map(a=>`<div class="unassigned-chip"><div><strong>Zone ${a.zone||zoneOfBlock(a.block)} · Blk ${a.block} · ${esc(a.unitDisplay)}</strong><span>${esc(a.slot)}${String(a.source||"").includes("Excel")?" · Excel":""}</span></div><div class="unassigned-actions"><button data-assign-team="Team 1" data-appt-id="${a.id}">Team 1</button><button data-assign-team="Team 2" data-appt-id="${a.id}">Team 2</button><button data-planner-edit="${a.id}">Edit</button><button class="cancel" data-planner-cancel="${a.id}">Cancel</button></div></div>`).join(""):`<div class="empty-state">No unassigned appointments for this Zone / Block / Date.</div>`;
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
  if(!slot){toast("Enter custom Start and End time");return}

  if(editId){
    const a=state.appointments.find(x=>x.id===editId);if(!a)return;
    const changed=a.date!==date||a.slot!==slot||a.unitKey!==key;
    if(changed){
      state.appointments.push({...a,id:Date.now()+1,scheduleState:"Rescheduled",source:"Planner History"});
    }
    state.appointments.filter(x=>x.id!==editId&&x.unitKey===key&&!isInactiveSchedule(x)&&x.workStatus!=="Completed"&&!appointmentHasEnded(x)).forEach(x=>x.scheduleState="Rescheduled");
    a.unitKey=key;a.zone=u.zone;a.block=u.block;a.floor=u.floor;a.unit=u.unit;a.unitDisplay=unitDisplay(u.floor,u.unit);
    a.date=date;a.slot=slot;a.team=team;a.remarks=remarks;a.source="Planner";a.scheduleState="Active";a.workStatus=appointmentHasEnded(a)?"Completed":"Pending";
    if(!a.ownerName)a.ownerName=u.ownerName||"";if(!a.contact)a.contact=u.contact||"";
    resetPlannerForm();save(changed?"Appointment rescheduled · old booking kept in history":"Planner appointment updated");return
  }

  const exact=state.appointments.find(x=>x.unitKey===key&&x.date===date&&x.slot===slot&&!isInactiveSchedule(x));
  if(exact){
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

  state.appointments.push({id:Date.now(),unitKey:key,zone:u.zone,block:u.block,floor:u.floor,unit:u.unit,unitDisplay:unitDisplay(u.floor,u.unit),ownerName:u.ownerName,contact:u.contact,date,slot,team,remarks,source:"Planner",scheduleState:"Active",workStatus:"Pending"});
  resetPlannerForm();save(existing.length?"Appointment rescheduled · old booking moved to history":"Planner updated · Master Data synced")
}
document.getElementById("plannerForm").addEventListener("submit",e=>{e.preventDefault();savePlannerAppointment()});
document.getElementById("plannerCancelEdit").addEventListener("click",resetPlannerForm);
document.getElementById("plannerViewZone").addEventListener("change",()=>{const z=document.getElementById("plannerViewZone").value;document.getElementById("plannerViewBlock").innerHTML=filterBlockOptions(z,true);renderPlanner()});
document.getElementById("plannerViewBlock").addEventListener("change",renderPlanner);
document.getElementById("teamDate").addEventListener("change",()=>{if(document.getElementById("plannerEditId").value)resetPlannerForm();renderPlanner()});
document.getElementById("plannerPrevDay").addEventListener("click",()=>{resetPlannerForm();document.getElementById("teamDate").value=addDaysISO(document.getElementById("teamDate").value||isoTodaySG(),-1);renderPlanner()});
document.getElementById("plannerNextDay").addEventListener("click",()=>{resetPlannerForm();document.getElementById("teamDate").value=addDaysISO(document.getElementById("teamDate").value||isoTodaySG(),1);renderPlanner()});
document.getElementById("plannerToday").addEventListener("click",()=>{resetPlannerForm();document.getElementById("teamDate").value=isoTodaySG();renderPlanner()});
document.getElementById("plannerTable").addEventListener("click",e=>{let b=e.target.closest("[data-planner-prefill]");if(b){resetPlannerForm();const [team,slot,zone]=b.dataset.plannerPrefill.split("|");document.getElementById("plannerTeam").value=team;document.getElementById("plannerSlot").value=slot;if(zone){document.getElementById("plannerZone").value=zone;syncPlannerBlocks()}togglePlannerCustomTime();document.getElementById("plannerBlock").focus();return}b=e.target.closest("[data-planner-edit]");if(b)return editPlannerAppointment(Number(b.dataset.plannerEdit));b=e.target.closest("[data-planner-cancel]");if(b)return cancelAppointment(Number(b.dataset.plannerCancel))});
document.getElementById("plannerSpecialTimes").addEventListener("click",e=>{let b=e.target.closest("[data-planner-edit]");if(b)return editPlannerAppointment(Number(b.dataset.plannerEdit));b=e.target.closest("[data-planner-cancel]");if(b)return cancelAppointment(Number(b.dataset.plannerCancel))});
document.getElementById("plannerUnassigned").addEventListener("click",e=>{let b=e.target.closest("[data-assign-team]");if(b){const a=state.appointments.find(x=>x.id===Number(b.dataset.apptId));if(a){a.team=b.dataset.assignTeam;save(`${a.unitDisplay} assigned to ${a.team}`)}return}b=e.target.closest("[data-planner-edit]");if(b)return editPlannerAppointment(Number(b.dataset.plannerEdit));b=e.target.closest("[data-planner-cancel]");if(b)return cancelAppointment(Number(b.dataset.plannerCancel))});

function buildReportRows(zoneFilter="all",blockFilter="all"){
  const rows=[];Object.keys(ZONE_BLOCKS).forEach(z=>{if(zoneFilter!=="all"&&String(z)!==String(zoneFilter))return;ZONE_BLOCKS[z].forEach(block=>{if(blockFilter!=="all"&&String(block)!==String(blockFilter))return;const u=getBlockUnits(block),total=u.length,agree=u.filter(x=>x.response==="A"||x.response==="C").length,done=u.filter(x=>x.workStatus==="Completed").length,d=u.filter(x=>x.response==="D").length,nr=u.filter(x=>x.response==="NR").length;rows.push({zone:Number(z),block,total,agree,agreePct:total?agree/total*100:0,done,donePct:total?done/total*100:0,d,dPct:total?d/total*100:0,nr,nrPct:total?nr/total*100:0})})});return rows
}
function reportTotals(rows){const t=rows.reduce((o,r)=>{o.total+=r.total;o.agree+=r.agree;o.done+=r.done;o.d+=r.d;o.nr+=r.nr;return o},{total:0,agree:0,done:0,d:0,nr:0});return{...t,agreePct:t.total?t.agree/t.total*100:0,donePct:t.total?t.done/t.total*100:0,dPct:t.total?t.d/t.total*100:0,nrPct:t.total?t.nr/t.total*100:0}}
function pct(v){return`${v.toFixed(1)}%`}
function renderReport(){
  const z=document.getElementById("reportZoneFilter").value,b=document.getElementById("reportBlockFilter").value,rows=buildReportRows(z,b),t=reportTotals(rows);
  document.getElementById("reportSummaryCards").innerHTML=`<div class="report-mini-card"><span>Total Units</span><strong>${t.total}</strong></div><div class="report-mini-card"><span>Opt-In A+C</span><strong>${t.agree}</strong></div><div class="report-mini-card"><span>Completed</span><strong>${t.done}</strong></div><div class="report-mini-card"><span>Opt-Out D</span><strong>${t.d}</strong></div><div class="report-mini-card"><span>No Response NR</span><strong>${t.nr}</strong></div>`;
  document.getElementById("reportTable").innerHTML=`<table class="weekly-table"><colgroup><col style="width:5%"><col style="width:8%"><col style="width:9%"><col style="width:8%"><col style="width:7%"><col style="width:8%"><col style="width:7%"><col style="width:8%"><col style="width:7%"><col style="width:8%"><col style="width:7%"></colgroup><thead><tr><th rowspan="2" class="weekly-head">S/N</th><th rowspan="2" class="weekly-head">BLK NO.</th><th rowspan="2" class="weekly-head">TOTAL UNITS</th><th colspan="2" class="weekly-head">UNITS OPT-IN<br>(Agree = A + C)</th><th colspan="2" class="weekly-head">UNITS OPT-IN<br>(Work Completed)</th><th colspan="2" class="weekly-head">UNITS OPT-OUT<br>(D)</th><th colspan="2" class="weekly-head">UNITS NO RESPONSE<br>(NR)</th></tr><tr><th>Number</th><th>%</th><th>Number</th><th>%</th><th>Number</th><th>%</th><th>Number</th><th>%</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td><strong>${r.block}</strong></td><td>${r.total}</td><td>${r.agree}</td><td>${pct(r.agreePct)}</td><td>${r.done}</td><td>${pct(r.donePct)}</td><td>${r.d}</td><td>${pct(r.dPct)}</td><td>${r.nr}</td><td>${pct(r.nrPct)}</td></tr>`).join("")}<tr class="total-row"><td colspan="2">TOTAL DU</td><td>${t.total}</td><td>${t.agree}</td><td>${pct(t.agreePct)}</td><td>${t.done}</td><td>${pct(t.donePct)}</td><td>${t.d}</td><td>${pct(t.dPct)}</td><td>${t.nr}</td><td>${pct(t.nrPct)}</td></tr></tbody></table>`;
}
document.getElementById("reportZoneFilter").addEventListener("change",()=>{const z=document.getElementById("reportZoneFilter").value;document.getElementById("reportBlockFilter").innerHTML=filterBlockOptions(z,true);renderReport()});
document.getElementById("reportBlockFilter").addEventListener("change",renderReport);

function csvCell(v){return`"${String(v??"").replace(/"/g,'""')}"`}function toCSV(rows){return rows.map(r=>r.map(csvCell).join(",")).join("\n")}function download(name,content,type="text/csv;charset=utf-8"){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
document.getElementById("exportProgressBtn").addEventListener("click",()=>{const z=document.getElementById("reportZoneFilter").value,b=document.getElementById("reportBlockFilter").value,r=buildReportRows(z,b),t=reportTotals(r);download(`ELU_Weekly_Progress_${z==="all"?"All_Zones":"Zone_"+z}.csv`,toCSV([["S/N","BLK NO.","TOTAL UNITS","OPT-IN A+C","OPT-IN %","WORK COMPLETED","COMPLETED %","OPT-OUT D","D %","NO RESPONSE NR","NR %"],...r.map((x,i)=>[i+1,x.block,x.total,x.agree,pct(x.agreePct),x.done,pct(x.donePct),x.d,pct(x.dPct),x.nr,pct(x.nrPct)]),["","TOTAL DU",t.total,t.agree,pct(t.agreePct),t.done,pct(t.donePct),t.d,pct(t.dPct),t.nr,pct(t.nrPct)] ]))});
document.getElementById("exportUnitsBtn").addEventListener("click",()=>{if(!confirm("Unit Register export contains resident details. Save the file securely. Continue?"))return;download("ELU_Unit_Register.csv",toCSV([["Zone","Block No","Unit No","Status","Owner Name","Contact","Appointment Date","Appointment Slot","Remarks"],...unitsArray().map(u=>[u.zone,u.block,unitDisplay(u.floor,u.unit),u.response,u.ownerName,u.contact,u.appointmentDate,u.appointmentSlot,u.remarks])]))});
document.getElementById("exportBackupBtn").addEventListener("click",()=>{if(!confirm("Backup contains resident and appointment data. Keep it private. Continue?"))return;download(`ELU_Backup_${isoTodaySG()}.json`,JSON.stringify({surveys:state.surveys,appointments:state.appointments,complaints:state.complaints},null,2),"application/json")});

function renderAll(){rebuildAllMasters();renderDashboard();renderBlockBoard();renderSurveyTable();renderAppointmentTable();renderUnitTable();renderComplaintTable();renderPlanner();renderReport()}
function startApp(){
  if(appStarted)return;
  appStarted=true;
  document.getElementById("todayChip").textContent=fmtDate.format(new Date());
  document.getElementById("appointmentFilterDate").value="";
  document.getElementById("appointmentMode").value="upcoming";
  document.getElementById("complaintDate").value=isoTodaySG();
  document.getElementById("teamDate").value=isoTodaySG();
  initSelectors();
  togglePlannerCustomTime();
  toggleAppointmentCustomTime();
  resetAppointmentForm();
  rebuildAllMasters();
  renderAll();
  autoCompleteAppointments();
  autoCompleteTimer=setInterval(()=>autoCompleteAppointments(true),60000)
}
initSecurityGate();
