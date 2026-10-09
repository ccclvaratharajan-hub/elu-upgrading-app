// Print-ready complaint register. This reads current app records; it never writes to state.
(function(){
  const dateInput=document.getElementById('complaintReportDate');
  const buttons={date:document.getElementById('complaintExcelDateBtn'),full:document.getElementById('complaintExcelFullBtn'),selected:document.getElementById('complaintExcelSelectedBtn')};
  if(!dateInput||Object.values(buttons).some(button=>!button))return;
  dateInput.value=isoTodaySG();
  const selectedIds=new Set();
  const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const xml=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
  const letters='ABCDEFGHIJK';
  const cell=(col,row,value,style=0)=>`<c r="${col}${row}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
  const row=(number,values,height=21)=>`<row r="${number}" ht="${height}" customHeight="1">${Object.entries(values).map(([col,v])=>cell(col,number,v[0],v[1]||0)).join('')}</row>`;
  const v=(text,style=0)=>[text,style];
  const enDate=iso=>iso?`${iso.slice(8,10)}/${iso.slice(5,7)}/${iso.slice(2,4)}`:'';
  const footerDate=iso=>iso?`${iso.slice(8,10)}.${iso.slice(5,7)}.${iso.slice(0,4)}`:'';
  const monthTitle=iso=>new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(iso+'T00:00:00Z')).toUpperCase();
  const tcCaseId=c=>String(c.tcCaseId||c.townCouncilCaseId||c.referenceNo||c.caseReference||'').trim()||
    (String(c.remarks||'')+' '+String(c.complaint||'')).match(/\bTS[\s:#-]*[A-Z0-9][A-Z0-9/-]*\b/i)?.[0]||'';
  const isTownCouncilCase=c=>/^(town council|tc|ts)$/i.test(String(c.source||c.receivedVia||'').trim())||/^TS[\s:#-]*[A-Z0-9]/i.test(tcCaseId(c));
  function reportRecords(asOf,mode){
    const zone=document.getElementById('complaintZoneFilter').value;
    const block=document.getElementById('complaintBlockFilter').value;
    return state.complaints.filter(c=>isTownCouncilCase(c)&&
      (mode==='selected'?selectedIds.has(String(c.id)):
        (mode!=='date'||c.date===asOf)&&
        (zone==='all'||Number(c.zone||zoneOfBlock(c.block))===Number(zone))&&
        (block==='all'||Number(c.block)===Number(block))))
      .sort((a,b)=>a.date.localeCompare(b.date)||Number(a.block)-Number(b.block)||Number(a.floor)-Number(b.floor)||Number(a.unit)-Number(b.unit)||Number(a.id)-Number(b.id));
  }
  function reportRows(records,asOf,mode){
    return records.map((c,index)=>{
      const u=getUnit(c.unitKey),events=complaintEvents(c).filter(e=>!isComplaintOpening(e)&&(mode!=='date'||e.date<=asOf))
        .sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.time||'').localeCompare(b.time||''));
      const action=events.map((e,i)=>`${enDate(e.date)}${e.time?' '+e.time:''}: ${e.action||''}${e.attendedBy?' ('+e.attendedBy+')':''}${i===events.length-1&&e.outcome==='Closed'?' — CLOSED':''}`).join('\n');
      const address=`Blk ${c.block} ${c.unitDisplay||unitDisplay(c.floor,c.unit)}`;
      const ref=tcCaseId(c),description=ref&&!String(c.complaint||'').includes(ref)?`${ref} · ${c.complaint||''}`:c.complaint||'';
      return [index+1,'TC',enDate(c.date),c.ownerName||u?.ownerName||'',address,c.contact||u?.contact||'',description,action,'','',''];
    });
  }
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${ns}">
    <fonts count="4"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font><font><b/><u/><sz val="11"/><name val="Arial"/></font><font><sz val="9"/><name val="Arial"/></font></fonts>
    <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF2F9"/><bgColor indexed="64"/></patternFill></fill></fills>
    <borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/></border><border><left style="medium"/><right style="medium"/><top style="medium"/><bottom style="medium"/></border></borders>
    <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
    <cellXfs count="8">
      <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="center" wrapText="1"/></xf>
      <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"><alignment vertical="center" wrapText="1"/></xf>
      <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
      <xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
      <xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0"><alignment vertical="center" wrapText="1"/></xf>
      <xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
      <xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
      <xf numFmtId="0" fontId="1" fillId="0" borderId="2" xfId="0"><alignment vertical="center" wrapText="1"/></xf>
    </cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  async function build(asOf,mode){
    const records=reportRecords(asOf,mode),data=reportRows(records,asOf,mode),body=[];
    const months=[...new Set(records.map(c=>c.date.slice(0,7)))];
    const reportMonth=mode==='date'?asOf:months.length===1?months[0]+'-01':null;
    body.push(row(1,{A:v('To',1),B:v(':',1),C:v('Ms. Geraldine Mok',1)},22));
    body.push(row(2,{C:v('Pasir Ris - Changi Town Council')},21));
    body.push(row(4,{A:v("Thru'",1),B:v(':',1),C:v('Ms. Elsa Hhin (PM)')},22));
    body.push(row(5,{C:v('Mr. Faizal, RTO/SPE')},20));
    body.push(row(6,{C:v('CPMD, EM Services Pte Ltd')},20));
    body.push(row(8,{A:v(`COMPLAINT / FEEDBACK REGISTER${reportMonth?' FOR THE MONTH OF '+monthTitle(reportMonth):''}`,2)},27));
    body.push(row(10,{A:v('Project Title',1),B:v(':',1),C:v('ELU to Blocks 531-562 & 564-569 Pasir Ris Drive 1/St 51')},25));
    body.push(row(12,{A:v('S/N',3),B:v('Informed\nby/Mode',3),C:v('Date',3),D:v('Feedback By',3),G:v('Description of complaint/feedback',3),H:v('Action Taken',3),I:v('Date Verified\nby SO',3),J:v('Sign-Off Date By Complainant',3)},32));
    body.push(row(13,{D:v('Name',3),E:v('Address',3),F:v('Contact Tel',3),J:v('Yes',3),K:v('No',3)},24));
    body.push(row(14,{A:v('ELU',7)},22));
    data.forEach((values,i)=>{const n=i+15,chars=Math.max(values[6].length,values[7].length),height=Math.min(132,Math.max(52,28+Math.ceil(chars/52)*15));body.push(row(n,Object.fromEntries(values.map((item,k)=>[letters[k],v(item,k===0||k===1||k===2||k===8||k===9||k===10?5:4)])),height))});
    const bottom=15+Math.max(data.length,1)+2;
    body.push(row(bottom,{A:v('Prepared By Contractor:',1),D:v('Shin Khai Const P/L',1),G:v('MR.MOHAN',1),I:v(''),K:v(footerDate(asOf),1)},24));
    body.push(row(bottom+1,{D:v('Company Name',1),G:v("Name of Contractor's Rep",1),I:v('Signature',1),K:v('Date',1)},22));
    const merges=['C1:K1','C2:K2','C4:K4','C5:K5','C6:K6','A8:K8','C10:K10','A12:A13','B12:B13','C12:C13','D12:F12','G12:G13','H12:H13','I12:I13','J12:K12','A14:K14','A'+bottom+':C'+bottom,'D'+bottom+':F'+bottom,'G'+bottom+':H'+bottom,'I'+bottom+':J'+bottom,'A'+(bottom+1)+':C'+(bottom+1),'D'+(bottom+1)+':F'+(bottom+1),'G'+(bottom+1)+':H'+(bottom+1),'I'+(bottom+1)+':J'+(bottom+1)];
    const widths=[6,15,13,18,20,17,47,47,14,10,10];
    const worksheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${ns}"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:K${bottom+1}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${body.join('')}</sheetData><mergeCells count="${merges.length}">${merges.map(ref=>`<mergeCell ref="${ref}"/>`).join('')}</mergeCells><printOptions horizontalCentered="1"/><pageMargins left="0.25" right="0.25" top="0.3" bottom="0.3" header="0.15" footer="0.15"/><pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/></worksheet>`;
    const zip=new JSZip();
    zip.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`);
    zip.file('_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    zip.file('xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Complaint Register" sheetId="1" r:id="rId1"/></sheets></workbook>`);
    zip.file('xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    zip.file('xl/worksheets/sheet1.xml',worksheet);zip.file('xl/styles.xml',styles);
    return zip.generateAsync({type:'blob',compression:'DEFLATE'});
  }
  function renderSelection(){
    const zone=document.getElementById('complaintZoneFilter').value,block=document.getElementById('complaintBlockFilter').value;
    const existing=new Set(state.complaints.map(c=>String(c.id)));for(const id of selectedIds)if(!existing.has(id))selectedIds.delete(id);
    const records=state.complaints.filter(c=>isTownCouncilCase(c)&&(zone==='all'||Number(c.zone||zoneOfBlock(c.block))===Number(zone))&&(block==='all'||Number(c.block)===Number(block)))
      .sort((a,b)=>(b.date||'').localeCompare(a.date||'')||Number(a.block)-Number(b.block));
    document.getElementById('complaintExportCount').textContent=`${selectedIds.size} selected`;
    document.getElementById('complaintExportSelection').innerHTML=records.length?`<div class="complaint-export-list">${records.map(c=>`<label class="complaint-export-row"><input type="checkbox" data-complaint-export-id="${xml(c.id)}" ${selectedIds.has(String(c.id))?'checked':''}><strong>${xml(enDate(c.date))}</strong><strong>Blk ${xml(c.block)} ${xml(c.unitDisplay||unitDisplay(c.floor,c.unit))}</strong><span class="complaint-export-description">${xml(tcCaseId(c)||'TC')} · ${xml(c.complaint||'')}</span></label>`).join('')}</div>`:'<p>No Town Council complaints in this filter.</p>';
  }
  window.renderComplaintExportSelection=renderSelection;
  document.getElementById('complaintExportSelection').addEventListener('change',e=>{
    const input=e.target.closest('[data-complaint-export-id]');if(!input)return;
    if(input.checked)selectedIds.add(input.dataset.complaintExportId);else selectedIds.delete(input.dataset.complaintExportId);
    document.getElementById('complaintExportCount').textContent=`${selectedIds.size} selected`;
  });
  renderSelection();
  for(const [mode,button] of Object.entries(buttons))button.addEventListener('click',async()=>{
    const asOf=mode==='date'?dateInput.value:isoTodaySG();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(asOf)){toast('Select a report date');return}
    if(mode==='selected'&&!selectedIds.size){toast('Tick the complaints to include');return}
    if(!reportRecords(asOf,mode).length){toast('No complaints for this selection');return}
    button.disabled=true;
    try{const blob=await build(asOf,mode);downloadBlob(`ELU_Complaint_Register_${mode==='date'?asOf:mode==='selected'?'Selected':'Full'}.xlsx`,blob);toast('Complaint Excel downloaded')}
    catch(error){console.error(error);toast('Could not create complaint Excel')}
    finally{button.disabled=false}
  });
})();
