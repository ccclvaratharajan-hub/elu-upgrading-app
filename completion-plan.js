/* V8.44.105: live remaining-workday view alongside the completion forecast. */
function completionMaxDate(...dates){return dates.filter(Boolean).sort().at(-1)||""}
function completionNextDay(date){let d=addDaysISO(date,1);while(new Date(d+"T00:00:00Z").getUTCDay()===0)d=addDaysISO(d,1);return d}
function completionAddDays(date,days){for(let i=0;i<days;i++)date=completionNextDay(date);return date}
function completionInputs(){return {today:isoTodaySG(),perTeam:SLOTS.length}}
function completionHasStarted(block,units,raw){
  if(!blockHasFieldActivity(block,raw))return false;
  // A confirmed booking is enough to mark the block started, even when its
  // appointment date is still in the future.
  if(![539,540,541,542,543,558,559,560,561].includes(block))return true;
  const today=isoTodaySG();
  return units.some(u=>u.workStatus==="Completed"||(u.response==="C"&&!!u.appointmentDate)||(u.appointmentDate&&u.appointmentDate<=today));
}
function completionRows(){
  return [4,5,6].flatMap(zone=>(ZONE_BLOCKS[zone]||[]).map(block=>{
    const raw=getBlockUnits(block);
    const units=raw.map(u=>{const live=currentUnitAppointmentState(u.key);return {...u,response:live.status,workStatus:live.workStatus,appointmentDate:live.appointment?.date||"",appointmentSlot:live.appointment?.slot||""}});
    const started=completionHasStarted(block,units,raw);
    const booked=units.filter(u=>u.response==="C"&&u.workStatus!=="Completed");
    // Untouched blocks carry default NR labels; they are not field-confirmed NR.
    const nr=started?units.filter(u=>u.response==="NR").length:0;
    const p=started?units.filter(u=>u.response==="P").length:0;
    const futureUnits=units.filter(u=>(u.response==="NR"||u.response==="P")&&u.workStatus!=="Completed").length;
    const done=units.filter(u=>u.workStatus==="Completed").length;
    const total=units.length,balance=nr+p,balancePct=total?balance/total*100:0;
    // The four-unit 539 has an existing booking; its unanswered units are follow-up.
    const tinyNrFollowUp=zone===5&&block===539&&total===4&&futureUnits===3&&
      units.filter(u=>u.response==="NR").length===3&&booked.length+done>=1;
    const followUp=tinyNrFollowUp||(started&&balance>0&&balance<10);
    // Leave up to nine unanswered units for follow-up instead of blocking the next block.
    // A genuinely untouched four-unit block still needs its one estimated workday.
    const planLeft=followUp?0:futureUnits>=10?futureUnits-9:futureUnits;
    return {zone,block,total,started,done,donePct:total?done/total*100:0,balancePct,futureUnits,
      booked:booked.length,nr,p,undated:balance,planLeft,tinyNrFollowUp,lastBooked:completionMaxDate(...booked.map(u=>u.appointmentDate)),bookedSlots:booked.map(u=>({date:u.appointmentDate,slot:u.appointmentSlot})),
      allSlots:units.filter(u=>u.appointmentDate&&SLOTS.includes(u.appointmentSlot)).map(u=>({date:u.appointmentDate,slot:u.appointmentSlot})),
      followUp,
      teams:zone===4&&block>=559?2:1,target:"",plannedDate:"",workDays:0};
  }));
}
function completionParallelBookingDate(slots){
  const counts=new Map();
  for(const a of slots||[]){
    if(!a.date||!SLOTS.includes(a.slot))continue;
    const key=`${a.date}|${a.slot}`,count=(counts.get(key)||0)+1;
    counts.set(key,count);
  }
  return [...counts].filter(([,count])=>count>=2).map(([key])=>key.split("|")[0]).sort()[0]||"";
}
function completionPriority(a,b){
  return Number(b.followUp)-Number(a.followUp)||
    Number(b.started)-Number(a.started)||
    a.balancePct-b.balancePct||
    b.donePct-a.donePct||
    a.undated-b.undated||
    a.block-b.block;
}
function completionSchedule(){
  const rows=completionRows(),{today}=completionInputs(),occupied=new Map();
  const lane=r=>r.zone===4?(r.block===557||r.block===558?"4-sub":"4-main"):String(r.zone);
  // Each confirmed C occupies its actual date and time slot. Never move it.
  rows.forEach(r=>r.bookedSlots.forEach(a=>{
    if(!a.date)return;
    const slot=SLOTS.includes(a.slot)?a.slot:SLOTS[0];
    const key=`${lane(r)}|${a.date}|${slot}`;
    occupied.set(key,(occupied.get(key)||0)+1);
  }));
  const now=sgClock();
  const allocate=(r,earliest,capacity,teams=r.teams)=>{
    let left=r.planLeft??r.undated,last="",date=earliest;
    // Count only the workdays needed for the undated balance. Existing booked
    // appointments already have dates and must not inflate this day count.
    const workDates=new Set();
    // Dates are estimates of available capacity, not actual resident bookings.
    for(let day=0;left&&day<730;day++,date=completionNextDay(date)){
      if(new Date(date+"T00:00:00Z").getUTCDay()===0)continue;
      for(const slot of SLOTS){
        if(date===today&&slotStartMinutes(slot)<=now.minutes)continue;
        const key=`${lane(r)}|${date}|${slot}`,used=occupied.get(key)||0;
        const open=Math.min(teams,Math.max(0,capacity(date)-used)),take=Math.min(left,open);
        if(take){occupied.set(key,used+take);left-=take;last=date;workDates.add(date)}
      }
    }
    r.plannedDate=last;
    r.workDays=workDates.size;
    r.target=completionMaxDate(r.lastBooked,last);
    return r.target;
  };
  const group=(zone,blocks,earliest,capacity,includeUpcoming=false)=>{
    const selected=blocks.map(block=>rows.find(r=>r.zone===zone&&r.block===block))
      .filter(r=>r&&(r.started||includeUpcoming));
    // Upcoming blocks use unbooked NR/P counts only for an estimated date.
    let cursor=earliest;
    selected.filter(r=>!r.followUp).forEach(r=>{
      let target=allocate(r,cursor,capacity,r.zone===6||r.block===562?2:r.teams);
      if(target)cursor=completionNextDay(target);
    });
    return completionMaxDate(...selected.filter(r=>!r.followUp).map(r=>r.target));
  };
  // Booked visits in 537–539 still occupy their actual slots; free slots can
  // already be used to start 540 instead of waiting for the final booked visit.
  group(5,ZONE_BLOCKS[5],today,()=>1,true);
  const block562=rows.find(r=>r.zone===4&&r.block===562);
  // The first booked 562 appointment is the first KSK team handover. Until
  // then both KSK teams can work in Zone 6; afterwards one remains there.
  const first562Date=block562?.allSlots.map(a=>a.date).filter(Boolean).sort()[0]||today;
  const zone6Capacity=date=>date<first562Date?2:1;
  rows.filter(r=>r.zone===6).forEach(r=>r.teams=first562Date>today?2:1);
  group(6,[555,556],today,zone6Capacity);
  group(6,ZONE_BLOCKS[6].filter(block=>block!==555&&block!==556),today,zone6Capacity);
  group(4,[557,558],today,()=>1,true);
  // The 556 team transfers after its final booked visit. The team working
  // 555 stays there; its unfinished NR does not delay the 556 handover.
  const block556=rows.find(r=>r.zone===6&&r.block===556);
  const releaseDate=completionMaxDate(block556?.target,...(block556?.allSlots||[]).map(a=>a.date))||today;
  const secondTeamDate=releaseDate>=today?completionNextDay(releaseDate):today;
  block562.teams=2;
  const mainCapacity=date=>date<first562Date?0:date>=secondTeamDate?2:1;
  group(4,[562,561,560,559],today,mainCapacity,true);
  return rows;
}
function completionDisplayRows(rows,zone){
  const order=zone===4?[557,558,562,561,560,559]:ZONE_BLOCKS[zone]||[];
  return rows.filter(r=>r.zone===zone).sort((a,b)=>order.indexOf(a.block)-order.indexOf(b.block));
}
function completionZoneTarget(rows,zone){return completionMaxDate(...rows.filter(r=>r.zone===zone).map(r=>r.followUp?r.lastBooked:r.target))}
function completionOverallTarget(rows){return completionMaxDate(...[4,5,6].map(zone=>completionZoneTarget(rows,zone)))}
function completionDate(date){return date?safeDate(date):"—"}
function completionWorkingDaysLeft(today,target){
  if(!target||target<=today)return 0;
  let days=0,date=today;
  while(date<target){date=completionNextDay(date);if(date<=target)days++}
  return days;
}
function completionPercent(value){return `${value.toFixed(1)}%`}
function completionTargetLabel(rows,zone){const date=completionZoneTarget(rows,zone);return date?`Est. ${completionDate(date)}`:rows.some(r=>r.zone===zone&&r.started)?"Almost completed / follow-up":"No active block yet"}
function completionWorkdays(r){return r.workDays?` · ${r.workDays} workday${r.workDays===1?"":"s"}`:""}
function completionBlockLabel(r){return r.tinyNrFollowUp?"NR follow-up · advance to next block":r.followUp?`Almost completed · NR/P follow-up${r.plannedDate?` ~ ${completionDate(r.plannedDate)}`:""}${completionWorkdays(r)}`:!r.started?`Not started · Est. ${completionDate(r.target)}${completionWorkdays(r)}`:r.done===r.total?"Completed":`${completionDate(r.target)}${completionWorkdays(r)}`}
function completionPptBlockLabel(r){return r.tinyNrFollowUp?"NR follow-up · advance":r.followUp?"Almost completed · NR/P follow-up":!r.started?`Not started · Est. ${completionDate(r.target)}${completionWorkdays(r)}`:r.done===r.total?"Completed":`${completionDate(r.target)}${completionWorkdays(r)}`}
async function completionBackgroundData(){
  try{
    const response=await fetch(new URL("elu-switchgear-night-v84453.jpg",document.baseURI));
    if(!response.ok)throw new Error("Slide photograph unavailable");
    const blob=await response.blob();
    return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)});
  }catch(err){console.warn("Completion slide background",err);return null}
}
function renderCompletionPlan(){
  const rows=completionSchedule(),{today,perTeam}=completionInputs();
  document.getElementById("completionCountdown").innerHTML=[4,5,6].map(zone=>{
    const group=rows.filter(r=>r.zone===zone),target=completionZoneTarget(rows,zone);
    const booked=group.reduce((n,r)=>n+r.booked,0);
    const unbooked=group.reduce((n,r)=>n+r.futureUnits,0);
    const nr=group.reduce((n,r)=>n+r.nr+r.p,0);
    return `<div class="completion-countdown-card"><strong>Zone ${zone}</strong><span class="completion-countdown-days">${target?completionWorkingDaysLeft(today,target):"—"}<small>working days left</small></span><span>Est. ${completionDate(target)}</span><span>${booked} booked · ${unbooked} unbooked forecast</span><span>${nr} recorded NR/P</span></div>`;
  }).join("");
  const totals=rows.reduce((a,r)=>{for(const k of ["done","booked","nr","p"])a[k]+=r[k];if(!r.followUp)a.planLeft+=r.planLeft;return a},{done:0,booked:0,nr:0,p:0,planLeft:0});
  document.getElementById("completionSummary").innerHTML=[
    ["Recorded completed",totals.done],["Already booked",totals.booked],["Recorded NR + P",totals.nr+totals.p],
    ["Main unbooked forecast",totals.planLeft],["Main upcoming · booked + forecast",totals.booked+totals.planLeft],
    ["Overall estimated finish",completionDate(completionOverallTarget(rows))]
  ].map(([label,count])=>`<div><span>${label}</span><strong>${count}</strong></div>`).join("");
  document.getElementById("completionZones").innerHTML=[4,5,6].map(zone=>{
    const group=completionDisplayRows(rows,zone);
    const body=group.map(r=>`<tr><td><strong>Blk ${r.block}</strong>${r.started?"":"<small>Yet to start</small>"}</td><td>${r.total}</td><td>${r.done}</td><td><strong>${completionPercent(r.donePct)}</strong></td><td>${r.booked}</td><td>${r.started?r.nr:"—"}</td><td>${r.started?r.p:"—"}</td><td><strong>${r.started?completionPercent(r.balancePct):"—"}</strong></td><td>${r.teams}${r.zone===4&&r.block===562?"<small>2nd after Blk 556</small>":""}</td><td><strong>${r.target?completionWorkingDaysLeft(today,r.target):"—"}</strong></td><td><strong>${completionBlockLabel(r)}</strong></td></tr>`).join("");
    return `<article class="completion-zone"><div class="completion-zone-head"><div><span>ZONE ${zone}</span><h3>Blocks ${ZONE_BLOCKS[zone].join(", ")}</h3></div><div><small>Estimated zone target</small><strong>${completionTargetLabel(rows,zone)}</strong></div></div><div class="completion-scroll"><table><thead><tr><th>Block</th><th>Units</th><th>Done</th><th>Done %</th><th>Booked</th><th>NR</th><th>P</th><th>Balance %</th><th>Teams</th><th>Days left</th><th>Main work / follow-up</th></tr></thead><tbody>${body}</tbody></table></div></article>`;
  }).join("");
  document.querySelector(".completion-controls span").textContent=`As of ${completionDate(today)} · ${perTeam} slots per team per day · Sundays excluded`;
}
async function exportCompletionPpt(){
  if(typeof PptxGenJS!=="function"){toast("PPT library did not load.");return}
  const rows=completionSchedule(),{today,perTeam}=completionInputs(),pptx=new PptxGenJS(),backgroundData=await completionBackgroundData();
  pptx.layout="LAYOUT_WIDE";pptx.author="ELU Upgrading";pptx.subject="Approximate zone completion plan";pptx.title="10 mm² Cable Upgrading Work (Unit Work)";
  const widths=[1.05,.90,.90,1.00,.80,.80,1.00,1.00,.90,4.08],x=[.45];widths.forEach(w=>x.push(x.at(-1)+w));
  [4,5,6].forEach((zone,i)=>{
    const group=completionDisplayRows(rows,zone),slide=pptx.addSlide();slide.background={color:"F6FAFD"};
    if(backgroundData){
      slide.addImage({data:backgroundData,x:0,y:0,w:13.333,h:7.5});
      slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.333,h:7.5,line:{color:"102C4C",transparency:100},fill:{color:"102C4C",transparency:68}});
    }
    slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.333,h:.13,line:{color:"57BFEF"},fill:{color:"57BFEF"}});
    const headColor=backgroundData?"FFFFFF":"123E67",kickerColor=backgroundData?"C9EEFF":"24658C";
    slide.addText(`ELU / ZONE ${zone} / COMPLETION PLAN`,{x:.48,y:.33,w:8.8,h:.29,fontFace:"Arial",fontSize:11,bold:true,color:kickerColor,margin:0});
    slide.addText("10 mm² Cable Upgrading Work (Unit Work)",{x:.48,y:.69,w:8.1,h:.58,fontFace:"Arial",fontSize:20,bold:true,color:headColor,margin:0,fit:"shrink"});
    slide.addText(`Estimated target: ${completionTargetLabel(rows,zone)}`,{x:8.6,y:.76,w:4.2,h:.36,fontFace:"Arial",fontSize:15,bold:true,color:headColor,align:"right",margin:0,fit:"shrink"});
    const draw=(v,c,y,h,header=false,shade=false)=>{
      slide.addShape(pptx.ShapeType.rect,{x:x[c],y,w:widths[c],h,
        line:{color:header?"204C73":"83A7BF",width:header?1:.75},
        fill:{color:header?"173F68":shade?"EAF3F9":"FFFFFF",
          transparency:backgroundData?(header?4:shade?13:8):0}});
      slide.addText(String(v),{x:x[c]+.05,y:y+.035,w:widths[c]-.10,h:h-.07,
        fontFace:"Arial",fontSize:header?11.2:13.4,bold:true,
        color:header?"FFFFFF":"102D46",margin:0,
        align:c===0||c===9?"left":"center",valign:"mid",fit:"shrink"});
    };
    ["Block","Units","Done","Done %","Booked","NR","P","Balance %","Teams","Target / follow-up"].forEach((v,c)=>draw(v,c,1.40,.62,true));
    group.forEach((r,j)=>[r.block,r.total,r.done,completionPercent(r.donePct),r.booked,r.started?r.nr:"—",r.started?r.p:"—",r.started?completionPercent(r.balancePct):"—",r.teams,completionPptBlockLabel(r)]
      .forEach((v,c)=>draw(v,c,2.02+j*.70,.70,false,j%2===1)));
    slide.addText(`Working estimate as of ${completionDate(today)}. ${perTeam} units per team per day; Sundays excluded. Confirmed bookings retain their dates.`,{x:.48,y:6.39,w:12.2,h:.34,fontFace:"Arial",fontSize:11,bold:!!backgroundData,color:backgroundData?"FFFFFF":"355D74",margin:0,fit:"shrink"});
    slide.addText("Empty slots are forecasts, not bookings. Under 10 NR/P remains follow-up; the same KSK teams move from Zone 6 to Blk 562.",{x:.48,y:6.77,w:12.2,h:.27,fontFace:"Arial",fontSize:9.5,color:backgroundData?"E7F5FF":"5C7788",margin:0,fit:"shrink"});
    slide.addText(`${i+1} / 3`,{x:12.2,y:7.18,w:.65,h:.18,fontFace:"Arial",fontSize:8,color:backgroundData?"FFFFFF":"60798A",align:"right",margin:0});
  });
  try{const blob=await pptx.write({outputType:"blob"});downloadBlob(`ELU_Completion_Plan_${today}.pptx`,blob);toast("Completion slides downloaded")}
  catch(err){console.error("Completion PPT",err);toast("Completion PPT failed")}
}
document.getElementById("completionPptBtn").addEventListener("click",exportCompletionPpt);
document.getElementById("exportCompletionPptBtn").addEventListener("click",exportCompletionPpt);
let completionCountdownDay=isoTodaySG();
setInterval(()=>{
  const today=isoTodaySG();
  if(today===completionCountdownDay)return;
  completionCountdownDay=today;
  if(document.getElementById("completion")?.classList.contains("active"))renderCompletionPlan();
},60000);
