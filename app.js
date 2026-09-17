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
  return { blocks, dailyUpdates:[], issues:[], photos:[] };
}

let state = loadState();

function loadState(){
  try{
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultData();
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

function renderAll(){
  renderDashboard();
  renderZones();
  renderBlockFilter();
  renderBlocks();
  renderDaily();
  renderIssues();
  renderPhotos();
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
    reports:["Reports","Export block, daily and issue data as CSV."]
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

renderAll();
