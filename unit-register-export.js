// Read-only Unit Register outputs, drawn directly from the current master records.
(function(){
  const printButton=document.getElementById("unitRegisterPrintBtn");
  const excelButton=document.getElementById("unitRegisterExcelBtn");
  if(!printButton||!excelButton)return;
  const escXml=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]));
  const cols="ABCDEFGHIJ";
  function records(){
    const zone=document.getElementById("unitZoneFilter").value,block=document.getElementById("unitBlockFilter").value;
    const query=document.getElementById("unitSearch").value.trim().toLowerCase();
    return unitsArray().filter(u=>(zone==="all"||Number(u.zone)===Number(zone))&&(block==="all"||Number(u.block)===Number(block))&&(!query||`blk ${u.block} ${unitDisplay(u.floor,u.unit)} ${u.ownerName||""} ${u.contact||""}`.toLowerCase().includes(query)))
      .sort((a,b)=>a.zone-b.zone||a.block-b.block||b.floor-a.floor||a.unit-b.unit);
  }
  function dateTime(u){
    if(!u.appointmentDate)return "";
    const d=new Date(u.appointmentDate+"T12:00:00+08:00");
    const day=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Singapore",day:"2-digit",month:"2-digit",year:"2-digit",weekday:"short"}).formatToParts(d);
    const p=Object.fromEntries(day.map(x=>[x.type,x.value]));
    return `${p.day}/${p.month}/${p.year} (${p.weekday})${u.appointmentSlot?" "+plannerDisplaySlot(u.appointmentSlot):""}`;
  }
  function label(u){
    if(u.workStatus==="Completed")return "Rewiring Completed";
    return {C:"Appointment Confirmed",A:"Opt-In",D:"Opt-Out",P:"Pending Confirmation",NR:"No Response"}[u.response]||String(u.response||"");
  }
  function kind(u){return u.workStatus==="Completed"?"completed":u.response==="C"?"confirmed":u.response==="D"?"optout":u.response==="NR"?"nr":"plain"}
  function details(u,index){return {sn:index+1,block:`Blk ${u.block}`,floor:String(u.floor).padStart(2,"0"),unit:String(u.unit).padStart(2,"0"),optin:["A","C"].includes(u.response)?1:"",optout:u.response==="D"?1:"",contact:u.contact||"",owner:u.ownerName||"",time:dateTime(u)||u.remarks||"",status:label(u),kind:kind(u)}}
  const headings=["S/N","Block No","Floor No","Unit No","Opt In","Opt Out","Contact No","","Remarks",""];
  function htmlTable(rows){
    let lastBlock="",lastFloor="";
    return `<table class="ur-table"><colgroup>${[5,8,6,6,6,6,12,15,22,14].map(w=>`<col style="width:${w}%">`).join("")}</colgroup><thead><tr><th>S/N</th><th>Block<br>No</th><th>Floor<br>No</th><th>Unit<br>No</th><th>Opt<br>In</th><th>Opt<br>Out</th><th colspan="2">Contact No</th><th colspan="2">Remarks</th></tr></thead><tbody>${rows.map(({u,index},i)=>{
      const d=details(u,index),newFloor=lastBlock!==d.block||lastFloor!==d.floor;
      lastBlock=d.block;lastFloor=d.floor;
      const next=rows[i+1]?.u,floorEnd=!next||next.block!==u.block||next.floor!==u.floor;
      return `<tr class="${newFloor?"floor-start ":""}${floorEnd?"floor-end ":""}${d.kind}"><td>${d.sn}</td><td>${esc(d.block)}</td><td>${esc(d.floor)}</td><td>${esc(d.unit)}</td><td class="opt-in${d.optin?" opt-in-mark":""}">${d.optin}</td><td class="opt-out">${d.optout}</td><td class="contact">${esc(d.contact)}</td><td class="owner">${esc(d.owner)}</td><td class="time">${esc(d.time)}</td><td class="status">${esc(d.status)}</td></tr>`
    }).join("")}</tbody></table>`
  }
  function printRegister(){
    const data=records();if(!data.length){toast("No matching units to print");return}
    const popup=window.open("","_blank");if(!popup){toast("Allow pop-ups to print Unit Register");return}
    const pages=[];
    for(const zone of [...new Set(data.map(u=>u.zone))])for(const block of [...new Set(data.filter(u=>u.zone===zone).map(u=>u.block))]){
      const blockRows=data.map((u,index)=>({u,index})).filter(x=>x.u.zone===zone&&x.u.block===block);
      // Repeat the headings and block number on each printed page. Floor groups stay together.
      let chunk=[];
      function flush(){if(chunk.length){pages.push({zone,block,rows:chunk});chunk=[]}}
      for(const row of blockRows){
        if(chunk.length>=17&&chunk.at(-1).u.floor!==row.u.floor)flush();
        chunk.push(row);
      }
      flush();
    }
    const printed=safeDate(isoTodaySG());
    const body=pages.map((page,i)=>`<section class="ur-page"><div class="ur-title"><strong>ELU · UNIT REGISTER</strong><span>Zone ${page.zone} · Blk ${page.block} · ${printed} · ${i+1}/${pages.length}</span></div>${htmlTable(page.rows)}</section>`).join("");
    const css=`@page{size:A4 landscape;margin:7mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0;font-family:Arial,sans-serif;color:#161616}.ur-page{width:283mm;min-height:195mm;break-after:page;page-break-after:always}.ur-page:last-child{break-after:auto;page-break-after:auto}.ur-title{display:flex;justify-content:space-between;align-items:center;padding:3mm 0 2mm;font-size:11px}.ur-title strong{font-size:15px;color:#193e61}.ur-table{width:100%;border-collapse:collapse;table-layout:fixed;font-family:Arial,sans-serif;font-size:9px}.ur-table th,.ur-table td{border:1px solid #2e3337;padding:2.5mm 1.4mm;height:8mm;vertical-align:middle;overflow-wrap:anywhere}.ur-table th{background:#dadada;color:#b20d0d;text-align:center;font-weight:800}.ur-table td:nth-child(-n+6){text-align:center}.ur-table .floor-start td{border-top:2px solid #131313}.ur-table .floor-end td{border-bottom:3px solid #131313}.ur-table .opt-in-mark{background:#fff34b}.ur-table .contact,.ur-table .owner{font-weight:600}.ur-table .time{background:#c8f7f4}.ur-table .completed .status{background:#00dfdf}.ur-table .confirmed .status{background:#7422ce;color:#fff}.ur-table .optout .status{background:#f7d9c7}.ur-table .nr .status{background:#f4e6e6}.ur-table tr{break-inside:avoid}`;
    popup.document.open();popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>ELU Unit Register</title><style>${css}</style></head><body>${body}</body></html>`);popup.document.close();
    setTimeout(()=>{popup.focus();popup.print()},250);
  }
  const cell=(ref,value,style=0)=>value===""||value==null?`<c r="${ref}" s="${style}"/>`:typeof value==="number"?`<c r="${ref}" s="${style}"><v>${value}</v></c>`:`<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escXml(value)}</t></is></c>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="10"/><name val="Aptos"/></font><font><b/><sz val="10"/><color rgb="FFB20D0D"/><name val="Aptos"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font></fonts><fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDBDBDB"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF34B"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFC8F7F4"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF00DFDF"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF7422CE"/></patternFill></fill></fills><borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="medium"><color rgb="FF131313"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="14"><xf fontId="0" fillId="0" borderId="1" xfId="0"><alignment vertical="center" wrapText="1"/></xf><xf fontId="1" fillId="2" borderId="1" xfId="0"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf fontId="0" fillId="0" borderId="1" xfId="0"><alignment horizontal="center" vertical="center"/></xf><xf fontId="0" fillId="3" borderId="1" xfId="0"><alignment horizontal="center" vertical="center"/></xf><xf fontId="0" fillId="4" borderId="1" xfId="0"><alignment vertical="center" wrapText="1"/></xf><xf fontId="0" fillId="5" borderId="1" xfId="0"><alignment vertical="center" wrapText="1"/></xf><xf fontId="2" fillId="6" borderId="1" xfId="0"><alignment vertical="center" wrapText="1"/></xf><xf fontId="0" fillId="0" borderId="2" xfId="0" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf><xf fontId="1" fillId="2" borderId="2" xfId="0" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf fontId="0" fillId="0" borderId="2" xfId="0" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf><xf fontId="0" fillId="3" borderId="2" xfId="0" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf><xf fontId="0" fillId="4" borderId="2" xfId="0" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf><xf fontId="0" fillId="5" borderId="2" xfId="0" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf><xf fontId="2" fillId="6" borderId="2" xfId="0" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  function worksheet(zone,rows){
    let n=1,xmlRows=[],breaks=[],previousBlock=null;
    xmlRows.push(`<row r="${n}" ht="31" customHeight="1">`+headings.map((h,i)=>cell(cols[i]+n,h,1)).join("")+"</row>");n++;
    rows.forEach(({u,index},i)=>{
      const next=rows[i+1]?.u,floorEnd=!next||next.block!==u.block||next.floor!==u.floor;
      if(previousBlock!==null&&previousBlock!==u.block)breaks.push(n-1);
      previousBlock=u.block;
      const d=details(u,index),values=[d.sn,d.block,d.floor,d.unit,d.optin,d.optout,d.contact,d.owner,d.time,d.status];
      const fmt=[2,2,2,2,d.optin?3:2,2,0,0,4,d.kind==="completed"?5:d.kind==="confirmed"?6:0].map(style=>style+(floorEnd?7:0));
      xmlRows.push(`<row r="${n}" ht="27" customHeight="1">`+values.map((v,i)=>cell(cols[i]+n,v,fmt[i])).join("")+"</row>");n++;
    });
    const width=[7,10,9,9,8,8,15,24,34,26];
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="22"/><cols>${width.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${xmlRows.join("")}</sheetData><mergeCells count="2"><mergeCell ref="G1:H1"/><mergeCell ref="I1:J1"/></mergeCells><printOptions horizontalCentered="1"/><pageMargins left="0.2" right="0.2" top="0.35" bottom="0.35" header="0.15" footer="0.15"/><pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/>${breaks.length?`<rowBreaks count="${breaks.length}" manualBreakCount="${breaks.length}">${breaks.map(id=>`<brk id="${id}" min="0" max="16383" man="1"/>`).join("")}</rowBreaks>`:""}</worksheet>`;
  }
  async function workbook(data){
    const zones=[...new Set(data.map(u=>u.zone))].sort((a,b)=>a-b);
    const sheets=zones.map(z=>({name:`Zone ${z}`,xml:worksheet(z,data.map((u,index)=>({u,index})).filter(x=>x.u.zone===z))}));
    const zip=new JSZip();
    zip.file("[Content_Types].xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`);
    zip.file("_rels/.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    zip.file("xl/workbook.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${s.name}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")}</sheets><definedNames>${sheets.map((s,i)=>`<definedName name="_xlnm.Print_Titles" localSheetId="${i}">'${s.name}'!$1:$1</definedName>`).join("")}</definedNames></workbook>`);
    zip.file("xl/_rels/workbook.xml.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    zip.file("xl/styles.xml",styles);sheets.forEach((s,i)=>zip.file(`xl/worksheets/sheet${i+1}.xml`,s.xml));
    return zip.generateAsync({type:"blob",compression:"DEFLATE",mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  }
  printButton.addEventListener("click",printRegister);
  excelButton.addEventListener("click",async()=>{
    const data=records();if(!data.length){toast("No matching units to export");return}
    excelButton.disabled=true;
    try{const zone=document.getElementById("unitZoneFilter").value,block=document.getElementById("unitBlockFilter").value;downloadBlob(`ELU_Unit_Register_${zone==="all"?"All_Zones":"Zone_"+zone}${block==="all"?"":"_Blk_"+block}_${isoTodaySG()}.xlsx`,await workbook(data));toast("Unit Register Excel downloaded")}
    catch(error){console.error(error);toast("Unit Register Excel download failed")}
    finally{excelButton.disabled=false}
  });
  window.__eluUnitRegisterExport={records,workbook,details,htmlTable};
})();
