// Three independent Excel exports modelled on the supplied site workbooks.
// Source records remain in the ELU unit master; exports do not save state.
(function(){
  const zoneSelect=document.getElementById("exactExcelZone");
  if(!zoneSelect)return;
  zoneSelect.innerHTML='<option value="">Select Zone</option>'+Object.keys(ZONE_BLOCKS).map(zone=>`<option value="${zone}">Zone ${zone}</option>`).join("");
  const xml=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[ch]));
  const col=n=>{let s="";while(n){s=String.fromCharCode(65+(n-1)%26)+s;n=Math.floor((n-1)/26)}return s};
  const c=(address,value,style=0,formula=null)=>{
    // Export current app values directly; no workbook links are required.
    if(value===null||value===undefined||value==="")return `<c r="${address}" s="${style}"/>`;
    if(typeof value==="number")return `<c r="${address}" s="${style}"><v>${value}</v></c>`;
    return `<c r="${address}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`
  };
  const row=(n,cells,height)=>`<row r="${n}"${height?` ht="${height}" customHeight="1"`:""}>${cells.join("")}</row>`;
  const sheet=(rows,widths,merges=[],orientation="portrait",extra="")=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${widths.map((width,i)=>`<col min="${i+1}" max="${i+1}" width="${width}" customWidth="1"/>`).join("")}</cols><sheetData>${rows.join("")}</sheetData>${merges.length?`<mergeCells count="${merges.length}">${merges.map(ref=>`<mergeCell ref="${ref}"/>`).join("")}</mergeCells>`:""}${extra}<printOptions horizontalCentered="1"/><pageMargins left="0.25" right="0.25" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup orientation="${orientation}" paperSize="9" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  async function xlsx(sheets,styleFile){
    const styles=await fetch(`report-templates/${styleFile}`).then(response=>{if(!response.ok)throw new Error("Report style unavailable");return response.text()});
    const zip=new JSZip();
    zip.file("[Content_Types].xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`);
    zip.file("_rels/.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    zip.file("xl/workbook.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheets.map((item,i)=>`<sheet name="${xml(item.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`);
    zip.file("xl/_rels/workbook.xml.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    zip.file("xl/styles.xml",styles);
    sheets.forEach((item,i)=>zip.file(`xl/worksheets/sheet${i+1}.xml`,item.content));
    return zip.generateAsync({type:"blob",compression:"DEFLATE"})
  }
  const label=u=>`#${String(u.floor).padStart(2,"0")}-${u.unit}`;
  const sorted=units=>[...units].sort((a,b)=>b.floor-a.floor||a.unit-b.unit);
  const response=u=>u.response==="D"?"D":u.response==="A"||u.response==="C"?"A":"NR";
  const area=block=>BLOCK_MAP_LOCATION[block]?.[2]||"Pasir Ris";
  function data(zone){return (ZONE_BLOCKS[zone]||[]).map(block=>{
    const units=getBlockUnits(block),started=responseSummaryStarted(block,units),active=started?units:[];
    return {block,units,started,total:active.length,
      agreed:sorted(active.filter(u=>response(u)==="A")),
      out:sorted(active.filter(u=>response(u)==="D")),
      nr:sorted(active.filter(u=>response(u)==="NR"))}
  })}
  const sums=blocks=>({total:blocks.reduce((n,b)=>n+b.total,0),agreed:blocks.reduce((n,b)=>n+b.agreed.length,0),out:blocks.reduce((n,b)=>n+b.out.length,0),nr:blocks.reduce((n,b)=>n+b.nr.length,0)});
  const date=()=>new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Singapore",day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date()).replaceAll("/",".");
  const sheetName=block=>`BLK ${block}`;
  const preview=document.getElementById("siteSheetPreview");
  let activeSheet="block";
  const td=(value,cls="")=>`<td${cls?` class="${cls}"`:""}>${xml(value)}</td>`;
  function previewBlock(blocks){
    const total=sums(blocks);
    const summary=`<div class="site-table-scroll"><table class="site-sheet-table"><thead><tr><th>Block</th><th>Street</th><th>Total units</th><th>Opt-In A + C</th><th>Opt-Out</th><th>NR</th></tr></thead><tbody>${blocks.map(b=>`<tr>${td(b.block)}${td(area(b.block))}${td(b.total)}${td(b.agreed.length,"site-agree")}${td(b.out.length,"site-out")}${td(b.nr.length,"site-nr")}</tr>`).join("")}<tr class="site-total">${td("TOTAL")}${td("")}${td(total.total)}${td(total.agreed)}${td(total.out)}${td(total.nr)}</tr></tbody></table></div>`;
    const details=blocks.map(b=>{
      const floors=[...new Set(b.units.map(u=>Number(u.floor)))].sort((a,z)=>z-a);
      const numbers=[...new Set(b.units.map(u=>Number(u.unit)))].sort((a,z)=>a-z);
      const lookup=new Map(b.units.map(u=>[`${u.floor}-${u.unit}`,u]));
      return `<details class="site-block-details"><summary>Blk ${b.block} · ${b.total} units · A+C ${b.agreed.length} · D ${b.out.length} · NR ${b.nr.length}</summary><div class="site-table-scroll"><table class="site-sheet-table site-unit-grid"><thead><tr><th>Level</th>${numbers.map(n=>`<th>#${xml(n)}</th>`).join("")}</tr></thead><tbody>${floors.map(f=>`<tr><th>${xml(f)}</th>${numbers.map(n=>{const u=lookup.get(`${f}-${n}`),s=u&&b.started?response(u):"";return td(s,s==="A"?"site-agree":s==="D"?"site-out":s==="NR"?"site-nr":"")}).join("")}</tr>`).join("")}</tbody></table></div></details>`
    }).join("");
    return `<h3>Block Chart · Summary</h3>${summary}<h3>Block wise unit charts</h3>${details}`
  }
  function previewResponse(blocks,zone){
    const totals=sums(blocks);
    return `<h3>Zone ${zone} · Opt-In, Opt-Out &amp; NR Unit Details</h3><div class="site-table-scroll"><table class="site-sheet-table site-response-table"><thead><tr><th>SL No.</th><th>Block</th><th>Total units</th><th>Opt-In</th><th>Opt-Out</th><th>Opt-Out unit details</th><th>NR</th><th>NR unit details</th></tr></thead><tbody>${blocks.map((b,i)=>`<tr>${td(i+1)}${td(`Blk ${b.block}`)}${td(b.total)}${td(b.agreed.length,"site-agree")}${td(b.out.length,"site-out")}${td(b.out.map(label).join(", "))}${td(b.nr.length,"site-nr")}${td(b.nr.map(label).join(", "))}</tr>`).join("")}<tr class="site-total">${td("TOTAL")}${td("")}${td(totals.total)}${td(totals.agreed)}${td(totals.out)}${td("")}${td(totals.nr)}${td("")}</tr></tbody></table></div>`
  }
  function previewTracking(blocks,zone){
    const units=blocks.flatMap(b=>b.nr.map(unit=>({block:b.block,unit})));
    return `<h3>Zone ${zone} · NR Unit Tracking</h3><p>Tracking number cells stay blank for site entry.</p><div class="site-table-scroll"><table class="site-sheet-table"><thead><tr><th>SL No.</th><th>Address</th><th>SingPost tracking number</th></tr></thead><tbody>${units.map((item,i)=>`<tr>${td(i+1)}${td(`BLK ${item.block}, ${label(item.unit)} · ${area(item.block)} ${510000+Number(item.block)}`)}${td("")}</tr>`).join("")||`<tr><td colspan="3">No NR units in this zone.</td></tr>`}</tbody></table></div>`
  }
  function renderPreview(){
    if(!preview)return;
    const zone=Number(zoneSelect.value),blocks=data(zone);
    preview.innerHTML=blocks.length?(activeSheet==="block"?previewBlock(blocks):activeSheet==="response"?previewResponse(blocks,zone):previewTracking(blocks,zone)):'<p class="site-empty">Select a zone to view its three report sheets.</p>';
    document.querySelectorAll("[data-site-sheet]").forEach(button=>{const selected=button.dataset.siteSheet===activeSheet;button.classList.toggle("active",selected);button.setAttribute("aria-selected",String(selected))});
  }
  zoneSelect.value="3";
  zoneSelect.addEventListener("change",renderPreview);
  document.querySelectorAll("[data-site-sheet]").forEach(button=>button.addEventListener("click",()=>{activeSheet=button.dataset.siteSheet;renderPreview()}));
  renderPreview();

  function blockWorkbook(zone,blocks){
    const first=blocks[0].block,last=blocks.at(-1).block,t=sums(blocks),summary=[];
    summary.push(row(1,[c("A1","BLOCK CHART FOR ELECTRICAL LOAD UPGRADING AND ELECTRICAL REWIRING TO BLOCK",7)]));
    const commonArea=blocks.every(b=>area(b.block)===area(first))?area(first):"Pasir Ris";
    summary.push(row(2,[c("A2",`${first} to ${last} @ ${commonArea.toUpperCase()}`,9),c("H2","Updated As of Date",5),c("I2",date(),5)]));
    summary.push(row(3,[c("A3","BLK No.",51),c("B3","Street Name",51),c("C3","Total Units",51),c("D3","Total units agreed/disagreed HDB to upgrade electrical submain cables",47),c("H3","Unit Locked",51),c("I3","No Reply",47)],50));
    summary.push(row(4,[c("D4","Agreed",53),c("F4","Disagreed",53)]));
    blocks.forEach((b,i)=>{const n=i+5,q=sheetName(b.block),base=b.sheetTotals;
      summary.push(row(n,[c(`A${n}`,b.block,53),c(`B${n}`,area(b.block),53),
        c(`C${n}`,b.total,51,`'${q}'!D${base.total}`),c(`D${n}`,b.agreed.length,51,`'${q}'!D${base.agreed}`),
        c(`E${n}`,b.total?b.agreed.length/b.total:0,12,`IF(C${n}=0,0,D${n}/C${n})`),
        c(`F${n}`,b.out.length,53,`'${q}'!D${base.out}`),c(`G${n}`,b.total?b.out.length/b.total:0,13,`IF(C${n}=0,0,F${n}/C${n})`),
        c(`H${n}`,0,53,`'${q}'!D${base.locked}`),c(`I${n}`,b.nr.length,53,`'${q}'!D${base.nr}`)]))
    });
    const tot=blocks.length+5,end=tot-1;
    summary.push(row(tot,[
      c(`C${tot}`,t.total,51,`SUM(C5:C${end})`),c(`D${tot}`,t.agreed,51,`SUM(D5:D${end})`),
      c(`E${tot}`,t.total?t.agreed/t.total:0,12,`IF(C${tot}=0,0,D${tot}/C${tot})`),
      c(`F${tot}`,t.out,51,`SUM(F5:F${end})`),c(`G${tot}`,t.total?t.out/t.total:0,16,`IF(C${tot}=0,0,F${tot}/C${tot})`),
      c(`H${tot}`,0,51,`SUM(H5:H${end})`),c(`I${tot}`,t.nr,51,`SUM(I5:I${end})`)]));
    const note=tot+2,section=tot+7,header=section+1,values=section+2;
    summary.push(row(note,[c(`A${note}`,"* For units that remained uncontactable, the contractor shall provide the details of attempts or letters issued to reach residents.",0)]));
    summary.push(row(section,[c(`A${section}`,"Summary of Data",59)]));
    summary.push(row(header,[c(`A${header}`,"Total nos. of unit",22),c(`B${header}`,"Nos. of units upgraded",55),c(`C${header}`,"Nos. of units that opted not to upgrade",55),c(`E${header}`,"Nos. of units with no response",55),c(`G${header}`,"Unit Locked",55),c(`I${header}`,"% of total units upgraded",55)],32));
    summary.push(row(values,[c(`A${values}`,t.total,17,`C${tot}`),c(`B${values}`,t.agreed,54,`D${tot}`),c(`C${values}`,t.out,54,`F${tot}`),c(`E${values}`,t.nr,54,`I${tot}`),c(`G${values}`,0,54,`H${tot}`),c(`I${values}`,t.total?t.agreed/t.total:0,57,`IF(A${values}=0,0,B${values}/A${values})`)]));
    summary.push(row(values+2,[c(`A${values+2}`,"Verified / Certified By:"),c(`E${values+2}`,"Endorsed By:")]));
    summary.push(row(values+3,[c(`A${values+3}`,"Name & Designation:"),c(`E${values+3}`,"Name & Designation:")]));
    summary.push(row(values+4,[c(`A${values+4}`,"Signature:"),c(`E${values+4}`,"Signature:")]));
    summary.push(row(values+5,[c(`A${values+5}`,"Date:"),c(`E${values+5}`,"Date:")]));
    const merge=["D3:G3","F4:G4",`A${section}:I${section}`,`C${header}:D${header}`,`E${header}:F${header}`,`G${header}:H${header}`,`I${header}:J${header}`,`C${values}:D${values}`,`E${values}:F${values}`,`G${values}:H${values}`,`I${values}:J${values}`];
    const result=[{name:"Summary",content:sheet(summary,[10,21,17,11,11,13,11,12,12,8],merge)}];
    blocks.forEach(b=>{
      const floors=[...new Set(b.units.map(u=>Number(u.floor)))].sort((a,z)=>z-a),numbers=[...new Set(b.units.map(u=>Number(u.unit)))].sort((a,z)=>a-z),lastCol=col(Math.max(numbers.length+1,8));
      const grid=[row(1,[c("A1","BLOCK CHART FOR ELECTRICAL LOAD UPGRADING TO BLOCK",74)]),row(2,[c("A2",`${first} TO ${last} PASIR RIS`,74)]),row(4,[c("A4","(Denote: A - Agreed; D - Disagreed; L - Unit Locked; NR - No Reply)",75)]),row(5,[c("A5",`Block ${b.block}`,76)])];
      grid.push(row(6,[c("A6","Unit",31),...numbers.map((n,i)=>c(`${col(i+2)}6`,`#${n}`,62))]));
      grid.push(row(7,[c("A7","Level",20)]));
      floors.forEach((floor,i)=>{
        const n=i+8,lookup=new Map(b.units.filter(u=>Number(u.floor)===floor).map(u=>[Number(u.unit),u]));
        grid.push(row(n,[c(`A${n}`,floor,36),...numbers.map((number,j)=>{
          const u=lookup.get(number),status=u&&b.started?response(u):"";
          return c(`${col(j+2)}${n}`,status,status==="D"?26:status==="NR"?37:21)
        })],24))
      });
      const gridEnd=7+floors.length,start=gridEnd+3,range=`B8:${col(numbers.length+1)}${gridEnd}`;
      b.sheetTotals={total:start,agreed:start+1,out:start+2,nr:start+3,locked:start+4};
      grid.push(row(start,[c(`B${start}`,"Total Units:",72),c(`D${start}`,b.total,32,`SUM(D${start+1}:D${start+4})`)]));
      grid.push(row(start+1,[c(`B${start+1}`,"Agreed:",70),c(`D${start+1}`,b.agreed.length,33,`COUNTIF(${range},"A")`)]));
      grid.push(row(start+2,[c(`B${start+2}`,"Disagreed:",70),c(`D${start+2}`,b.out.length,33,`COUNTIF(${range},"D")`)]));
      grid.push(row(start+3,[c(`B${start+3}`,"No Reply",66),c(`D${start+3}`,b.nr.length,33,`COUNTIF(${range},"NR")`)]));
      grid.push(row(start+4,[c(`B${start+4}`,"Unit Locked",68),c(`D${start+4}`,0,19,`COUNTIF(${range},"L")`)]));
      const merges=[`A1:${lastCol}1`,`A2:${lastCol}2`,`A4:${lastCol}4`,...Array.from({length:5},(_,i)=>`B${start+i}:C${start+i}`)];
      result.push({name:sheetName(b.block),content:sheet(grid,[11,...Array.from({length:Math.max(numbers.length,7)},()=>9)],merges)})
    });
    return result
  }

  function responseWorkbook(zone,blocks){
    const first=blocks[0].block,last=blocks.at(-1).block,t=sums(blocks),rows=[];
    const commonArea=blocks.every(b=>area(b.block)===area(first))?area(first):"Pasir Ris";
    rows.push(row(1,[c("A1",`PROJECT: ELU AT BLK ${first} TO ${last} ${commonArea.toUpperCase()}`,13)],19));
    rows.push(row(2,[c("A2","(Summary of Opt In, Opt Out & NR Unit details)",16)],20));
    rows.push(row(3,["SL. No",`Blk (Zone ${zone})`,"Total Unit","Opt In","Opt Out","Opt out Unit Details","No response unit","No response unit details","Remarks"].map((v,i)=>c(`${col(i+1)}3`,v,i===6?9:i===8?10:8)),32.5));
    blocks.forEach((b,i)=>{const n=i+4;rows.push(row(n,[c(`A${n}`,i+1,2),c(`B${n}`,`Blk ${b.block}`,2),c(`C${n}`,b.total,2),c(`D${n}`,b.agreed.length,2),c(`E${n}`,b.out.length,2),c(`F${n}`,b.out.map(label).join(", "),4),c(`G${n}`,b.nr.length,2),c(`H${n}`,b.nr.map(label).join(", "),12),c(`I${n}`,"",6)],Math.max(40,Math.ceil(Math.max(b.out.length,b.nr.length)/5)*17)))});
    const end=blocks.length+3,tot=end+1;
    rows.push(row(tot,[c(`E${tot}`,t.out,3,`SUM(E4:E${end})`),c(`G${tot}`,t.nr,3,`SUM(G4:G${end})`)]));
    return [{name:"Sheet1",content:sheet(rows,[6.1,11.4,9.5,7.1,7.9,30.5,11.5,31,47],["A1:I1","A2:I2"],"landscape") }]
  }

  function trackingWorkbook(zone,blocks){
    const first=blocks[0].block,last=blocks.at(-1).block,title=`ELU : ZONE ${zone} (BLK ${first} TO ${last}) NR UNIT - REG`;
    const make=(name,items)=>{
      const rows=[row(1,[c("A1",title,6)],30),row(2,[c("A2","SL.NO",3),c("B2","ADDRESS",3),c("C2","SINGPOST TRACKING NUMBER",3)],30)];
      items.forEach((item,i)=>{const n=i+3;rows.push(row(n,[c(`A${n}`,i+1,3),c(`B${n}`,`BLK ${item.block} , ${label(item.unit)}\n${area(item.block).toUpperCase()} ${510000+Number(item.block)}`,4),c(`C${n}`,"",5)],31))});
      return {name,content:sheet(rows,[8.7,39.8,28],["A1:C1"])}
    };
    const all=blocks.flatMap(b=>b.nr.map(unit=>({block:b.block,unit})));
    return [make("Summary",all),...blocks.filter(b=>b.nr.length).map(b=>make(String(b.block),b.nr.map(unit=>({block:b.block,unit}))))]
  }

  async function exportFile(kind){
    const zone=Number(zoneSelect.value),blocks=data(zone);
    if(!blocks.length){toast("Select a Zone for the Excel report");return}
    const styles={block:"block-styles.xml",response:"response-styles.xml",tracking:"tracking-styles.xml"};
    // Establish total-row references before the linked Summary sheet is built.
    blocks.forEach(b=>{const floors=new Set(b.units.map(u=>u.floor)).size,start=10+floors;b.sheetTotals={total:start,agreed:start+1,out:start+2,nr:start+3,locked:start+4}});
    const sheets=kind==="block"?blockWorkbook(zone,blocks):kind==="response"?responseWorkbook(zone,blocks):trackingWorkbook(zone,blocks);
    const blob=await xlsx(sheets,styles[kind]);
    const names={block:"Block_Chart",response:"NR_OptOut_Details",tracking:"NR_Tracking"};
    downloadBlob(`ELU_Zone_${zone}_${names[kind]}_${isoTodaySG()}.xlsx`,blob)
  }
  const pdfInk=[.08,.21,.30],pdfBlue=[.10,.39,.59],pdfPale=[.85,.93,.97],pdfGreen=[.84,.95,.88],pdfYellow=[1,.94,.77],pdfRed=[1,.86,.88];
  function pdfHeader(title,subtitle){return pdfRect(0,0,842,78,pdfPale)+pdfText(28,19,18,title,true,pdfInk)+pdfText(28,49,9,subtitle,false,pdfInk)}
  function pdfTableLine(y,items,widths,shade=false){let out=pdfRect(28,y,786,26,shade?pdfPale:[1,1,1],[.72,.82,.88]),x=34;items.forEach((item,i)=>{out+=pdfText(x,y+7,8,String(item),shade,pdfInk);x+=widths[i]});return out}
  function pdfBlockPages(zone,blocks){
    const totals=sums(blocks),pages=[];
    let page=pdfHeader("BLOCK CHART - ELECTRICAL LOAD UPGRADING",`ZONE ${zone}  |  BLK ${blocks[0].block} TO ${blocks.at(-1).block}  |  ${date()}`);
    page+=pdfTableLine(94,["BLOCK","STREET","TOTAL","AGREED","DISAGREED","NO REPLY"],[80,260,90,115,120,120],true);
    blocks.forEach((b,i)=>{page+=pdfTableLine(120+i*27,[b.block,area(b.block),b.total,b.agreed.length,b.out.length,b.nr.length],[80,260,90,115,120,120],i%2===1)});
    page+=pdfTableLine(120+blocks.length*27,["TOTAL","",totals.total,totals.agreed,totals.out,totals.nr],[80,260,90,115,120,120],true);
    page+=pdfText(30,345,9,"A/C = agreed   |   D = disagreed   |   NR/P = no reply",false,pdfInk);pages.push(page);
    blocks.forEach(b=>{
      const floors=[...new Set(b.units.map(u=>Number(u.floor)))].sort((a,z)=>z-a),numbers=[...new Set(b.units.map(u=>Number(u.unit)))].sort((a,z)=>a-z);
      const lookup=new Map(b.units.map(u=>[`${u.floor}-${u.unit}`,u]));
      const perPage=19;
      for(let start=0;start<floors.length||start===0;start+=perPage){let p=pdfHeader(`BLOCK ${b.block} - UNIT CHART`,`ZONE ${zone}  |  ${area(b.block)}  |  Total ${b.total}  Agreed ${b.agreed.length}  Disagreed ${b.out.length}  NR ${b.nr.length}`);
        const xs=Math.min(66,740/Math.max(1,numbers.length)),x0=62;p+=pdfRect(28,94,786,24,pdfPale);p+=pdfText(33,101,8,"LEVEL",true,pdfInk);
        numbers.forEach((n,j)=>p+=pdfText(x0+j*xs,101,8,`#${n}`,true,pdfInk));
        floors.slice(start,start+perPage).forEach((f,i)=>{const y=119+i*22;p+=pdfRect(28,y,786,22,i%2?[.96,.98,.99]:[1,1,1],[.8,.87,.91]);p+=pdfText(34,y+6,8,f,true,pdfInk);
          numbers.forEach((n,j)=>{const u=lookup.get(`${f}-${n}`),s=u&&b.started?response(u):"";if(s){p+=pdfRect(x0+j*xs-3,y+2,Math.max(18,xs-7),18,s==="A"?pdfGreen:s==="D"?pdfYellow:pdfRed);p+=pdfText(x0+j*xs,y+6,8,s,true,pdfInk)}})
        });pages.push(p)}
    });return pages
  }
  function pdfResponsePages(zone,blocks){
    const pages=[],totals=sums(blocks);let summary=pdfHeader("OPT IN / OPT OUT / NR UNIT DETAILS",`ZONE ${zone}  |  BLK ${blocks[0].block} TO ${blocks.at(-1).block}  |  ${date()}`);
    summary+=pdfTableLine(94,["BLOCK","TOTAL UNIT","OPT IN","OPT OUT","NO RESPONSE"],[150,150,150,150,150],true);
    blocks.forEach((b,i)=>summary+=pdfTableLine(120+i*27,[b.block,b.total,b.agreed.length,b.out.length,b.nr.length],[150,150,150,150,150],i%2===1));
    summary+=pdfTableLine(120+blocks.length*27,["TOTAL",totals.total,totals.agreed,totals.out,totals.nr],[150,150,150,150,150],true);pages.push(summary);
    blocks.forEach(b=>{const out=b.out.map(label),nr=b.nr.map(label),lists=[["OPT OUT UNIT DETAILS",out],["NO RESPONSE UNIT DETAILS",nr]];
      lists.forEach(([heading,items])=>{if(!items.length)return;const chunks=[];for(let i=0;i<items.length;i+=96)chunks.push(items.slice(i,i+96));
        chunks.forEach((part,partIndex)=>{let p=pdfHeader(`BLK ${b.block} - ${heading}`,`ZONE ${zone}  |  ${area(b.block)}  |  ${partIndex+1}/${chunks.length}  |  ${date()}`);
          p+=pdfText(30,92,10,`Total units: ${b.total}   Opt In: ${b.agreed.length}   Opt Out: ${b.out.length}   NR: ${b.nr.length}`,true,pdfInk);
          if(!part.length)p+=pdfText(32,133,10,"No units",false,pdfInk);
          part.forEach((unit,i)=>{const x=32+(i%4)*195,y=134+Math.floor(i/4)*18;p+=pdfRect(x-3,y-2,184,17,i%2?pdfPale:[1,1,1]);p+=pdfText(x,y,9,unit,false,pdfInk)});pages.push(p)})
      })
    });return pages
  }
  function pdfTrackingPages(zone,blocks){
    const pages=[],groups=[{name:"SUMMARY",items:blocks.flatMap(b=>b.nr.map(unit=>({block:b.block,unit})))},...blocks.filter(b=>b.nr.length).map(b=>({name:`BLK ${b.block}`,items:b.nr.map(unit=>({block:b.block,unit}))}))];
    groups.forEach(group=>{const chunks=[];for(let i=0;i<group.items.length;i+=16)chunks.push(group.items.slice(i,i+16));if(!chunks.length)chunks.push([]);
      chunks.forEach((items,partIndex)=>{let p=pdfHeader(`NR UNIT - TRACKING REGISTER (${group.name})`,`ZONE ${zone}  |  BLK ${blocks[0].block} TO ${blocks.at(-1).block}  |  ${partIndex+1}/${chunks.length}`);
        p+=pdfTableLine(94,["SL NO.","ADDRESS","SINGPOST TRACKING NUMBER"],[75,420,275],true);
        items.forEach((item,i)=>{const y=120+i*27;p+=pdfRect(28,y,786,27,i%2?pdfPale:[1,1,1],[.72,.82,.88]);p+=pdfText(34,y+8,8,partIndex*16+i+1,false,pdfInk);p+=pdfText(109,y+8,8,`BLK ${item.block}, ${label(item.unit)}  ${area(item.block)}  ${510000+Number(item.block)}`,false,pdfInk)});
        pages.push(p)})
    });return pages
  }
  function exportPdf(kind){const zone=Number(zoneSelect.value),blocks=data(zone);if(!blocks.length){toast("Select a Zone for the PDF report");return}
    const pages=kind==="block"?pdfBlockPages(zone,blocks):kind==="response"?pdfResponsePages(zone,blocks):pdfTrackingPages(zone,blocks);
    const names={block:"Block_Chart",response:"NR_OptOut_Details",tracking:"NR_Tracking"};
    downloadBlob(`ELU_Zone_${zone}_${names[kind]}_${isoTodaySG()}.pdf`,buildPdfBlob(pages));toast(`${kind} PDF downloaded`)
  }
  [["exactBlockPdfBtn","block"],["exactResponsePdfBtn","response"],["exactTrackingPdfBtn","tracking"]].forEach(([id,kind])=>document.getElementById(id).addEventListener("click",()=>{try{rebuildAllMasters();exportPdf(kind)}catch(error){console.error(error);toast("PDF report could not be created")}}));
  [["exactBlockExcelBtn","block"],["exactResponseExcelBtn","response"],["exactTrackingExcelBtn","tracking"]].forEach(([id,kind])=>{
    document.getElementById(id).addEventListener("click",async()=>{
      const button=document.getElementById(id);button.disabled=true;
      try{rebuildAllMasters();await exportFile(kind);toast(`${kind} Excel downloaded`)}
      catch(error){console.error(error);toast("Excel report could not be created")}
      finally{button.disabled=false}
    })
  })
})();
