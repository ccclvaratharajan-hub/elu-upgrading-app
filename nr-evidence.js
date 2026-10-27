// NR visit evidence remains separate from appointment and response decisions.
(function(){
  const TYPES=[['day','Day visit'],['night','Night visit'],['weekend','Weekend visit']];
  const zoneEl=document.getElementById('nrEvidenceZone'),blockEl=document.getElementById('nrEvidenceBlock');
  if(!zoneEl)return;
  zoneEl.innerHTML='<option value="">Select Zone</option>'+Object.keys(ZONE_BLOCKS).map(z=>`<option value="${z}">Zone ${z}</option>`).join('');
  let selected='',photoUrls=[],renderNonce=0,timestampQueue=Promise.resolve();
  const clearUrls=()=>{photoUrls.forEach(URL.revokeObjectURL);photoUrls=[]};
  const photoId=(key,kind)=>`${key}|${kind}`;
  const record=key=>state.nrEvidence?.[key]||{visits:{},reviewed:false,finalNote:''};
  const photos=()=>photoDbAll('nrVisitPhotos');
  const photoFor=(items,key,kind)=>items.find(p=>p.id===photoId(key,kind));
  const fmt=v=>v?safeDate(v):'—';
  const reportDate=v=>{const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${Number(m[3])}/${Number(m[2])}/${m[1]}`:v||''};
  const reportTime=v=>{const m=String(v||'').match(/^(\d{2}):(\d{2})$/);if(!m)return v||'';const h=Number(m[1]);return `${h%12||12}:${m[2]} ${h<12?'am':'pm'}`};
  const reportAddress=zone=>Number(zone)===3?'Pasir Ris Dr 1':'Pasir Ris St 51';
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
  async function readPrintedTimestamp(file,sharedWorker){
    const OCR=await loadOCR(),url=URL.createObjectURL(file);
    let worker=sharedWorker;
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
      worker=worker||await OCR.createWorker('eng',1,{workerPath:new URL('./vendor/tesseract/worker.min.js',location.href).href,corePath:new URL('./vendor/tesseract/',location.href).href,langPath:new URL('./vendor/tesseract/',location.href).href,gzip:true});
      await worker.setParameters({tessedit_pageseg_mode:8,tessedit_char_whitelist:'0123456789:/APMapm. '});
      const timePattern=/(?:^|\D)([01]?\d|2[0-3])[:.](\d{2})\s*([AP]M)?(?:\D|$)/i;
      const datePattern=/(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2})/;
      const read=async(candidates,pattern)=>{
        for(const [x,y,cw,ch,threshold] of candidates){
          const found=(await worker.recognize(crop(x,y,cw,ch,threshold))).data.text.trim();
          const match=found.match(pattern);if(match)return match
        }
        return null
      };
      const tm=await read([[.02,.78,.195,.085,180],[.02,.78,.195,.085,0],[.015,.76,.22,.11,160],[.015,.76,.22,.11,0]],timePattern);
      const dm=await read([[.235,.775,.215,.05,180],[.235,.775,.215,.05,0],[.22,.75,.31,.095,160],[.22,.75,.31,.095,0]],datePattern);
      if(!tm||!dm)return null;
      const date=`${dm[3]}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`;
      if(new Date(`${date}T12:00:00`).toISOString().slice(0,10)!==date)return null;
      let hour=Number(tm[1]);if(tm[3])hour=hour%12+(tm[3].toUpperCase()==='PM'?12:0);
      return {date,time:`${String(hour).padStart(2,'0')}:${tm[2]}`}
    }finally{URL.revokeObjectURL(url);if(!sharedWorker)await worker?.terminate()}
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
    const items=await photos();if(selected!==key)return;
    clearUrls();
    document.getElementById('nrEvidenceVisitForms').innerHTML=TYPES.map(([kind,label])=>{
      const p=photoFor(items,key,kind),url=p?.blob instanceof Blob?URL.createObjectURL(p.blob):'';
      if(url)photoUrls.push(url);
      return `<fieldset class="nr-visit-card" data-nr-kind="${kind}"><legend>${label}</legend>${url?`<div class="nr-photo-current"><a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${label} evidence"></a><span>Saved photo</span></div>`:'<small>No photo attached</small>'}<div class="nr-photo-actions"><label class="nr-file-action">${url?'Replace photo':'Upload photo'}<input type="file" data-field="photo" accept="image/jpeg,image/png,image/webp"></label>${url?`<button type="button" data-remove-photo="${kind}">Delete photo</button>`:''}</div></fieldset>`
    }).join('');
    const count=TYPES.filter(([kind])=>photoFor(items,key,kind)?.blob instanceof Blob).length;
    document.getElementById('nrEvidenceSaved').textContent=`${count}/3 visit photos saved${count===3?' · Ready for report':''}. Date and time are shown on the photos.`;
  }
  async function render(key){
    const nonce=++renderNonce;
    const z=Number(zoneEl.value),old=blockEl.value;
    blockEl.innerHTML='<option value="all">All blocks</option>'+(ZONE_BLOCKS[z]||[]).map(b=>`<option value="${b}">Blk ${b}</option>`).join('');
    blockEl.value=[...blockEl.options].some(o=>o.value===old)?old:'all';
    const rows=chosenRows(),items=await photos();if(nonce!==renderNonce)return;
    document.getElementById('nrEvidenceCount').textContent=z?`${rows.length} current NR or recorded units in Zone ${z}`:'Choose a zone to see its NR units.';
    document.getElementById('nrEvidenceList').innerHTML=rows.length?rows.map(u=>{
      const done=TYPES.filter(([kind])=>photoFor(items,u.key,kind)?.blob instanceof Blob).length;
      return `<button type="button" class="nr-unit-row ${u.key===selected?'selected':''}" data-nr-unit="${esc(u.key)}"><strong>${esc(unitText(u))}</strong><span>${u.response==='NR'?'NR':esc(statusLabel(u.response))} · ${done}/3 photos${done===3?' · Report ready':''}</span></button>`
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
    if(!confirm('Delete this visit photo? You can upload it again later.'))return;
    await photoDbDelete('nrVisitPhotos',photoId(selected,kind));
    const r=state.nrEvidence?.[selected];if(r){r.visits=r.visits||{};delete r.visits[kind];r.reviewed=false;r.finalNote='';r.updatedAt=new Date().toISOString();save('NR visit photo deleted')}
    await render(selected)
  });
  document.getElementById('nrEvidenceVisitForms').addEventListener('change',async e=>{
    if(e.target.dataset.field!=='photo'||!e.target.files?.[0])return;
    const kind=e.target.closest('[data-nr-kind]')?.dataset.nrKind,file=e.target.files[0],key=selected;
    if(!kind||!key)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){toast('Use JPEG, PNG or WebP visit photos');e.target.value='';return}
    if(file.size>12*1024*1024){toast('Each visit photo must be under 12 MB');e.target.value='';return}
    const inputs=[...document.querySelectorAll('#nrEvidenceVisitForms input[type="file"]')];inputs.forEach(input=>input.disabled=true);
    try{
      const savedAt=new Date().toISOString();
      await photoDbPut('nrVisitPhotos',{id:photoId(key,kind),unitKey:key,kind,blob:file,name:file.name,savedAt});
      const previous=record(key);
      state.nrEvidence=state.nrEvidence||{};
      const visits={...(previous.visits||{})};delete visits[kind];
      state.nrEvidence[key]={...previous,visits,reviewed:false,finalNote:'',reviewedAt:'',updatedAt:savedAt};
      save('NR visit photo saved');await render(key);
      // Recognition is best effort. The original timestamp remains visible on the saved photo.
      timestampQueue=timestampQueue.then(async()=>{
        try{
          const stamp=await exifDateTime(file).catch(()=>null)||await readPrintedTimestamp(file).catch(()=>null);
          if(!stamp||visitRule(kind,stamp.date,stamp.time))return;
          const current=(await photos()).find(p=>p.id===photoId(key,kind));
          if(current?.savedAt!==savedAt)return;
          const r=record(key);r.visits={...(r.visits||{}),[kind]:stamp};r.updatedAt=new Date().toISOString();
          state.nrEvidence[key]=r;save('NR photo timestamp recognized')
        }catch(error){console.warn('NR timestamp recognition unavailable',error)}
      }).catch(error=>console.warn('NR timestamp recognition unavailable',error))
    }catch(error){console.error(error);toast('Photo could not be saved. Please try again.')}
    finally{inputs.forEach(input=>input.disabled=false)}
  });
  const xml=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
  async function excelImage(source){
    const url=URL.createObjectURL(source);
    try{
      const img=new Image();img.src=url;await img.decode();
      const ratio=img.naturalWidth/img.naturalHeight||1;
      if(source.type!=='image/webp')return {blob:source,ratio};
      const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
      canvas.getContext('2d').drawImage(img,0,0);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      if(!blob)throw new Error('WebP conversion failed');
      return {blob,ratio}
    }finally{URL.revokeObjectURL(url)}
  }
  async function reportRows(){
    await timestampQueue;
    const items=await photos(),rows=chosenRows().map(u=>({u,r:record(u.key),p:TYPES.map(([kind])=>photoFor(items,u.key,kind))}));
    let updated=false,worker,workerUnavailable=false;
    try{
      for(const row of rows.filter(({p})=>p.every(photo=>photo?.blob instanceof Blob))){
        for(let j=0;j<TYPES.length;j++){
          const kind=TYPES[j][0];if(row.r.visits?.[kind]?.date&&row.r.visits?.[kind]?.time)continue;
          let stamp=await exifDateTime(row.p[j].blob).catch(()=>null);
          if(!stamp&&!workerUnavailable){
            if(!worker){const OCR=await loadOCR().catch(()=>null);if(OCR)worker=await OCR.createWorker('eng',1,{workerPath:new URL('./vendor/tesseract/worker.min.js',location.href).href,corePath:new URL('./vendor/tesseract/',location.href).href,langPath:new URL('./vendor/tesseract/',location.href).href,gzip:true}).catch(()=>null);if(!worker)workerUnavailable=true}
            if(worker)stamp=await readPrintedTimestamp(row.p[j].blob,worker).catch(()=>null)
          }
          if(!stamp||visitRule(kind,stamp.date,stamp.time))continue;
          state.nrEvidence=state.nrEvidence||{};
          row.r={...row.r,visits:{...(row.r.visits||{}),[kind]:stamp}};
          state.nrEvidence[row.u.key]=row.r;updated=true
        }
      }
    }finally{await worker?.terminate()}
    if(updated)save('NR photo timestamps recognized for report');
    return rows
  }
  function reportPages(rows){
    const pages=[];
    for(const row of rows){
      let page=pages[pages.length-1];
      if(!page||page.length===3||page[0].u.block!==row.u.block||page[0].u.zone!==row.u.zone){page=[];pages.push(page)}
      page.push(row)
    }
    return pages
  }
  async function pdfPhoto(document,blob){
    const converted=await excelImage(blob);
    const bytes=await converted.blob.arrayBuffer();
    return converted.blob.type==='image/png'?document.embedPng(bytes):document.embedJpg(bytes)
  }
  async function stampCrop(blob){
    const url=URL.createObjectURL(blob);
    try{
      const img=new Image();img.src=url;await img.decode();
      const w=img.naturalWidth,h=img.naturalHeight,canvas=document.createElement('canvas');
      canvas.width=900;canvas.height=135;
      canvas.getContext('2d').drawImage(img,.015*w,.765*h,.52*w,.115*h,0,0,900,135);
      return await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Timestamp crop failed')),'image/jpeg',.95))
    }finally{URL.revokeObjectURL(url)}
  }
  async function downloadEvidencePdf(rows){
    const {PDFDocument,StandardFonts,rgb}=window.PDFLib;
    const document=await PDFDocument.create(),regular=await document.embedFont(StandardFonts.Helvetica),bold=await document.embedFont(StandardFonts.HelveticaBold);
    const ink=rgb(.12,.18,.22),red=rgb(.84,.25,.28),line=rgb(.29,.35,.38);
    const W=595.28,H=841.89,left=32,right=563.28,width=right-left,unitW=96,photoW=(width-unitW)/3;
    const txt=(page,value,x,y,size=9,font=regular,color=ink)=>page.drawText(String(value),{x,y,size,font,color});
    const center=(page,value,x,w,y,size=9,font=regular,color=ink)=>txt(page,value,x+(w-font.widthOfTextAtSize(String(value),size))/2,y,size,font,color);
    const hLine=(page,y,x1=left,x2=right,thickness=0.8)=>page.drawLine({start:{x:x1,y},end:{x:x2,y},thickness,color:line});
    const vLine=(page,x,y1,y2)=>page.drawLine({start:{x,y:y1},end:{x,y:y2},thickness:.8,color:line});
    for(const group of reportPages(rows)){
      const page=document.addPage([W,H]);let y=H-34;
      hLine(page,y);center(page,'Non Responsive Unit',left,width,y-19,15,bold,red);y-=29;hLine(page,y);
      const heading=`Blk ${group[0].u.block} · ${reportAddress(group[0].u.zone)}`;
      center(page,heading,left,width,y-14,10,bold);y-=21;hLine(page,y);
      for(const {u,r,p} of group){
        const headerTop=y,headerBottom=y-19,imageBottom=headerBottom-130,captionBottom=imageBottom-37;
        hLine(page,headerBottom);hLine(page,imageBottom,left+unitW,right);hLine(page,captionBottom,left,right,1.2);
        for(let j=0;j<4;j++)vLine(page,left+(j===0?0:unitW+(j-1)*photoW),captionBottom,headerTop);
        vLine(page,right,captionBottom,headerTop);
        center(page,'Unit',left,unitW,headerBottom+5,9,bold);
        for(let j=0;j<3;j++)center(page,['First Visit','Second Visit','Weekend Visit'][j],left+unitW+j*photoW,photoW,headerBottom+5,9,bold);
        center(page,unitDisplay(u.floor,u.unit),left,unitW,imageBottom+62,13,bold);
        for(let j=0;j<3;j++){
          const picture=await pdfPhoto(document,p[j].blob),scale=Math.min((photoW-9)/picture.width,124/picture.height);
          const w=picture.width*scale,h=picture.height*scale,x=left+unitW+j*photoW+(photoW-w)/2;
          page.drawImage(picture,{x,y:imageBottom+(130-h)/2,width:w,height:h});
          const v=r.visits?.[TYPES[j][0]],cx=left+unitW+j*photoW;
          center(page,'Visited on',cx,photoW,imageBottom-11,8.5,bold);
          if(v?.date&&v?.time){center(page,reportDate(v.date),cx,photoW,imageBottom-21,8.5);center(page,reportTime(v.time),cx,photoW,imageBottom-31,8.5)}
          else{
            const crop=await stampCrop(p[j].blob),stamp=await document.embedJpg(await crop.arrayBuffer());
            page.drawImage(stamp,{x:cx+9,y:imageBottom-35,width:photoW-18,height:19})
          }
        }
        y=captionBottom
      }
      const witness=(label,top)=>{
        txt(page,`Witness by ${label}`,left+2,top-14,9.5);
        const columns=[{x:left+6,w:150,label:'Name / Designation'},{x:left+190,w:150,label:'Signature'},{x:right-100,w:95,label:'Date'}];
        for(const col of columns){hLine(page,top-36,col.x,col.x+col.w,.7);center(page,col.label,col.x,col.w,top-48,8)}
      };
      witness('Contractor (M/s Shin Khai Construction Pte Ltd)',y-8);
      witness('Consultant',y-67)
    }
    return new Blob([await document.save()],{type:'application/pdf'})
  }
  document.getElementById('nrEvidencePrint').addEventListener('click',async()=>{
    const button=document.getElementById('nrEvidencePrint');button.disabled=true;
    try{
      const rows=(await reportRows()).filter(({p})=>p.every(photo=>photo?.blob instanceof Blob));
      if(!rows.length){toast('No unit has all three saved visit photos in this zone / block');return}
      const pdf=await downloadEvidencePdf(rows);
      downloadBlob(`ELU_NR_Evidence_Zone${zoneEl.value}_${isoTodaySG()}.pdf`,pdf);
      toast('Zone NR PDF downloaded')
    }catch(error){console.error(error);toast('NR PDF could not be prepared')}
    finally{button.disabled=false}
  });
  document.getElementById('nrEvidenceExcel').addEventListener('click',async()=>{
    const rows=(await reportRows()).filter(({p})=>p.every(photo=>photo?.blob instanceof Blob));if(!rows.length){toast('No unit has all three saved visit photos in this zone / block');return}
    const zip=new JSZip(),sheetRows=[],drawings=[],relations=[],media=[],pageBreaks=[],merges=['A1:D1'];
    const cell=(ref,v,style=3)=>`<c r="${ref}" s="${style}" t="inlineStr"><is><t>${xml(v)}</t></is></c>`;
    sheetRows.push(`<row r="1" ht="33" customHeight="1">${cell('A1','Non Responsive Unit',1)}${cell('D1','',3)}</row>`);
    let n=2;
    const groups=reportPages(rows);
    for(let g=0;g<groups.length;g++){
      const first=groups[g][0].u;
      sheetRows.push(`<row r="${n}" ht="19" customHeight="1">${cell(`A${n}`,`Blk ${first.block} · ${reportAddress(first.zone)}`,2)}${cell(`D${n}`,'',3)}</row>`);merges.push(`A${n}:D${n}`);n++;
      for(const {u,r,p} of groups[g]){
      sheetRows.push(`<row r="${n}" ht="18" customHeight="1">${['Unit','First Visit','Second Visit','Weekend Visit'].map((v,j)=>cell(`${'ABCD'[j]}${n}`,v,2)).join('')}</row>`);n++;
      const unitRow=n;
      sheetRows.push(`<row r="${n}" ht="116" customHeight="1">${cell(`A${n}`,unitDisplay(u.floor,u.unit),4)}${'BCD'.split('').map(col=>cell(`${col}${n}`,'' )).join('')}</row>`);
      for(let j=0;j<3;j++)if(p[j]?.blob instanceof Blob){
        const {blob:b,ratio}=await excelImage(p[j].blob),ext=b.type==='image/png'?'png':'jpg',id=media.length+1;
        const maxW=1100000,maxH=1330000,w=Math.round(Math.min(maxW,maxH*ratio)),h=Math.round(w/ratio),x=Math.round((maxW-w)/2),y=Math.round((maxH-h)/2);
        media.push({path:`image${id}.${ext}`,blob:b});relations.push(`<Relationship Id="rId${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${id}.${ext}"/>`);
        drawings.push(`<xdr:oneCellAnchor><xdr:from><xdr:col>${j+1}</xdr:col><xdr:colOff>${x}</xdr:colOff><xdr:row>${n-1}</xdr:row><xdr:rowOff>${y}</xdr:rowOff></xdr:from><xdr:ext cx="${w}" cy="${h}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${id}" name="Visit photo ${id}"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${id}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`)
      }
      n++;
      sheetRows.push(`<row r="${n}" ht="37" customHeight="1">${cell(`A${n}`,'',8)}${TYPES.map(([kind],j)=>{const v=r.visits?.[kind];return cell(`${'BCD'[j]}${n}`,v?.date&&v?.time?`Visited on\n${reportDate(v.date)}\n${reportTime(v.time)}`:'Visited on',v?.date&&v?.time?8:9)}).join('')}</row>`);
      for(let j=0;j<TYPES.length;j++){
        const v=r.visits?.[TYPES[j][0]];
        if(v?.date&&v?.time)continue;
        const blob=await stampCrop(p[j].blob),id=media.length+1;
        media.push({path:`image${id}.jpg`,blob});relations.push(`<Relationship Id="rId${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${id}.jpg"/>`);
        drawings.push(`<xdr:oneCellAnchor><xdr:from><xdr:col>${j+1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${n-1}</xdr:row><xdr:rowOff>200000</xdr:rowOff></xdr:from><xdr:ext cx="1100000" cy="220000"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${id}" name="Visit timestamp ${id}"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${id}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`)
      }
      merges.push(`A${unitRow}:A${n}`);n++;
      }
      sheetRows.push(`<row r="${n}" ht="18" customHeight="1">${cell(`A${n}`,'Witness by Contractor (M/s Shin Khai Construction Pte Ltd)',6)}</row>`);merges.push(`A${n}:D${n}`);n++;
      sheetRows.push(`<row r="${n}" ht="24" customHeight="1">${cell(`A${n}`,'________________________',7)}${cell(`C${n}`,'________________________',7)}${cell(`D${n}`,'____________',7)}</row>`);merges.push(`A${n}:B${n}`);n++;
      sheetRows.push(`<row r="${n}" ht="14" customHeight="1">${cell(`A${n}`,'Name / Designation',7)}${cell(`C${n}`,'Signature',7)}${cell(`D${n}`,'Date',7)}</row>`);merges.push(`A${n}:B${n}`);n++;
      sheetRows.push(`<row r="${n}" ht="18" customHeight="1">${cell(`A${n}`,'Witness by Consultant',6)}</row>`);merges.push(`A${n}:D${n}`);n++;
      sheetRows.push(`<row r="${n}" ht="24" customHeight="1">${cell(`A${n}`,'________________________',7)}${cell(`C${n}`,'________________________',7)}${cell(`D${n}`,'____________',7)}</row>`);merges.push(`A${n}:B${n}`);n++;
      sheetRows.push(`<row r="${n}" ht="14" customHeight="1">${cell(`A${n}`,'Name / Designation',7)}${cell(`C${n}`,'Signature',7)}${cell(`D${n}`,'Date',7)}</row>`);merges.push(`A${n}:B${n}`);n++;
      if(g<groups.length-1)pageBreaks.push(n-1)
    }
    const types=`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`;
    zip.file('[Content_Types].xml',types);
    zip.file('_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    zip.file('xl/workbook.xml',`<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Zone ${zoneEl.value} NR Evidence" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">'Zone ${zoneEl.value} NR Evidence'!$1:$1</definedName></definedNames></workbook>`);
    zip.file('xl/_rels/workbook.xml.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    zip.file('xl/styles.xml','<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="18"/><color rgb="FFD64248"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font><font><b/><sz val="14"/><name val="Arial"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="medium"/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="10"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
    zip.file('xl/worksheets/sheet1.xml',`<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews><cols><col min="1" max="1" width="18" customWidth="1"/><col min="2" max="4" width="27" customWidth="1"/></cols><sheetData>${sheetRows.join('')}</sheetData><mergeCells count="${merges.length}">${merges.map(ref=>`<mergeCell ref="${ref}"/>`).join('')}</mergeCells><printOptions horizontalCentered="1"/><pageMargins left="0.3" right="0.3" top="0.55" bottom="0.45" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>${pageBreaks.length?`<rowBreaks count="${pageBreaks.length}" manualBreakCount="${pageBreaks.length}">${pageBreaks.map(id=>`<brk id="${id}" min="0" max="16383" man="1"/>`).join('')}</rowBreaks>`:''}<drawing r:id="rId1"/></worksheet>`);
    zip.file('xl/worksheets/_rels/sheet1.xml.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>');
    zip.file('xl/drawings/drawing1.xml',`<?xml version="1.0"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${drawings.join('')}</xdr:wsDr>`);
    zip.file('xl/drawings/_rels/drawing1.xml.rels',`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relations.join('')}</Relationships>`);
    for(const m of media)zip.file(`xl/media/${m.path}`,await m.blob.arrayBuffer());
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'});
    downloadBlob(`ELU_NR_Evidence_Zone${zoneEl.value}_${isoTodaySG()}.xlsx`,blob);toast('Zone NR Excel downloaded')
  });
})();
