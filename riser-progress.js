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
  function normaliseLabels(text){
    return String(text||'').replace(/[–—−]/g,'-').replace(/([#＃]\s*)[Oo](?=\d)/g,'$10').replace(/\b[Oo](?=\d\s*-)/g,'0').replace(/(\d{1,2})\s*[_.]\s*(?=\d{3}\b)/g,'$1-');
  }
  function labelledUnits(text,g){
    if(!g)return [];
    const result=new Set();
    for(const m of normaliseLabels(text).matchAll(/#?\s*(\d{1,2})\s*-\s*(\d{3})\b/g))if(Number(m[1])===g.floor&&g.units.includes(Number(m[2])))result.add(Number(m[2]));
    return [...result];
  }
  const matching=(text,blockHint)=>{
    const label=normaliseLabels(text);const explicit=label.match(/\b(?:blk|block)\s*[-_#:]?\s*(5\d{2})(?:[A-Z])?\b/i);
    // The unit label/reference wins over a camera location watermark. A camera
    // sometimes prints the neighbouring block (e.g. Blk 533 in the 532 set).
    const hint=Number(blockHint)||0;const block=hint||(explicit?Number(explicit[1]):0);
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
    const label=String(name).toLowerCase().replace(/\.(?:jpe?g|png|webp)$/i,'');
    if(/(?:\(l\)|\b(?:link|terminal|termination|connection)\b)/.test(label))return 'link';
    if(/(?:\(full\)|\b(?:full|overview|both.meters|meter.box.overview|whole.box)\b)/.test(label))return 'overview';
    const named=g.units.filter(unit=>new RegExp(`\\b(?:unit|meter)[ #_-]*${unit}\\b`,'i').test(label));
    if(named.length===1)return `unit-${named[0]}`;
    const units=labelledUnits(name,g);return units.length>1?'overview':units.length===1?`unit-${units[0]}`:''
  }
  async function render(){
    const nonce=++renderNonce;const saved=await photoDbAll('riserPhotos');if(nonce!==renderNonce)return;
    revoke();const groups=visibleGroups();const preview=p=>{const url=URL.createObjectURL(p.blob);urls.push(url);return `<a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${esc(p.name)}"></a>`};
    document.getElementById('riserCount').textContent=Number(zoneEl.value)===3?`${groups.length} unit groups · ${saved.filter(p=>p.groupKey&&groups.some(g=>g.key===p.groupKey)).length} matched photos`:'Floor and unit pairing reference for this zone has not been supplied yet.';
    const card=(p,g,role)=>{
      const url=p?URL.createObjectURL(p.blob):'';if(url)urls.push(url);
      const label=role==='overview'?'Meter box overview':role==='link'?'Link':`#${String(g.floor).padStart(2,'0')}-${role.slice(5)}`;
      return `<div class="riser-slot"><strong>${esc(label)}</strong>${p?`<a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${esc(label)}"></a><small>${esc(p.name)}</small>`:'<div class="riser-empty">Photo not available</div>'}<label class="riser-slot-add">${p?'Replace photo':'Add photo'}<input type="file" accept="image/jpeg,image/png,image/webp" data-riser-slot="${g.key}" data-riser-slot-role="${role}" ${p?`data-riser-replace="${esc(p.id)}"`:''}></label>${p?`<button type="button" data-riser-delete="${esc(p.id)}">Delete</button>`:''}</div>`;
    };
    groupsEl.innerHTML=groups.length?groups.map(g=>{
      const photos=saved.filter(p=>p.groupKey===g.key);
      const chosen=requiredRoles(g).map(role=>photos.filter(p=>p.role===role).sort((a,b)=>(b.manual?1:0)-(a.manual?1:0)||(b.quality||0)-(a.quality||0)||String(b.savedAt).localeCompare(String(a.savedAt)))[0]);
      const extra=photos.filter(p=>!chosen.includes(p));
      return `<section class="riser-group" data-riser-key="${g.key}"><div class="riser-group-head"><strong>${esc(display(g))}</strong><span>${chosen.filter(Boolean).length} / ${requiredRoles(g).length} photos placed</span></div><div class="riser-layout"><div class="riser-side">${['overview','link'].map((role,i)=>card(chosen[i],g,role)).join('')}</div><div class="riser-side">${g.units.map((unit,i)=>card(chosen[i+2],g,`unit-${unit}`)).join('')}</div></div>${extra.length?`<details class="riser-extras"><summary>${extra.length} other photos</summary><div class="riser-thumbs">${extra.map(p=>`<div class="riser-thumb">${preview(p)}<small>${esc(p.name)}</small><select aria-label="Photo position" data-riser-role="${esc(p.id)}">${roleOptions(g,p.role)}</select><button type="button" data-riser-delete="${esc(p.id)}">Delete</button></div>`).join('')}</div></details>`:''}</section>`
    }).join(''):'<p class="empty-state">Pairing reference is available for Zone 3. Other zones can be added from their floor and unit reference.</p>';
    const pending=saved.filter(p=>!p.groupKey&&Number(p.zone)===Number(zoneEl.value));
    pendingEl.innerHTML=pending.length?`<details><summary>${pending.length} photos could not be read clearly</summary><p>These photos have been kept separately. Clear matches are already placed in the report below.</p>${pending.map(p=>`<div class="riser-review">${preview(p)}<span>${esc(p.name)}</span><details><summary>Assign manually (optional)</summary><select data-riser-assign="${esc(p.id)}">${options()}</select></details><button type="button" data-riser-discard="${esc(p.id)}">Delete</button></div>`).join('')}</details>`:'';

  }
  window.renderRiserProgress=render;
  zoneEl.addEventListener('change',()=>{fillBlocks();staged=[];document.getElementById('riserCommit').disabled=true;render().catch(console.error)});
  blockEl.addEventListener('change',()=>{fillFloors();render().catch(console.error)});
  floorEl.addEventListener('change',()=>render().catch(console.error));
  document.getElementById('riserClearBlock').addEventListener('click',async()=>{
    const block=Number(blockEl.value),zone=Number(zoneEl.value);
    if(!block){statusEl.textContent='Select one block first, then clear its riser photos.';return}
    const photos=(await photoDbAll('riserPhotos')).filter(p=>Number(p.zone)===zone&&Number(p.block)===block);
    if(!photos.length){statusEl.textContent=`Blk ${block} has no saved riser photos.`;return}
    if(!confirm(`Delete all ${photos.length} riser photos for Blk ${block}? This will not affect other blocks or registers.`))return;
    for(const p of photos)await photoDbDelete('riserPhotos',p.id);
    staged=[];statusEl.textContent=`Cleared ${photos.length} riser photos for Blk ${block}. Other blocks were kept.`;
    await render();
  });
  async function fingerprint(bytes){const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('')}
  let ocrWorker=null;
  async function ocr(file,region='all'){
    if(!window.Tesseract){await new Promise((res,rej)=>{const s=document.createElement('script');s.src='./vendor/tesseract/tesseract.min.js';s.onload=res;s.onerror=()=>rej(new Error('Photo reading could not start. Reload and try again.'));document.head.append(s)})}
    ocrWorker=ocrWorker||await Tesseract.createWorker('eng',1,{workerPath:new URL('./vendor/tesseract/worker.min.js',location.href).href,corePath:new URL('./vendor/tesseract/tesseract-core-simd-lstm.wasm.js',location.href).href,langPath:new URL('./vendor/tesseract/',location.href).href,gzip:true});
    const image=await createImageBitmap(file);
    try{
      const canvas=document.createElement('canvas'),scale=Math.min(1,1400/image.width),cut=region==='labels'?0.84:1;
      canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*cut*scale);
      const ctx=canvas.getContext('2d');ctx.filter='contrast(1.35) grayscale(1)';ctx.drawImage(image,0,0,image.width,image.height*cut,0,0,canvas.width,canvas.height);
      await ocrWorker.setParameters({tessedit_pageseg_mode:11});
      return (await ocrWorker.recognize(canvas)).data.text||'';
    }finally{image.close()}
  }
  // Read the small dark unit plaques independently: the surrounding meter
  // serial numbers and camera address must never override a unit plaque.
  async function readUnitPlaques(blob){
    const image=await createImageBitmap(blob);const texts=[];
    try{
      const w=Math.min(540,image.width),h=Math.round(image.height*w/image.width),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,w,h);
      const data=ctx.getImageData(0,0,w,h).data,n=w*h,visited=new Uint8Array(n),queue=new Int32Array(n),boxes=[];
      const dark=i=>data[i*4]*.299+data[i*4+1]*.587+data[i*4+2]*.114<105;
      for(let i=0;i<Math.floor(n*.85);i++){
        if(visited[i]||!dark(i))continue;
        let head=0,tail=1,minX=i%w,maxX=minX,minY=Math.floor(i/w),maxY=minY;queue[0]=i;visited[i]=1;
        while(head<tail){const a=queue[head++],x=a%w,y=Math.floor(a/w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
          for(const b of [x>0?a-1:-1,x<w-1?a+1:-1,y>0?a-w:-1,y<h-1?a+w:-1])if(b>=0&&!visited[b]&&dark(b)){visited[b]=1;queue[tail++]=b}
        }
        const bw=maxX-minX+1,bh=maxY-minY+1;
        if(minX<w*.60&&bw>=w*.055&&bw<w*.30&&bh>=h*.009&&bh<h*.09&&bw/bh>1.25&&bw/bh<5&&tail/(bw*bh)>.48&&maxY<h*.85)boxes.push({x:minX,y:minY,w:bw,h:bh});
      }
      boxes.sort((a,b)=>a.y-b.y);
      // Initialise the same locally bundled worker once, then reuse it.
      if(!ocrWorker)await ocr(blob,'labels');
      await ocrWorker.setParameters({tessedit_pageseg_mode:7,tessedit_char_whitelist:'0123456789-#'});
      for(const box of boxes.slice(0,10)){
        const scale=image.width/w,pad=3,patch=document.createElement('canvas');patch.width=Math.round((box.w+pad*2)*scale*3);patch.height=Math.round((box.h+pad*2)*scale*3);
        const pc=patch.getContext('2d');pc.filter='invert(1) grayscale(1) contrast(1.2)';pc.drawImage(image,(box.x-pad)*scale,(box.y-pad)*scale,(box.w+pad*2)*scale,(box.h+pad*2)*scale,0,0,patch.width,patch.height);
        const result=(await ocrWorker.recognize(patch)).data.text||'';if(/\d{1,2}\s*-\s*\d{3}\b/.test(result))texts.push(result);
      }
      const overview=boxes.some((a,i)=>boxes.slice(i+1).some(b=>Math.abs(a.x-b.x)<Math.max(a.w,b.w)*.35&&Math.abs(a.y-b.y)>h*.18&&a.w/b.w>.65&&a.w/b.w<1.5));
      return {text:texts.join('\n'),overview};
    }finally{image.close();if(ocrWorker)await ocrWorker.setParameters({tessedit_char_whitelist:'',tessedit_pageseg_mode:11})}
  }
  async function readBlueLabels(blob){
    const image=await createImageBitmap(blob);const texts=[];
    try{
      const w=Math.min(900,image.width),h=Math.round(image.height*w/image.width),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,w,h);const data=ctx.getImageData(0,0,w,h).data,mask=new Uint8Array(w*h),rows=new Uint32Array(h);
      for(let y=0;y<h*.83;y++)for(let x=0;x<w;x++){const i=y*w+x,k=i*4,r=data[k],g=data[k+1],b=data[k+2];if(b>r+22&&b>g+10&&r<165){mask[i]=1;rows[y]++}}
      const bands=[];let start=-1,last=-1;
      for(let y=0;y<h*.83;y++){
        if(rows[y]>=3){if(start<0)start=y;last=y}
        if(start>=0&&(y-last>8||y>=Math.floor(h*.83)-1)){if(last-start>=6&&last-start<h*.09)bands.push([start,last]);start=-1}
      }
      await ocrWorker.setParameters({tessedit_pageseg_mode:7,tessedit_char_whitelist:'0123456789-#'});
      for(const [top,bottom] of bands.slice(0,8)){
        let left=w,right=0,count=0;for(let y=top;y<=bottom;y++)for(let x=0;x<w;x++)if(mask[y*w+x]){left=Math.min(left,x);right=Math.max(right,x);count++}
        const bw=right-left+1,bh=bottom-top+1;if(bw<35||bw/bh<1.6||count/(bw*bh)<.035)continue;
        const patch=document.createElement('canvas');patch.width=bw+20;patch.height=bh+20;const pc=patch.getContext('2d'),pixels=pc.createImageData(patch.width,patch.height);pixels.data.fill(255);
        for(let y=0;y<bh;y++)for(let x=0;x<bw;x++)if(mask[(top+y)*w+left+x]){const k=((y+10)*patch.width+x+10)*4;pixels.data[k]=pixels.data[k+1]=pixels.data[k+2]=0}
        pc.putImageData(pixels,0,0);const result=(await ocrWorker.recognize(patch)).data.text||'';if(/\d{1,2}\s*-\s*\d{3}\b/.test(result))texts.push(result);
      }
      return texts.join('\n');
    }finally{image.close();if(ocrWorker)await ocrWorker.setParameters({tessedit_char_whitelist:'',tessedit_pageseg_mode:11})}
  }
  async function analysePhoto(blob,name,blockHint){
    let text='',g=matching(name,blockHint),role=roleHint(name,g),warning='';
    if(!g||!role){
      try{const plaques=await readUnitPlaques(blob);text=plaques.text;g=g||matching(text,blockHint);role=role||(g&&plaques.overview?'overview':roleHint(text,g));
        if(!g||!role){const blue=await readBlueLabels(blob);text+='\n'+blue;g=g||matching(text,blockHint);role=role||(g&&plaques.overview?'overview':roleHint(text,g))}
        if(!g||!role){const more=await ocr(blob,'labels');text+='\n'+more;g=g||matching(text,blockHint);role=roleHint(name,g)||(g&&plaques.overview?'overview':roleHint(text,g))}
        if(!g){const more=await ocr(blob);text+='\n'+more;g=matching(text,blockHint);role=role||(g&&plaques.overview?'overview':roleHint(text,g))}
      }catch(error){warning=error.message||'Photo reading unavailable';console.warn('Riser photo reading',error)}
    }
    return {g,role,text,warning};
  }
  let importing=false;
  document.getElementById('riserZip').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file||importing)return;importing=true;e.target.disabled=true;staged=[];document.getElementById('riserCommit').disabled=true;
    const importZone=Number(zoneEl.value),importBlock=blockEl.value;zoneEl.disabled=blockEl.disabled=floorEl.disabled=true;
    try{
      const zip=await JSZip.loadAsync(await file.arrayBuffer());const entries=Object.values(zip.files).filter(x=>!x.dir&&fileTypes[extension(x.name)]&&!x.name.split('/').some(part=>part.startsWith('__MACOSX')));
      const size=entries.reduce((n,x)=>n+(x._data?.uncompressedSize||0),0);
      if(entries.length>600||size>600*1024*1024)throw new Error('Choose a ZIP with at most 600 photos and 600 MB of images.');
      if(!entries.length)throw new Error('No JPEG, PNG or WebP photos found in this ZIP.');
      const savedById=new Map((await photoDbAll('riserPhotos')).map(p=>[p.id,p]));let duplicates=0,placed=0,needsReview=0;const seen=new Set(),importedBlocks=new Set();let readingWarning='';
      for(let i=0;i<entries.length;i++){
        const entry=entries[i];statusEl.textContent=`Checking photo ${i+1} of ${entries.length}: ${entry.name}`;
        const bytes=await entry.async('uint8array');const id=`riser-${await fingerprint(bytes)}`;
        if(seen.has(id)){duplicates++;continue}seen.add(id);
        const blob=new Blob([bytes],{type:fileTypes[extension(entry.name)]});
        // A numbered ZIP folder is the block context even when All blocks is selected.
        const folderBlock=[file.name.replace(/\.zip$/i,''),...entry.name.split('/').slice(0,-1)].map(part=>{const m=part.match(/^(?:(?:blk|block)[ _-]*)?(5\d{2})(?:[ _-].*)?$/i);return m?Number(m[1]):0}).find(Boolean)||0;
        const blockHint=folderBlock||(importBlock==='all'?0:Number(importBlock));
        const name=entry.name.split('/').pop(),old=savedById.get(id);
        const result=await analysePhoto(blob,entry.name,blockHint);
        if(result.warning)readingWarning=result.warning;
        let group=result.g||reference.find(x=>x.key===old?.groupKey);
        if(group&&group.zone!==importZone)group=null;
        const p={...old,id,zone:group?.zone||importZone,block:group?.block||blockHint,floor:group?.floor||0,groupKey:old?.manual?old.groupKey:group?.key||'',role:old?.manual?old.role:result.role||old?.role||'',name,blob,recognisedText:result.text||old?.recognisedText||'',savedAt:old?.savedAt||new Date().toISOString()};
        if(old?.manual){p.zone=old.zone;p.block=old.block;p.floor=old.floor}
        if(p.block)importedBlocks.add(Number(p.block));
        if(old)duplicates++;
        if(p.groupKey&&p.role)placed++;else needsReview++;

        await photoDbPut('riserPhotos',p);
        savedById.set(id,p);if((i+1)%8===0)await render();
      }
      if(importedBlocks.size===1){blockEl.value=String([...importedBlocks][0]);fillFloors();floorEl.value='all'}
      statusEl.textContent=`${placed} clear photos placed automatically · ${needsReview} need checking · ${duplicates} already saved. Missing photos can be added later.${readingWarning?' Photo reading error: '+readingWarning:''}`;
      await render()
    }catch(error){console.error(error);statusEl.textContent=error.message||'ZIP could not be checked.'}
    finally{e.target.value='';e.target.disabled=false;importing=false;zoneEl.disabled=blockEl.disabled=floorEl.disabled=false}
  });
  pendingEl.addEventListener('change',async e=>{
    if(e.target.dataset.riserStageRole!=null){const p=staged[Number(e.target.dataset.riserStageRole)],g=reference.find(g=>g.key===p?.groupKey);if(p)p.role=g&&requiredRoles(g).includes(e.target.value)?e.target.value:'';return}
    if(e.target.dataset.riserStage!=null){const p=staged[Number(e.target.dataset.riserStage)],g=reference.find(g=>g.key===e.target.value);if(!p)return;p.groupKey=g?.key||'';p.block=g?.block||0;p.floor=g?.floor||0;p.role=g&&requiredRoles(g).includes(p.role)?p.role:roleHint(p.name,g);await render();return}
    if(e.target.dataset.riserAssign){const p=(await photoDbAll('riserPhotos')).find(p=>p.id===e.target.dataset.riserAssign),g=reference.find(g=>g.key===e.target.value);if(!p)return;p.groupKey=g?.key||'';p.block=g?.block||0;p.floor=g?.floor||0;p.role=roleHint(p.name,g);p.manual=true;await photoDbPut('riserPhotos',p);await render()}
  });
  pendingEl.addEventListener('click',async e=>{const id=e.target.dataset.riserDiscard;if(!id)return;await photoDbDelete('riserPhotos',id);await render()});
  document.getElementById('riserCommit').addEventListener('click',async()=>{
    const button=document.getElementById('riserCommit');button.disabled=true;
    try{for(const p of staged)await photoDbPut('riserPhotos',p);statusEl.textContent=`${staged.filter(p=>p.groupKey).length} matched and ${staged.filter(p=>!p.groupKey).length} unassigned photos saved. Review unassigned photos below.`;staged=[];await render()}
    catch(error){console.error(error);statusEl.textContent='Some photos could not be saved. Please check storage.';button.disabled=false}
  });
  groupsEl.addEventListener('change',async e=>{
    const key=e.target.dataset.riserSlot,file=e.target.files?.[0],role=e.target.dataset.riserSlotRole;if(!key||!file)return;
    const g=reference.find(g=>g.key===key);if(!g||!requiredRoles(g).includes(role))return;
    try{
      if(!Object.values(fileTypes).includes(file.type)||file.size>12*1024*1024)throw new Error('Use a JPEG, PNG or WebP photo under 12 MB.');
      const id=`riser-${await fingerprint(await file.arrayBuffer())}`,oldId=e.target.dataset.riserReplace;
      await photoDbPut('riserPhotos',{id,zone:g.zone,block:g.block,floor:g.floor,groupKey:g.key,role,name:file.name,blob:file,manual:true,savedAt:new Date().toISOString()});
      if(oldId&&oldId!==id)await photoDbDelete('riserPhotos',oldId);
      statusEl.textContent='Photo saved in its position.';await render();
    }catch(error){statusEl.textContent=error.message}
  });
  groupsEl.addEventListener('change',async e=>{const key=e.target.dataset.riserAdd,files=[...(e.target.files||[])];if(!key||!files.length)return;const g=reference.find(g=>g.key===key);if(!g)return;try{for(const file of files){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024)throw new Error('Use JPEG, PNG or WebP photos under 12 MB.');const id=`riser-${await fingerprint(await file.arrayBuffer())}`;await photoDbPut('riserPhotos',{id,zone:g.zone,block:g.block,floor:g.floor,groupKey:g.key,role:roleHint(file.name,g),name:file.name,blob:file,savedAt:new Date().toISOString()})}await render()}catch(error){statusEl.textContent=error.message}});
  groupsEl.addEventListener('change',async e=>{const id=e.target.dataset.riserRole;if(!id)return;const p=(await photoDbAll('riserPhotos')).find(p=>p.id===id),g=reference.find(g=>g.key===p?.groupKey);if(!p||!g)return;p.role=requiredRoles(g).includes(e.target.value)?e.target.value:'';p.manual=true;await photoDbPut('riserPhotos',p);await render()});
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
    const pdf=await PDFLib.PDFDocument.create();const font=await pdf.embedFont(PDFLib.StandardFonts.Helvetica),bold=await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
    const W=595.28,H=841.89,x=34,totalW=W-68,unitW=128,photoW=(totalW-unitW)/2,rowH=96;
    let page=null,y=0,previousBlock=null,rowCount=0;
    function line(x1,y1,x2,y2,width=0.8){page.drawLine({start:{x:x1,y:y1},end:{x:x2,y:y2},thickness:width,color:PDFLib.rgb(0,0,0)})}
    function center(s,f,size,x0,width,atY){page.drawText(s,{x:x0+(width-f.widthOfTextAtSize(s,size))/2,y:atY,size,font:f,color:PDFLib.rgb(0,0,0)})}
    function newPage(block){page=pdf.addPage([W,H]);rowCount=0;center(`ELECTRICAL LOAD UPGRADING WORKS (ELU) AT BLOCKS 531 - 569 ${zone===3?'PASIR RIS DRIVE 1':'PASIR RIS STREET 51'}`,bold,8,x,totalW,H-42);line(x,H-48,x+totalW,H-48);center(`BLOCK ${block}`,bold,9,x,totalW,H-61);line(x,H-66,x+totalW,H-66);line(x,H-82,x+totalW,H-82);line(x,H-82,x,H-66);line(x+unitW,H-82,x+unitW,H-66);line(x+unitW+photoW,H-82,x+unitW+photoW,H-66);line(x+totalW,H-82,x+totalW,H-66);center('Unit Details',bold,8,x,unitW,H-78);center('AFTER',bold,8,x+unitW,photoW,H-78);center('AFTER',bold,8,x+unitW+photoW,photoW,H-78);y=H-82;previousBlock=block}
    async function fit(p,box){
      if(!p){center('Photo not available',font,7,box.x,box.w,box.y+box.h/2);return}
      const img=await reportImage(pdf,p),scale=Math.min(box.w/img.width,box.h/img.height);const w=img.width*scale,h=img.height*scale;
      page.drawImage(img,{x:box.x+(box.w-w)/2,y:box.y+(box.h-h)/2,width:w,height:h})
    }
    for(const g of records){
      const photos=requiredRoles(g).map(role=>byKey.get(g.key).filter(p=>p.role===role).sort((a,b)=>(b.manual?1:0)-(a.manual?1:0)||(b.quality||0)-(a.quality||0)||String(b.savedAt).localeCompare(String(a.savedAt)))[0]);
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
