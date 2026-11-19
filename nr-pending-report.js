// Operational NR/P report. Read the live masters and the same started-block rule as Project Progress.
(function(){
  const panel=document.getElementById("nrPendingPanel");
  if(!panel)return;
  const zone=document.getElementById("nrPendingZone"),block=document.getElementById("nrPendingBlock");
  const excel=document.getElementById("nrPendingExcel"),print=document.getElementById("nrPendingPrint");
  const unitHeaders=["S/N","Zone","Block","Unit","NR","Pending","Owner","Contact","Remarks"];
  const xml=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]));

  function data(zoneFilter="all",blockFilter="all"){
    const blocks=[],units=[];
    for(const z of Object.keys(ZONE_BLOCKS).map(Number).sort((a,b)=>a-b)){
      if(zoneFilter!=="all"&&String(z)!==String(zoneFilter))continue;
      for(const b of ZONE_BLOCKS[z]){
        if(blockFilter!=="all"&&String(b)!==String(blockFilter))continue;
        const source=getBlockUnits(b),started=blockHasFieldActivity(b,source);
        const unique=new Map(source.filter(u=>started&&["NR","P"].includes(u.response)).map(u=>[u.key,u]));
        const selected=[...unique.values()].sort((a,b)=>b.floor-a.floor||a.unit-b.unit);
        const nr=selected.filter(u=>u.response==="NR").length,pending=selected.length-nr;
        blocks.push({zone:z,block:Number(b),nr,pending,total:selected.length});
        units.push(...selected.map(u=>({...u,zone:z,block:Number(b),contact:contactText(u.contact)})));
      }
    }
    const zones=[...new Set(blocks.map(b=>b.zone))].map(z=>{
      const group=blocks.filter(b=>b.zone===z),nr=group.reduce((n,b)=>n+b.nr,0),pending=group.reduce((n,b)=>n+b.pending,0);
      return {zone:z,nr,pending,total:nr+pending};
    });
    return {zones,blocks,units,nr:zones.reduce((n,z)=>n+z.nr,0),pending:zones.reduce((n,z)=>n+z.pending,0)};
  }
  const unitRows=report=>report.units.map((u,i)=>[i+1,u.zone,u.block,unitDisplay(u.floor,u.unit),u.response==="NR"?1:"",u.response==="P"?1:"",u.ownerName||"",u.contact,u.remarks||""]);
  const scope=()=>(zone.value==="all"?"All Zones":"Zone "+zone.value)+(block.value!=="all"?" · Blk "+block.value:"");
  function table(headers,rows,total){
    return '<table class="nrp-table"><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join("")+'</tr></thead><tbody>'
      +rows.map(row=>'<tr>'+row.map(value=>'<td>'+esc(value)+'</td>').join("")+'</tr>').join("")
      +(total?'<tr class="nrp-total">'+total.map(v=>'<td>'+esc(v)+'</td>').join("")+'</tr>':"")+'</tbody></table>';
  }
  function render(){
    const report=data(zone.value,block.value),total=report.nr+report.pending;
    document.getElementById("nrPendingCount").textContent=report.nr+" NR · "+report.pending+" Pending · "+total+" total";
    document.getElementById("nrPendingSummary").innerHTML=table(["Zone","NR","Pending","Total"],report.zones.map(z=>["Zone "+z.zone,z.nr,z.pending,z.total]),["TOTAL",report.nr,report.pending,total]);
    document.getElementById("nrPendingBlocks").innerHTML=table(["Zone","Block","NR","Pending","Total"],report.blocks.map(b=>["Zone "+b.zone,"Blk "+b.block,b.nr,b.pending,b.total]),["TOTAL","",report.nr,report.pending,total]);
    document.getElementById("nrPendingUnits").innerHTML=report.units.length?table(unitHeaders,unitRows(report)):'<p class="empty-state">No NR or Pending units for this selection.</p>';
    excel.disabled=print.disabled=!report.units.length;
  }
  function syncBlocks(){
    block.innerHTML='<option value="all">All Blocks</option>'+(zone.value==="all"?Object.values(ZONE_BLOCKS).flat():ZONE_BLOCKS[zone.value]||[]).slice().sort((a,b)=>a-b).map(b=>'<option value="'+b+'">Blk '+b+'</option>').join("");
    block.value="all";render();
  }
  zone.innerHTML='<option value="all">All Zones</option>'+Object.keys(ZONE_BLOCKS).map(z=>'<option value="'+z+'">Zone '+z+'</option>').join("");
  zone.value="all";zone.addEventListener("change",syncBlocks);block.addEventListener("change",render);
  document.querySelector('[data-report-view="nrpending"]').addEventListener("click",render);
  const previousRender=renderReport;
  renderReport=function(){previousRender.apply(this,arguments);render()};

  const cell=(ref,value,style=0)=>{
    if(value&&typeof value==="object"&&value.formula)return '<c r="'+ref+'" s="'+style+'"><f>'+xml(value.formula)+'</f><v>'+value.value+'</v></c>';
    if(typeof value==="number")return '<c r="'+ref+'" s="'+style+'"><v>'+value+'</v></c>';
    return '<c r="'+ref+'" s="'+style+'" t="inlineStr"><is><t xml:space="preserve">'+xml(value)+'</t></is></c>';
  };
  const styles='<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><b/><sz val="16"/><color rgb="FF153E66"/><name val="Arial"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF153E66"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFE6E9"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE2F0FF"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="center" wrapText="1"/></xf><xf fontId="1" fillId="2" borderId="0" xfId="0"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf fontId="2" fillId="0" borderId="0" xfId="0"/><xf fontId="0" fillId="3" borderId="0" xfId="0"><alignment horizontal="center" vertical="center"/></xf><xf fontId="0" fillId="4" borderId="0" xfId="0"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"><alignment horizontal="left" vertical="center" wrapText="1" indent="1"/></xf><xf fontId="0" fillId="0" borderId="0" xfId="0"><alignment horizontal="left" vertical="center" wrapText="0"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  function worksheet(title,headers,rows,widths,nrColumn,pColumn,textColumns=[]){
    const letters="ABCDEFGHI",last=letters[headers.length-1],end=rows.length+4;
    const rowXml=(number,values,header=false)=>'<row r="'+number+'" ht="'+(header?30:26)+'" customHeight="1">'+values.map((value,i)=>cell(letters[i]+number,value,header?1:textColumns.includes(i)?5:i===nrColumn?3:i===pColumn?4:0)).join("")+'</row>';
    return '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:'+last+end+'"/><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>'+widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join("")+'</cols><sheetData><row r="1" ht="30" customHeight="1">'+cell('A1',title,2)+'</row><row r="2" ht="22" customHeight="1">'+cell('A2',safeDate(isoTodaySG())+' · '+scope(),6)+'</row>'+rowXml(4,headers,true)+rows.map((r,i)=>rowXml(i+5,r)).join("")+'</sheetData><autoFilter ref="A4:'+last+end+'"/><printOptions horizontalCentered="1"/><pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.15" footer="0.15"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>';
  }
  async function workbook(report){
    const end=Math.max(5,report.units.length+4),zoneRange="'Unit List'!$B$5:$B$"+end,nrRange="'Unit List'!$E$5:$E$"+end,pRange="'Unit List'!$F$5:$F$"+end,blockRange="'Unit List'!$C$5:$C$"+end;
    const f=(formula,value)=>({formula,value});
    const zoneRows=report.zones.map((z,i)=>{const row=i+5;return [z.zone,f('SUMIF('+zoneRange+',A'+row+','+nrRange+')',z.nr),f('SUMIF('+zoneRange+',A'+row+','+pRange+')',z.pending),f('SUM(B'+row+':C'+row+')',z.total)]});
    const blockRows=report.blocks.map((b,i)=>{const row=i+5;return [b.zone,b.block,f('SUMIF('+blockRange+',B'+row+','+nrRange+')',b.nr),f('SUMIF('+blockRange+',B'+row+','+pRange+')',b.pending),f('SUM(C'+row+':D'+row+')',b.total)]});
    zoneRows.push(['TOTAL',f('SUM(B5:B'+(zoneRows.length+4)+')',report.nr),f('SUM(C5:C'+(zoneRows.length+4)+')',report.pending),f('SUM(D5:D'+(zoneRows.length+4)+')',report.nr+report.pending)]);
    blockRows.push(['TOTAL','',f('SUM(C5:C'+(blockRows.length+4)+')',report.nr),f('SUM(D5:D'+(blockRows.length+4)+')',report.pending),f('SUM(E5:E'+(blockRows.length+4)+')',report.nr+report.pending)]);
    const sheets=[{name:'Zone Summary',xml:worksheet('NR and Pending Units',['Zone','NR','Pending','Total'],zoneRows,[22,17,17,18],1,2)},
      {name:'Block Summary',xml:worksheet('Block Summary',['Zone','Block','NR','Pending','Total'],blockRows,[22,18,17,17,18],2,3)},
      {name:'Unit List',xml:worksheet('NR and Pending Unit List',unitHeaders,unitRows(report),[8,9,11,15,9,11,25,25,52],4,5,[3,7])}];
    const zip=new JSZip(),main='http://schemas.openxmlformats.org/spreadsheetml/2006/main',rels='http://schemas.openxmlformats.org/package/2006/relationships',office='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    zip.file('[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((s,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>');
    zip.file('_rels/.rels','<?xml version="1.0"?><Relationships xmlns="'+rels+'"><Relationship Id="rId1" Type="'+office+'/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    zip.file('xl/workbook.xml','<?xml version="1.0"?><workbook xmlns="'+main+'" xmlns:r="'+office+'"><bookViews><workbookView/></bookViews><sheets>'+sheets.map((s,i)=>'<sheet name="'+s.name+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets><definedNames>'+sheets.map((s,i)=>'<definedName name="_xlnm.Print_Titles" localSheetId="'+i+'">\''+s.name+'\'!$1:$4</definedName>').join('')+'</definedNames><calcPr fullCalcOnLoad="1"/></workbook>');
    zip.file('xl/_rels/workbook.xml.rels','<?xml version="1.0"?><Relationships xmlns="'+rels+'">'+sheets.map((s,i)=>'<Relationship Id="rId'+(i+1)+'" Type="'+office+'/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'<Relationship Id="rId4" Type="'+office+'/styles" Target="styles.xml"/></Relationships>');
    zip.file('xl/styles.xml',styles);sheets.forEach((s,i)=>zip.file('xl/worksheets/sheet'+(i+1)+'.xml',s.xml));
    return zip.generateAsync({type:'blob',compression:'DEFLATE',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  excel.addEventListener('click',async()=>{
    rebuildAllMasters();const report=data(zone.value,block.value);if(!report.units.length){toast('No NR or Pending units for this selection');return}
    excel.disabled=true;
    try{downloadBlob('ELU_NR_Pending_'+(zone.value==='all'?'All_Zones':'Zone_'+zone.value)+(block.value!=='all'?'_Blk_'+block.value:'')+'_'+isoTodaySG()+'.xlsx',await workbook(report));toast('NR and Pending Excel downloaded')}
    catch(error){console.error(error);toast('NR and Pending Excel download failed')}
    finally{excel.disabled=false}
  });
  print.addEventListener('click',()=>{
    rebuildAllMasters();const report=data(zone.value,block.value);if(!report.units.length){toast('No NR or Pending units for this selection');return}
    const popup=window.open('','_blank');if(!popup){toast('Allow pop-ups for print preview');return}
    const content='<h1>NR and Pending Units</h1><p>'+esc(safeDate(isoTodaySG())+' · '+scope())+'</p><h2>Zone Summary</h2>'+table(['Zone','NR','Pending','Total'],report.zones.map(z=>['Zone '+z.zone,z.nr,z.pending,z.total]),['TOTAL',report.nr,report.pending,report.nr+report.pending])
      +'<section class="nrp-print-section"><h2>Block Summary</h2>'+table(['Zone','Block','NR','Pending','Total'],report.blocks.map(b=>['Zone '+b.zone,'Blk '+b.block,b.nr,b.pending,b.total]))+'</section>'
      +'<section class="nrp-print-section"><h2>Unit List</h2>'+table(unitHeaders,unitRows(report))+'</section>';
    popup.document.open();popup.document.write('<!doctype html><html><head><meta charset="utf-8"><title>NR and Pending Units</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box;print-color-adjust:exact;-webkit-print-color-adjust:exact}body{font:10pt Arial,sans-serif;color:#142c42}h1{font-size:17pt}h2{font-size:12pt}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{padding:2mm;border-bottom:1px solid #cad6df;overflow-wrap:anywhere;vertical-align:top}th{background:#153e66;color:#fff}thead{display:table-header-group}tr{break-inside:avoid}.nrp-total{font-weight:bold;background:#e2f0ff}.nrp-print-section{break-before:page}body>table{max-width:160mm}section table{font-size:9pt}</style></head><body>'+content+'</body></html>');popup.document.close();setTimeout(()=>{popup.focus();popup.print()},250);
  });
  window.__eluNRPendingReport={data,workbook,render};syncBlocks();
})();
