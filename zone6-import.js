// Private one-time Zone 6 import. The workbook stays on the user's device;
// resident fields are stored only in the app's encrypted saved state.
(function(){
  const fileInput=document.getElementById('zone6SurveyFile');
  const preview=document.getElementById('zone6ImportPreview');
  const applyBtn=document.getElementById('zone6ApplyImport');
  const undoBtn=document.getElementById('zone6UndoImport');
  if(!fileInput)return;
  const BACKUP_KEY='elu_zone6_preimport_backup_v1';
  let candidate=null;
  const local=x=>Array.from(x.getElementsByTagName('*')).filter(e=>e.localName==='row');
  const children=(x,name)=>Array.from(x.children).filter(e=>e.localName===name);
  const text=x=>x?.textContent||'';
  async function parse(file){
    const zip=await JSZip.loadAsync(await file.arrayBuffer());
    const parseXml=async name=>{
      const part=zip.file(name);if(!part)throw Error(`Excel part missing: ${name}`);
      const doc=new DOMParser().parseFromString(await part.async('string'),'application/xml');
      if(doc.getElementsByTagName('parsererror').length)throw Error(`Invalid Excel XML: ${name}`);
      return doc;
    };
    const strings=zip.file('xl/sharedStrings.xml')?Array.from((await parseXml('xl/sharedStrings.xml')).getElementsByTagName('*')).filter(e=>e.localName==='si').map(si=>Array.from(si.getElementsByTagName('*')).filter(e=>e.localName==='t').map(text).join('')):[];
    const book=await parseXml('xl/workbook.xml');
    const rels=await parseXml('xl/_rels/workbook.xml.rels');
    const paths=Object.fromEntries(Array.from(rels.getElementsByTagName('*')).filter(e=>e.localName==='Relationship').map(e=>[e.getAttribute('Id'),e.getAttribute('Target')]));
    const sheets={};
    for(const node of Array.from(book.getElementsByTagName('*')).filter(e=>e.localName==='sheet')){
      const name=node.getAttribute('name'),id=node.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||node.getAttribute('r:id');
      if(!/^55[1-6]( blk chart)?$/.test(name))continue;
      const target=paths[id];if(!target)throw Error(`Sheet relationship missing: ${name}`);
      const doc=await parseXml(target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,''));
      const rows=[];
      for(const row of local(doc)){
        const cells={};
        for(const c of children(row,'c')){
          const address=c.getAttribute('r'),col=address.match(/^[A-Z]+/)[0],valueNode=children(c,'v')[0];
          let value=c.getAttribute('t')==='s'?strings[Number(text(valueNode))]:c.getAttribute('t')==='inlineStr'?Array.from(c.getElementsByTagName('*')).filter(e=>e.localName==='t').map(text).join(''):text(valueNode);
          if(value!=='')cells[col]=value;
        }
        rows[Number(row.getAttribute('r'))]=cells;
      }
      sheets[name]=rows;
    }
    const entries={},stats={};
    for(const block of ZONE_BLOCKS[6]){
      const chart=sheets[`${block} blk chart`],detail=sheets[String(block)];
      if(!chart||!detail)throw Error(`Blk ${block} chart or unit sheet missing`);
      const heads=chart[4]||{},columns=Object.entries(heads).filter(([col,v])=>col>='C'&&col<='I'&&/^\d+(?:\.0+)?$/.test(v)).map(([col,v])=>[col,Number(v)]);
      const chartStatus=new Map();
      for(let row=5;row<chart.length;row++){
        const r=chart[row]||{},floor=Number(r.B);if(!floor)continue;
        for(const [col,unit] of columns)chartStatus.set(`${floor}-${unit}`,String(r[col]||'').toUpperCase().trim());
      }
      if([...chartStatus.values()].every(v=>!v)){stats[block]={total:0,A:0,C:0,D:0,NR:0,completed:0};continue}
      let floor=0,count=0;
      for(let row=2;row<detail.length;row++){
        const r=detail[row]||{};if(r.C)floor=Number(r.C);
        const unit=Number(r.D);if(!floor||!unit)continue;
        const key=`${block}-${floor}-${unit}`;
        if(!PROJECT_LAYOUT[block]?.floors?.[floor]?.includes(unit))throw Error(`Unit in Excel is not in the app: Blk ${block} #${floor}-${unit}`);
        if(entries[key])throw Error(`Duplicate unit in Excel: Blk ${block} #${floor}-${unit}`);
        const mark=chartStatus.get(`${floor}-${unit}`)||'';
        if(!mark)continue; // Unstarted units remain exactly as they were.
        if(!['A','C','D','NR','CNR','VNR'].includes(mark))throw Error(`Unknown Block Chart status ${mark}: Blk ${block} #${floor}-${unit}`);
        const work=String(r.J||'').trim(),rawDate=String(r.I||'').trim(),date=legacyDateISO(rawDate);
        // The chart owns the response. Rajan explicitly corrected 554 #10-117 to Opt-In.
        const status=block===554&&floor===10&&unit===117?'A':mark==='CNR'||mark==='VNR'?'NR':mark;
        const completed=status==='A'&&Boolean(date);
        if(status==='C'&&!date)throw Error(`Confirmed appointment date missing: Blk ${block} #${floor}-${unit}`);
        const name=String(r.H||'').trim(),contact=String(r.G||'').trim();
        const normalizedSchedule=rawDate.replace(/(\d{1,2}(?::\d{2})?(?:am|pm))(\d{1,2}(?::\d{2})?(?:am|pm))/i,'$1–$2');
        const slot=legacySlot(normalizedSchedule);
        if(status==='C'&&!slot)throw Error(`Confirmed appointment time missing: Blk ${block} #${floor}-${unit}`);
        entries[key]={status,ownerName:name,contact,completed,appointmentDate:date,appointmentSlot:slot,legacySchedule:rawDate,legacyRemark:''};
        count++;
      }
      const chartCount=[...chartStatus.values()].filter(Boolean).length;
      if(count!==chartCount)throw Error(`Blk ${block}: ${count} listing units do not match ${chartCount} marked chart units`);
      stats[block]={total:count,A:0,C:0,D:0,NR:0,completed:0};
      for(const [key,e] of Object.entries(entries))if(key.startsWith(`${block}-`)){stats[block][e.status]++;if(e.completed)stats[block].completed++}
    }
    if(!Object.keys(entries).length)throw Error('No marked Zone 6 units found');
    return {entries,stats};
  }
  fileInput.addEventListener('change',async()=>{
    candidate=null;applyBtn.disabled=true;
    const file=fileInput.files?.[0];if(!file)return;
    preview.textContent='Reading Zone 6 survey Excel…';
    try{
      candidate=await parse(file);
      preview.textContent=`Ready: ${Object.keys(candidate.entries).length} marked units in Zone 6. Block Chart A/C/D/NR controls the status; CNR/VNR → NR. Blk 554 #10-117 uses your explicit Opt-In correction. Blank chart units remain untouched. `+Object.entries(candidate.stats).map(([b,v])=>`Blk ${b}: ${v.A} Opt-In, ${v.C} Confirmation, ${v.D} Opt-Out, ${v.NR} NR`).join(' · ');
      applyBtn.disabled=false;
    }catch(e){console.error(e);preview.textContent=`Cannot import: ${e.message}`}
  });
  applyBtn.addEventListener('click',async()=>{
    if(!candidate||!secureSessionKey||!appStarted)return;
    applyBtn.disabled=true;
    try{
      const old=await encryptPayload(secureSnapshot(),secureSessionKey);
      localStorage.setItem(BACKUP_KEY,JSON.stringify(old));
      const imported=candidate.entries;
      const keys=new Set(Object.keys(imported));
      state.appointments=state.appointments.filter(a=>!keys.has(a.unitKey));
      state.appointmentTombstones=[...new Set([...(state.appointmentTombstones||[]),...SOURCE_APPOINTMENTS.filter(a=>keys.has(a.unitKey)).map(a=>String(a.id))])];
      state.zone6ImportData={...(state.zone6ImportData||{}),...imported};
      applyZone6ImportSeed(imported);
      const now=Date.now();let offset=0;
      for(const [key,e] of Object.entries(imported)){
        const u=state.units[key],status=e.status;
        if(!u)throw Error(`App unit missing: ${key}`);
        if(status==='C'||e.completed){
          state.appointments.push({id:now+offset++,unitKey:key,zone:6,block:u.block,floor:u.floor,unit:u.unit,unitDisplay:unitDisplay(u.floor,u.unit),ownerName:e.ownerName,contact:e.contact,date:e.appointmentDate,slot:e.appointmentSlot||'',team:'',remarks:'',source:'Zone6 Survey Import',scheduleState:'Active',workStatus:e.completed?'Completed':'Pending',requiresExplicitCompletion:status==='C'});
          delete state.statusOverrides[key];
        }else{
          state.statusOverrides[key]={status,source:'Zone6 Survey Import',reason:status==='A'?'Zone 6 survey Opt-In (status only)':'Zone 6 survey Excel',updatedAt:new Date().toISOString()};
        }
        state.statusAudit.push({id:`zone6-import-${now}-${key}`,unitKey:key,from:u.response,to:status,action:'zone6-survey-import',source:'Zone6 Survey Import',at:new Date().toISOString()});
      }
      rebuildAllMasters();await securePersistNow();renderAll();
      preview.textContent=`Zone 6 updated: ${keys.size} marked units from the selected Excel. Blank chart units and all other zones stayed unchanged.`;
      undoBtn.hidden=false;toast('Zone 6 survey imported');
    }catch(e){console.error(e);preview.textContent=`Import failed: ${e.message}. Use Undo last import to restore.`;undoBtn.hidden=false}
  });
  undoBtn.addEventListener('click',async()=>{
    const raw=localStorage.getItem(BACKUP_KEY);if(!raw||!secureSessionKey)return;
    localStorage.setItem(SECURE_STATE_KEY,raw);localStorage.removeItem(BACKUP_KEY);location.reload();
  });
  undoBtn.hidden=!localStorage.getItem(BACKUP_KEY);
})();
