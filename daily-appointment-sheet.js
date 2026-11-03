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
  function dateCard(date){
    const d=new Date(date+'T12:00:00+08:00');
    if(Number.isNaN(d.getTime()))return esc(plannerDateLabel(date));
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Singapore',day:'2-digit',month:'short',year:'numeric',weekday:'short'}).formatToParts(d);
    const part=type=>parts.find(p=>p.type===type)?.value||'';
    return '<div class="daily-date-card"><span class="daily-date-number">'+esc(part('day'))+'</span><span class="daily-date-month">'+esc(part('month').toUpperCase()+' '+part('year'))+'</span><span class="daily-date-weekday">'+esc(part('weekday').toUpperCase())+'</span><span class="daily-date-label">'+esc(plannerDateLabel(date))+'</span></div>';
  }
  function zoneTable(zone,date,appointments,contractor=""){
    const single=contractor==="IMS"||contractor==="ND Noor";
    const displayTeams=contractor==="KSK"?zone4KskDisplayTeams(appointments):null;
    const teamOf=a=>displayTeams?.get(a.id)||a.team;
    // The daily sheet is a record of booked appointments, not a template of free slots.
    const slots=[...new Set(appointments.map(a=>a.slot).filter(Boolean))].sort((a,b)=>slotStartMinutes(a)-slotStartMinutes(b)||(slotEndMinutes(b)||0)-(slotEndMinutes(a)||0));
    const matching=(team,slot)=>appointments.filter(a=>a.slot===slot&&(single||teamOf(a)===team)).sort(byUnit);
    const units=(team,slot)=>matching(team,slot).map(a=>'<div class="daily-unit"><button type="button" class="daily-unit-open" data-daily-open="'+a.id+'" title="Open in Appointment Schedule">Blk '+esc(a.block)+' '+esc(a.unitDisplay||unitDisplay(a.floor,a.unit))+'</button>'+(contractor==="KSK"?'<button type="button" class="daily-team-move" data-daily-team="'+a.id+'" title="Move to '+(team==="Team 1"?"Team 2":"Team 1")+'">'+(team==="Team 1"?esc(team)+' →':'← '+esc(team))+'</button>':'')+'</div>').join("");
    const remarks=(team,slot)=>matching(team,slot).map(a=>'<div class="daily-remark">'+esc(a.remarks||"")+'</div>').join("");
    const unassigned=single?[]:appointments.filter(a=>a.team!=="Team 1"&&a.team!=="Team 2");
    const heading='Zone '+zone+(contractor?' · '+contractor+(contractor==='IMS'?' · Blk 557–558':contractor==='KSK'?' · Blk 559–562':' · Blk 537–543'):'');
    const headers=single?['Date','Time',contractor==='IMS'?'IMS Team':'ND Noor','Remarks']:['Date','Time','Team 1','Remarks','Time','Team 2','Remarks'];
    const teamCells=(team,slot)=>!matching(team,slot).length?'<td></td><td></td><td></td>':'<td class="daily-time">'+esc(slot)+'</td><td>'+units(team,slot)+'</td><td>'+remarks(team,slot)+'</td>';
    return '<section class="daily-zone" data-daily-zone="'+zone+'" data-daily-contractor="'+esc(contractor)+'"><div class="daily-zone-head"><strong>'+heading+'</strong><span>'+appointments.length+' appointment'+(appointments.length===1?"":"s")+'</span></div><div class="daily-scroll"><img class="daily-zone-watermark" src="assets/daily-planner-'+(single?'db':'meter')+'-watermark.svg" alt="" aria-hidden="true"><table class="daily-table'+(single?' single-team':'')+'"><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+slots.map((slot,i)=>'<tr>'+(i===0?'<td class="daily-date" rowspan="'+slots.length+'">'+dateCard(date)+'</td>':"")+(single?'<td class="daily-time">'+esc(slot)+'</td><td>'+units("Team 1",slot)+'</td><td>'+remarks("Team 1",slot)+'</td>':teamCells("Team 1",slot)+teamCells("Team 2",slot))+'</tr>').join("")+'</tbody></table></div>'+(unassigned.length?'<div class="daily-unassigned"><strong>Team not assigned: </strong>'+unassigned.map(a=>esc("Blk "+a.block+" "+(a.unitDisplay||unitDisplay(a.floor,a.unit)))).join(", ")+'</div>':"")+'</section>';
  }
  function render(){
    const date=dateInput.value||isoTodaySG(),zone=zoneInput.value||"all",appointments=currentEntries(date,zone);
    title.textContent=plannerDateLabel(date)+" · "+(zone==="all"?"All Zones":"Zone "+zone);
    const zones=zone==="all"?[...new Set(appointments.map(a=>Number(a.zone||zoneOfBlock(a.block))))].sort((a,b)=>a-b):[Number(zone)];
    grid.innerHTML=appointments.length?zones.map(z=>{
      const entries=appointments.filter(a=>Number(a.zone||zoneOfBlock(a.block))===z);
      if(z!==4)return zoneTable(z,date,entries,z===5?'ND Noor':'');
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
      const displayTeams=zone4KskDisplayTeams(entries),currentTeam=displayTeams.get(a.id);
      if(currentTeam!=="Team 1"&&currentTeam!=="Team 2")return;
      // Freeze this day's existing visible layout before moving the selected row.
      // Otherwise legacy overlap balancing can also move its neighbouring booking.
      const currentTeamsById=new Map(entries.map(entry=>[Number(entry.id),displayTeams.get(entry.id)]));
      state.appointments.forEach(record=>{
        const displayedTeam=currentTeamsById.get(Number(record.id));
        if(displayedTeam==="Team 1"||displayedTeam==="Team 2"){
          record.team=displayedTeam;
          record.teamManual=true;
        }
      });
      a.team=currentTeam==="Team 1"?"Team 2":"Team 1";
      save("KSK appointment moved to "+a.team);
      return
    }
    const button=event.target.closest("[data-daily-open]");
    if(button)editAppointment(Number(button.dataset.dailyOpen));
  });
  document.getElementById("plannerPrintDayBtn").addEventListener("click",async()=>{
    render();
    const popup=window.open("","_blank");
    if(!popup){toast("Allow pop-ups to print the daily sheet");return}
    const body=grid.cloneNode(true);
    body.querySelectorAll("[data-daily-team]").forEach(button=>button.remove());
    body.querySelectorAll("button").forEach(button=>button.replaceWith(document.createTextNode(button.textContent)));
    // Keep the approved calendar-date tile on both the screen and the printed sheet.
    const label=esc(plannerDateLabel(dateInput.value||isoTodaySG()));
    const scope=zoneInput.value==="all"?"All Zones":"Zone "+esc(zoneInput.value);
    const selection=document.getElementById('plannerPrintScope')?.value||'all';
    const background=esc(new URL('assets/daily-planner-print-scenery.svg',document.baseURI).href);
    const teamBody=team=>{
      const copy=body.cloneNode(true);
      if(team==='all')return copy;
      if(['IMS','KSK','ND Noor','Other zones'].includes(team)){
        copy.querySelectorAll('.daily-zone').forEach(section=>{
          const contractor=section.dataset.dailyContractor||'';
          if(team==='Other zones'?Boolean(contractor):contractor!==team)section.remove();
        });
        copy.querySelectorAll('.daily-empty').forEach(element=>element.remove());
        return copy;
      }
      copy.querySelectorAll('.daily-zone').forEach(section=>{
        const table=section.querySelector('.daily-table'),single=table.classList.contains('single-team');
        if(team==='Unassigned'){
          if(!section.querySelector('.daily-unassigned')){section.remove();return}
          section.querySelector('.daily-scroll')?.remove();
          section.querySelector('.daily-zone-head span').textContent='Team not assigned';
          return;
        }
        if((team==='IMS')!==single){section.remove();return}
        section.querySelector('.daily-unassigned')?.remove();
        if(!single){
          const start=team==='Team 1'?0:3;
          const dateCell=table.querySelector('.daily-date');
          table.querySelectorAll('tr').forEach(row=>{
            [...row.children].filter(cell=>!cell.classList.contains('daily-date')&&!(cell.tagName==='TH'&&cell.textContent==='Date')).forEach((cell,index)=>{if(index<start||index>=start+3)cell.remove()});
          });
          table.classList.add('single-team');
          table.querySelectorAll('tbody tr').forEach(row=>{if(!row.querySelector('.daily-unit'))row.remove()});
          const rows=table.querySelectorAll('tbody tr');
          if(dateCell&&rows.length){dateCell.rowSpan=rows.length;rows[0].prepend(dateCell)}
        }
        const count=section.querySelectorAll('.daily-unit').length;
        if(!count){section.remove();return}
        section.querySelector('.daily-zone-head span').textContent=count+' appointment'+(count===1?'':'s');
      });
      // Empty-state text belongs to the requested team, rather than the original all-team grid.
      copy.querySelectorAll('.daily-empty').forEach(element=>element.remove());
      return copy;
    };
    const choices=selection==='contractors'?['IMS','KSK','ND Noor','Other zones']:selection==='separate'?['Team 1','Team 2','IMS','ND Noor','Unassigned']:[selection];
    const sheets=choices.map(team=>({team,body:teamBody(team)})).filter(sheet=>!['separate','contractors'].includes(selection)||sheet.body.querySelector('.daily-zone'));
    if(!sheets.length)sheets.push({team:'all',body:teamBody('all')});
    const pages=sheets.map(sheet=>'<main class="print-page"><img class="print-background" src="'+background+'" alt=""><div class="print-content"><header class="print-heading"><h1>ELU Daily Planner</h1><p>'+label+' &nbsp; | &nbsp; '+scope+(sheet.team==='all'?'':' &nbsp; | &nbsp; '+esc(sheet.team))+'</p></header>'+(sheet.body.innerHTML||'<p class="daily-empty">No appointments for this team on this date.</p>')+'</div></main>').join('');
    const css=`
      @page{size:A4 portrait;margin:7mm}
      *{box-sizing:border-box}
      html,body{margin:0;padding:0}
      body{font:10pt/1.15 Arial,Helvetica,sans-serif;color:#142b43;width:196mm}
      .print-page{position:relative;isolation:isolate;width:196mm;height:282mm;break-inside:avoid;page-break-inside:avoid;break-after:page;page-break-after:always}
      .print-page:last-child{break-after:auto;page-break-after:auto}
      .print-background{position:absolute;left:-7mm;top:-7mm;width:210mm;height:297mm;z-index:-1;object-fit:cover;object-position:center}
      .print-content{position:absolute;left:0;top:0;width:196mm;transform-origin:top left}
      .print-heading{height:22mm;margin:0 0 7px;border-radius:6px;border-left:2px solid #d3b268;padding:4mm 3mm 2mm;background:linear-gradient(90deg,rgba(255,255,255,.98),rgba(255,255,255,.91) 68%,rgba(255,255,255,.58))}
      .print-heading h1,.print-heading p{max-width:100%}
      h1{font-size:15pt;line-height:1.1;margin:0 0 3px}
      .print-heading p{font-size:10pt;font-weight:bold;margin:0}
      .daily-zone{margin-bottom:7px;break-inside:avoid;border:1px solid rgba(255,255,255,.9);border-radius:5px;overflow:hidden;box-shadow:0 2px 5px rgba(8,30,54,.17);background:#fff}
      .daily-zone-head{background:linear-gradient(115deg,#002744,#123f60);color:white;padding:4px 6px;display:flex;justify-content:space-between;gap:6px;font-size:9.5pt;font-weight:bold}
      .daily-scroll{overflow:visible;position:relative;isolation:isolate}
      .daily-zone-watermark{position:absolute;right:1%;bottom:1px;width:15%;height:calc(100% - 20px);object-fit:contain;object-position:right center;z-index:0}
      .daily-zone[data-daily-contractor="IMS"] .daily-zone-watermark,.daily-zone[data-daily-contractor="ND Noor"] .daily-zone-watermark{width:39%}
      table{position:relative;z-index:1;width:100%;border-collapse:collapse;table-layout:fixed}
      th,td{border:1px solid rgba(116,143,166,.34);padding:2px 4px;vertical-align:top;overflow-wrap:anywhere}
      td{background:rgba(255,255,255,.08)}
      th{background:rgba(224,241,253,.96);font-size:9pt;font-weight:bold;text-align:left;padding:3px 4px}
      th:nth-child(1){width:13%}
      th:nth-child(2),th:nth-child(5){width:11%}
      th:nth-child(3),th:nth-child(6){width:21%}
      th:nth-child(4),th:nth-child(7){width:11.5%}
      .single-team th:nth-child(1){width:16%}
      .single-team th:nth-child(2){width:16%}
      .single-team th:nth-child(3){width:34%}
      .single-team th:nth-child(4){width:34%}
      td.daily-time{font-size:8.5pt;font-weight:bold;background:rgba(255,255,255,.91);white-space:nowrap}
      td.daily-date{vertical-align:middle;background:rgba(255,255,255,.96);padding:2px 5px}
      .daily-date-card{display:flex;flex-direction:column;align-items:flex-start}
      .daily-date-number{font-size:26pt;line-height:.95;font-weight:800;letter-spacing:-1px}
      .daily-date-month{font-size:7.4pt;font-weight:bold;white-space:nowrap;margin-top:3px}
      .daily-date-weekday{font-size:7pt;letter-spacing:1px;margin-top:1px}
      .daily-date-label{font-size:6.6pt;font-weight:bold;border-top:1px solid #c9ac64;margin-top:4px;padding-top:3px;white-space:nowrap}
      .daily-unit{padding:1px 0;min-height:14px;font-weight:bold}
      .daily-remark{padding:1px 0;min-height:14px;font-size:8pt;white-space:pre-wrap}
      .daily-unassigned,.daily-empty{margin:4px;font-size:9pt;background:rgba(255,255,255,.92);padding:5px}
      .compact .daily-zone{margin-bottom:3px}
      .compact .daily-zone-head{padding:2px 5px}
      .compact th,.compact td{padding:1px 3px}
      .compact .daily-unit,.compact .daily-remark{padding:0;min-height:12px}
      .compact .print-heading{margin-bottom:4px}
      header,th,.daily-zone-head,td.daily-time{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    `;
    popup.document.open();
    popup.document.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ELU Daily Planner '+esc(dateInput.value)+'</title><style>'+css+'</style></head><body>'+pages+'</body></html>');
    popup.document.close();
    const fit=()=>{
      popup.document.querySelectorAll('.print-page').forEach(page=>{
        const content=page.querySelector('.print-content');
        page.classList.remove('compact');content.style.transform='none';
        const measure=()=>Math.min(1,page.clientWidth/Math.max(content.scrollWidth,content.getBoundingClientRect().width),page.clientHeight/Math.max(content.scrollHeight,content.getBoundingClientRect().height));
        let scale=measure();
        if(scale<.98){page.classList.add('compact');scale=measure()}
        // Round down and leave a small height allowance so no last row is cut off.
        scale=Math.floor(scale*9990)/10000;
        content.style.transform='scale('+scale+')';
      });
    };
    popup.addEventListener('beforeprint',fit);
    const images=[...popup.document.images].map(img=>img.decode?img.decode():new Promise((resolve,reject)=>{
      if(img.complete){img.naturalWidth?resolve():reject(new Error('Background unavailable'));return}
      img.onload=resolve;img.onerror=reject;
    }));
    Promise.all([popup.document.fonts?.ready||Promise.resolve(),...images]).then(()=>popup.requestAnimationFrame(()=>popup.requestAnimationFrame(()=>{
      if(popup.closed)return;
      fit();popup.focus();popup.print();
    }))).catch(()=>{toast('Daily Planner background could not load. Refresh and try printing again.');popup.close()});
  });
  window.renderPlannerDailySheet=render;
  render();
})();
