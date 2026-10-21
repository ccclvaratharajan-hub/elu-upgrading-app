// A compact, editable daily view of the same appointments used by Planner.
(function(){
  const grid=document.getElementById("plannerDailyGrid"),entry=document.getElementById("plannerDailyEntry");
  if(!grid||!entry)return;
  const dailyView=document.getElementById("dailyplanner");
  for(const element of [document.querySelector("#teams .simple-planner-hero"),document.getElementById("plannerDailyPanel"),document.querySelector("#teams .planner-bulk-export")])dailyView.appendChild(element);
  const form=document.getElementById("plannerForm");
  entry.appendChild(form);
  form.classList.add("hidden");
  form.removeAttribute("aria-hidden");
  const title=document.getElementById("plannerDailyTitle");
  const dateInput=document.getElementById("teamDate"),zoneInput=document.getElementById("plannerViewZone");
  function currentEntries(date,zone){
    const latest=new Map();
    state.appointments.forEach(a=>{
      if(a.date!==date||!liveScheduleRecord(a))return;
      const z=Number(a.zone||zoneOfBlock(a.block));
      if(zone!=="all"&&z!==Number(zone))return;
      const key=a.date+"|"+a.unitKey,old=latest.get(key);
      if(!old||Number(a.id||0)>Number(old.id||0))latest.set(key,a);
    });
    return [...latest.values()];
  }
  const sort=(a,b)=>Number(a.block)-Number(b.block)||Number(b.floor)-Number(a.floor)||Number(a.unit)-Number(b.unit);
  function rowEntries(items){
    return items.sort(sort).map(a=>'<div class="daily-unit"><strong>Blk '+esc(a.block)+' '+esc(a.unitDisplay||unitDisplay(a.floor,a.unit))+'</strong><div class="daily-actions"><button type="button" data-daily-edit="'+a.id+'">Edit</button><button type="button" data-daily-cancel="'+a.id+'">Cancel</button></div></div>').join("");
  }
  function dailyTable(z,data,date){
    const specials=[...new Set(data.map(a=>a.slot).filter(s=>s&&!SLOTS.includes(s)))].sort((a,b)=>slotStartMinutes(a)-slotStartMinutes(b));
    const slots=[...SLOTS,...specials];
    const cell=(team,slot)=>{
      const items=data.filter(a=>a.team===team&&a.slot===slot);
      return rowEntries(items)+'<button type="button" class="daily-plus" data-daily-add="'+esc(z)+'|'+esc(team)+'|'+esc(slot)+'">+ Add</button>';
    };
    const remarks=(team,slot)=>data.filter(a=>a.team===team&&a.slot===slot).sort(sort).map(a=>'<div class="daily-remark">'+esc(a.remarks||"")+'</div>').join("");
    const unassigned=data.filter(a=>a.team!=="Team 1"&&a.team!=="Team 2");
    return '<section class="daily-zone"><div class="daily-zone-head"><strong>Zone '+z+'</strong><span>'+data.length+' appointment'+(data.length===1?"":"s")+'</span></div><div class="daily-scroll"><table class="daily-table"><thead><tr><th>Time</th><th>Team 1</th><th>Remarks</th><th>Time</th><th>Team 2</th><th>Remarks</th></tr></thead><tbody>'+slots.map(slot=>'<tr><td class="daily-time">'+esc(slot)+'</td><td>'+cell("Team 1",slot)+'</td><td class="daily-remark-cell">'+remarks("Team 1",slot)+'</td><td class="daily-time">'+esc(slot)+'</td><td>'+cell("Team 2",slot)+'</td><td class="daily-remark-cell">'+remarks("Team 2",slot)+'</td></tr>').join("")+'</tbody></table></div>'+(unassigned.length?'<div class="daily-unassigned"><strong>Team not assigned</strong>'+rowEntries(unassigned)+'</div>':"")+'</section>';
  }
  function render(){
    const date=dateInput.value||isoTodaySG(),zone=zoneInput.value||"all",data=currentEntries(date,zone);
    title.textContent=plannerDateLabel(date)+" · "+(zone==="all"?"All Zones":"Zone "+zone);
    const zones=zone==="all"?[...new Set(data.map(a=>Number(a.zone||zoneOfBlock(a.block))))].sort((a,b)=>a-b):[Number(zone)];
    grid.innerHTML=zones.length?zones.map(z=>dailyTable(z,data.filter(a=>Number(a.zone||zoneOfBlock(a.block))===z),date)).join(""):'<p class="daily-empty">No appointments for this date. Add one below if needed.</p>';
  }
  function openForm(zone,team,slot){
    form.classList.remove("hidden");
    resetPlannerForm();
    document.getElementById("plannerZone").value=String(zone||"1");
    syncPlannerBlocks();
    document.getElementById("plannerTeam").value=team||"Team 1";
    const slotSelect=document.getElementById("plannerSlot");
    if(SLOTS.includes(slot))slotSelect.value=slot;
    else if(slot){
      slotSelect.value="CUSTOM";
      const times=slotToCustomTimes(slot);
      document.getElementById("plannerCustomStart").value=times.start;
      document.getElementById("plannerCustomEnd").value=times.end;
    }
    togglePlannerCustomTime();
    entry.scrollIntoView({behavior:"smooth",block:"nearest"});
    document.getElementById("plannerBlock").focus();
  }
  document.getElementById("plannerDailyAddBtn").addEventListener("click",()=>openForm(zoneInput.value==="all"?"1":zoneInput.value,"Team 1",SLOTS[0]));
  grid.addEventListener("click",event=>{
    const edit=event.target.closest("[data-daily-edit]");
    if(edit){form.classList.remove("hidden");editPlannerAppointment(Number(edit.dataset.dailyEdit));entry.scrollIntoView({behavior:"smooth",block:"nearest"});return}
    const cancel=event.target.closest("[data-daily-cancel]");
    if(cancel){cancelAppointment(Number(cancel.dataset.dailyCancel));return}
    const add=event.target.closest("[data-daily-add]");
    if(add){const [zone,team,slot]=add.dataset.dailyAdd.split("|");openForm(zone,team,slot)}
  });
  document.getElementById("plannerCancelEdit").addEventListener("click",()=>form.classList.add("hidden"));
  // Print this selected date as a clean sheet, ready for the system print dialog or a screenshot.
  document.getElementById("plannerPrintDayBtn").addEventListener("click",()=>{
    render();
    const popup=window.open("","_blank");
    if(!popup){toast("Allow pop-ups to print the daily sheet");return}
    const body=grid.cloneNode(true);
    body.querySelectorAll("button,.daily-actions").forEach(e=>e.remove());
    popup.document.open();
    popup.document.write('<!doctype html><html><head><meta charset="utf-8"><title>ELU Daily Appointments '+esc(dateInput.value)+'</title><style>@page{size:A4 landscape;margin:10mm}body{font:13px Arial,sans-serif;color:#172c43;margin:0}h1{font-size:20px;margin:0 0 12px}.daily-zone{margin-bottom:18px;break-inside:avoid}.daily-zone-head{background:#173b62;color:white;padding:8px 12px;display:flex;justify-content:space-between}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #aebdcc;padding:7px;vertical-align:top}th{background:#deebf4}th:nth-child(1),th:nth-child(4){width:12%}td.daily-time{font-weight:bold;background:#f2f6fa}.daily-unit{padding:3px 0}.daily-unit strong{display:block}.daily-remark{padding:3px 0;min-height:17px}.daily-unassigned{margin:8px}.daily-unassigned .daily-unit{display:inline-block;margin-right:20px}</style></head><body><h1>ELU Daily Appointments · '+esc(plannerDateLabel(dateInput.value||isoTodaySG()))+'</h1>'+body.innerHTML+'</body></html>');
    popup.document.close();
    setTimeout(()=>{popup.focus();popup.print()},250);
  });
  window.renderPlannerDailySheet=render;
  render();
})();
