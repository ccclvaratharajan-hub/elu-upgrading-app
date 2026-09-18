const STORAGE_KEY="elu_premium_v9";
const PREV_STORAGE_KEY="elu_premium_v8";
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
  return (SOURCE_APPOINTMENTS||[]).map(a=>({...a,scheduleState:a.scheduleState||"Active"}))
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
    response:normalizeStatus(seed.response),ownerName:seed.ownerName||"",contact:seed.contact||"",remarks:seed.remarks||"",
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
  fresh.surveys=(saved.surveys||[]).map(s=>({...s,response:normalizeStatus(s.response),createdAt:s.createdAt||new Date(Number(s.id)||Date.now()).toISOString()}));
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
        remarks:clean.remarks||seed.remarks||"",
        team:clean.team||seed.team||"",
        scheduleState:clean.scheduleState||seed.scheduleState||"Active",
        workStatus:clean.workStatus||seed.workStatus||"Pending"
      };
    }else if(isUserAppointment(clean)){
      fresh.appointments.push(clean);
    }
  });
  return fresh
}
function migratePrevious(){
  try{
    const old=JSON.parse(localStorage.getItem(PREV_STORAGE_KEY)||"null");
    return mergeSavedIntoFresh(old)
  }catch{return makeInitialState()}
}
function loadState(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
    if(saved)return mergeSavedIntoFresh(saved)
  }catch{}
  return migratePrevious()
}
let state=loadState();
normalizeManualOverrides();

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
  if(latestSurvey){
    base.ownerName=latestSurvey.ownerName||"";
    base.contact=latestSurvey.contact||base.contact;
    base.response=normalizeStatus(latestSurvey.response)||base.response;
    base.followUpDate=latestSurvey.followUpDate||"";
    base.lastFollowUp=latestSurvey.createdAt?latestSurvey.createdAt.slice(0,10):"";
    base.remarks=latestSurvey.remarks||"";
  }
  const latestAppt=preferredMasterAppointment(key);
  if(latestAppt){
    base.appointmentDate=latestAppt.date||"";
    base.appointmentSlot=latestAppt.slot||"";
    base.team=latestAppt.team||"";
    if(latestAppt.ownerName)base.ownerName=latestAppt.ownerName;
    if(latestAppt.contact)base.contact=latestAppt.contact;
    if(latestAppt.remarks){
      const parts=[base.remarks,latestAppt.remarks].map(v=>String(v||"").trim()).filter(Boolean);
      base.remarks=[...new Set(parts)].join(" · ");
    }
    if(latestAppt.workStatus==="Completed"||appointmentHasEnded(latestAppt)){
      latestAppt.workStatus="Completed";base.workStatus="Completed";base.response="A";
    }else{
      base.response="C";
    }
  }
  state.units[key]=base;
}
function rebuildAllMasters(){Object.keys(state.units).forEach(rebuildUnitMaster)}
function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify({surveys:state.surveys,appointments:state.appointments,complaints:state.complaints,createdAt:state.createdAt}))}
function save(msg){rebuildAllMasters();persist();renderAll();if(msg)toast(msg)}
function autoCompleteAppointments(showToast=false){
  let changed=0;
  state.appointments.forEach(a=>{
    if(!isInactiveSchedule(a)&&a.workStatus!=="Completed"&&appointmentHasEnded(a)){a.workStatus="Completed";changed++}
  });
  if(changed){rebuildAllMasters();persist();renderAll();if(showToast)toast(`${changed} appointment${changed===1?"":"s"} changed C → A`)}
}
rebuildAllMasters();persist();

function viewTitle(view){return {
dashboard:["Executive Dashboard","One view of A, C, D, NR, appointments and completed work."],
blockboard:["Block & Floor Board","Exact floor-wise units from your PR3 Excel files."],
survey:["Survey & Follow-up","First-entry register. Unit Register updates automatically."],
appointments:["Appointment Schedule","Planner is prefilled from the uploaded PR3 schedule. Enter resident details here without double entry."],
units:["Unit Register","Read-only master data populated automatically from your working registers."],
complaints:["Complaint Register","Separate complaint records with unit lookup."],
teams:["Appointment Planner","Plan Team 1 and Team 2 across four standard slots, plus special custom time when needed."],
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
function unitOptionsForBlock(block){return getBlockUnits(block).map(u=>`<option value="${u.key}">${unitDisplay(u.floor,u.unit)}</option>`).join("")}
function initSelectors(){
  ["boardZone","surveyZone"].forEach(id=>document.getElementById(id).innerHTML=zoneOptions());
  document.getElementById("unitZoneFilter").innerHTML=zoneOptions(true);
  document.getElementById("reportZoneFilter").innerHTML=zoneOptions(true);
  document.getElementById("unitZoneFilter").value="1";document.getElementById("reportZoneFilter").value="1";
  document.getElementById("boardZone").value="1";syncBoardBlocks();
  document.getElementById("surveyZone").value="1";syncSurveyBlocks();
  ["appointmentBlock","complaintBlock","plannerBlock"].forEach(id=>document.getElementById(id).innerHTML=Object.values(ZONE_BLOCKS).flat().map(b=>`<option value="${b}">Blk ${b}</option>`).join(""));
  syncPairUnits("appointment");syncPairUnits("complaint");syncPlannerUnits();
}
function syncBoardBlocks(){const z=document.getElementById("boardZone").value;document.getElementById("boardBlock").innerHTML=blockOptions(z);renderBoardFloorOptions();renderBlockBoard()}
function renderBoardFloorOptions(){
  const b=document.getElementById("boardBlock").value,floors=Object.keys(PROJECT_LAYOUT[b]?.floors||{}).map(Number).sort((a,b)=>b-a),e=document.getElementById("boardFloor"),old=e.value;
  e.innerHTML=`<option value="all">All floors</option>`+floors.map(x=>`<option value="${x}">Floor ${x}</option>`).join("");if([...e.options].some(o=>o.value===old))e.value=old
}
function syncSurveyBlocks(){document.getElementById("surveyBlock").innerHTML=blockOptions(document.getElementById("surveyZone").value);syncSurveyUnits()}
function syncSurveyUnits(){document.getElementById("surveyUnit").innerHTML=unitOptionsForBlock(document.getElementById("surveyBlock").value);autofillSurvey()}
function syncPairUnits(prefix){document.getElementById(prefix+"Unit").innerHTML=unitOptionsForBlock(document.getElementById(prefix+"Block").value);autofillPair(prefix)}
function syncPlannerUnits(){document.getElementById("plannerUnit").innerHTML=unitOptionsForBlock(document.getElementById("plannerBlock").value)}
function autofillSurvey(){const u=getUnit(document.getElementById("surveyUnit").value);if(!u)return;document.getElementById("surveyOwner").value=u.ownerName||"";document.getElementById("surveyContact").value=u.contact||"";document.getElementById("surveyResponse").value=u.response==="C"?"A":normalizeStatus(u.response)}

function preferredUnitAppointment(key){return preferredMasterAppointment(key)}
function appointmentTargetForForm(key){
  const editId=Number(document.getElementById("appointmentEditId").value);
  if(editId)return state.appointments.find(a=>a.id===editId)||null;
  return preferredUnitAppointment(key)
}
function renderAppointmentPlan(a){
  const card=document.getElementById("appointmentPlanCard"),note=document.getElementById("appointmentSyncNote");
  document.getElementById("appointmentPlanDate").textContent=a?safeDate(a.date):"—";
  document.getElementById("appointmentPlanSlot").textContent=a?(a.slot||"—"):"—";
  document.getElementById("appointmentPlanTeam").textContent=a?(a.team||"Unassigned"):"—";
  card.classList.toggle("no-plan",!a);
  if(note)note.textContent=a?`Schedule synced from Planner: ${safeDate(a.date)} · ${a.slot}${a.team?` · ${a.team}`:""}`:"No planner booking found for this unit. Add Date + Slot in Appointment Planner first."
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
    renderAppointmentPlan(a)
  }
}
document.getElementById("boardZone").addEventListener("change",syncBoardBlocks);document.getElementById("boardBlock").addEventListener("change",()=>{renderBoardFloorOptions();renderBlockBoard()});document.getElementById("boardFloor").addEventListener("change",renderBlockBoard);document.getElementById("boardSearch").addEventListener("input",renderBlockBoard);
document.getElementById("surveyZone").addEventListener("change",syncSurveyBlocks);document.getElementById("surveyBlock").addEventListener("change",syncSurveyUnits);document.getElementById("surveyUnit").addEventListener("change",autofillSurvey);
["appointment","complaint"].forEach(p=>{document.getElementById(p+"Block").addEventListener("change",()=>syncPairUnits(p));document.getElementById(p+"Unit").addEventListener("change",()=>autofillPair(p))});
document.getElementById("plannerBlock").addEventListener("change",syncPlannerUnits);
document.getElementById("plannerSlot").addEventListener("change",togglePlannerCustomTime);

function renderDashboard(){
  const u=unitsArray(),total=u.length,a=u.filter(x=>x.response==="A").length,c=u.filter(x=>x.response==="C").length,d=u.filter(x=>x.response==="D").length,nr=u.filter(x=>x.response==="NR").length,done=u.filter(x=>x.workStatus==="Completed").length;
  const agree=a+c,openFollowups=state.surveys.filter(s=>s.followUpDate&&s.followUpDate>=isoTodaySG()).length,donePct=total?Math.round(done/total*100):0;
  document.getElementById("heroTotalUnits").textContent=total.toLocaleString();const tag=document.getElementById("heroTagUnits");if(tag)tag.textContent=`${total.toLocaleString()} Units`;const orbit=document.getElementById("heroOrbit");if(orbit)orbit.style.setProperty("--pct",`${donePct*3.6}deg`);const orbitText=document.getElementById("heroCompletionPct");if(orbitText)orbitText.textContent=`${donePct}%`;
  document.getElementById("kpiOptIn").textContent=agree.toLocaleString();document.getElementById("kpiOptInPct").textContent=`${Math.round(agree/total*100)}% · A + C`;
  document.getElementById("kpiAppointments").textContent=c.toLocaleString();
  document.getElementById("kpiCompleted").textContent=done.toLocaleString();document.getElementById("kpiCompletedPct").textContent=`${donePct}% project`;
  document.getElementById("kpiNR").textContent=nr.toLocaleString();document.getElementById("kpiOptOut").textContent=d.toLocaleString();document.getElementById("kpiFollowups").textContent=openFollowups.toLocaleString();
  document.getElementById("zoneProgress").innerHTML=Object.keys(ZONE_BLOCKS).map(z=>{const zu=u.filter(x=>x.zone===Number(z)),zc=zu.filter(x=>x.workStatus==="Completed").length,za=zu.filter(x=>x.response==="A"||x.response==="C").length,pct=Math.round(zc/zu.length*100);return`<div class="zone-line"><div><div><div class="zone-name">Zone ${z}</div><div class="zone-pct">${pct}% complete</div></div><div class="zone-mini">${zc}/${zu.length}<br>${za} opt-in</div></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div>`}).join("");
  const upcoming=state.appointments.filter(x=>x.workStatus!=="Completed"&&!appointmentHasEnded(x)&&x.date>=isoTodaySG()).sort((a,b)=>a.date.localeCompare(b.date)||SLOTS.indexOf(a.slot)-SLOTS.indexOf(b.slot)).slice(0,6);
  document.getElementById("upcomingAppointments").innerHTML=upcoming.length?upcoming.map(x=>`<div class="compact-item"><div><strong>Blk ${x.block} · ${esc(x.unitDisplay)}</strong><span>${esc(getUnit(x.unitKey)?.ownerName||"Owner not entered")} · ${esc(x.team||"Unassigned")}</span></div><small>C · ${safeDate(x.date)}<br>${esc(x.slot)}</small></div>`).join(""):`<div class="empty-state">No upcoming confirmations.</div>`;
  const follow=state.surveys.filter(s=>s.followUpDate&&s.followUpDate>=isoTodaySG()).sort((a,b)=>a.followUpDate.localeCompare(b.followUpDate)).slice(0,6);document.getElementById("followupAttention").innerHTML=follow.length?follow.map(s=>`<div class="attention-card"><strong>Blk ${s.block} · ${esc(s.unitDisplay)}</strong><span>${esc(s.ownerName||"Owner not entered")} · ${esc(s.contact||"No contact")}</span><b>${safeDate(s.followUpDate)}</b></div>`).join(""):`<div class="empty-state">No follow-ups scheduled.</div>`;
  renderTodayTeamBoard();
}
function renderBlockBoard(){
  const block=Number(document.getElementById("boardBlock").value),floorFilter=document.getElementById("boardFloor").value,q=document.getElementById("boardSearch").value.trim().toLowerCase(),u=getBlockUnits(block);
  const a=u.filter(x=>x.response==="A").length,c=u.filter(x=>x.response==="C").length,d=u.filter(x=>x.response==="D").length,nr=u.filter(x=>x.response==="NR").length;
  document.getElementById("blockHeadline").innerHTML=`<div><h2>Block ${block}</h2><p>Zone ${PROJECT_LAYOUT[block].zone} · ${u.length} exact units</p></div><div class="block-stats"><span class="mini-stat">A <strong>${a}</strong></span><span class="mini-stat">C <strong>${c}</strong></span><span class="mini-stat">D <strong>${d}</strong></span><span class="mini-stat">NR <strong>${nr}</strong></span></div>`;
  const floors=[...new Set(u.map(x=>x.floor))].sort((a,b)=>b-a).filter(f=>floorFilter==="all"||Number(floorFilter)===f);
  document.getElementById("floorBoard").innerHTML=floors.map(f=>{const fu=u.filter(x=>x.floor===f).filter(x=>!q||unitDisplay(x.floor,x.unit).toLowerCase().includes(q)||String(x.unit).includes(q));if(!fu.length)return"";return`<div class="floor-row"><div class="floor-label"><strong>${f}</strong><span>Floor</span></div><div class="unit-grid">${fu.map(x=>{const sc=x.response==="A"?"status-a":x.response==="C"?"status-c":x.response==="D"?"status-out":x.response==="NR"?"status-nr":"";const dateLine=x.appointmentDate&&(x.response==="A"||x.response==="C")?`<div class="u-date ${x.response==="A"?"done-date":"appt-date"}"><span>${x.response==="A"?"Done":"Appt"}</span>${esc(shortBoardDate(x.appointmentDate))}</div>`:"";return`<button class="unit-card ${sc}" data-unit-key="${x.key}"><div class="u-no">${unitDisplay(x.floor,x.unit)}</div><div class="u-status">${esc(statusLabel(x.response))}</div>${dateLine}</button>`}).join("")}</div></div>`}).join("")||`<div class="empty-state">No units match this filter.</div>`;
}
document.getElementById("floorBoard").addEventListener("click",e=>{const b=e.target.closest("[data-unit-key]");if(b)openDrawer(b.dataset.unitKey)});

function latestAppointment(key){return latestById(state.appointments.filter(a=>a.unitKey===key))}
function openDrawer(key){
  const u=getUnit(key);if(!u)return;const a=latestAppointment(key);
  document.getElementById("drawerUnitKey").value=key;document.getElementById("drawerUnitTitle").textContent=`Blk ${u.block} · ${unitDisplay(u.floor,u.unit)}`;document.getElementById("drawerUnitMeta").textContent=`Zone ${u.zone} · Floor ${u.floor}`;
  document.getElementById("drawerStatusText").textContent=statusLabel(u.response);document.getElementById("drawerOwnerText").textContent=u.ownerName||"—";document.getElementById("drawerContactText").textContent=u.contact||"—";document.getElementById("drawerFollowupText").textContent=safeDate(u.followUpDate)||"—";document.getElementById("drawerRemarksText").textContent=u.remarks||"—";document.getElementById("drawerAppointmentText").textContent=u.appointmentDate?`${safeDate(u.appointmentDate)} · ${u.appointmentSlot}`:"—";document.getElementById("drawerTeamText").textContent=u.team||"—";
  const legacy=document.getElementById("drawerLegacy"),txt=[u.legacySchedule&&`Imported schedule: ${u.legacySchedule}`,u.legacyRemark&&`Imported Excel remark: ${u.legacyRemark}`].filter(Boolean).join("<br>");legacy.innerHTML=txt;legacy.classList.toggle("show",!!txt);
  document.getElementById("drawerBackdrop").classList.add("open");document.getElementById("unitDrawer").classList.add("open");
}
function closeDrawer(){document.getElementById("drawerBackdrop").classList.remove("open");document.getElementById("unitDrawer").classList.remove("open")}
document.getElementById("drawerClose").addEventListener("click",closeDrawer);document.getElementById("drawerBackdrop").addEventListener("click",closeDrawer);
function jumpFromDrawer(target){const u=getUnit(document.getElementById("drawerUnitKey").value);if(!u)return;closeDrawer();setView(target);if(target==="survey"){document.getElementById("surveyZone").value=String(u.zone);syncSurveyBlocks();document.getElementById("surveyBlock").value=String(u.block);syncSurveyUnits();document.getElementById("surveyUnit").value=u.key;autofillSurvey()}else{document.getElementById("appointmentBlock").value=String(u.block);syncPairUnits("appointment");document.getElementById("appointmentUnit").value=u.key;autofillPair("appointment")}}
document.getElementById("drawerSurveyBtn").addEventListener("click",()=>jumpFromDrawer("survey"));document.getElementById("drawerAppointmentBtn").addEventListener("click",()=>jumpFromDrawer("appointments"));

function resetSurveyForm(){
  document.getElementById("surveyEditId").value="";document.getElementById("surveySaveBtn").textContent="Save Survey Entry → Update Unit Register";document.getElementById("surveyCancelEdit").classList.add("hidden");document.getElementById("surveyRemarks").value="";document.getElementById("surveyFollowup").value="";autofillSurvey()
}
document.getElementById("surveyCancelEdit").addEventListener("click",resetSurveyForm);
document.getElementById("surveyForm").addEventListener("submit",e=>{
  e.preventDefault();const key=document.getElementById("surveyUnit").value,u=getUnit(key);if(!u)return;const id=Number(document.getElementById("surveyEditId").value)||Date.now();
  const entry={id,createdAt:new Date().toISOString(),unitKey:key,zone:u.zone,block:u.block,floor:u.floor,unit:u.unit,unitDisplay:unitDisplay(u.floor,u.unit),ownerName:document.getElementById("surveyOwner").value.trim(),contact:document.getElementById("surveyContact").value.trim(),response:normalizeStatus(document.getElementById("surveyResponse").value),followUpDate:document.getElementById("surveyFollowup").value,remarks:document.getElementById("surveyRemarks").value.trim()};
  const idx=state.surveys.findIndex(s=>s.id===id);if(idx>=0)state.surveys[idx]=entry;else state.surveys.push(entry);resetSurveyForm();save(idx>=0?"Survey entry updated":"Survey saved · Unit Register updated");
});
function editSurvey(id){
  const s=state.surveys.find(x=>x.id===id);if(!s)return;setView("survey");document.getElementById("surveyZone").value=String(s.zone);syncSurveyBlocks();document.getElementById("surveyBlock").value=String(s.block);syncSurveyUnits();document.getElementById("surveyUnit").value=s.unitKey;document.getElementById("surveyOwner").value=s.ownerName||"";document.getElementById("surveyContact").value=s.contact||"";document.getElementById("surveyResponse").value=normalizeStatus(s.response);document.getElementById("surveyFollowup").value=s.followUpDate||"";document.getElementById("surveyRemarks").value=s.remarks||"";document.getElementById("surveyEditId").value=String(s.id);document.getElementById("surveySaveBtn").textContent="Update Survey Entry";document.getElementById("surveyCancelEdit").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"})
}
function deleteSurvey(id){if(!confirm("Delete this survey entry?"))return;state.surveys=state.surveys.filter(x=>x.id!==id);save("Survey entry deleted")}
function renderSurveyTable(){
  const r=[...state.surveys].sort((a,b)=>b.id-a.id);document.getElementById("surveyTable").innerHTML=r.length?`<table><thead><tr><th>Date</th><th>Block / Unit</th><th>Owner</th><th>Contact</th><th>Status</th><th>Follow-up</th><th>Note</th><th>Action</th></tr></thead><tbody>${r.map(s=>`<tr><td>${safeDate((s.createdAt||"").slice(0,10))}</td><td>Blk ${s.block}<br><strong>${esc(s.unitDisplay)}</strong></td><td>${esc(s.ownerName||"—")}</td><td>${esc(s.contact||"—")}</td><td>${statusPill(s.response)}</td><td>${safeDate(s.followUpDate)||"—"}</td><td>${esc(s.remarks||"—")}</td><td><div class="action-set"><button class="table-action" data-survey-edit="${s.id}">Edit</button><button class="table-action delete" data-survey-delete="${s.id}">Delete</button></div></td></tr>`).join("")}</tbody></table>`:`<div class="empty-state">No survey entries yet.</div>`
}
document.getElementById("surveyTable").addEventListener("click",e=>{let b=e.target.closest("[data-survey-edit]");if(b)return editSurvey(Number(b.dataset.surveyEdit));b=e.target.closest("[data-survey-delete]");if(b)deleteSurvey(Number(b.dataset.surveyDelete))});

function resetAppointmentForm(){
  document.getElementById("appointmentEditId").value="";
  document.getElementById("appointmentSaveBtn").textContent="Save Resident Details";
  document.getElementById("appointmentCancelEdit").classList.add("hidden");
  autofillPair("appointment")
}
document.getElementById("appointmentCancelEdit").addEventListener("click",resetAppointmentForm);
document.getElementById("appointmentForm").addEventListener("submit",e=>{
  e.preventDefault();
  const key=document.getElementById("appointmentUnit").value,u=getUnit(key);if(!u)return;
  const a=appointmentTargetForForm(key);
  if(!a){toast("Set Date + Slot in Appointment Planner first");return}
  a.ownerName=document.getElementById("appointmentOwner").value.trim();
  a.contact=document.getElementById("appointmentContact").value.trim();
  a.remarks=document.getElementById("appointmentRemarks").value.trim();
  if(!a.source)a.source="Planner";if(!a.scheduleState)a.scheduleState="Active";
  document.getElementById("appointmentEditId").value="";
  save("Resident details saved · Master Data updated")
});
function editAppointment(id){
  const a=state.appointments.find(x=>x.id===id);if(!a)return;
  setView("appointments");
  document.getElementById("appointmentEditId").value=String(a.id);
  document.getElementById("appointmentBlock").value=String(a.block);
  syncPairUnits("appointment");
  document.getElementById("appointmentUnit").value=a.unitKey;
  document.getElementById("appointmentOwner").value=a.ownerName||getUnit(a.unitKey)?.ownerName||"";
  document.getElementById("appointmentContact").value=a.contact||getUnit(a.unitKey)?.contact||"";
  document.getElementById("appointmentRemarks").value=a.remarks||"";
  document.getElementById("appointmentSaveBtn").textContent="Update Resident Details";
  document.getElementById("appointmentCancelEdit").classList.remove("hidden");
  renderAppointmentPlan(a);
  window.scrollTo({top:0,behavior:"smooth"})
}
function deleteAppointment(id){if(!confirm("Delete this appointment? The Unit Register will recalculate automatically."))return;state.appointments=state.appointments.filter(x=>x.id!==id);save("Appointment deleted · Unit Register recalculated")}
document.getElementById("appointmentFilterDate").addEventListener("change",renderAppointmentTable);document.getElementById("appointmentMode").addEventListener("change",renderAppointmentTable);
function renderAppointmentTable(){
  const f=document.getElementById("appointmentFilterDate").value,mode=document.getElementById("appointmentMode").value;let r=[...state.appointments];
  const imported=r.filter(a=>String(a.source||"").includes("Excel")).length;const ic=document.getElementById("importedScheduleCount");if(ic)ic.textContent=imported.toLocaleString();
  if(f)r=r.filter(a=>a.date===f);
  else if(mode==="upcoming")r=r.filter(a=>!isInactiveSchedule(a)&&a.workStatus!=="Completed"&&!appointmentHasEnded(a)&&a.date>=isoTodaySG());
  else if(mode==="completed")r=r.filter(a=>isInactiveSchedule(a)||a.workStatus==="Completed"||appointmentHasEnded(a));
  r.sort((a,b)=>mode==="completed"?b.date.localeCompare(a.date)||slotStartMinutes(b.slot)-slotStartMinutes(a.slot):a.date.localeCompare(b.date)||slotStartMinutes(a.slot)-slotStartMinutes(b.slot));
  document.getElementById("appointmentTable").innerHTML=r.length?`<table><thead><tr><th>Date</th><th>Slot</th><th>Block / Unit</th><th>Owner</th><th>Contact</th><th>Team</th><th>Schedule</th><th>Unit Status</th><th>Source</th><th>Action</th></tr></thead><tbody>${r.slice(0,900).map(a=>{const u=getUnit(a.unitKey),st=a.scheduleState||"Active",sc=st==="Rescheduled"?"rescheduled":st==="History"?"history":a.workStatus==="Completed"?"completed":"confirmed";return`<tr><td>${safeDate(a.date)}</td><td>${esc(a.slot)}</td><td>Blk ${a.block}<br><strong>${esc(a.unitDisplay)}</strong></td><td>${esc(u?.ownerName||a.ownerName||"—")}</td><td>${esc(u?.contact||a.contact||"—")}</td><td>${esc(a.team||"Unassigned")}</td><td><span class="pill ${sc}">${esc(st==="Active"?(a.workStatus==="Completed"?"Completed":"Active"):st)}</span></td><td>${statusPill(u?.response)}</td><td><span class="pill ${String(a.source||"").includes("Excel")?"confirmed":"pending"}">${esc(a.source||"Manual")}</span></td><td><div class="action-set"><button class="table-action" data-appt-edit="${a.id}">Edit</button><button class="table-action delete" data-appt-delete="${a.id}">Delete</button></div></td></tr>`}).join("")}</tbody></table>${r.length>900?`<div class="empty-state">Showing first 900 records. Use View or Date filter to narrow the schedule.</div>`:""}`:`<div class="empty-state">No appointments found for this view.</div>`;
}
document.getElementById("appointmentTable").addEventListener("click",e=>{let b=e.target.closest("[data-appt-edit]");if(b)return editAppointment(Number(b.dataset.apptEdit));b=e.target.closest("[data-appt-delete]");if(b)deleteAppointment(Number(b.dataset.apptDelete))});

document.getElementById("unitSearch").addEventListener("input",renderUnitTable);document.getElementById("unitZoneFilter").addEventListener("change",renderUnitTable);
function renderUnitTable(){
  const q=document.getElementById("unitSearch").value.trim().toLowerCase(),zf=document.getElementById("unitZoneFilter").value;let r=unitsArray();if(zf!=="all")r=r.filter(u=>u.zone===Number(zf));if(q)r=r.filter(u=>`blk ${u.block} ${unitDisplay(u.floor,u.unit)} ${u.ownerName} ${u.contact}`.toLowerCase().includes(q));
  document.getElementById("unitTable").innerHTML=r.length?`<table><thead><tr><th>Block No</th><th>Unit No</th><th>Status</th><th>Owner Name</th><th>Contact</th><th>Appointment Date</th><th>Slot</th><th>Remarks</th></tr></thead><tbody>${r.map(u=>`<tr><td>Blk ${u.block}</td><td><strong>${unitDisplay(u.floor,u.unit)}</strong></td><td>${statusPill(u.response)}</td><td>${esc(u.ownerName||"—")}</td><td>${esc(u.contact||"—")}</td><td>${safeDate(u.appointmentDate)||"—"}</td><td>${esc(u.appointmentSlot||"—")}</td><td>${esc(u.remarks||"—")}</td></tr>`).join("")}</tbody></table>`:`<div class="empty-state">No matching unit records.</div>`
}

function resetComplaintForm(){document.getElementById("complaintEditId").value="";document.getElementById("complaintSaveBtn").textContent="Save Complaint";document.getElementById("complaintCancelEdit").classList.add("hidden");document.getElementById("complaintText").value="";document.getElementById("complaintRemarks").value="";document.getElementById("complaintDate").value=isoTodaySG();document.getElementById("complaintStatus").value="Open";autofillPair("complaint")}
document.getElementById("complaintCancelEdit").addEventListener("click",resetComplaintForm);
document.getElementById("complaintForm").addEventListener("submit",e=>{
  e.preventDefault();const key=document.getElementById("complaintUnit").value,u=getUnit(key);if(!u)return;const id=Number(document.getElementById("complaintEditId").value)||Date.now();
  const entry={id,unitKey:key,zone:u.zone,block:u.block,floor:u.floor,unit:u.unit,unitDisplay:unitDisplay(u.floor,u.unit),ownerName:u.ownerName,contact:u.contact,date:document.getElementById("complaintDate").value,status:document.getElementById("complaintStatus").value,complaint:document.getElementById("complaintText").value.trim(),remarks:document.getElementById("complaintRemarks").value.trim()};
  const idx=state.complaints.findIndex(c=>c.id===id);if(idx>=0)state.complaints[idx]=entry;else state.complaints.push(entry);resetComplaintForm();save(idx>=0?"Complaint updated":"Complaint saved separately");
});
function editComplaint(id){const c=state.complaints.find(x=>x.id===id);if(!c)return;setView("complaints");document.getElementById("complaintBlock").value=String(c.block);syncPairUnits("complaint");document.getElementById("complaintUnit").value=c.unitKey;autofillPair("complaint");document.getElementById("complaintDate").value=c.date;document.getElementById("complaintStatus").value=c.status;document.getElementById("complaintText").value=c.complaint;document.getElementById("complaintRemarks").value=c.remarks||"";document.getElementById("complaintEditId").value=String(c.id);document.getElementById("complaintSaveBtn").textContent="Update Complaint";document.getElementById("complaintCancelEdit").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"})}
function deleteComplaint(id){if(!confirm("Delete this complaint entry?"))return;state.complaints=state.complaints.filter(x=>x.id!==id);save("Complaint deleted")}
function renderComplaintTable(){const r=[...state.complaints].sort((a,b)=>b.id-a.id);document.getElementById("complaintTable").innerHTML=r.length?`<table><thead><tr><th>Date</th><th>Block / Unit</th><th>Owner</th><th>Contact</th><th>Complaint</th><th>Complaint Status</th><th>Remarks</th><th>Action</th></tr></thead><tbody>${r.map(c=>`<tr><td>${safeDate(c.date)}</td><td>Blk ${c.block}<br><strong>${esc(c.unitDisplay)}</strong></td><td>${esc(c.ownerName||"—")}</td><td>${esc(c.contact||"—")}</td><td>${esc(c.complaint)}</td><td><span class="pill ${c.status==="Closed"?"completed":c.status==="Open"?"d":"pending"}">${esc(c.status)}</span></td><td>${esc(c.remarks||"—")}</td><td><div class="action-set"><button class="table-action" data-comp-edit="${c.id}">Edit</button><button class="table-action delete" data-comp-delete="${c.id}">Delete</button></div></td></tr>`).join("")}</tbody></table>`:`<div class="empty-state">No complaints yet.</div>`}
document.getElementById("complaintTable").addEventListener("click",e=>{let b=e.target.closest("[data-comp-edit]");if(b)return editComplaint(Number(b.dataset.compEdit));b=e.target.closest("[data-comp-delete]");if(b)deleteComplaint(Number(b.dataset.compDelete))});

function addDaysISO(date,days){const d=new Date(date+"T12:00:00+08:00");d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function plannerDateLabel(date){const d=new Date(date+"T00:00:00+08:00");return new Intl.DateTimeFormat("en-SG",{timeZone:"Asia/Singapore",weekday:"short",day:"2-digit",month:"2-digit",year:"2-digit"}).format(d)}
function plannerDateShort(date){const d=new Date(date+"T00:00:00+08:00");return new Intl.DateTimeFormat("en-SG",{timeZone:"Asia/Singapore",weekday:"short",day:"2-digit",month:"2-digit",year:"2-digit"}).format(d)}
function appointmentForPlanner(a){const u=getUnit(a.unitKey);return {...a,ownerName:u?.ownerName||a.ownerName||"",contact:u?.contact||a.contact||""}}
function plannerEntries(date,team,slot){return state.appointments.filter(a=>!isInactiveSchedule(a)&&a.date===date&&a.team===team&&a.slot===slot).map(appointmentForPlanner)}
function plannerRemarks(entries){return entries.map(a=>a.remarks||"").filter(Boolean).join(" · ")||"—"}
function plannerTeamCell(entries,team,slot){if(!entries.length)return `<div class="planner-empty-cell">—</div><button class="planner-add-cell" data-planner-prefill="${esc(team)}|${esc(slot)}">+ Add</button>`;return entries.map(a=>`<div class="planner-team-entry"><div><strong>${esc(a.unitDisplay)}</strong><small>Blk ${a.block}</small></div><div class="planner-entry-actions"><button class="planner-mini-action" data-planner-edit="${a.id}">Edit</button><button class="planner-mini-action remove" data-planner-remove="${a.id}">Remove</button></div></div>`).join("")+`<button class="planner-add-cell" data-planner-prefill="${esc(team)}|${esc(slot)}">+ Add</button>`}
function renderPlanner(){
  const date=document.getElementById("teamDate").value||isoTodaySG();document.getElementById("plannerDateTitle").textContent=`${plannerDateLabel(date)} unit appointments`;
  const rows=SLOTS.map((slot,i)=>{const t1=plannerEntries(date,"Team 1",slot),t2=plannerEntries(date,"Team 2",slot);return `<tr>${i===0?`<td class="date-cell" rowspan="4">${esc(plannerDateShort(date))}</td>`:""}<td class="slot-cell">${esc(slot)}</td><td class="team-cell">${plannerTeamCell(t1,"Team 1",slot)}</td><td class="remarks-cell">${esc(plannerRemarks(t1))}</td><td class="slot-cell team2-start">${esc(slot)}</td><td class="team-cell">${plannerTeamCell(t2,"Team 2",slot)}</td><td class="remarks-cell">${esc(plannerRemarks(t2))}</td></tr>`}).join("");
  document.getElementById("plannerTable").innerHTML=`<table class="planner-table"><thead><tr><th>Date</th><th>Time</th><th>Team 1</th><th>Remarks</th><th class="team2-start">Time</th><th>Team 2</th><th>Remarks</th></tr></thead><tbody>${rows}</tbody></table>`;
  const special=state.appointments.filter(a=>!isInactiveSchedule(a)&&a.date===date&&!SLOTS.includes(a.slot)).sort((a,b)=>slotStartMinutes(a.slot)-slotStartMinutes(b.slot)||a.block-b.block);
  document.getElementById("plannerSpecialTimes").innerHTML=special.length?`<div class="special-time-title"><h4>Special Time Appointments</h4><span>${special.length} booking${special.length===1?"":"s"}</span></div>${special.map(a=>`<div class="special-time-card"><span class="special-time-badge">${esc(a.slot)}</span><strong>Blk ${a.block} · ${esc(a.unitDisplay)}</strong><span>${esc(a.team||"Unassigned")}</span><span>${esc(a.remarks||"—")}</span><div class="planner-entry-actions"><button class="table-action" data-planner-edit="${a.id}">Edit</button><button class="table-action remove" data-planner-remove="${a.id}">Remove</button></div></div>`).join("")}`:"";
  const un=state.appointments.filter(a=>!isInactiveSchedule(a)&&a.date===date&&!a.team).sort((a,b)=>slotStartMinutes(a.slot)-slotStartMinutes(b.slot)||a.block-b.block);
  document.getElementById("plannerUnassigned").innerHTML=un.length?un.map(a=>`<div class="unassigned-chip"><div><strong>Blk ${a.block} · ${esc(a.unitDisplay)}</strong><span>${esc(a.slot)}${a.source==="Excel"?" · Excel":""}</span></div><div class="unassigned-actions"><button data-assign-team="Team 1" data-appt-id="${a.id}">Team 1</button><button data-assign-team="Team 2" data-appt-id="${a.id}">Team 2</button><button data-planner-edit="${a.id}">Edit</button><button class="remove" data-planner-remove="${a.id}">Remove</button></div></div>`).join(""):`<div class="empty-state">No unassigned appointments for this date.</div>`;
}
function renderTodayTeamBoard(){
  const date=isoTodaySG();document.getElementById("todayTeamBoard").innerHTML=["Team 1","Team 2"].map(team=>{
    const all=state.appointments.filter(a=>!isInactiveSchedule(a)&&a.date===date&&a.team===team),special=all.filter(a=>!SLOTS.includes(a.slot)).sort((a,b)=>slotStartMinutes(a.slot)-slotStartMinutes(b.slot));
    return `<div class="today-team-col"><div class="today-team-head"><strong>${team}</strong><span>${all.length} appointment${all.length===1?"":"s"}</span></div>${SLOTS.map(slot=>{const arr=plannerEntries(date,team,slot);return `<div class="today-slot"><div class="today-slot-time">${esc(slot)}</div><div class="today-slot-work">${arr.length?arr.map(a=>`<div class="today-appt-chip"><strong>Blk ${a.block} · ${esc(a.unitDisplay)}</strong>${a.remarks?` · ${esc(a.remarks)}`:""}</div>`).join(""):`<div class="today-empty">No appointment</div>`}</div></div>`}).join("")}${special.length?`<div class="today-slot"><div class="today-slot-time">Special</div><div class="today-slot-work">${special.map(a=>`<div class="today-appt-chip"><strong>${esc(a.slot)} · Blk ${a.block} · ${esc(a.unitDisplay)}</strong>${a.remarks?` · ${esc(a.remarks)}`:""}</div>`).join("")}</div></div>`:""}</div>`
  }).join("")
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
function removePlannerAppointment(id){
  const a=state.appointments.find(x=>x.id===id);if(!a)return;
  if(!confirm(`Remove Blk ${a.block} · ${a.unitDisplay} from ${a.slot}?`))return;
  state.appointments=state.appointments.filter(x=>x.id!==id);
  if(Number(document.getElementById("plannerEditId").value)===id)resetPlannerForm();
  save("Planner entry removed · Master Data recalculated")
}
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
document.getElementById("teamDate").addEventListener("change",()=>{if(document.getElementById("plannerEditId").value)resetPlannerForm();renderPlanner()});
document.getElementById("plannerPrevDay").addEventListener("click",()=>{resetPlannerForm();document.getElementById("teamDate").value=addDaysISO(document.getElementById("teamDate").value||isoTodaySG(),-1);renderPlanner()});
document.getElementById("plannerNextDay").addEventListener("click",()=>{resetPlannerForm();document.getElementById("teamDate").value=addDaysISO(document.getElementById("teamDate").value||isoTodaySG(),1);renderPlanner()});
document.getElementById("plannerToday").addEventListener("click",()=>{resetPlannerForm();document.getElementById("teamDate").value=isoTodaySG();renderPlanner()});
document.getElementById("plannerTable").addEventListener("click",e=>{let b=e.target.closest("[data-planner-prefill]");if(b){resetPlannerForm();const [team,slot]=b.dataset.plannerPrefill.split("|");document.getElementById("plannerTeam").value=team;document.getElementById("plannerSlot").value=slot;togglePlannerCustomTime();document.getElementById("plannerBlock").focus();return}b=e.target.closest("[data-planner-edit]");if(b)return editPlannerAppointment(Number(b.dataset.plannerEdit));b=e.target.closest("[data-planner-remove]");if(b)return removePlannerAppointment(Number(b.dataset.plannerRemove))});
document.getElementById("plannerSpecialTimes").addEventListener("click",e=>{let b=e.target.closest("[data-planner-edit]");if(b)return editPlannerAppointment(Number(b.dataset.plannerEdit));b=e.target.closest("[data-planner-remove]");if(b)return removePlannerAppointment(Number(b.dataset.plannerRemove))});
document.getElementById("plannerUnassigned").addEventListener("click",e=>{let b=e.target.closest("[data-assign-team]");if(b){const a=state.appointments.find(x=>x.id===Number(b.dataset.apptId));if(a){a.team=b.dataset.assignTeam;save(`${a.unitDisplay} assigned to ${a.team}`)}return}b=e.target.closest("[data-planner-edit]");if(b)return editPlannerAppointment(Number(b.dataset.plannerEdit));b=e.target.closest("[data-planner-remove]");if(b)return removePlannerAppointment(Number(b.dataset.plannerRemove))});

function buildReportRows(zoneFilter="all"){
  const rows=[];Object.keys(ZONE_BLOCKS).forEach(z=>{if(zoneFilter!=="all"&&String(z)!==String(zoneFilter))return;ZONE_BLOCKS[z].forEach(block=>{const u=getBlockUnits(block),total=u.length,agree=u.filter(x=>x.response==="A"||x.response==="C").length,done=u.filter(x=>x.workStatus==="Completed").length,d=u.filter(x=>x.response==="D").length,nr=u.filter(x=>x.response==="NR").length;rows.push({zone:Number(z),block,total,agree,agreePct:total?agree/total*100:0,done,donePct:total?done/total*100:0,d,dPct:total?d/total*100:0,nr,nrPct:total?nr/total*100:0})})});return rows
}
function reportTotals(rows){const t=rows.reduce((o,r)=>{o.total+=r.total;o.agree+=r.agree;o.done+=r.done;o.d+=r.d;o.nr+=r.nr;return o},{total:0,agree:0,done:0,d:0,nr:0});return{...t,agreePct:t.total?t.agree/t.total*100:0,donePct:t.total?t.done/t.total*100:0,dPct:t.total?t.d/t.total*100:0,nrPct:t.total?t.nr/t.total*100:0}}
function pct(v){return`${v.toFixed(1)}%`}
function renderReport(){
  const z=document.getElementById("reportZoneFilter").value,rows=buildReportRows(z),t=reportTotals(rows);
  document.getElementById("reportSummaryCards").innerHTML=`<div class="report-mini-card"><span>Total Units</span><strong>${t.total}</strong></div><div class="report-mini-card"><span>Opt-In A+C</span><strong>${t.agree}</strong></div><div class="report-mini-card"><span>Completed</span><strong>${t.done}</strong></div><div class="report-mini-card"><span>Opt-Out D</span><strong>${t.d}</strong></div><div class="report-mini-card"><span>No Response NR</span><strong>${t.nr}</strong></div>`;
  document.getElementById("reportTable").innerHTML=`<table class="weekly-table"><colgroup><col style="width:5%"><col style="width:8%"><col style="width:9%"><col style="width:8%"><col style="width:7%"><col style="width:8%"><col style="width:7%"><col style="width:8%"><col style="width:7%"><col style="width:8%"><col style="width:7%"></colgroup><thead><tr><th rowspan="2" class="weekly-head">S/N</th><th rowspan="2" class="weekly-head">BLK NO.</th><th rowspan="2" class="weekly-head">TOTAL UNITS</th><th colspan="2" class="weekly-head">UNITS OPT-IN<br>(Agree = A + C)</th><th colspan="2" class="weekly-head">UNITS OPT-IN<br>(Work Completed)</th><th colspan="2" class="weekly-head">UNITS OPT-OUT<br>(D)</th><th colspan="2" class="weekly-head">UNITS NO RESPONSE<br>(NR)</th></tr><tr><th>Number</th><th>%</th><th>Number</th><th>%</th><th>Number</th><th>%</th><th>Number</th><th>%</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td><strong>${r.block}</strong></td><td>${r.total}</td><td>${r.agree}</td><td>${pct(r.agreePct)}</td><td>${r.done}</td><td>${pct(r.donePct)}</td><td>${r.d}</td><td>${pct(r.dPct)}</td><td>${r.nr}</td><td>${pct(r.nrPct)}</td></tr>`).join("")}<tr class="total-row"><td colspan="2">TOTAL DU</td><td>${t.total}</td><td>${t.agree}</td><td>${pct(t.agreePct)}</td><td>${t.done}</td><td>${pct(t.donePct)}</td><td>${t.d}</td><td>${pct(t.dPct)}</td><td>${t.nr}</td><td>${pct(t.nrPct)}</td></tr></tbody></table>`;
}
document.getElementById("reportZoneFilter").addEventListener("change",renderReport);

function csvCell(v){return`"${String(v??"").replace(/"/g,'""')}"`}function toCSV(rows){return rows.map(r=>r.map(csvCell).join(",")).join("\n")}function download(name,content,type="text/csv;charset=utf-8"){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
document.getElementById("exportProgressBtn").addEventListener("click",()=>{const z=document.getElementById("reportZoneFilter").value,r=buildReportRows(z),t=reportTotals(r);download(`ELU_Weekly_Progress_${z==="all"?"All_Zones":"Zone_"+z}.csv`,toCSV([["S/N","BLK NO.","TOTAL UNITS","OPT-IN A+C","OPT-IN %","WORK COMPLETED","COMPLETED %","OPT-OUT D","D %","NO RESPONSE NR","NR %"],...r.map((x,i)=>[i+1,x.block,x.total,x.agree,pct(x.agreePct),x.done,pct(x.donePct),x.d,pct(x.dPct),x.nr,pct(x.nrPct)]),["","TOTAL DU",t.total,t.agree,pct(t.agreePct),t.done,pct(t.donePct),t.d,pct(t.dPct),t.nr,pct(t.nrPct)] ]))});
document.getElementById("exportUnitsBtn").addEventListener("click",()=>download("ELU_Unit_Register.csv",toCSV([["Block No","Unit No","Status","Owner Name","Contact","Remarks","Appointment Date","Appointment Slot"],...unitsArray().map(u=>[u.block,unitDisplay(u.floor,u.unit),u.response,u.ownerName,u.contact,u.remarks,u.appointmentDate,u.appointmentSlot])])) );
document.getElementById("exportBackupBtn").addEventListener("click",()=>download(`ELU_Backup_${isoTodaySG()}.json`,JSON.stringify({surveys:state.surveys,appointments:state.appointments,complaints:state.complaints},null,2),"application/json"));

function renderAll(){rebuildAllMasters();renderDashboard();renderBlockBoard();renderSurveyTable();renderAppointmentTable();renderUnitTable();renderComplaintTable();renderPlanner();renderReport()}
document.getElementById("todayChip").textContent=fmtDate.format(new Date());document.getElementById("appointmentFilterDate").value="";document.getElementById("appointmentMode").value="upcoming";document.getElementById("complaintDate").value=isoTodaySG();document.getElementById("teamDate").value=isoTodaySG();
initSelectors();togglePlannerCustomTime();renderAll();autoCompleteAppointments();
setInterval(()=>autoCompleteAppointments(true),60000);
