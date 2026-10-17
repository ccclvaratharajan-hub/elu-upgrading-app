/* V8.44.77: read-only forecast from the live Block Board state. */
function completionMaxDate(...dates){return dates.filter(Boolean).sort().at(-1)||""}
function completionNextDay(date){let d=addDaysISO(date,1);while(new Date(d+"T00:00:00Z").getUTCDay()===0)d=addDaysISO(d,1);return d}
function completionAddDays(date,days){for(let i=0;i<days;i++)date=completionNextDay(date);return date}
function completionInputs(){return {today:isoTodaySG(),perTeam:Math.max(1,Math.min(8,Number(document.getElementById("completionDailyUnits").value)||4))}}
function completionRows(){
  return [4,5,6].flatMap(zone=>(ZONE_BLOCKS[zone]||[]).map(block=>{
    const raw=getBlockUnits(block),started=blockHasFieldActivity(block,raw);
    const units=raw.map(u=>{const live=currentUnitAppointmentState(u.key);return {...u,response:live.status,workStatus:live.workStatus,appointmentDate:live.appointment?.date||""}});
    const booked=units.filter(u=>u.response==="C"&&u.workStatus!=="Completed");
    const nr=units.filter(u=>u.response==="NR").length,p=units.filter(u=>u.response==="P").length;
    return {zone,block,total:units.length,started,done:units.filter(u=>u.workStatus==="Completed").length,
      booked:booked.length,nr,p,undated:nr+p,lastBooked:completionMaxDate(...booked.map(u=>u.appointmentDate)),
      teams:zone===6||(zone===4&&block>=559)?2:1,target:""};
  }));
}
function completionSchedule(){
  const rows=completionRows(),{today,perTeam}=completionInputs();
  const bookedThrough=completionMaxDate(today,...rows.map(r=>r.lastBooked));
  const sequence=(zone,blocks,firstAnchor)=>{
    let anchor=firstAnchor||bookedThrough;
    blocks.forEach(block=>{
      const r=rows.find(x=>x.zone===zone&&x.block===block);
      const base=completionMaxDate(bookedThrough,anchor,r.lastBooked);
      const days=Math.ceil(r.undated/(r.teams*perTeam));
      r.target=days?completionAddDays(base,days):(r.booked?r.lastBooked:"");
      if(r.target)anchor=completionMaxDate(anchor,r.target);
    });
    return anchor;
  };
  sequence(5,ZONE_BLOCKS[5],bookedThrough);
  const zone6End=sequence(6,ZONE_BLOCKS[6],bookedThrough);
  const firstZone4End=sequence(4,[557,558],bookedThrough);
  sequence(4,[559,560,561,562],completionMaxDate(firstZone4End,zone6End));
  return rows;
}
function completionZoneTarget(rows,zone){return completionMaxDate(...rows.filter(r=>r.zone===zone).map(r=>r.target))}
function completionDate(date){return date?safeDate(date):"—"}
function renderCompletionPlan(){
  const rows=completionSchedule(),{today,perTeam}=completionInputs();
  const totals=rows.reduce((a,r)=>{for(const k of ["done","booked","nr","p","undated"])a[k]+=r[k];return a},{done:0,booked:0,nr:0,p:0,undated:0});
  document.getElementById("completionSummary").innerHTML=[
    ["Recorded completed",totals.done],["Pink C · dated",totals.booked],["Red NR",totals.nr],["White/blue P",totals.p],["To plan · NR + P",totals.undated]
  ].map(([label,count])=>`<div><span>${label}</span><strong>${count}</strong></div>`).join("");
  document.getElementById("completionZones").innerHTML=[4,5,6].map(zone=>{
    const group=rows.filter(r=>r.zone===zone);
    const body=group.map(r=>`<tr><td><strong>Blk ${r.block}</strong>${r.started?"":"<small>Yet to start</small>"}</td><td>${r.total}</td><td>${r.done}</td><td>${r.booked}</td><td>${r.nr}</td><td>${r.p}</td><td>${r.undated}</td><td>${completionDate(r.lastBooked)}</td><td>${r.teams}</td><td><strong>${completionDate(r.target)}</strong></td></tr>`).join("");
    return `<article class="completion-zone"><div class="completion-zone-head"><div><span>ZONE ${zone}</span><h3>Blocks ${ZONE_BLOCKS[zone].join(", ")}</h3></div><div><small>Approximate zone target</small><strong>${completionDate(completionZoneTarget(rows,zone))}</strong></div></div><div class="completion-scroll"><table><thead><tr><th>Block</th><th>Units</th><th>Done</th><th>Booked</th><th>NR</th><th>P</th><th>No date</th><th>Last booking</th><th>Teams</th><th>Est. date</th></tr></thead><tbody>${body}</tbody></table></div></article>`;
  }).join("");
  document.querySelector(".completion-controls span").textContent=`As of ${completionDate(today)} · Booked through ${completionDate(completionMaxDate(...rows.map(r=>r.lastBooked)))} · ${perTeam} units per team per day · Sundays excluded`;
}
async function exportCompletionPpt(){
  if(typeof PptxGenJS!=="function"){toast("PPT library did not load.");return}
  const rows=completionSchedule(),{today,perTeam}=completionInputs(),pptx=new PptxGenJS();
  pptx.layout="LAYOUT_WIDE";pptx.author="ELU Upgrading";pptx.subject="Approximate zone completion plan";pptx.title="ELU Expected Completion";
  const widths=[1.10,1.10,1.10,1.10,1.00,.80,1.20,1.80,1.00,2.23],x=[.45];widths.forEach(w=>x.push(x.at(-1)+w));
  [4,5,6].forEach((zone,i)=>{
    const group=rows.filter(r=>r.zone===zone),slide=pptx.addSlide();slide.background={color:"F6FAFD"};
    slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.333,h:.13,line:{color:"123E67"},fill:{color:"123E67"}});
    slide.addText("ELU UPGRADING / EXPECTED COMPLETION",{x:.48,y:.33,w:8.8,h:.29,fontFace:"Arial",fontSize:11,bold:true,color:"24658C",margin:0});
    slide.addText(`Zone ${zone} · Block plan`,{x:.48,y:.72,w:8.5,h:.5,fontFace:"Arial",fontSize:25,bold:true,color:"123E67",margin:0});
    slide.addText(`Approximate target: ${completionDate(completionZoneTarget(rows,zone))}`,{x:8.6,y:.76,w:4.2,h:.36,fontFace:"Arial",fontSize:15,bold:true,color:"12638E",align:"right",margin:0});
    const draw=(v,c,y,h,header=false,shade=false)=>{
      slide.addShape(pptx.ShapeType.rect,{x:x[c],y,w:widths[c],h,line:{color:"B7CBDA",width:.7},fill:{color:header?"DCECF7":shade?"EDF5FA":"FFFFFF"}});
      slide.addText(String(v),{x:x[c]+.04,y:y+.025,w:widths[c]-.08,h:h-.05,fontFace:"Arial",fontSize:header?9:10.8,bold:header||c===0||c===9,color:header?"123E67":"18394E",margin:0,align:c===0?"left":"center",valign:"mid",fit:"shrink"});
    };
    ["Block","Units","Done","Booked","NR","P","No date","Last booked","Teams","Est. date"].forEach((v,c)=>draw(v,c,1.58,.51,true));
    group.forEach((r,j)=>[r.block,r.total,r.done,r.booked,r.nr,r.p,r.undated,completionDate(r.lastBooked),r.teams,completionDate(r.target)]
      .forEach((v,c)=>draw(v,c,2.09+j*.61,.61,false,j%2===1)));
    slide.addText(`Working estimate as of ${completionDate(today)}. ${perTeam} units per team per day; Sundays excluded. Confirmed bookings retain their dates.`,{x:.48,y:6.49,w:12.2,h:.33,fontFace:"Arial",fontSize:10,color:"355D74",margin:0,fit:"shrink"});
    slide.addText("NR and undated units need resident confirmation. Cancellation or extra work may change the target.",{x:.48,y:6.86,w:12.2,h:.25,fontFace:"Arial",fontSize:9,color:"5C7788",margin:0,fit:"shrink"});
    slide.addText(`${i+1} / 3`,{x:12.2,y:7.18,w:.65,h:.18,fontFace:"Arial",fontSize:8,color:"60798A",align:"right",margin:0});
  });
  try{const blob=await pptx.write({outputType:"blob"});downloadBlob(`ELU_Completion_Plan_${today}.pptx`,blob);toast("Completion slides downloaded")}
  catch(err){console.error("Completion PPT",err);toast("Completion PPT failed")}
}
document.getElementById("completionDailyUnits").addEventListener("change",renderCompletionPlan);
document.getElementById("completionPptBtn").addEventListener("click",exportCompletionPpt);
document.getElementById("exportCompletionPptBtn").addEventListener("click",exportCompletionPpt);
