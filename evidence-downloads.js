// Bulk evidence exports are read-only views of the current browser workspace.
(function(){
  const zoneSelect=document.getElementById('evidenceDownloadZone');
  if(!zoneSelect)return;
  zoneSelect.innerHTML=Object.keys(ZONE_BLOCKS).map(z=>`<option value="${z}">Zone ${z}</option>`).join('');
  const optCount=document.getElementById('evidenceOptOutCount');
  const nrCount=document.getElementById('evidenceNRCount');
  const optButton=document.getElementById('evidenceOptOutDownload');
  const nrButton=document.getElementById('evidenceNRDownload');
  const message=document.getElementById('evidenceDownloadMessage');
  const kinds=['day','night','weekend'];
  const fileSafe=s=>String(s||'').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,100);
  const csvValue=v=>{
    let value=String(v??'');
    if(/^[\s]*[=+@-]/.test(value))value="'"+value;
    return '"'+value.replace(/"/g,'""')+'"'
  };
  const csv=(headers,rows)=>'\ufeff'+[headers,...rows].map(row=>row.map(csvValue).join(',')).join('\r\n')+'\r\n';
  function units(zone){return unitsArray().filter(u=>Number(u.zone)===zone).sort((a,b)=>a.block-b.block||b.floor-a.floor||a.unit-b.unit)}
  function name(u){return `Blk_${u.block}/Unit_${String(u.floor).padStart(2,'0')}-${u.unit}`}
  function optRows(zone,forms){
    const byKey=new Map(forms.filter(f=>f?.unitKey&&getUnit(f.unitKey)?.zone===zone).map(f=>[f.unitKey,f]));
    return units(zone).filter(u=>currentUnitAppointmentState(u.key).status==='D'||byKey.has(u.key))
      .map(u=>({u,form:byKey.get(u.key),decision:state.statusOverrides?.[u.key]||{}}))
  }
  function nrRows(zone,photos){
    const byId=new Map(photos.filter(p=>p?.id&&p?.blob instanceof Blob).map(p=>[p.id,p]));
    return units(zone).map(u=>{
      const record=state.nrEvidence?.[u.key];
      if(!record)return null;
      const files=kinds.map(kind=>byId.get(`${u.key}|${kind}`));
      return kinds.every((kind,i)=>record.visits?.[kind]?.date&&record.visits?.[kind]?.time&&files[i])?{u,record,files}:null
    }).filter(Boolean)
  }
  let refreshId=0;
  async function render(){
    const id=++refreshId,zone=Number(zoneSelect.value);
    optCount.textContent='Checking saved forms…';nrCount.textContent='Checking visit photos…';
    try{
      const [forms,photos]=await Promise.all([photoDbAll('optOutForms'),photoDbAll('nrVisitPhotos')]);
      if(id!==refreshId)return;
      const opt=optRows(zone,forms),nr=nrRows(zone,photos),attached=opt.filter(r=>r.form?.blob instanceof Blob).length;
      optCount.textContent=`${opt.length} Opt-Out records · ${attached} attached forms`;
      nrCount.textContent=`${nr.length} units with all 3 dated visit photos · ${nr.length*3} photos`;
      optButton.disabled=!opt.length;nrButton.disabled=!nr.length;
      message.textContent=''
    }catch(error){console.error(error);optCount.textContent=nrCount.textContent='Saved files unavailable on this browser';optButton.disabled=nrButton.disabled=true}
  }
  window.renderEvidenceDownloads=render;
  zoneSelect.addEventListener('change',()=>render());
  async function run(button,action){
    if(button.disabled)return;
    button.disabled=true;message.textContent='Preparing zone download…';
    try{await action();message.textContent='Download prepared.'}
    catch(error){console.error(error);message.textContent='Download could not be prepared. Please try again.'}
    finally{await render()}
  }
  optButton.addEventListener('click',()=>run(optButton,async()=>{
    const zone=Number(zoneSelect.value),forms=await photoDbAll('optOutForms'),rows=optRows(zone,forms);
    if(!rows.length){toast('No Opt-Out records in this zone');return}
    const zip=new JSZip(),index=[['Zone','Block','Unit','Current Status','Evidence Type','Details','Attached File','Saved At']];
    for(const {u,form,decision} of rows){
      const ext=form?.type==='application/pdf'?'pdf':form?.type==='image/png'?'png':form?.type==='image/webp'?'webp':'jpg';
      const path=form?.blob instanceof Blob?`${name(u)}/Opt_Out_Form.${ext}`:'';
      if(path)zip.file(path,await form.blob.arrayBuffer());
      index.push([zone,u.block,unitDisplay(u.floor,u.unit),currentUnitAppointmentState(u.key).status,decision.optOutKind||'',decision.optOutNote||'',path,form?.savedAt||''])
    }
    zip.file('Opt_Out_Index.csv',csv(index[0],index.slice(1)));
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'});
    downloadBlob(`ELU_Opt_Out_Evidence_Zone${zone}_${isoTodaySG()}.zip`,blob)
  }));
  nrButton.addEventListener('click',()=>run(nrButton,async()=>{
    const zone=Number(zoneSelect.value),photos=await photoDbAll('nrVisitPhotos'),rows=nrRows(zone,photos);
    if(!rows.length){toast('No units have all 3 dated visit photos in this zone');return}
    const zip=new JSZip(),index=[['Zone','Block','Unit','Current Status','Day Date','Day Time','Night Date','Night Time','Weekend Date','Weekend Time','Final Review','Final Note']];
    for(const {u,record,files} of rows){
      for(let i=0;i<kinds.length;i++){
        const kind=kinds[i],p=files[i],v=record.visits[kind],ext=p.blob.type==='image/png'?'png':p.blob.type==='image/webp'?'webp':'jpg';
        zip.file(`${name(u)}/${kind}_${fileSafe(v.date)}_${fileSafe(v.time)}.${ext}`,await p.blob.arrayBuffer())
      }
      index.push([zone,u.block,unitDisplay(u.floor,u.unit),currentUnitAppointmentState(u.key).status,...kinds.flatMap(k=>[record.visits[k].date,record.visits[k].time]),record.reviewed?'Yes':'No',record.finalNote||''])
    }
    zip.file('NR_Three_Visit_Index.csv',csv(index[0],index.slice(1)));
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'});
    downloadBlob(`ELU_NR_Three_Visits_Zone${zone}_${isoTodaySG()}.zip`,blob)
  }));
})();
