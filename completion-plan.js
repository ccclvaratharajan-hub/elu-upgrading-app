/* V8.44.83: read-only forecast from the live Block Board state. */
function completionMaxDate(...dates){return dates.filter(Boolean).sort().at(-1)||""}
function completionNextDay(date){let d=addDaysISO(date,1);while(new Date(d+"T00:00:00Z").getUTCDay()===0)d=addDaysISO(d,1);return d}
function completionAddDays(date,days){for(let i=0;i<days;i++)date=completionNextDay(date);return date}
function completionInputs(){return {today:isoTodaySG(),perTeam:SLOTS.length}}
function completionRows(){
  return [4,5,6].flatMap(zone=>(ZONE_BLOCKS[zone]||[]).map(block=>{
    const raw=getBlockUnits(block),started=blockHasFieldActivity(block,raw);
    const units=raw.map(u=>{const live=currentUnitAppointmentState(u.key);return {...u,response:live.status,workStatus:live.workStatus,appointmentDate:live.appointment?.date||"",appointmentSlot:live.appointment?.slot||""}});
    const booked=units.filter(u=>u.response==="C"&&u.workStatus!=="Completed");
    const nr=units.filter(u=>u.response==="NR").length,p=units.filter(u=>u.response==="P").length;
    const done=units.filter(u=>u.workStatus==="Completed").length;
    const total=units.length,balance=nr+p,balancePct=total?balance/total*100:0;
    return {zone,block,total,started,done,donePct:total?done/total*100:0,balancePct,
      booked:booked.length,nr,p,undated:balance,lastBooked:completionMaxDate(...booked.map(u=>u.appointmentDate)),bookedSlots:booked.map(u=>({date:u.appointmentDate,slot:u.appointmentSlot})),
      followUp:started&&balance>0&&balancePct<10&&done+booked.length>0,
      teams:zone===6||(zone===4&&block>=559)?2:1,target:"",plannedDate:""};
  }));
}
function completionSchedule(){
  const rows=completionRows(),{today}=completionInputs(),occupied=new Map();
  // Each confirmed C occupies its actual date and time slot. Never move it.
  rows.forEach(r=>r.bookedSlots.forEach(a=>{
    if(!a.date)return;
    const slot=SLOTS.includes(a.slot)?a.slot:SLOTS[0];
    const key=`${r.zone}|${a.date}|${slot}`;
    occupied.set(key,(occupied.get(key)||0)+1);
  }));
  const now=sgClock(),perTeam=completionInputs().perTeam;
  const allocate=(r,earliest,teams)=>{
    let left=r.undated,last="",date=earliest;
    // Dates are estimates of available capacity, not actual resident bookings.
    for(let day=0;left&&day<730;day++,date=completionNextDay(date)){
      if(new Date(date+"T00:00:00Z").getUTCDay()===0)continue;
      for(const slot of SLOTS){
        if(date===today&&slotStartMinutes(slot)<=now.minutes)continue;
        const key=`${r.zone}|${date}|${slot}`,used=occupied.get(key)||0;
        const open=Math.max(0,teams-used),take=Math.min(left,open);
        if(take){occupied.set(key,used+take);left-=take;last=date}
      }
    }
    r.plannedDate=last;
    r.target=completionMaxDate(r.lastBooked,last);
    r.teams=teams;
    return r.target;
  };
  const group=(zone,blocks,earliest,teams)=>{
    const selected=blocks.map(block=>rows.find(r=>r.zone===zone&&r.block===block));
    // Finish the main workload first; the handful of residual NR/P can use later gaps.
    selected.filter(r=>!r.followUp).concat(selected.filter(r=>r.followUp)).forEach(r=>allocate(r,earliest,teams));
    return completionMaxDate(...selected.filter(r=>!r.followUp).map(r=>r.target));
  };
  group(5,ZONE_BLOCKS[5],today,1);
  const zone6End=group(6,ZONE_BLOCKS[6],today,2);
  const firstZone4End=group(4,[557,558],today,1);
  const secondStart=completionNextDay(completionMaxDate(today,zone6End,firstZone4End));
  group(4,[559,560,561,562],secondStart,2);
  return rows;
}
function completionZoneTarget(rows,zone){return completionMaxDate(...rows.filter(r=>r.zone===zone&&!r.followUp).map(r=>r.target))}
function completionDate(date){return date?safeDate(date):"—"}
function completionPercent(value){return `${value.toFixed(1)}%`}
function completionTargetLabel(rows,zone){const date=completionZoneTarget(rows,zone);return date?completionDate(date):"Almost completed / follow-up"}
function completionBlockLabel(r){return r.followUp?`Almost completed · NR/P follow-up${r.plannedDate?` ~ ${completionDate(r.plannedDate)}`:""}`:completionDate(r.target)}
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
  const totals=rows.reduce((a,r)=>{for(const k of ["done","booked","nr","p","undated"])a[k]+=r[k];return a},{done:0,booked:0,nr:0,p:0,undated:0});
  document.getElementById("completionSummary").innerHTML=[
    ["Recorded completed",totals.done],["Pink C · dated",totals.booked],["Red NR",totals.nr],["White/blue P",totals.p],["To plan · NR + P",totals.undated]
  ].map(([label,count])=>`<div><span>${label}</span><strong>${count}</strong></div>`).join("");
  document.getElementById("completionZones").innerHTML=[4,5,6].map(zone=>{
    const group=rows.filter(r=>r.zone===zone);
    const body=group.map(r=>`<tr><td><strong>Blk ${r.block}</strong>${r.started?"":"<small>Yet to start</small>"}</td><td>${r.total}</td><td>${r.done}</td><td><strong>${completionPercent(r.donePct)}</strong></td><td>${r.booked}</td><td>${r.nr}</td><td>${r.p}</td><td><strong>${completionPercent(r.balancePct)}</strong></td><td>${r.teams}</td><td><strong>${completionBlockLabel(r)}</strong></td></tr>`).join("");
    return `<article class="completion-zone"><div class="completion-zone-head"><div><span>ZONE ${zone}</span><h3>Blocks ${ZONE_BLOCKS[zone].join(", ")}</h3></div><div><small>Approximate main-work target</small><strong>${completionTargetLabel(rows,zone)}</strong></div></div><div class="completion-scroll"><table><thead><tr><th>Block</th><th>Units</th><th>Done</th><th>Done %</th><th>Booked</th><th>NR</th><th>P</th><th>Balance %</th><th>Teams</th><th>Main work / follow-up</th></tr></thead><tbody>${body}</tbody></table></div></article>`;
  }).join("");
  document.querySelector(".completion-controls span").textContent=`As of ${completionDate(today)} · ${perTeam} slots per team per day · Sundays excluded`;
}
async function exportCompletionPpt(){
  if(typeof PptxGenJS!=="function"){toast("PPT library did not load.");return}
  const rows=completionSchedule(),{today,perTeam}=completionInputs(),pptx=new PptxGenJS(),backgroundData=await completionBackgroundData();
  pptx.layout="LAYOUT_WIDE";pptx.author="ELU Upgrading";pptx.subject="Approximate zone completion plan";pptx.title="10 mm² Cable Upgrading Work (Unit Work)";
  const widths=[1.05,.90,.90,1.00,.80,.80,1.00,1.00,.90,4.08],x=[.45];widths.forEach(w=>x.push(x.at(-1)+w));
  [4,5,6].forEach((zone,i)=>{
    const group=rows.filter(r=>r.zone===zone),slide=pptx.addSlide();slide.background={color:"F6FAFD"};
    if(backgroundData){
      slide.addImage({data:backgroundData,x:0,y:0,w:13.333,h:7.5});
      slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.333,h:7.5,line:{color:"102C4C",transparency:100},fill:{color:"102C4C",transparency:38}});
    }
    slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.333,h:.13,line:{color:"57BFEF"},fill:{color:"57BFEF"}});
    const headColor=backgroundData?"FFFFFF":"123E67",kickerColor=backgroundData?"C9EEFF":"24658C";
    slide.addText(`ELU / ZONE ${zone} / EXPECTED COMPLETION`,{x:.48,y:.33,w:8.8,h:.29,fontFace:"Arial",fontSize:11,bold:true,color:kickerColor,margin:0});
    slide.addText("10 mm² Cable Upgrading Work (Unit Work)",{x:.48,y:.69,w:8.1,h:.58,fontFace:"Arial",fontSize:20,bold:true,color:headColor,margin:0,fit:"shrink"});
    slide.addText(`Main-work target: ${completionTargetLabel(rows,zone)}`,{x:8.6,y:.76,w:4.2,h:.36,fontFace:"Arial",fontSize:15,bold:true,color:headColor,align:"right",margin:0,fit:"shrink"});
    const draw=(v,c,y,h,header=false,shade=false)=>{
      slide.addShape(pptx.ShapeType.rect,{x:x[c],y,w:widths[c],h,line:{color:"B7CBDA",width:.7},fill:{color:header?"DCECF7":shade?"EDF5FA":"FFFFFF"}});
      slide.addText(String(v),{x:x[c]+.04,y:y+.025,w:widths[c]-.08,h:h-.05,fontFace:"Arial",fontSize:header?9:10.8,bold:header||c===0||c===3||c===7||c===9,color:header?"123E67":"18394E",margin:0,align:c===0||c===9?"left":"center",valign:"mid",fit:"shrink"});
    };
    ["Block","Units","Done","Done %","Booked","NR","P","Balance %","Teams","Target / follow-up"].forEach((v,c)=>draw(v,c,1.58,.51,true));
    group.forEach((r,j)=>[r.block,r.total,r.done,completionPercent(r.donePct),r.booked,r.nr,r.p,completionPercent(r.balancePct),r.teams,completionBlockLabel(r)]
      .forEach((v,c)=>draw(v,c,2.09+j*.61,.61,false,j%2===1)));
    slide.addText(`Working estimate as of ${completionDate(today)}. ${perTeam} units per team per day; Sundays excluded. Confirmed bookings retain their dates.`,{x:.48,y:6.49,w:12.2,h:.33,fontFace:"Arial",fontSize:10,bold:!!backgroundData,color:backgroundData?"FFFFFF":"355D74",margin:0,fit:"shrink"});
    slide.addText("Balance % = (NR + P) / total units. Active blocks below 10% balance are almost completed; follow-up does not extend the zone target.",{x:.48,y:6.86,w:12.2,h:.25,fontFace:"Arial",fontSize:9,color:backgroundData?"E7F5FF":"5C7788",margin:0,fit:"shrink"});
    slide.addText(`${i+1} / 3`,{x:12.2,y:7.18,w:.65,h:.18,fontFace:"Arial",fontSize:8,color:backgroundData?"FFFFFF":"60798A",align:"right",margin:0});
  });
  try{const blob=await pptx.write({outputType:"blob"});downloadBlob(`ELU_Completion_Plan_${today}.pptx`,blob);toast("Completion slides downloaded")}
  catch(err){console.error("Completion PPT",err);toast("Completion PPT failed")}
}
document.getElementById("completionPptBtn").addEventListener("click",exportCompletionPpt);
document.getElementById("exportCompletionPptBtn").addEventListener("click",exportCompletionPpt);
