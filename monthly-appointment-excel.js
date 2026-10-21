// Export the live Planner records as a month-wide, zone-wise Team 1 / Team 2 workbook.
(function(){
  const monthInput=document.getElementById("plannerExportMonth"),button=document.getElementById("plannerExportMonthBtn");
  if(!monthInput||!button)return;
  monthInput.value=isoTodaySG().slice(0,7);
  const xml=v=>String(v??"").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[ch]||""));
  const cell=(ref,v,s=0)=>v===null||v===undefined||v===""?'<c r="'+ref+'" s="'+s+'"/>':typeof v==="number"?'<c r="'+ref+'" s="'+s+'"><v>'+v+'</v></c>':'<c r="'+ref+'" s="'+s+'" t="inlineStr"><is><t xml:space="preserve">'+xml(v)+'</t></is></c>';
  const serial=iso=>Math.round((Date.parse(iso+"T00:00:00Z")-Date.UTC(1899,11,30))/86400000);
  const unit=a=>"Blk "+a.block+"  "+(a.unitDisplay||unitDisplay(a.floor,a.unit));
  function monthlyAppointments(month,zone){
    const selected=new Map();
    for(const a of state.appointments){
      if(!a.date?.startsWith(month+"-")||!liveScheduleRecord(a))continue;
      if(zone!=="all"&&Number(a.zone||zoneOfBlock(a.block))!==Number(zone))continue;
      const key=a.date+"|"+a.unitKey,old=selected.get(key);
      if(!old||Number(a.id||0)>Number(old.id||0))selected.set(key,a);
    }
    return [...selected.values()];
  }
  const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font><font><b/><sz val="11"/><color rgb="FF19283C"/><name val="Aptos"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF173B62"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFE87A"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="164" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  function zoneSheet(z,month,data,selectedDate=""){
    const byDate=new Map();
    data.filter(a=>Number(a.zone||zoneOfBlock(a.block))===z).forEach(a=>{if(!byDate.has(a.date))byDate.set(a.date,[]);byDate.get(a.date).push(a)});
    const [year,mm]=month.split("-").map(Number),days=new Date(Date.UTC(year,mm,0)).getUTCDate(),merges=[],rows=[];
    rows.push('<row r="1" ht="32" customHeight="1">'+["Date","Time","Team 1","Remarks","Time","Team 2","Remarks"].map((v,i)=>cell("ABCDEFG"[i]+"1",v,1)).join("")+"</row>");
    let n=2;
    for(const day of selectedDate?[Number(selectedDate.slice(-2))]:Array.from({length:days},(_,i)=>i+1)){
      const iso=month+"-"+String(day).padStart(2,"0"),entries=byDate.get(iso)||[];
      const custom=[...new Set(entries.map(a=>a.slot).filter(s=>s&&!SLOTS.includes(s)))].sort((a,b)=>slotStartMinutes(a)-slotStartMinutes(b));
      const start=n;
      for(const slot of [...SLOTS,...custom]){
        const cells=[cell("A"+n,n===start?serial(iso):null,2)];
        for(const [offset,team] of [[1,"Team 1"],[4,"Team 2"]]){
          const group=entries.filter(a=>a.team===team&&a.slot===slot).sort((a,b)=>Number(a.block)-Number(b.block)||Number(b.floor)-Number(a.floor)||Number(a.unit)-Number(b.unit));
          cells.push(cell("ABCDEFG"[offset]+n,slot,3));
          cells.push(cell("ABCDEFG"[offset+1]+n,group.map(unit).join("\n"),3));
          cells.push(cell("ABCDEFG"[offset+2]+n,group.map(a=>String(a.remarks||"").trim()).filter(Boolean).join("\n"),3));
        }
        rows.push('<row r="'+n+'" ht="29" customHeight="1">'+cells.join("")+"</row>");n++;
      }
      merges.push("A"+start+":A"+(n-1));
    }
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="20"/><cols>'+[16,17,24,32,17,24,32].map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join("")+'</cols><sheetData>'+rows.join("")+'</sheetData><mergeCells count="'+merges.length+'">'+merges.map(ref=>'<mergeCell ref="'+ref+'"/>').join("")+'</mergeCells><pageMargins left="0.25" right="0.25" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/></worksheet>';
  }
  function unassignedSheet(data){
    const rows=['<row r="1">'+["Date","Zone","Time","Block","Unit","Remarks"].map((v,i)=>cell("ABCDEF"[i]+"1",v,1)).join("")+"</row>"];
    data.sort((a,b)=>a.date.localeCompare(b.date)||slotStartMinutes(a.slot)-slotStartMinutes(b.slot)).forEach((a,i)=>{
      const n=i+2,values=[a.date,"Zone "+(a.zone||zoneOfBlock(a.block)),a.slot||"","Blk "+a.block,a.unitDisplay||unitDisplay(a.floor,a.unit),a.remarks||""];
      rows.push('<row r="'+n+'">'+values.map((v,j)=>cell("ABCDEF"[j]+n,v,3)).join("")+"</row>");
    });
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews><cols>'+[16,13,18,15,18,45].map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join("")+'</cols><sheetData>'+rows.join("")+"</sheetData></worksheet>";
  }
  async function workbook(month,zone,selectedDate=""){
    const data=monthlyAppointments(month,zone).filter(a=>!selectedDate||a.date===selectedDate);
    const zones=zone==="all"?(selectedDate?[...new Set(data.map(a=>Number(a.zone||zoneOfBlock(a.block))))].filter(z=>ZONE_BLOCKS[z]).sort((a,b)=>a-b):[1,2,3,4,5,6]):[Number(zone)];
    if(!zones.length)zones.push(1,2,3,4,5,6);
    const sheets=zones.map(z=>({name:"Zone "+z+" ("+ZONE_BLOCKS[z][0]+"-"+ZONE_BLOCKS[z].at(-1)+")",content:zoneSheet(z,month,data,selectedDate)}));
    const unassigned=data.filter(a=>a.team!=="Team 1"&&a.team!=="Team 2");
    if(unassigned.length)sheets.push({name:"Unassigned",content:unassignedSheet(unassigned)});
    const zip=new JSZip();
    zip.file("[Content_Types].xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join("")+"</Types>");
    zip.file("_rels/.rels",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    zip.file("xl/workbook.xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map((s,i)=>'<sheet name="'+xml(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join("")+"</sheets></workbook>");
    zip.file("xl/_rels/workbook.xml.rels",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join("")+'<Relationship Id="rId'+(sheets.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    zip.file("xl/styles.xml",styles);sheets.forEach((s,i)=>zip.file("xl/worksheets/sheet"+(i+1)+".xml",s.content));
    return zip.generateAsync({type:"blob",compression:"DEFLATE",mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  }
  button.addEventListener("click",async()=>{
    const month=monthInput.value,zone=document.getElementById("plannerViewZone").value||"all";
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)){toast("Select an Excel month");return}
    button.disabled=true;
    try{downloadBlob("ELU_Appointment_Schedule_"+month+"_"+(zone==="all"?"All_Zones":"Zone_"+zone)+".xlsx",await workbook(month,zone));toast("Monthly appointment Excel downloaded")}
    catch(error){console.error(error);toast("Excel download failed. Please try again")}
    finally{button.disabled=false}
  });
  window.__eluMonthlyAppointmentExcel={monthlyAppointments,workbook};
  document.getElementById("plannerExportDayBtn").addEventListener("click",async()=>{
    const date=document.getElementById("teamDate").value||isoTodaySG(),zone=document.getElementById("plannerViewZone").value||"all";
    if(!/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(date)){toast("Select a date");return}
    const dayButton=document.getElementById("plannerExportDayBtn");dayButton.disabled=true;
    try{downloadBlob("ELU_Daily_Appointment_"+date+"_"+(zone==="all"?"All_Zones":"Zone_"+zone)+".xlsx",await workbook(date.slice(0,7),zone,date));toast("Daily appointment Excel downloaded")}
    catch(error){console.error(error);toast("Daily Excel download failed")}
    finally{dayButton.disabled=false}
  });
})();
