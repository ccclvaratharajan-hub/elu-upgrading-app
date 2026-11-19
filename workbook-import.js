(function(){
  "use strict";
  const input=document.getElementById("projectWorkbookFile");
  if(!input)return;
  const preview=document.getElementById("projectWorkbookPreview");
  const button=document.getElementById("projectWorkbookApply");
  let candidate=null;
  let busy=false;
  const source="PR3 Workbook Import";
  const byName=(node,name)=>Array.from(node.getElementsByTagNameNS("*",name));
  const child=(node,name)=>Array.from(node.children).find(x=>x.localName===name);
  const clean=value=>String(value??"").trim();
  const integer=value=>/^\d+(?:\.0+)?$/.test(clean(value))?Number(value):0;
  const marks={A:"A",C:"C",D:"D",P:"P",NR:"NR",CNR:"NR",VNR:"NR",DL:"NR"};
  const blocks=Object.values(ZONE_BLOCKS).flat();

  async function readExcel(data){
    const zip=await JSZip.loadAsync(data);
    async function xml(path){
      const part=zip.file(path);
      if(!part)throw new Error("Excel file is missing "+path);
      const doc=new DOMParser().parseFromString(await part.async("string"),"application/xml");
      if(byName(doc,"parsererror").length)throw new Error("Cannot read Excel part "+path);
      return doc;
    }
    const strings=zip.file("xl/sharedStrings.xml")
      ?byName(await xml("xl/sharedStrings.xml"),"si").map(row=>byName(row,"t").map(cell=>cell.textContent).join(""))
      :[];
    const book=await xml("xl/workbook.xml");
    const relations=new Map(byName(await xml("xl/_rels/workbook.xml.rels"),"Relationship")
      .map(node=>[node.getAttribute("Id"),node.getAttribute("Target")]));
    const sheets=new Map();
    for(const node of byName(book,"sheet")){
      const name=node.getAttribute("name").trim().toLowerCase();
      if(!/^\d{3}(?: blk chart)?$/.test(name))continue;
      const target=relations.get(node.getAttribute("r:id"));
      if(!target)throw new Error("Missing sheet "+name);
      const path=new URL(target,"https://workbook.invalid/xl/workbook.xml").pathname.slice(1);
      const doc=await xml(path);
      const rows=new Map();
      for(const row of byName(doc,"row")){
        const cells={};
        for(const cell of Array.from(row.children).filter(el=>el.localName==="c")){
          const column=cell.getAttribute("r")?.match(/^[A-Z]+/)?.[0];
          if(!column)continue;
          const type=cell.getAttribute("t");
          const raw=child(cell,"v")?.textContent||"";
          if(type==="e")continue;
          cells[column]=clean(type==="s"?strings[Number(raw)]
            :type==="inlineStr"?byName(cell,"t").map(t=>t.textContent).join(""):raw);
        }
        rows.set(Number(row.getAttribute("r")),cells);
      }
      if(sheets.has(name))throw new Error("Duplicate Excel tab "+name);
      sheets.set(name,rows);
    }
    return sheets;
  }

  function chartMarks(chart){
    const columns=Object.entries(chart.get(4)||{}).filter(([col,value])=>col!=="A"&&col!=="B"&&integer(value));
    const rows=new Map();
    for(const [index,row] of chart){
      const floor=integer(row.B);
      if(index<5||!floor)continue;
      for(const [col,unit] of columns){
        const mark=clean(row[col]).toUpperCase();
        if(mark)rows.set(floor+"-"+Number(unit),mark);
      }
    }
    return rows;
  }

  function unitRows(detail){
    const units=new Map();
    let floor=0;
    for(const [index,row] of detail){
      if(index===1)continue;
      floor=integer(row.C)||floor;
      const unit=integer(row.D);
      if(!floor||!unit)continue;
      const key=floor+"-"+unit;
      if(units.has(key))throw new Error("Duplicate detail row #"+key);
      units.set(key,row);
    }
    return units;
  }

  function readAppointment(raw){
    const value=clean(raw);
    const iso=value.match(/\b(20\d\d)-(\d{1,2})-(\d{1,2})\b/);
    const dmy=value.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4}|\d{2})\b/);
    const serial=Number(value);
    const day=iso?iso[1]+"-"+iso[2].padStart(2,"0")+"-"+iso[3].padStart(2,"0")
      :dmy?(dmy[3].length===2?"20"+dmy[3]:dmy[3])+"-"+dmy[2].padStart(2,"0")+"-"+dmy[1].padStart(2,"0")
      :serial>=40000&&serial<=60000?new Date(Date.UTC(1899,11,30)+Math.floor(serial)*86400000).toISOString().slice(0,10):"";
    const parsed=day?new Date(day+"T00:00:00Z"):null;
    const date=parsed&&!Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===day?day:"";
    const timeText=value.replace(/[—−]/g,"–").replace(/\s+to\s+/gi,"–")
      .replace(/(\d)\.(\d{2})(\s*(?:am|pm))/gi,"$1:$2$3")
      .replace(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))(?=\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))/gi,"$1–");
    const slot=legacySlot(timeText);
    return {date,slot:slot&&slotStartMinutes(slot)<slotEndMinutes(slot)?slot:""};
  }

  async function readReports(file){
    const content=await file.arrayBuffer();
    const files=[];
    if(/\.xlsx$/i.test(file.name))files.push(content);
    else if(/\.zip$/i.test(file.name)){
      const outer=await JSZip.loadAsync(content);
      const spreadsheets=Object.values(outer.files).filter(part=>!part.dir&&/\.xlsx$/i.test(part.name)&&!part.name.startsWith("__MACOSX/"));
      if(!spreadsheets.length)throw new Error("No .xlsx workbooks in the selected ZIP.");
      for(const part of spreadsheets)files.push(await part.async("arraybuffer"));
    }else throw new Error("Select a PR3 survey workbook or its ZIP.");
    const rows=new Map();
    const received=new Set();
    const issues=[];
    for(const data of files){
      const report=await readExcel(data);
      for(const block of blocks){
        const chart=report.get(block+" blk chart");
        const detail=report.get(String(block));
        if(!chart&&!detail)continue;
        if(!chart||!detail)throw new Error("Blk "+block+" is missing its block chart or unit tab.");
        if(received.has(block))throw new Error("Two workbooks include Blk "+block+". Select one copy per block.");
        received.add(block);
        const addresses=unitRows(detail);
        for(const [address,mark] of chartMarks(chart)){
          const key=correctedUnitKey(block+"-"+address);
          if(!Object.hasOwn(marks,mark)){
            if(!["CSR","N/A"].includes(mark))issues.push(key+" · unknown chart status "+mark);
            continue;
          }
          if(rows.has(key))throw new Error("Two report rows resolve to "+key+".");
          const row=addresses.get(address)||{};
          const legacySchedule=clean(row.I);
          const legacyRemark=clean(row.J);
          const status=key==="554-10-117"?"A":marks[mark];
          const {date,slot}=readAppointment(legacySchedule);
          rows.set(key,{status,date,slot,ownerName:clean(row.H),contact:contactText(clean(row.G)),legacySchedule,legacyRemark});
        }
      }
    }
    if(!rows.size)throw new Error("No marked PR3 units in the selected workbook.");
    return {rows,blocks:received.size,files:files.length,issues};
  }

  function importPlan(report){
    const units={};
    const overrides={};
    const appointments=[];
    const issues=[...report.issues];
    let kept=0,pending=0;
    const byUnit=new Map();
    const savedSurveyKeys=new Set(state.surveys.map(record=>record.unitKey));
    for(const a of state.appointments){
      if(!byUnit.has(a.unitKey))byUnit.set(a.unitKey,[]);
      byUnit.get(a.unitKey).push(a);
    }
    const cancelledKeys=new Set();
    const deleted=new Set((state.appointmentTombstones||[]).map(String));
    for(const a of SOURCE_APPOINTMENTS){
      if(deleted.has(String(a.id)))cancelledKeys.add(correctedUnitKey(a.unitKey));
    }
    // All seeded appointment IDs are derived from their block, floor and unit.
    for(const [key,u] of Object.entries(state.units)){
      if(deleted.has(String(importedAppointmentId(u.block,u.floor,u.unit))))cancelledKeys.add(key);
    }
    const now=new Date().toISOString();
    let id=Math.max(Date.now(),...state.appointments.map(a=>Number(a.id)||0));
    for(const [key,row] of report.rows){
      const unit=getUnit(key);
      if(!unit){issues.push(key+" · unit absent from ELU layout");continue;}
      const existing=byUnit.get(key)||[];
      const status=currentUnitAppointmentState(key).status;
      const userHistory=existing.some(a=>isUserAppointment(a)||a.userScheduleOverride||a.cancelledAt||isInactiveSchedule(a));
      if(hasManualStatusDecision(key)||state.workbookUnitData?.[key]||savedSurveyKeys.has(key)
        ||userHistory||cancelledKeys.has(key)||(status==="A"||status==="D")||
        existing.some(a=>a.workStatus!=="Completed"&&a.date&&!appointmentHasEnded(a))){
        kept++;
        continue;
      }
      const {date,slot,legacySchedule,legacyRemark}=row;
      const ownerName=unit.ownerName||row.ownerName;
      const contact=unit.contact||row.contact;
      units[key]={ownerName,contact,legacySchedule,legacyRemark};
      if((row.status==="A"||row.status==="C")&&date&&(slot||row.status==="A")){
        appointments.push({id:++id,unitKey:key,zone:unit.zone,block:unit.block,floor:unit.floor,unit:unit.unit,
          unitDisplay:unitDisplay(unit.floor,unit.unit),date,slot,team:"",ownerName,contact,remarks:legacyRemark,
          source,scheduleState:"Active",workStatus:row.status==="A"?"Completed":"Pending",
          requiresExplicitCompletion:row.status==="C"});
        continue;
      }
      const next=row.status==="C"?"P":row.status;
      if(row.status==="C"){pending++;issues.push(key+" · confirmed chart mark, date or time missing");}
      overrides[key]={status:next,source,reason:"PR3 Block Chart import",updatedAt:now,decisionId:null};
    }
    return {units,overrides,appointments,kept,pending,issues};
  }

  function showPlan(plan,prefix){
    const count=Object.keys(plan.units).length;
    preview.replaceChildren(document.createTextNode(prefix+" "+count+" unit records · "
      +plan.appointments.length+" dated records · "+plan.kept+" existing units kept."));
    if(plan.issues.length){
      const details=document.createElement("details");
      const summary=document.createElement("summary");
      summary.textContent=plan.issues.length+" rows to review";
      const list=document.createElement("ul");
      for(const issue of plan.issues){
        const item=document.createElement("li");
        item.textContent=issue;
        list.append(item);
      }
      details.append(summary,list);
      preview.append(details);
    }
  }

  input.addEventListener("change",async()=>{
    const file=input.files[0];
    candidate=null;
    button.disabled=true;
    if(!file)return;
    preview.textContent="Reading PR3 workbook…";
    try{
      const report=await readReports(file);
      if(input.files[0]!==file)return;
      const plan=importPlan(report);
      candidate=report;
      showPlan(plan,"Preview · "+report.files+" workbooks, "+report.blocks+" blocks.");
      button.disabled=!Object.keys(plan.units).length;
    }catch(error){
      if(input.files[0]===file)preview.textContent="Workbook could not be read · "+error.message;
    }
  });
  button.addEventListener("click",async()=>{
    if(!candidate||busy||!secureSessionKey||!appStarted)return;
    busy=true;
    input.disabled=button.disabled=true;
    try{
      await securePersistChain;
      const plan=importPlan(candidate);
      if(!Object.keys(plan.units).length){showPlan(plan,"No new records.");return;}
      const before=secureSnapshot();
      const current=JSON.stringify(before);
      const storage=localStorage.getItem(SECURE_STATE_KEY);
      const key=secureSessionKey;
      const data={
        workbookUnitData:{...before.workbookUnitData,...plan.units},
        statusOverrides:{...before.statusOverrides,...plan.overrides},
        appointments:[...before.appointments,...plan.appointments]
      };
      const encrypted=await encryptPayload({...before,...data},key);
      if(key!==secureSessionKey||storage!==localStorage.getItem(SECURE_STATE_KEY)||current!==JSON.stringify(secureSnapshot())){
        throw new Error("ELU records changed during import. Preview and apply again.");
      }
      localStorage.setItem(SECURE_STATE_KEY,JSON.stringify(encrypted));
      Object.assign(state,data);
      candidate=null;
      renderAll();
      showPlan(plan,"Imported.");
      toast("PR3 workbook imported");
    }catch(error){
      preview.textContent="Import stopped · "+error.message;
    }finally{
      busy=false;
      input.disabled=false;
      button.disabled=!candidate;
    }
  });
})();
