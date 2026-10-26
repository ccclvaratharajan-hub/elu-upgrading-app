// NR visit evidence remains separate from appointment and response decisions.
(function(){
  const TYPES=[['day','Day visit'],['night','Night visit'],['weekend','Weekend visit']];
  const zoneEl=document.getElementById('nrEvidenceZone'),blockEl=document.getElementById('nrEvidenceBlock');
  if(!zoneEl)return;
  zoneEl.innerHTML='<option value="">Select Zone</option>'+Object.keys(ZONE_BLOCKS).map(z=>`<option value="${z}">Zone ${z}</option>`).join('');
  let selected='',photoUrls=[],renderNonce=0;
  const clearUrls=()=>{photoUrls.forEach(URL.revokeObjectURL);photoUrls=[]};
  const photoId=(key,kind)=>`${key}|${kind}`;
  const record=key=>state.nrEvidence?.[key]||{visits:{},reviewed:false,finalNote:''};
  const photos=()=>photoDbAll('nrVisitPhotos');
  const photoFor=(items,key,kind)=>items.find(p=>p.id===photoId(key,kind));
  const fmt=v=>v?safeDate(v):'—';
  const unitText=u=>`Blk ${u.block} · ${unitDisplay(u.floor,u.unit)}`;
  window.openNRInDrawer=key=>{
    const u=getUnit(key),editor=document.getElementById('nrEvidenceEditor');if(!u)return;
    zoneEl.value=String(u.zone);blockEl.value='all';
    document.getElementById('drawerNRVisitMount').append(editor);
    renderEditor(key).catch(error=>{
      console.error(error);
      document.getElementById('nrEvidenceSaved').textContent='Photo storage could not be opened. Please reload the app and try again.'
    })
  };
  window.closeNRInDrawer=()=>{
    const editor=document.getElementById('nrEvidenceEditor');
    document.querySelector('#nrevidence .nr-evidence-panel').after(editor)
  };
  function visitRule(kind,date,time){
    if(!date||!time)return '';
    const day=new Date(`${date}T12:00:00`).getDay(),mins=Number(time.slice(0,2))*60+Number(time.slice(3,5));
    if(kind==='day'&&(day<1||day>5||mins>1080))return 'Day visit: Monday to Friday, before 6 PM';
    if(kind==='weekend'&&day!==6)return 'Weekend visit: Saturday only';
    if(kind==='night'&&mins<=1080)return 'Night visit: after 6 PM';
    return ''
  }
  async function exifDateTime(file){
    if(file.type!=='image/jpeg')return null;
    const bytes=await file.arrayBuffer(),v=new DataView(bytes);
    const ascii=(offset,length)=>{if(offset<0||offset+length>v.byteLength)return '';let s='';for(let i=0;i<length;i++)s+=String.fromCharCode(v.getUint8(offset+i));return s};
    const decode=raw=>{const m=raw.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/);return m?{date:`${m[1]}-${m[2]}-${m[3]}`,time:`${m[4]}:${m[5]}`}:null};
    if(v.byteLength<16||v.getUint16(0)!==0xffd8)return null;
    let p=2;
    while(p+4<v.byteLength){
      if(v.getUint8(p)!==0xff)break;
      const marker=v.getUint8(p+1);if(marker===0xda)break;
      const length=v.getUint16(p+2);if(length<2||p+2+length>v.byteLength)break;
      if(marker===0xe1&&ascii(p+4,6)==='Exif\0\0'){
        const start=p+10,little=ascii(start,2)==='II';
        if(!little&&ascii(start,2)!=='MM')return null;
        const u16=o=>v.getUint16(o,little),u32=o=>v.getUint32(o,little);
        const dir=(offset,tag)=>{const at=start+offset;if(at<start||at+2>v.byteLength)return null;const count=u16(at);if(count>200)return null;for(let i=0;i<count;i++){const e=at+2+i*12;if(e+12>v.byteLength)return null;if(u16(e)===tag)return {type:u16(e+2),count:u32(e+4),value:u32(e+8),entry:e}}return null};
        try{
          const root=u32(start+4),sub=dir(root,0x8769),stamp=sub&&dir(sub.value,0x9003)||dir(root,0x0132);
          if(stamp?.type===2&&stamp.count>=19&&stamp.count<=40){const at=stamp.count<=4?stamp.entry+8:start+stamp.value;return decode(ascii(at,stamp.count))}
        }catch{}
        return null
      }
      p+=2+length
    }
    return null
  }
  // Timestamp Camera can burn the clock into pixels while stripping EXIF (as in
  // the supplied sample). Load OCR only when such a photo is selected.
  let ocrScript;
  async function loadOCR(){
    if(window.Tesseract)return window.Tesseract;
    ocrScript=ocrScript||new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='./vendor/tesseract/tesseract.min.js';
      script.onload=()=>resolve(window.Tesseract);script.onerror=()=>reject(new Error('OCR unavailable'));
      document.head.append(script)
    });
    return ocrScript
  }
  async function readPrintedTimestamp(file){
    const OCR=await loadOCR(),url=URL.createObjectURL(file);
    let worker;
    try{
      const img=new Image();img.src=url;await img.decode();
      const w=img.naturalWidth,h=img.naturalHeight;
      // The sample's white clock and date are in the lower-left of the photo.
      // Keep a manual edit path for other watermark layouts or uncertain OCR.
      const crop=(x,y,cw,ch,threshold)=>{
        const canvas=document.createElement('canvas');canvas.width=Math.round(cw*w*3);canvas.height=Math.round(ch*h*3);
        const ctx=canvas.getContext('2d',{willReadFrequently:true});
        ctx.drawImage(img,x*w,y*h,cw*w,ch*h,0,0,canvas.width,canvas.height);
        if(threshold){const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
          for(let i=0;i<pixels.data.length;i+=4){const gray=(pixels.data[i]*.299+pixels.data[i+1]*.587+pixels.data[i+2]*.114);const v=gray>threshold?0:255;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v}
          ctx.putImageData(pixels,0,0)}
        return canvas
      };
      worker=await OCR.createWorker('eng',1,{workerPath:new URL('./vendor/tesseract/worker.min.js',location.href).href,corePath:new URL('./vendor/tesseract/',location.href).href,langPath:new URL('./vendor/tesseract/',location.href).href,gzip:true});
      await worker.setParameters({tessedit_pageseg_mode:8,tessedit_char_whitelist:'0123456789:/'});
      const timeImage=crop(.02,.78,.195,.085,180),dateImage=crop(.235,.775,.215,.05,180);
      const timeText=(await worker.recognize(timeImage)).data.text.trim();
      const dateText=(await worker.recognize(dateImage)).data.text.trim();
      const tm=timeText.match(/(?:^|\D)([01]?\d|2[0-3])[:.](\d{2})(?:\D|$)/);
      const dm=dateText.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2})/);
      if(!tm||!dm)return null;
      const date=`${dm[3]}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`;
      if(new Date(`${date}T12:00:00`).toISOString().slice(0,10)!==date)return null;
      return {date,time:`${tm[1].padStart(2,'0')}:${tm[2]}`}
    }finally{URL.revokeObjectURL(url);await worker?.terminate()}
  }
  function chosenRows(){
    const z=Number(zoneEl.value),block=blockEl.value;
    if(!z)return [];
    return (ZONE_BLOCKS[z]||[]).filter(b=>block==='all'||Number(block)===b).flatMap(b=>getBlockUnits(b))
      .filter(u=>u.response==='NR'||state.nrEvidence?.[u.key])
      .sort((a,b)=>a.block-b.block||b.floor-a.floor||a.unit-b.unit);
  }
  async function renderEditor(key){
    const u=getUnit(key),panel=document.getElementById('nrEvidenceEditor');
    if(!u){panel.hidden=true;return}
    selected=key;panel.hidden=false;document.getElementById('nrEvidenceUnitTitle').textContent=unitText(u);
    const r=record(key),items=await photos();if(selected!==key)return;
    clearUrls();
    document.getElementById('nrEvidenceVisitForms').innerHTML=TYPES.map(([kind,label])=>{
      const v=r.visits?.[kind]||{},p=photoFor(items,key,kind),url=p?.blob instanceof Blob?URL.createObjectURL(p.blob):'';
      if(url)photoUrls.push(url);
      return `<fieldset class="nr-visit-card" data-nr-kind="${kind}"><legend>${label}</legend><div class="nr-visit-fields"><label>Date<input type="date" data-field="date" value="${esc(v.date||'')}"></label><label>Time<input type="time" data-field="time" value="${esc(v.time||'')}"></label></div><label>Visit note<input type="text" data-field="note" value="${esc(v.note||'')}" placeholder="No one answered / notice left"></label><label>Visit photo<input type="file" data-field="photo" accept="image/jpeg,image/png"></label>${url?`<div class="nr-photo-current"><a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${label} evidence"></a><span>Photo attached</span><button type="button" data-remove-photo="${kind}">Remove photo</button></div>`:'<small>No photo attached</small>'}</fieldset>`
    }).join('');
    document.getElementById('nrEvidenceReviewed').checked=Boolean(r.reviewed);
    document.getElementById('nrEvidenceFinalNote').value=r.finalNote||'';
    document.getElementById('nrEvidenceSaved').textContent=r.reviewed?'Final review recorded. The unit stays NR until its response is changed separately.':'';
  }
  async function render(key){
    const nonce=++renderNonce;
    const z=Number(zoneEl.value),old=blockEl.value;
    blockEl.innerHTML='<option value="all">All blocks</option>'+(ZONE_BLOCKS[z]||[]).map(b=>`<option value="${b}">Blk ${b}</option>`).join('');
    blockEl.value=[...blockEl.options].some(o=>o.value===old)?old:'all';
    const rows=chosenRows(),items=await photos();if(nonce!==renderNonce)return;
    document.getElementById('nrEvidenceCount').textContent=z?`${rows.length} current NR or recorded units in Zone ${z}`:'Choose a zone to see its NR units.';
    document.getElementById('nrEvidenceList').innerHTML=rows.length?rows.map(u=>{
      const r=record(u.key),done=TYPES.filter(([kind])=>r.visits?.[kind]?.date&&r.visits?.[kind]?.time&&photoFor(items,u.key,kind)).length;
      return `<button type="button" class="nr-unit-row ${u.key===selected?'selected':''}" data-nr-unit="${esc(u.key)}"><strong>${esc(unitText(u))}</strong><span>${u.response==='NR'?'NR':esc(statusLabel(u.response))} · ${done}/3 photos${r.reviewed?' · Final review recorded':''}</span></button>`
    }).join(''):'<p class="empty-state">No NR units for this selection.</p>';
    if(key&&rows.some(u=>u.key===key))await renderEditor(key);
    else if(selected&&rows.some(u=>u.key===selected))await renderEditor(selected);
    else{selected='';clearUrls();document.getElementById('nrEvidenceEditor').hidden=true}
  }
  window.renderNREvidence=render;
  zoneEl.addEventListener('change',()=>{blockEl.value='all';selected='';render().catch(console.error)});
  blockEl.addEventListener('change',()=>{selected='';render().catch(console.error)});
  document.getElementById('nrEvidenceList').addEventListener('click',e=>{
    const key=e.target.closest('[data-nr-unit]')?.dataset.nrUnit;
    if(key)renderEditor(key).then(()=>{document.getElementById('nrEvidenceEditor').scrollIntoView({block:'nearest'})}).catch(console.error)
  });
  document.getElementById('nrEvidenceVisitForms').addEventListener('click',async e=>{
    const kind=e.target.closest('[data-remove-photo]')?.dataset.removePhoto;
    if(!kind||!selected)return;
    if(!confirm('Remove this visit photo? The visit date and note will remain.'))return;
    await photoDbDelete('nrVisitPhotos',photoId(selected,kind));
    const r=state.nrEvidence?.[selected];if(r?.reviewed){r.reviewed=false;r.finalNote='';save('Final review cleared because a visit photo was removed')}
    await render(selected)
  });
  document.getElementById('nrEvidenceVisitForms').addEventListener('change',async e=>{
    if(e.target.dataset.field!=='photo'||!e.target.files?.[0])return;
    const card=e.target.closest('[data-nr-kind]'),file=e.target.files[0];
    try{
      card.querySelector('[data-field="photo"]').disabled=true;
      toast('Reading the visit date and time from the photo…');
      const stamp=await exifDateTime(file)||await readPrintedTimestamp(file);
      if(stamp){card.querySelector('[data-field="date"]').value=stamp.date;card.querySelector('[data-field="time"]').value=stamp.time;toast('Date and time filled. Please verify against the photo before saving.')}
      else toast('Timestamp could not be read clearly. Enter the date and time printed on the photo.')
    }catch(error){console.error(error);toast('Enter the date and time printed on the photo.')}
    finally{card.querySelector('[data-field="photo"]').disabled=false}
  });
  document.getElementById('nrEvidenceSave').addEventListener('click',async()=>{
    const key=selected,u=getUnit(key);if(!u)return;
    const old=record(key),visits={...old.visits},newFiles=[];
    for(const [kind] of TYPES){
      const card=document.querySelector(`#nrEvidenceVisitForms [data-nr-kind="${kind}"]`),date=card.querySelector('[data-field="date"]').value,time=card.querySelector('[data-field="time"]').value,note=card.querySelector('[data-field="note"]').value.trim(),file=card.querySelector('[data-field="photo"]').files[0];
      if(Boolean(date)!==Boolean(time)){toast('Enter both visit date and time');return}
      const rule=visitRule(kind,date,time);if(rule){toast(rule);return}
      if(file&&!['image/jpeg','image/png'].includes(file.type)){toast('Use JPEG or PNG visit photos');return}
      if(file&&file.size>12*1024*1024){toast('Each visit photo must be under 12 MB');return}
      if(file&&!date){toast('Enter visit date and time before attaching its photo');return}
      if(date)visits[kind]={date,time,note};else delete visits[kind];
      if(file)newFiles.push({id:photoId(key,kind),unitKey:key,kind,blob:file,name:file.name})
    }
    const reviewed=document.getElementById('nrEvidenceReviewed').checked,finalNote=document.getElementById('nrEvidenceFinalNote').value.trim();
    let existing;try{existing=await photos()}catch(error){toast('Photo storage unavailable');return}
    if(reviewed){
      if(!finalNote){toast('Enter a final review note');return}
      if(TYPES.some(([kind])=>!visits[kind]||!(newFiles.some(f=>f.kind===kind)||photoFor(existing,key,kind)))){toast('Day, night and weekend dates, times and photos are all required for final review');return}
    }
    const button=document.getElementById('nrEvidenceSave');button.disabled=true;
    try{
      for(const row of newFiles)await photoDbPut('nrVisitPhotos',row);
      state.nrEvidence=state.nrEvidence||{};
      state.nrEvidence[key]={visits,reviewed,finalNote:reviewed?finalNote:'',reviewedAt:reviewed?new Date().toISOString():'',updatedAt:new Date().toISOString()};
      save('NR visit record saved');await render(key)
    }catch(error){console.error(error);toast('NR record could not be saved')}
    finally{button.disabled=false}
  });
  const xml=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
  function currentNRRows(){return chosenRows().filter(u=>u.response==='NR')}
  async function reportRows(){const items=await photos();return currentNRRows().map(u=>({u,r:record(u.key),p:TYPES.map(([kind])=>photoFor(items,u.key,kind))}))}
  document.getElementById('nrEvidencePrint').addEventListener('click',async()=>{
    const tab=window.open('','_blank','width=1000,height=900');if(!tab){toast('Allow pop-ups to print the NR report');return}
    try{
      const rows=(await reportRows()).filter(({r,p})=>TYPES.every(([kind],i)=>r.visits?.[kind]?.date&&r.visits?.[kind]?.time&&p[i]?.blob));
      if(!rows.length){tab.close();toast('No NR unit has all three dated visit photos yet');return}
      const urls=[],pages=[];
      for(let i=0;i<rows.length;i+=2){
        const batch=rows.slice(i,i+2),blocks=[...new Set(batch.map(x=>x.u.block))].join(', ');
        const cards=batch.map(({u,r,p})=>`<div class="visit-row"><div class="unit">${esc(unitDisplay(u.floor,u.unit))}</div>${TYPES.map(([kind,label],j)=>{const url=URL.createObjectURL(p[j].blob);urls.push(url);return `<div class="photo"><b>${label}</b><img src="${url}"><small>Visited on<br>${fmt(r.visits[kind].date)}<br>${esc(r.visits[kind].time)}</small></div>`}).join('')}</div>`).join('');
        pages.push(`<section class="page"><h1>Non Responsive Unit</h1><h2>ELU · Zone ${zoneEl.value} · Blk ${blocks} · Pasir Ris</h2><div class="visit-table">${cards}</div><div class="witness">Witness by Contractor <span>Name / Designation ___________________</span><span>Signature ___________________</span><span>Date __________</span></div><div class="witness">Witness by Consultant <span>Name / Designation ___________________</span><span>Signature ___________________</span><span>Date __________</span></div></section>`)
      }
      tab.document.open();tab.document.write(`<!doctype html><html><head><title>NR Visit Evidence · Zone ${zoneEl.value}</title><style>@page{size:A4 portrait;margin:16mm}*{box-sizing:border-box}body{font:12px Arial;margin:0;color:#1e2e39}.page{break-after:page;page-break-after:always}.page:last-child{break-after:auto;page-break-after:auto}h1{text-align:center;color:#d64248;font-size:18px;margin:0;border:1px solid #4d5b61;padding:7px}h2{text-align:center;font-size:11px;border:1px solid #4d5b61;border-top:0;margin:0;padding:5px}.visit-row{display:grid;grid-template-columns:20% repeat(3,1fr);border-left:1px solid #4d5b61;border-bottom:1px solid #4d5b61}.visit-row>*{border-right:1px solid #4d5b61}.unit{padding:12px;text-align:center;font-weight:bold;font-size:16px}.photo{text-align:center}.photo b{display:block;border-bottom:1px solid #4d5b61;padding:4px;font-size:10px}.photo img{display:block;width:100%;height:45mm;object-fit:contain}.photo small{display:block;border-top:1px solid #4d5b61;padding:5px;line-height:1.3;font-size:10px}.witness{margin-top:18px;font-size:11px}.witness span{display:inline-block;margin:18px 12px 0 0;font-size:10px}@media print{button{display:none}}</style></head><body>${pages.join('')}<script>onload=()=>setTimeout(()=>print(),500)<\/script></body></html>`);tab.document.close();setTimeout(()=>urls.forEach(URL.revokeObjectURL),300000)
    }catch(error){tab.close();console.error(error);toast('NR print could not be prepared')}
  });
  document.getElementById('nrEvidenceExcel').addEventListener('click',async()=>{
    const rows=await reportRows();if(!rows.length){toast('No NR units in this zone / block');return}
    const zip=new JSZip(),sheetRows=[],drawings=[],relations=[],media=[];
    const cell=(ref,v,style=3)=>`<c r="${ref}" s="${style}" t="inlineStr"><is><t>${xml(v)}</t></is></c>`;
    sheetRows.push(`<row r="1" ht="30" customHeight="1">${cell('A1',`Non Responsive Units · Zone ${zoneEl.value}`,1)}</row>`);
    sheetRows.push(`<row r="2">${['Unit','Day visit','Night visit','Weekend visit'].map((v,i)=>cell(`${'ABCD'[i]}2`,v,2)).join('')}</row>`);
    let n=3;
    for(const {u,r,p} of rows){
      sheetRows.push(`<row r="${n}" ht="125" customHeight="1">${cell(`A${n}`,`Blk ${u.block} ${unitDisplay(u.floor,u.unit)}`)}${'BCD'.split('').map(col=>cell(`${col}${n}`,'' )).join('')}</row>`);
      for(let j=0;j<3;j++)if(p[j]?.blob instanceof Blob){
        const b=p[j].blob,ext=b.type==='image/png'?'png':'jpg',id=media.length+1;
        media.push({path:`image${id}.${ext}`,blob:b});relations.push(`<Relationship Id="rId${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${id}.${ext}"/>`);
        drawings.push(`<xdr:oneCellAnchor><xdr:from><xdr:col>${j+1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${n-1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="1740000" cy="1300000"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${id}" name="Visit photo ${id}"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${id}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`)
      }
      n++;
      sheetRows.push(`<row r="${n}" ht="46" customHeight="1">${cell(`A${n}`,r.reviewed?'Final review recorded':'NR follow-up')}${TYPES.map(([kind],j)=>cell(`${'BCD'[j]}${n}`,r.visits?.[kind]?`${fmt(r.visits[kind].date)} ${r.visits[kind].time} | ${r.visits[kind].note||''}`:'Not visited')).join('')}</row>`);n++
    }
    const types=`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`;
    zip.file('[Content_Types].xml',types);
    zip.file('_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    zip.file('xl/workbook.xml',`<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Zone ${zoneEl.value} NR Evidence" sheetId="1" r:id="rId1"/></sheets></workbook>`);
    zip.file('xl/_rels/workbook.xml.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    zip.file('xl/styles.xml','<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="16"/><color rgb="FFD64248"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
    zip.file('xl/worksheets/sheet1.xml',`<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews><cols><col min="1" max="1" width="22" customWidth="1"/><col min="2" max="4" width="31" customWidth="1"/></cols><sheetData>${sheetRows.join('')}</sheetData><mergeCells count="1"><mergeCell ref="A1:D1"/></mergeCells><printOptions horizontalCentered="1"/><pageMargins left="0.25" right="0.25" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/><drawing r:id="rId1"/></worksheet>`);
    zip.file('xl/worksheets/_rels/sheet1.xml.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>');
    zip.file('xl/drawings/drawing1.xml',`<?xml version="1.0"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${drawings.join('')}</xdr:wsDr>`);
    zip.file('xl/drawings/_rels/drawing1.xml.rels',`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relations.join('')}</Relationships>`);
    for(const m of media)zip.file(`xl/media/${m.path}`,await m.blob.arrayBuffer());
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'});
    downloadBlob(`ELU_NR_Evidence_Zone${zoneEl.value}_${isoTodaySG()}.xlsx`,blob);toast('Zone NR Excel downloaded')
  });
})();
