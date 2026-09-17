const ZONES = {
  1: ["564","565","566","567","568","569"],
  2: ["544","545","546","547","548","549","550"],
  3: ["531","532","533","534","535","536"],
  4: ["557","558","559","560","561","562"],
  5: ["537","538","539","540","541","542","543"],
  6: ["551","552","553","554","555","556"]
};

const STATUS = ["Not Started","In Progress","Completed","Hold"];

const STORAGE_KEY = "elu_upgrading_app_v1";

function defaultData(){
  const blocks = [];
  Object.entries(ZONES).forEach(([zone, blockList])=>{
    blockList.forEach(block=>{
      blocks.push({
        zone:Number(zone),
        block,
        status:"Not Started",
        progress:0,
        remarks:""
      });
    });
  });
  return { blocks, dailyUpdates:[], issues:[], photos:[], units:[], appointments:[], complaints:[], surveys:[] };
}

let state = loadState();

function loadState(){
  try{
    const saved = localStorage.getItem(STORAGE_KEY);
    if(!saved) return defaultData();
    const d = JSON.parse(saved);
    d.units = d.units || [];
    d.appointments = d.appointments || [];
    d.complaints = d.complaints || [];
    d.surveys = d.surveys || [];
    return d;
  }catch{
    return defaultData();
  }
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAll();
}

function toast(message){
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),1800);
}

function today(){
  return new Date().toISOString().slice(0,10);
}

function zoneProgress(zone){
  const items = state.blocks.filter(b=>b.zone===Number(zone));
  if(!items.length) return 0;
  return Math.round(items.reduce((sum,b)=>sum+Number(b.progress||0),0)/items.length);
}

function overallProgress(){
  if(!state.blocks.length) return 0;
  return Math.round(state.blocks.reduce((sum,b)=>sum+Number(b.progress||0),0)/state.blocks.length);
}

function esc(v=""){
  return String(v).replace(/[&<>"']/g, s=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[s]);
}

function fillZoneSelect(selectId){
  const el = document.getElementById(selectId);
  el.innerHTML = Object.keys(ZONES).map(z=>`<option value="${z}">Zone ${z}</option>`).join("");
}

function fillBlockSelect(zoneId, blockId){
  const zoneEl = document.getElementById(zoneId);
  const blockEl = document.getElementById(blockId);
  const update = ()=>{
    const z = zoneEl.value;
    blockEl.innerHTML = ZONES[z].map(b=>`<option value="${b}">Blk ${b}</option>`).join("");
  };
  zoneEl.addEventListener("change", update);
  update();
}

function renderDashboard(){
  document.getElementById("totalBlocks").textContent = state.blocks.length;
  document.getElementById("overallProgress").textContent = overallProgress()+"%";
  document.getElementById("openIssues").textContent =
    state.issues.filter(i=>i.status!=="Closed").length;

  document.getElementById("dashboardZones").innerHTML =
    Object.keys(ZONES).map(z=>{
      const pct = zoneProgress(z);
      return `<div class="zone-row">
        <strong>Zone ${z}</strong>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <span>${pct}%</span>
      </div>`;
    }).join("");

  const updates = [...state.dailyUpdates].sort((a,b)=>b.id-a.id).slice(0,6);
  document.getElementById("latestUpdates").innerHTML = updates.length ? `
    <table>
      <thead><tr><th>Date</th><th>Zone</th><th>Block</th><th>Manpower</th><th>Work Done</th></tr></thead>
      <tbody>${updates.map(u=>`<tr>
        <td>${esc(u.date)}</td><td>Zone ${u.zone}</td><td>Blk ${esc(u.block)}</td>
        <td>${esc(u.manpower)}</td><td>${esc(u.work)}</td>
      </tr>`).join("")}</tbody>
    </table>` : `<div class="empty">No daily updates yet.</div>`;
}

function renderZones(){
  document.getElementById("zoneCards").innerHTML = Object.entries(ZONES).map(([z,blocks])=>{
    const pct = zoneProgress(z);
    const completed = state.blocks.filter(b=>b.zone===Number(z) && b.status==="Completed").length;
    return `<article class="zone-card">
      <span class="badge">Zone ${z}</span>
      <h3>Blocks ${blocks[0]}–${blocks[blocks.length-1]}</h3>
      <div class="meta">${blocks.length} blocks • ${completed} completed</div>
      <div class="big">${pct}%</div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
    </article>`;
  }).join("");
}

function renderBlockFilter(){
  const el = document.getElementById("blockZoneFilter");
  const current = el.value || "all";
  el.innerHTML = `<option value="all">All Zones</option>` +
    Object.keys(ZONES).map(z=>`<option value="${z}">Zone ${z}</option>`).join("");
  el.value = current;
}

function renderBlocks(){
  const filter = document.getElementById("blockZoneFilter").value || "all";
  const items = filter==="all" ? state.blocks : state.blocks.filter(b=>b.zone===Number(filter));
  document.getElementById("blockTableBody").innerHTML = items.map(b=>`
    <tr data-zone="${b.zone}" data-block="${b.block}">
      <td>Zone ${b.zone}</td>
      <td>Blk ${b.block}</td>
      <td>
        <select class="status-select block-status">
          ${STATUS.map(s=>`<option ${s===b.status?"selected":""}>${s}</option>`).join("")}
        </select>
      </td>
      <td><input class="progress-input block-progress" type="number" min="0" max="100" value="${Number(b.progress||0)}"></td>
      <td><input class="remark-input block-remarks" value="${esc(b.remarks||"")}"></td>
      <td><button class="primary save-block">Save</button></td>
    </tr>
  `).join("");
}

function renderDaily(){
  const items = [...state.dailyUpdates].sort((a,b)=>b.id-a.id);
  document.getElementById("dailyTable").innerHTML = items.length ? `
    <table>
      <thead><tr><th>Date</th><th>Zone</th><th>Block</th><th>Manpower</th><th>Work Done</th><th>Remarks</th><th></th></tr></thead>
      <tbody>${items.map(u=>`<tr>
        <td>${esc(u.date)}</td><td>Zone ${u.zone}</td><td>Blk ${esc(u.block)}</td>
        <td>${esc(u.manpower)}</td><td>${esc(u.work)}</td><td>${esc(u.remarks||"")}</td>
        <td><button class="secondary delete-daily" data-id="${u.id}">Delete</button></td>
      </tr>`).join("")}</tbody>
    </table>` : `<div class="empty">No daily updates yet.</div>`;
}

function renderIssues(){
  const items = [...state.issues].sort((a,b)=>b.id-a.id);
  document.getElementById("issueTable").innerHTML = items.length ? `
    <table>
      <thead><tr><th>Date</th><th>Zone</th><th>Block</th><th>Issue</th><th>Pending</th><th>Responsible</th><th>Status</th><th></th></tr></thead>
      <tbody>${items.map(i=>`<tr>
        <td>${esc(i.date)}</td><td>Zone ${i.zone}</td><td>Blk ${esc(i.block)}</td>
        <td>${esc(i.issue)}</td><td>${esc(i.pending||"")}</td><td>${esc(i.responsible||"")}</td>
        <td>
          <select class="issue-status-edit" data-id="${i.id}">
            ${["Open","In Progress","Closed"].map(s=>`<option ${s===i.status?"selected":""}>${s}</option>`).join("")}
          </select>
        </td>
        <td><button class="secondary delete-issue" data-id="${i.id}">Delete</button></td>
      </tr>`).join("")}</tbody>
    </table>` : `<div class="empty">No issues recorded yet.</div>`;
}

function renderPhotos(){
  const items = [...state.photos].sort((a,b)=>b.id-a.id);
  document.getElementById("photoGallery").innerHTML = items.length ? items.map(p=>`
    <article class="photo-card">
      <img src="${p.dataUrl}" alt="ELU ${esc(p.stage)} photo">
      <div class="info">
        <strong>Zone ${p.zone} • Blk ${esc(p.block)}</strong>
        <small>${esc(p.stage)} • ${esc(p.date)}</small>
        <p>${esc(p.remarks||"")}</p>
        <button class="secondary delete-photo" data-id="${p.id}">Delete</button>
      </div>
    </article>
  `).join("") : `<div class="empty">No photos added yet.</div>`;
}


function fillUnitBlockSelect(){
  const el=document.getElementById("unitBlock");
  if(!el) return;
  const blocks=[...new Set(state.blocks.map(b=>b.block))].sort((a,b)=>Number(a)-Number(b));
  el.innerHTML=blocks.map(b=>`<option value="${b}">Blk ${b}</option>`).join("");
}
function unitLabel(u){ return `Blk ${u.block} / ${u.unitNo}`; }
function getUnitById(id){ return state.units.find(u=>u.id===Number(id)); }

function populateResidentUnitLists(){
  const options=state.units.length
    ? state.units.slice().sort((a,b)=>unitLabel(a).localeCompare(unitLabel(b))).map(u=>`<option value="${u.id}">${esc(unitLabel(u))}</option>`).join("")
    : `<option value="">No units yet</option>`;
  ["appointmentUnit","complaintUnit","surveyUnit"].forEach(id=>{
    const el=document.getElementById(id); if(el) el.innerHTML=options;
  });
  ["appointment","complaint","survey"].forEach(autofillResident);
}
function autofillResident(prefix){
  const sel=document.getElementById(prefix+"Unit");
  if(!sel) return;
  const u=getUnitById(sel.value);
  const owner=document.getElementById(prefix+"Owner");
  const contact=document.getElementById(prefix+"Contact");
  if(owner) owner.value=u?.ownerName||"";
  if(contact) contact.value=u?.contact||"";
}
function renderUnits(){
  const el=document.getElementById("unitTable"); if(!el) return;
  const items=[...state.units].sort((a,b)=>(a.block+a.unitNo).localeCompare(b.block+b.unitNo));
  el.innerHTML=items.length?`<table><thead><tr><th>Block</th><th>Unit</th><th>Opt In</th><th>Opt Out</th><th>NR</th><th>Owner</th><th>Contact</th><th>Date & Time</th><th>Remarks</th><th></th></tr></thead><tbody>${
    items.map(u=>`<tr><td>Blk ${esc(u.block)}</td><td>${esc(u.unitNo)}</td><td>${u.optIn?"Yes":""}</td><td>${u.optOut?"Yes":""}</td><td>${u.nr?"Yes":""}</td><td>${esc(u.ownerName||"")}</td><td>${esc(u.contact||"")}</td><td>${esc(u.dateTime||"")}</td><td>${esc(u.remarks||"")}</td><td><button class="secondary delete-unit" data-id="${u.id}">Delete</button></td></tr>`).join("")
  }</tbody></table>`:`<div class="empty">No unit records yet.</div>`;
}
function renderAppointments(){
  const el=document.getElementById("appointmentTable"); if(!el) return;
  const items=[...state.appointments].sort((a,b)=>b.id-a.id);
  el.innerHTML=items.length?`<table><thead><tr><th>Date</th><th>Slot</th><th>Block</th><th>Unit</th><th>Owner</th><th>Contact</th><th>Remarks</th><th></th></tr></thead><tbody>${
    items.map(a=>`<tr><td>${esc(a.date)}</td><td>${esc(a.slot)}</td><td>Blk ${esc(a.block)}</td><td>${esc(a.unitNo)}</td><td>${esc(a.ownerName||"")}</td><td>${esc(a.contact||"")}</td><td>${esc(a.remarks||"")}</td><td><button class="secondary delete-appointment" data-id="${a.id}">Delete</button></td></tr>`).join("")
  }</tbody></table>`:`<div class="empty">No appointments yet.</div>`;
}
function renderComplaints(){
  const el=document.getElementById("complaintTable"); if(!el) return;
  const items=[...state.complaints].sort((a,b)=>b.id-a.id);
  el.innerHTML=items.length?`<table><thead><tr><th>Date</th><th>Block</th><th>Unit</th><th>Owner</th><th>Complaint</th><th>Status</th><th>Remarks</th><th></th></tr></thead><tbody>${
    items.map(c=>`<tr><td>${esc(c.date)}</td><td>Blk ${esc(c.block)}</td><td>${esc(c.unitNo)}</td><td>${esc(c.ownerName||"")}</td><td>${esc(c.complaint)}</td><td>${esc(c.status)}</td><td>${esc(c.remarks||"")}</td><td><button class="secondary delete-complaint" data-id="${c.id}">Delete</button></td></tr>`).join("")
  }</tbody></table>`:`<div class="empty">No complaints yet.</div>`;
}
function renderSurveys(){
  const el=document.getElementById("surveyTable"); if(!el) return;
  const items=[...state.surveys].sort((a,b)=>b.id-a.id);
  el.innerHTML=items.length?`<table><thead><tr><th>Date</th><th>Block</th><th>Unit</th><th>Owner</th><th>Result</th><th>Remarks</th><th></th></tr></thead><tbody>${
    items.map(s=>`<tr><td>${esc(s.date)}</td><td>Blk ${esc(s.block)}</td><td>${esc(s.unitNo)}</td><td>${esc(s.ownerName||"")}</td><td>${esc(s.result)}</td><td>${esc(s.remarks||"")}</td><td><button class="secondary delete-survey" data-id="${s.id}">Delete</button></td></tr>`).join("")
  }</tbody></table>`:`<div class="empty">No survey records yet.</div>`;
}

function renderAll(){
  renderDashboard();
  renderZones();
  renderBlockFilter();
  renderBlocks();
  renderDaily();
  renderIssues();
  renderPhotos();
  renderUnits();
  populateResidentUnitLists();
  renderAppointments();
  renderComplaints();
  renderSurveys();
}

function setView(view){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active-view"));
  document.getElementById(view).classList.add("active-view");
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active", b.dataset.view===view));

  const titles = {
    dashboard:["Dashboard","Overall ELU upgrading progress across all 6 zones."],
    zones:["Zone View","Zone 1 to Zone 6 progress summary."],
    blocks:["Block View","Update status, progress and remarks block-by-block."],
    daily:["Daily Update","Record date, manpower, work done and remarks."],
    photos:["Photo Upload","Store before, during and after photo records."],
    issues:["Issues","Track site issues, pending items and responsibility."],
    units:["Unit Register","Manage unit, owner, contact and opt-in details."],
    appointments:["Appointments","Book resident appointments using fixed daily slots."],
    complaints:["Complaints","Track resident complaints and status."],
    surveys:["Survey Register","Track survey status and follow-up."],
    reports:["Reports","Export project and resident data as CSV."]
  };
  document.getElementById("pageTitle").textContent = titles[view][0];
  document.getElementById("pageSubtitle").textContent = titles[view][1];
}

document.getElementById("nav").addEventListener("click", e=>{
  const btn = e.target.closest(".nav-btn");
  if(btn) setView(btn.dataset.view);
});

document.getElementById("blockZoneFilter").addEventListener("change", renderBlocks);

document.getElementById("blockTableBody").addEventListener("click", e=>{
  const btn = e.target.closest(".save-block");
  if(!btn) return;
  const tr = btn.closest("tr");
  const zone = Number(tr.dataset.zone);
  const block = tr.dataset.block;
  const item = state.blocks.find(b=>b.zone===zone && b.block===block);
  if(!item) return;
  item.status = tr.querySelector(".block-status").value;
  item.progress = Math.max(0,Math.min(100,Number(tr.querySelector(".block-progress").value||0)));
  item.remarks = tr.querySelector(".block-remarks").value.trim();
  if(item.status==="Completed" && item.progress<100) item.progress=100;
  saveState();
  toast(`Blk ${block} updated`);
});

document.getElementById("dailyForm").addEventListener("submit", e=>{
  e.preventDefault();
  state.dailyUpdates.push({
    id:Date.now(),
    date:document.getElementById("dailyDate").value,
    zone:Number(document.getElementById("dailyZone").value),
    block:document.getElementById("dailyBlock").value,
    manpower:Number(document.getElementById("dailyManpower").value||0),
    work:document.getElementById("dailyWork").value.trim(),
    remarks:document.getElementById("dailyRemarks").value.trim()
  });
  e.target.reset();
  document.getElementById("dailyDate").value=today();
  document.getElementById("dailyManpower").value=0;
  saveState();
  toast("Daily update saved");
});

document.getElementById("dailyTable").addEventListener("click", e=>{
  const btn=e.target.closest(".delete-daily");
  if(!btn) return;
  state.dailyUpdates=state.dailyUpdates.filter(x=>x.id!==Number(btn.dataset.id));
  saveState();
  toast("Daily update deleted");
});

document.getElementById("issueForm").addEventListener("submit", e=>{
  e.preventDefault();
  state.issues.push({
    id:Date.now(),
    date:document.getElementById("issueDate").value,
    zone:Number(document.getElementById("issueZone").value),
    block:document.getElementById("issueBlock").value,
    issue:document.getElementById("issueText").value.trim(),
    pending:document.getElementById("pendingItem").value.trim(),
    responsible:document.getElementById("responsiblePerson").value.trim(),
    status:document.getElementById("issueStatus").value
  });
  e.target.reset();
  document.getElementById("issueDate").value=today();
document.getElementById("appointmentDate").value=today();
document.getElementById("complaintDate").value=today();
document.getElementById("surveyDate").value=today();
  saveState();
  toast("Issue saved");
});

document.getElementById("issueTable").addEventListener("change", e=>{
  if(!e.target.classList.contains("issue-status-edit")) return;
  const item = state.issues.find(i=>i.id===Number(e.target.dataset.id));
  if(item){ item.status=e.target.value; saveState(); toast("Issue status updated"); }
});

document.getElementById("issueTable").addEventListener("click", e=>{
  const btn=e.target.closest(".delete-issue");
  if(!btn) return;
  state.issues=state.issues.filter(x=>x.id!==Number(btn.dataset.id));
  saveState();
  toast("Issue deleted");
});

document.getElementById("photoForm").addEventListener("submit", e=>{
  e.preventDefault();
  const file=document.getElementById("photoFile").files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    state.photos.push({
      id:Date.now(),
      zone:Number(document.getElementById("photoZone").value),
      block:document.getElementById("photoBlock").value,
      stage:document.getElementById("photoStage").value,
      remarks:document.getElementById("photoRemarks").value.trim(),
      date:today(),
      dataUrl:reader.result
    });
    e.target.reset();
    saveState();
    toast("Photo record saved");
  };
  reader.readAsDataURL(file);
});

document.getElementById("photoGallery").addEventListener("click", e=>{
  const btn=e.target.closest(".delete-photo");
  if(!btn) return;
  state.photos=state.photos.filter(x=>x.id!==Number(btn.dataset.id));
  saveState();
  toast("Photo deleted");
});


fillUnitBlockSelect();
["appointmentUnit","complaintUnit","surveyUnit"].forEach(id=>{
  const el=document.getElementById(id);
  if(el) el.addEventListener("change",()=>autofillResident(id.replace("Unit","")));
});

document.getElementById("unitForm")?.addEventListener("submit",e=>{
  e.preventDefault();
  const block=document.getElementById("unitBlock").value;
  const unitNo=document.getElementById("unitNo").value.trim();
  const data={
    block,unitNo,
    optIn:document.getElementById("optIn").checked,
    optOut:document.getElementById("optOut").checked,
    nr:document.getElementById("nr").checked,
    ownerName:document.getElementById("ownerName").value.trim(),
    contact:document.getElementById("ownerContact").value.trim(),
    dateTime:document.getElementById("unitDateTime").value,
    remarks:document.getElementById("unitRemarks").value.trim()
  };
  const old=state.units.find(u=>u.block===block && u.unitNo.toLowerCase()===unitNo.toLowerCase());
  if(old) Object.assign(old,data); else state.units.push({id:Date.now(),...data});
  e.target.reset(); saveState(); toast(old?"Unit updated":"Unit saved");
});
document.getElementById("unitTable")?.addEventListener("click",e=>{
  const b=e.target.closest(".delete-unit"); if(!b) return;
  state.units=state.units.filter(x=>x.id!==Number(b.dataset.id)); saveState(); toast("Unit deleted");
});

document.getElementById("appointmentForm")?.addEventListener("submit",e=>{
  e.preventDefault(); const u=getUnitById(document.getElementById("appointmentUnit").value);
  if(!u){toast("Add a unit first");return;}
  state.appointments.push({id:Date.now(),unitId:u.id,block:u.block,unitNo:u.unitNo,ownerName:u.ownerName,contact:u.contact,date:document.getElementById("appointmentDate").value,slot:document.getElementById("appointmentSlot").value,remarks:document.getElementById("appointmentRemarks").value.trim()});
  e.target.reset(); document.getElementById("appointmentDate").value=today(); saveState(); toast("Appointment saved");
});
document.getElementById("appointmentTable")?.addEventListener("click",e=>{
  const b=e.target.closest(".delete-appointment"); if(!b) return;
  state.appointments=state.appointments.filter(x=>x.id!==Number(b.dataset.id)); saveState(); toast("Appointment deleted");
});

document.getElementById("complaintForm")?.addEventListener("submit",e=>{
  e.preventDefault(); const u=getUnitById(document.getElementById("complaintUnit").value);
  if(!u){toast("Add a unit first");return;}
  state.complaints.push({id:Date.now(),unitId:u.id,block:u.block,unitNo:u.unitNo,ownerName:u.ownerName,contact:u.contact,date:document.getElementById("complaintDate").value,complaint:document.getElementById("complaintText").value.trim(),status:document.getElementById("complaintStatus").value,remarks:document.getElementById("complaintRemarks").value.trim()});
  e.target.reset(); document.getElementById("complaintDate").value=today(); saveState(); toast("Complaint saved");
});
document.getElementById("complaintTable")?.addEventListener("click",e=>{
  const b=e.target.closest(".delete-complaint"); if(!b) return;
  state.complaints=state.complaints.filter(x=>x.id!==Number(b.dataset.id)); saveState(); toast("Complaint deleted");
});

document.getElementById("surveyForm")?.addEventListener("submit",e=>{
  e.preventDefault(); const u=getUnitById(document.getElementById("surveyUnit").value);
  if(!u){toast("Add a unit first");return;}
  state.surveys.push({id:Date.now(),unitId:u.id,block:u.block,unitNo:u.unitNo,ownerName:u.ownerName,contact:u.contact,date:document.getElementById("surveyDate").value,result:document.getElementById("surveyResult").value,remarks:document.getElementById("surveyRemarks").value.trim()});
  e.target.reset(); document.getElementById("surveyDate").value=today(); saveState(); toast("Survey saved");
});
document.getElementById("surveyTable")?.addEventListener("click",e=>{
  const b=e.target.closest(".delete-survey"); if(!b) return;
  state.surveys=state.surveys.filter(x=>x.id!==Number(b.dataset.id)); saveState(); toast("Survey deleted");
});

function csvEscape(v){
  const s=String(v??"");
  return `"${s.replace(/"/g,'""')}"`;
}
function downloadCSV(filename, rows){
  const csv=rows.map(r=>r.map(csvEscape).join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=filename;a.click();
  URL.revokeObjectURL(url);
}

document.getElementById("exportBlocks").addEventListener("click", ()=>{
  downloadCSV("elu_block_progress.csv", [
    ["Zone","Block","Status","Progress %","Remarks"],
    ...state.blocks.map(b=>[b.zone,b.block,b.status,b.progress,b.remarks])
  ]);
});
document.getElementById("exportDaily").addEventListener("click", ()=>{
  downloadCSV("elu_daily_updates.csv", [
    ["Date","Zone","Block","Manpower","Work Done","Remarks"],
    ...state.dailyUpdates.map(u=>[u.date,u.zone,u.block,u.manpower,u.work,u.remarks])
  ]);
});
document.getElementById("exportIssues").addEventListener("click", ()=>{
  downloadCSV("elu_issues.csv", [
    ["Date","Zone","Block","Issue","Pending Item","Responsible Person","Status"],
    ...state.issues.map(i=>[i.date,i.zone,i.block,i.issue,i.pending,i.responsible,i.status])
  ]);
});


document.getElementById("exportUnits")?.addEventListener("click", ()=>{
  downloadCSV("elu_unit_register.csv", [["Block No","Unit No","Opt In","Opt Out","NR","Owner Name","Contact","Date & Time","Remarks"],...state.units.map(u=>[u.block,u.unitNo,u.optIn?"Yes":"",u.optOut?"Yes":"",u.nr?"Yes":"",u.ownerName,u.contact,u.dateTime,u.remarks])]);
});
document.getElementById("exportAppointments")?.addEventListener("click", ()=>{
  downloadCSV("elu_appointments.csv", [["Date","Time Slot","Block No","Unit No","Owner Name","Contact","Remarks"],...state.appointments.map(a=>[a.date,a.slot,a.block,a.unitNo,a.ownerName,a.contact,a.remarks])]);
});
document.getElementById("exportComplaints")?.addEventListener("click", ()=>{
  downloadCSV("elu_complaints.csv", [["Date","Block No","Unit No","Owner Name","Contact","Complaint","Status","Remarks"],...state.complaints.map(c=>[c.date,c.block,c.unitNo,c.ownerName,c.contact,c.complaint,c.status,c.remarks])]);
});

document.getElementById("resetDemoBtn").addEventListener("click", ()=>{
  if(confirm("Reset all ELU app data in this browser?")){
    state=defaultData();
    saveState();
    toast("Data reset");
  }
});

["dailyZone","photoZone","issueZone"].forEach(fillZoneSelect);
fillBlockSelect("dailyZone","dailyBlock");
fillBlockSelect("photoZone","photoBlock");
fillBlockSelect("issueZone","issueBlock");

document.getElementById("dailyDate").value=today();
document.getElementById("issueDate").value=today();
document.getElementById("appointmentDate").value=today();
document.getElementById("complaintDate").value=today();
document.getElementById("surveyDate").value=today();

renderAll();
