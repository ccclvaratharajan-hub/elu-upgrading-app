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
    return [...latest.values()].map(a=>({...a,slot:plannerDisplaySlot(a.slot)}));
  }
  const byUnit=(a,b)=>Number(a.block)-Number(b.block)||Number(b.floor)-Number(a.floor)||Number(a.unit)-Number(b.unit);
  function zoneTable(zone,date,appointments,contractor=""){
    const single=contractor==="IMS";
    const displayTeams=contractor==="KSK"?zone4KskDisplayTeams(appointments):null;
    const teamOf=a=>displayTeams?.get(a.id)||a.team;
    // The daily sheet is a record of booked appointments, not a template of free slots.
    const slots=[...new Set(appointments.map(a=>a.slot).filter(Boolean))].sort((a,b)=>slotStartMinutes(a)-slotStartMinutes(b)||(slotEndMinutes(b)||0)-(slotEndMinutes(a)||0));
    const matching=(team,slot)=>appointments.filter(a=>a.slot===slot&&(single||teamOf(a)===team)).sort(byUnit);
    const units=(team,slot)=>matching(team,slot).map(a=>'<div class="daily-unit"><button type="button" class="daily-unit-open" data-daily-open="'+a.id+'" title="Open in Appointment Schedule">Blk '+esc(a.block)+' '+esc(a.unitDisplay||unitDisplay(a.floor,a.unit))+'</button>'+(contractor==="KSK"?'<button type="button" class="daily-team-move" data-daily-team="'+a.id+'" title="Move to '+(team==="Team 1"?"Team 2":"Team 1")+'">→ '+(team==="Team 1"?"Team 2":"Team 1")+'</button>':'')+'</div>').join("");
    const remarks=(team,slot)=>matching(team,slot).map(a=>'<div class="daily-remark">'+esc(a.remarks||"")+'</div>').join("");
    const unassigned=single?[]:appointments.filter(a=>a.team!=="Team 1"&&a.team!=="Team 2");
    const heading='Zone '+zone+(contractor?' · '+contractor+(single?' · Blk 557–558':' · Blk 559–562'):'');
    const headers=single?['Date','Time','IMS Team','Remarks']:['Date','Time','Team 1','Remarks','Time','Team 2','Remarks'];
    const teamCells=(team,slot)=>!matching(team,slot).length?'<td></td><td></td><td></td>':'<td class="daily-time">'+esc(slot)+'</td><td>'+units(team,slot)+'</td><td>'+remarks(team,slot)+'</td>';
    return '<section class="daily-zone" data-daily-zone="'+zone+'"><div class="daily-zone-head"><strong>'+heading+'</strong><span>'+appointments.length+' appointment'+(appointments.length===1?"":"s")+'</span></div><div class="daily-scroll"><table class="daily-table'+(single?' single-team':'')+'"><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+slots.map((slot,i)=>'<tr>'+(i===0?'<td class="daily-date" rowspan="'+slots.length+'">'+esc(plannerDateLabel(date))+'</td>':"")+(single?'<td class="daily-time">'+esc(slot)+'</td><td>'+units("Team 1",slot)+'</td><td>'+remarks("Team 1",slot)+'</td>':teamCells("Team 1",slot)+teamCells("Team 2",slot))+'</tr>').join("")+'</tbody></table></div>'+(unassigned.length?'<div class="daily-unassigned"><strong>Team not assigned: </strong>'+unassigned.map(a=>esc("Blk "+a.block+" "+(a.unitDisplay||unitDisplay(a.floor,a.unit)))).join(", ")+'</div>':"")+'</section>';
  }
  function render(){
    const date=dateInput.value||isoTodaySG(),zone=zoneInput.value||"all",appointments=currentEntries(date,zone);
    title.textContent=plannerDateLabel(date)+" · "+(zone==="all"?"All Zones":"Zone "+zone);
    const zones=zone==="all"?[...new Set(appointments.map(a=>Number(a.zone||zoneOfBlock(a.block))))].sort((a,b)=>a-b):[Number(zone)];
    grid.innerHTML=appointments.length?zones.map(z=>{
      const entries=appointments.filter(a=>Number(a.zone||zoneOfBlock(a.block))===z);
      if(z!==4)return zoneTable(z,date,entries);
      const ims=entries.filter(a=>[557,558].includes(Number(a.block))),ksk=entries.filter(a=>[559,560,561,562].includes(Number(a.block)));
      return (ims.length?zoneTable(z,date,ims,"IMS"):"")+(ksk.length?zoneTable(z,date,ksk,"KSK"):"");
    }).join(""):'<p class="daily-empty">No appointments for this date. Enter bookings in Appointment Schedule.</p>';
  }
  grid.addEventListener("click",event=>{
    const move=event.target.closest("[data-daily-team]");
    if(move){
      const id=Number(move.dataset.dailyTeam),a=state.appointments.find(x=>Number(x.id)===id);
      if(!a||![559,560,561,562].includes(Number(a.block))||!liveScheduleRecord(a))return;
      const entries=currentEntries(a.date,"4").filter(x=>[559,560,561,562].includes(Number(x.block)));
      a.team=zone4KskDisplayTeams(entries).get(a.id)==="Team 1"?"Team 2":"Team 1";
      a.teamManual=true;
      save("KSK appointment moved to "+a.team);
      return
    }
    const button=event.target.closest("[data-daily-open]");
    if(button)editAppointment(Number(button.dataset.dailyOpen));
  });
  document.getElementById("plannerPrintDayBtn").addEventListener("click",()=>{
    render();
    const popup=window.open("","_blank");
    if(!popup){toast("Allow pop-ups to print the daily sheet");return}
    const body=grid.cloneNode(true);
    body.querySelectorAll("[data-daily-team]").forEach(button=>button.remove());
    body.querySelectorAll("button").forEach(button=>button.replaceWith(document.createTextNode(button.textContent)));
    const byZone=new Map();
    body.querySelectorAll(".daily-zone").forEach(section=>{const zone=section.dataset.dailyZone;if(!byZone.has(zone))byZone.set(zone,[]);byZone.get(zone).push(section.outerHTML)});
    const label=esc(plannerDateLabel(dateInput.value||isoTodaySG()));
    const pages=byZone.size?[...byZone].map(([zone,sections])=>'<div class="print-page"><div class="print-content"><h1>ELU Daily Appointments · '+label+' · Zone '+esc(zone)+'</h1>'+sections.join('')+'</div></div>').join(''):'<div class="print-page"><div class="print-content"><h1>ELU Daily Appointments · '+label+'</h1>'+body.innerHTML+'</div></div>';
    popup.document.open();
    popup.document.write('<!doctype html><html><head><meta charset="utf-8"><title>ELU Daily Appointments '+esc(dateInput.value)+'</title><style>@page{size:A4 landscape;margin:7mm}*{box-sizing:border-box}body{font:10px Arial,sans-serif;color:#172c43;margin:0;width:283mm}.print-page{width:283mm;height:196mm;overflow:hidden;break-after:page;page-break-after:always}.print-page:last-child{break-after:auto;page-break-after:auto}.print-content{width:283mm;transform-origin:top left}h1{font-size:17px;margin:0 0 6px}.daily-zone{margin-bottom:8px;break-inside:avoid}.daily-zone-head{background:#173b62;color:white;padding:5px 8px;display:flex;justify-content:space-between}.daily-scroll{overflow:visible}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #aebdcc;padding:3px 5px;vertical-align:top;overflow-wrap:anywhere}th{background:#deebf4}th:nth-child(1){width:13%}th:nth-child(2),th:nth-child(5){width:12%}.single-team th:nth-child(2){width:17%}td.daily-time{font-weight:bold;background:#f2f6fa;white-space:nowrap}td.daily-date{font-weight:bold;background:#fff3aa;vertical-align:middle;text-align:center}.daily-unit,.daily-remark{padding:2px 0;min-height:12px}.daily-unassigned{margin:5px}header,th,.daily-zone-head,td.daily-date,td.daily-time{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>'+pages+'</body></html>');
    popup.document.close();
    setTimeout(()=>{popup.document.querySelectorAll('.print-content').forEach(content=>{const width=283*96/25.4,height=196*96/25.4;content.style.zoom=Math.min(1,width/content.scrollWidth,height/content.scrollHeight).toFixed(3)});popup.focus();popup.print()},250);
  });
  window.renderPlannerDailySheet=render;
  render();
})();
