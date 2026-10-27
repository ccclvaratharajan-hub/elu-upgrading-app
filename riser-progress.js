// Riser progress uses unit pairings from the floor reference, not physical riser labels.
(function(){
  const zoneEl=document.getElementById('riserZone');if(!zoneEl)return;
  const blockEl=document.getElementById('riserBlock'),floorEl=document.getElementById('riserFloor');
  const groupsEl=document.getElementById('riserGroups'),pendingEl=document.getElementById('riserPending'),statusEl=document.getElementById('riserImportStatus');
  const floors=(start,end)=>Array.from({length:end-start+1},(_,i)=>i+start);
  const refs={
    531:{floors:[1,3,5,7],pairs:[[294,296],[298,300],[302,304],[306,308],[310,312],[314,316],[318,320],[322,324]]},
    532:{floors:floors(2,13),pairs:[[328,330],[326,332]]},
    533:{floors:floors(2,13),pairs:[[250,256],[252,254]]},
    534:{floors:floors(2,13),forFloor(f){const result=[[272,274],[276]];if(f%2===0)result.push([268,270]);if([2,4,6,8,10].includes(f))result.push([264,266],[260,262],[258]);return result}},
    535:{floors:floors(2,13),pairs:[[278,284],[280,282]]},
    536:{floors:floors(2,13),pairs:[[288,290],[286,292]]}
  };
  const groupKey=(block,floor,units)=>`${block}|${floor}|${units.join('+')}`;
  const allGroups=()=>Object.entries(refs).flatMap(([block,ref])=>ref.floors.flatMap(floor=>(ref.forFloor?ref.forFloor(floor):ref.pairs).map(units=>({zone:3,block:Number(block),floor,units,key:groupKey(block,floor,units)}))));
  const reference=allGroups();let staged=[],urls=[],renderNonce=0;
  const revoke=()=>{urls.forEach(URL.revokeObjectURL);urls=[]};
  const visibleGroups=()=>reference.filter(g=>String(g.zone)===zoneEl.value&&(blockEl.value==='all'||String(g.block)===blockEl.value)&&(floorEl.value==='all'||String(g.floor)===floorEl.value));
  function fillBlocks(){const old=blockEl.value;blockEl.innerHTML='<option value="all">All blocks</option>'+(ZONE_BLOCKS[Number(zoneEl.value)]||[]).map(b=>`<option value="${b}">Blk ${b}</option>`).join('');blockEl.value=[...blockEl.options].some(o=>o.value===old)?old:'all';fillFloors()}
  function fillFloors(){const old=floorEl.value;floorEl.innerHTML='<option value="all">All floors</option>'+[...new Set(reference.filter(g=>String(g.zone)===zoneEl.value&&(blockEl.value==='all'||String(g.block)===blockEl.value)).map(g=>g.floor))].sort((a,b)=>a-b).map(f=>`<option value="${f}">${String(f).padStart(2,'0')}</option>`).join('');floorEl.value=[...floorEl.options].some(o=>o.value===old)?old:'all'}
  zoneEl.innerHTML=Object.keys(ZONE_BLOCKS).map(z=>`<option value="${z}">Zone ${z}</option>`).join('');zoneEl.value='3';fillBlocks();
  const display=g=>`Blk ${g.block} · #${String(g.floor).padStart(2,'0')}-${g.units.join(' & ')}`;
  const fileTypes={'jpg':'image/jpeg','jpeg':'image/jpeg','png':'image/png','webp':'image/webp'};
  const extension=name=>String(name).split('.').pop().toLowerCase();
  const matching=(text,blockHint)=>{
    const label=String(text||'').replace(/\b[Oo](?=\d{1,2}\s*[-–])/g,'0');const explicit=label.match(/\b(?:blk|block)\s*[-_#:]?\s*(5\d{2})(?:[A-Z])?\b/i);
    const hint=Number(blockHint)||0;if(hint&&explicit&&Number(explicit[1])!==hint)return null;const block=hint||(explicit?Number(explicit[1]):0);
    const found=new Set();const pattern=/#?\s*(\d{1,2})\s*[-–]\s*(\d{2,3})\b/g;
    for(const m of label.matchAll(pattern))for(const g of reference)if((!block||g.block===block)&&g.floor===Number(m[1])&&g.units.includes(Number(m[2])))found.add(g.key);
    return found.size===1?reference.find(g=>g.key===[...found][0]):null
  };
  function options(selected=''){
    return `<option value="">Choose exact floor and unit</option>`+reference.filter(g=>String(g.zone)===zoneEl.value&&(blockEl.value==='all'||String(g.block)===blockEl.value)).map(g=>`<option value="${g.key}" ${g.key===selected?'selected':''}>${esc(display(g))}</option>`).join('')
  }
  const requiredRoles=g=>['overview','link',...g.units.map(unit=>`unit-${unit}`)];
  function roleOptions(g,selected=''){
    if(!g)return '<option value="">Choose unit first</option>';
    return '<option value="">Choose photo position</option>'+[
      ['overview','Meter box overview · left'],['link','Link · left'],...g.units.map(unit=>[`unit-${unit}`,`Unit #${unit} · right`])
    ].map(([value,label])=>`<option value="${value}" ${selected===value?'selected':''}>${label}</option>`).join('')
  }
  function roleHint(name,g){
    if(!g)return '';
    const label=String(name).toLowerCase();
    if(/\b(link|terminal|termination|connection)\b/.test(label))return 'link';
    if(/\b(overview|both.meters|meter.box.overview|whole.box)\b/.test(label))return 'overview';
    const named=g.units.filter(unit=>new RegExp(`\\b(?:unit|meter)[ #_-]*${unit}\\b`,'i').test(label));
    return named.length===1?`unit-${named[0]}`:''
  }
  async function render(){
    const nonce=++renderNonce;const saved=await photoDbAll('riserPhotos');if(nonce!==renderNonce)return;
    revoke();const groups=visibleGroups();const preview=p=>{const url=URL.createObjectURL(p.blob);urls.push(url);return `<a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${esc(p.name)}"></a>`};
    document.getElementById('riserCount').textContent=Number(zoneEl.value)===3?`${groups.length} unit groups · ${saved.filter(p=>p.groupKey&&groups.some(g=>g.key===p.groupKey)).length} matched photos`:'Floor and unit pairing reference for this zone has not been supplied yet.';
    groupsEl.innerHTML=groups.length?groups.map(g=>{
      const photos=saved.filter(p=>p.groupKey===g.key).sort((a,b)=>String(a.name).localeCompare(String(b.name),undefined,{numeric:true}));
      const roles=new Set(photos.map(p=>p.role).filter(Boolean)),ready=requiredRoles(g).every(role=>roles.has(role))&&photos.length===requiredRoles(g).length;
      return `<section class="riser-group" data-riser-key="${g.key}"><div class="riser-group-head"><strong>${esc(display(g))}</strong><span>${photos.length} photos · ${ready?'PDF ready':'select exact photo positions'}</span><label>Add photos<input type="file" data-riser-add="${g.key}" accept="image/jpeg,image/png,image/webp" multiple></label></div><div class="riser-thumbs">${photos.map(p=>{const url=URL.createObjectURL(p.blob);urls.push(url);return `<div class="riser-thumb"><a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${esc(p.name)}"></a><small>${esc(p.name)}</small><select aria-label="Photo position" data-riser-role="${esc(p.id)}">${roleOptions(g,p.role)}</select><details><summary>Change unit</summary><select data-riser-move="${esc(p.id)}">${options(p.groupKey)}</select></details><button type="button" data-riser-delete="${esc(p.id)}">Delete</button></div>`}).join('')}</div></section>`
    }).join(''):'<p class="empty-state">Pairing reference is available for Zone 3. Other zones can be added from their floor and unit reference.</p>';
    const pending=saved.filter(p=>!p.groupKey&&Number(p.zone)===Number(zoneEl.value));
    pendingEl.innerHTML=(pending.length||staged.length)?`<h3>${staged.length?'Review ZIP matches before saving':'Check unassigned photos'}</h3><p>Check the unit and the photo position. Meter box overview and link go on the left; individual unit photos go on the right.</p>${pending.map(p=>`<div class="riser-review">${preview(p)}<span>${esc(p.name)}</span><select data-riser-assign="${esc(p.id)}">${options()}</select><button type="button" data-riser-discard="${esc(p.id)}">Delete</button></div>`).join('')}${staged.map((p,i)=>`<div class="riser-review">${preview(p)}<span>${esc(p.name)}</span><select data-riser-stage="${i}">${options(p.groupKey)}</select><select data-riser-stage-role="${i}">${roleOptions(reference.find(g=>g.key===p.groupKey),p.role)}</select></div>`).join('')}`:'';
  }
  window.renderRiserProgress=render;
  zoneEl.addEventListener('change',()=>{fillBlocks();staged=[];document.getElementById('riserCommit').disabled=true;render().catch(console.error)});
  blockEl.addEventListener('change',()=>{fillFloors();render().catch(console.error)});
  floorEl.addEventListener('change',()=>render().catch(console.error));
  async function fingerprint(bytes){const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('')}
  let ocrWorker=null;
  async function ocr(file){
    if(!window.Tesseract){await new Promise((res,rej)=>{const s=document.createElement('script');s.src='./vendor/tesseract/tesseract.min.js';s.onload=res;s.onerror=rej;document.head.append(s)})}
    ocrWorker=ocrWorker||await Tesseract.createWorker('eng',1,{workerPath:new URL('./vendor/tesseract/worker.min.js',location.href).href,corePath:new URL('./vendor/tesseract/',location.href).href,langPath:new URL('./vendor/tesseract/',location.href).href,gzip:true});
    await ocrWorker.setParameters({tessedit_pageseg_mode:11});return (await ocrWorker.recognize(file)).data.text||''
  }
  document.getElementById('riserZip').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;staged=[];document.getElementById('riserCommit').disabled=true;
    try{
      const zip=await JSZip.loadAsync(await file.arrayBuffer());const entries=Object.values(zip.files).filter(x=>!x.dir&&fileTypes[extension(x.name)]&&!x.name.split('/').some(part=>part.startsWith('__MACOSX')));
      const size=entries.reduce((n,x)=>n+(x._data?.uncompressedSize||0),0);
      if(entries.length>600||size>600*1024*1024)throw new Error('Choose a ZIP with at most 600 photos and 600 MB of images.');
      if(!entries.length)throw new Error('No JPEG, PNG or WebP photos found in this ZIP.');
      const savedIds=new Set((await photoDbAll('riserPhotos')).map(p=>p.id));let duplicates=0;
      for(let i=0;i<entries.length;i++){
        const entry=entries[i];statusEl.textContent=`Checking photo ${i+1} of ${entries.length}: ${entry.name}`;
        const bytes=await entry.async('uint8array');const id=`riser-${await fingerprint(bytes)}`;
        if(savedIds.has(id)||staged.some(p=>p.id===id)){duplicates++;continue}
        const blob=new Blob([bytes],{type:fileTypes[extension(entry.name)]});let g=matching(entry.name,blockEl.value);
        if(!g&&Number(zoneEl.value)===3)try{g=matching(await ocr(blob),blockEl.value)}catch(error){console.warn('Riser number reading unavailable',error)}
        if(g&&g.zone!==Number(zoneEl.value))g=null;
        staged.push({id,zone:Number(zoneEl.value),block:g?.block||Number(blockEl.value)||0,floor:g?.floor||0,groupKey:g?.key||'',role:roleHint(entry.name,g),name:entry.name.split('/').pop(),blob,savedAt:new Date().toISOString()});
      }
      statusEl.textContent=`${staged.filter(p=>p.groupKey).length} matched · ${staged.filter(p=>!p.groupKey).length} to review · ${duplicates} already saved.`;
      document.getElementById('riserCommit').disabled=!staged.length;await render()
    }catch(error){console.error(error);statusEl.textContent=error.message||'ZIP could not be checked.'}
    finally{e.target.value=''}
  });
  pendingEl.addEventListener('change',async e=>{
    if(e.target.dataset.riserStageRole!=null){const p=staged[Number(e.target.dataset.riserStageRole)],g=reference.find(g=>g.key===p?.groupKey);if(p)p.role=g&&requiredRoles(g).includes(e.target.value)?e.target.value:'';return}
    if(e.target.dataset.riserStage!=null){const p=staged[Number(e.target.dataset.riserStage)],g=reference.find(g=>g.key===e.target.value);if(!p)return;p.groupKey=g?.key||'';p.block=g?.block||0;p.floor=g?.floor||0;p.role=g&&requiredRoles(g).includes(p.role)?p.role:roleHint(p.name,g);await render();return}
    if(e.target.dataset.riserAssign){const p=(await photoDbAll('riserPhotos')).find(p=>p.id===e.target.dataset.riserAssign),g=reference.find(g=>g.key===e.target.value);if(!p)return;p.groupKey=g?.key||'';p.block=g?.block||0;p.floor=g?.floor||0;p.role=roleHint(p.name,g);await photoDbPut('riserPhotos',p);await render()}
  });
  pendingEl.addEventListener('click',async e=>{const id=e.target.dataset.riserDiscard;if(!id)return;await photoDbDelete('riserPhotos',id);await render()});
  document.getElementById('riserCommit').addEventListener('click',async()=>{
    const button=document.getElementById('riserCommit');button.disabled=true;
    try{for(const p of staged)await photoDbPut('riserPhotos',p);statusEl.textContent=`${staged.filter(p=>p.groupKey).length} matched and ${staged.filter(p=>!p.groupKey).length} unassigned photos saved. Review unassigned photos below.`;staged=[];await render()}
    catch(error){console.error(error);statusEl.textContent='Some photos could not be saved. Please check storage.';button.disabled=false}
  });
  groupsEl.addEventListener('change',async e=>{const key=e.target.dataset.riserAdd,files=[...(e.target.files||[])];if(!key||!files.length)return;const g=reference.find(g=>g.key===key);if(!g)return;try{for(const file of files){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024)throw new Error('Use JPEG, PNG or WebP photos under 12 MB.');const id=`riser-${await fingerprint(await file.arrayBuffer())}`;await photoDbPut('riserPhotos',{id,zone:g.zone,block:g.block,floor:g.floor,groupKey:g.key,role:roleHint(file.name,g),name:file.name,blob:file,savedAt:new Date().toISOString()})}await render()}catch(error){statusEl.textContent=error.message}});
  groupsEl.addEventListener('change',async e=>{const id=e.target.dataset.riserRole;if(!id)return;const p=(await photoDbAll('riserPhotos')).find(p=>p.id===id),g=reference.find(g=>g.key===p?.groupKey);if(!p||!g)return;p.role=requiredRoles(g).includes(e.target.value)?e.target.value:'';await photoDbPut('riserPhotos',p);await render()});
  groupsEl.addEventListener('change',async e=>{const id=e.target.dataset.riserMove;if(!id)return;const p=(await photoDbAll('riserPhotos')).find(p=>p.id===id),g=reference.find(g=>g.key===e.target.value);if(!p||!g)return;p.groupKey=g.key;p.zone=g.zone;p.block=g.block;p.floor=g.floor;p.role=requiredRoles(g).includes(p.role)?p.role:'';await photoDbPut('riserPhotos',p);await render()});
  groupsEl.addEventListener('click',async e=>{const id=e.target.dataset.riserDelete;if(!id)return;if(!confirm('Delete this riser photo?'))return;await photoDbDelete('riserPhotos',id);await render()});
  // PDF output follows the A4 sample: block header, unit details, two AFTER columns.
  document.getElementById('riserPdf').addEventListener('click',async()=>{
    const button=document.getElementById('riserPdf');button.disabled=true;
    try{await downloadReport()}catch(error){console.error(error);statusEl.textContent=error.message||'PDF could not be prepared.'}finally{button.disabled=false}
  });
  async function reportImage(pdf,p){
    let bytes=await p.blob.arrayBuffer();
    if(p.blob.type==='image/webp'){
      const url=URL.createObjectURL(p.blob);try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;canvas.getContext('2d').drawImage(img,0,0);const data=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!data)throw new Error('Could not convert a WebP photo.');bytes=await data.arrayBuffer()}finally{URL.revokeObjectURL(url)}
    }
    return p.blob.type==='image/jpeg'?pdf.embedJpg(bytes):pdf.embedPng(bytes)
  }
  async function downloadReport(){
    if(!window.PDFLib)throw new Error('PDF library is unavailable. Reload the app.');
    const zone=Number(zoneEl.value),blockFilter=blockEl.value;
    const saved=(await photoDbAll('riserPhotos')).filter(p=>p.groupKey&&p.zone===zone);
    const byKey=new Map();for(const p of saved){if(!byKey.has(p.groupKey))byKey.set(p.groupKey,[]);byKey.get(p.groupKey).push(p)}
    const records=reference.filter(g=>g.zone===zone&&(blockFilter==='all'||String(g.block)===blockFilter)&&byKey.has(g.key));
    if(!records.length)throw new Error('No matched photos in the selected block.');
    for(const g of records){
      const assigned=byKey.get(g.key),roles=requiredRoles(g);
      if(assigned.length!==roles.length||roles.some(role=>assigned.filter(p=>p.role===role).length!==1))throw new Error(`${display(g)}: select one Meter box overview, one Link, and one photo for each unit before PDF download.`)
    }
    const pdf=await PDFLib.PDFDocument.create();const font=await pdf.embedFont(PDFLib.StandardFonts.Helvetica),bold=await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
    const W=595.28,H=841.89,x=34,totalW=W-68,unitW=128,photoW=(totalW-unitW)/2,rowH=96;
    let page=null,y=0,previousBlock=null,rowCount=0;
    function line(x1,y1,x2,y2,width=0.8){page.drawLine({start:{x:x1,y:y1},end:{x:x2,y:y2},thickness:width,color:PDFLib.rgb(0,0,0)})}
    function center(s,f,size,x0,width,atY){page.drawText(s,{x:x0+(width-f.widthOfTextAtSize(s,size))/2,y:atY,size,font:f,color:PDFLib.rgb(0,0,0)})}
    function newPage(block){page=pdf.addPage([W,H]);rowCount=0;center(`ELECTRICAL LOAD UPGRADING WORKS (ELU) AT BLOCKS 531 - 569 ${zone===3?'PASIR RIS DRIVE 1':'PASIR RIS STREET 51'}`,bold,8,x,totalW,H-42);line(x,H-48,x+totalW,H-48);center(`BLOCK ${block}`,bold,9,x,totalW,H-61);line(x,H-66,x+totalW,H-66);line(x,H-82,x+totalW,H-82);line(x,H-82,x,H-66);line(x+unitW,H-82,x+unitW,H-66);line(x+unitW+photoW,H-82,x+unitW+photoW,H-66);line(x+totalW,H-82,x+totalW,H-66);center('Unit Details',bold,8,x,unitW,H-78);center('AFTER',bold,8,x+unitW,photoW,H-78);center('AFTER',bold,8,x+unitW+photoW,photoW,H-78);y=H-82;previousBlock=block}
    async function fit(p,box){
      const img=await reportImage(pdf,p),scale=Math.min(box.w/img.width,box.h/img.height);const w=img.width*scale,h=img.height*scale;
      page.drawImage(img,{x:box.x+(box.w-w)/2,y:box.y+(box.h-h)/2,width:w,height:h})
    }
    for(const g of records){
      const photos=requiredRoles(g).map(role=>byKey.get(g.key).find(p=>p.role===role));
      for(let start=0;start<photos.length;start+=4){
        if(!page||previousBlock!==g.block||rowCount===7)newPage(g.block);
        const chunk=photos.slice(start,start+4),bottom=y-rowH,caption=rowCount>0,headY=caption?y-12:y;
        line(x,y,x+totalW,y);line(x,bottom,x+totalW,bottom);line(x,bottom,x,y);line(x+unitW,bottom,x+unitW,y);line(x+totalW,bottom,x+totalW,y);
        const label=`#${String(g.floor).padStart(2,'0')} - ${g.units.join(' & ')}${start?' (cont.)':''}`;
        center(label,font,9,x,unitW,bottom+rowH/2);
        if(chunk.length===1){if(caption){center('AFTER',bold,8,x+unitW,totalW-unitW,headY+2);line(x+unitW,headY,x+totalW,headY)}await fit(chunk[0],{x:x+unitW+5,y:bottom+4,w:totalW-unitW-10,h:caption?rowH-18:rowH-8})}
        else{
          const split=chunk.length<=2?1:2;line(x+unitW+photoW,bottom,x+unitW+photoW,y);
          for(let side=0;side<2;side++){
            const cellX=x+unitW+side*photoW,images=chunk.slice(side*split,(side+1)*split);if(caption){center('AFTER',bold,8,cellX,photoW,headY+2);line(cellX,headY,cellX+photoW,headY)}
            for(let j=0;j<images.length;j++)await fit(images[j],{x:cellX+3+j*(photoW/images.length),y:bottom+3,w:photoW/images.length-6,h:caption?rowH-17:rowH-6})
          }
        }
        y=bottom;rowCount++
      }
    }
    const bytes=await pdf.save();const filename=`ELU_Riser_Progress_Zone${zone}_${blockFilter==='all'?'All_Blocks':`Blk${blockFilter}`}_${isoTodaySG()}.pdf`;
    downloadBlob(filename,new Blob([bytes],{type:'application/pdf'}));statusEl.textContent=`PDF ready: ${records.length} floor and unit groups across ${pdf.getPageCount()} A4 pages.`
  }
})();
