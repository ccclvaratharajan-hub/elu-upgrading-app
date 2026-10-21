// Read-only day sheet. Appointment Schedule remains the only booking entry point.
(function(){
  const grid=document.getElementById("plannerDailyGrid");
  if(!grid)return;
  const dailyView=document.getElementById("dailyplanner");
  for(const element of [document.querySelector("#teams .simple-planner-hero"),document.getElementById("plannerDailyPanel"),document.querySelector("#teams .planner-bulk-export")])dailyView.appendChild(element);
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
  const byUnit=(a,b)=>Number(a.block)-Number(b.block)||Number(b.floor)-Number(a.floor)||Number(a.unit)-Number(b.unit);
  function zoneTable(zone,date,appointments){
    const custom=[...new Set(appointments.map(a=>a.slot).filter(s=>s&&!SLOTS.includes(s)))].sort((a,b)=>slotStartMinutes(a)-slotStartMinutes(b));
    const slots=[...SLOTS,...custom];
    const matching=(team,slot)=>appointments.filter(a=>a.team===team&&a.slot===slot).sort(byUnit);
    const units=(team,slot)=>matching(team,slot).map(a=>'<div class="daily-unit"><button type="button" class="daily-unit-open" data-daily-open="'+a.id+'" title="Open in Appointment Schedule">Blk '+esc(a.block)+' '+esc(a.unitDisplay||unitDisplay(a.floor,a.unit))+'</button></div>').join("");
    const remarks=(team,slot)=>matching(team,slot).map(a=>'<div class="daily-remark">'+esc(a.remarks||"")+'</div>').join("");
    const unassigned=appointments.filter(a=>a.team!=="Team 1"&&a.team!=="Team 2");
    return '<section class="daily-zone"><div class="daily-zone-head"><strong>Zone '+zone+'</strong><span>'+appointments.length+' appointment'+(appointments.length===1?"":"s")+'</span></div><div class="daily-scroll"><table class="daily-table"><thead><tr><th>Date</th><th>Time</th><th>Team 1</th><th>Remarks</th><th>Time</th><th>Team 2</th><th>Remarks</th></tr></thead><tbody>'+slots.map((slot,i)=>'<tr>'+(i===0?'<td class="daily-date" rowspan="'+slots.length+'">'+esc(plannerDateLabel(date))+'</td>':"")+'<td class="daily-time">'+esc(slot)+'</td><td>'+units("Team 1",slot)+'</td><td>'+remarks("Team 1",slot)+'</td><td class="daily-time">'+esc(slot)+'</td><td>'+units("Team 2",slot)+'</td><td>'+remarks("Team 2",slot)+'</td></tr>').join("")+'</tbody></table></div>'+(unassigned.length?'<div class="daily-unassigned"><strong>Team not assigned: </strong>'+unassigned.map(a=>esc("Blk "+a.block+" "+(a.unitDisplay||unitDisplay(a.floor,a.unit)))).join(", ")+'</div>':"")+'</section>';
  }
  function render(){
    const date=dateInput.value||isoTodaySG(),zone=zoneInput.value||"all",appointments=currentEntries(date,zone);
    title.textContent=plannerDateLabel(date)+" · "+(zone==="all"?"All Zones":"Zone "+zone);
    const zones=zone==="all"?[...new Set(appointments.map(a=>Number(a.zone||zoneOfBlock(a.block))))].sort((a,b)=>a-b):[Number(zone)];
    grid.innerHTML=zones.length?zones.map(z=>zoneTable(z,date,appointments.filter(a=>Number(a.zone||zoneOfBlock(a.block))===z))).join(""):'<p class="daily-empty">No appointments for this date. Enter bookings in Appointment Schedule.</p>';
  }
  grid.addEventListener("click",event=>{
    const button=event.target.closest("[data-daily-open]");
    if(button)editAppointment(Number(button.dataset.dailyOpen));
  });
  document.getElementById("plannerPrintDayBtn").addEventListener("click",()=>{
    render();
    const popup=window.open("","_blank");
    if(!popup){toast("Allow pop-ups to print the daily sheet");return}
    const body=grid.cloneNode(true);
    body.querySelectorAll("button").forEach(button=>button.replaceWith(document.createTextNode(button.textContent)));
    popup.document.open();
    popup.document.write('<!doctype html><html><head><meta charset="utf-8"><title>ELU Daily Appointments '+esc(dateInput.value)+'</title><style>@page{size:A4 landscape;margin:10mm}body{font:12px Arial,sans-serif;color:#172c43;margin:0}h1{font-size:20px;margin:0 0 12px}.daily-zone{margin-bottom:18px;break-inside:avoid}.daily-zone-head{background:#173b62;color:white;padding:8px 12px;display:flex;justify-content:space-between}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #aebdcc;padding:7px;vertical-align:top}th{background:#deebf4}th:nth-child(1){width:13%}th:nth-child(2),th:nth-child(5){width:12%}td.daily-time{font-weight:bold;background:#f2f6fa}td.daily-date{font-weight:bold;background:#fff3aa;vertical-align:middle;text-align:center}.daily-unit,.daily-remark{padding:3px 0;min-height:17px}.daily-unassigned{margin:8px}</style></head><body><h1>ELU Daily Appointments · '+esc(plannerDateLabel(dateInput.value||isoTodaySG()))+'</h1>'+body.innerHTML+'</body></html>');
    popup.document.close();
    setTimeout(()=>{popup.focus();popup.print()},250);
  });
  window.renderPlannerDailySheet=render;
  render();
})();
