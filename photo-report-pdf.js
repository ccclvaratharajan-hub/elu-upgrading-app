(function(){
  'use strict';
  const PAGE=[595.35,841.95],LEFT=11.9,TOP=12.75,WIDTH=571.5;
  const COLUMNS=[51.6,129,195.45,195.45],HEADER=16.5,BODY=105.5,ROWS=6;
  let busy=false;
  function plain(value){return String(value??'').replace(/[\u2010-\u2015\u2212]/g,'-').replace(/\u00b7/g,' | ').replace(/[^\x20-\x7e]/g,'?');}
  function progress(button,message){if(button)button.textContent=message;const status=document.getElementById('photoPdfDownloadStatus');if(status)status.textContent=message;}
  function fitText(font,text,size,width){while(size>5.5&&font.widthOfTextAtSize(text,size)>width)size-=.25;return size;}
  function center(page,text,x,y,width,font,size=8){text=plain(text);size=fitText(font,text,size,width-5);page.drawText(text,{x:x+(width-font.widthOfTextAtSize(text,size))/2,y,font,size,color:window.PDFLib.rgb(0,0,0)});}
  function exifOrientation(bytes){
    if(bytes[0]!==255||bytes[1]!==216)return 1;
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let pos=2;
    try{while(pos+4<=bytes.length){if(bytes[pos]!==255)break;const marker=bytes[pos+1],size=view.getUint16(pos+2);if(marker===218||marker===217||size<2||pos+2+size>bytes.length)break;
      if(marker===225&&size>=16&&view.getUint32(pos+4)===0x45786966&&view.getUint16(pos+8)===0){const tiff=pos+10,little=view.getUint16(tiff)===0x4949;if(view.getUint16(tiff+2,little)!==42)return 1;const ifd=tiff+view.getUint32(tiff+4,little),count=view.getUint16(ifd,little);for(let i=0;i<count;i++){const at=ifd+2+i*12;if(at+12>pos+2+size)break;if(view.getUint16(at,little)===274){const orientation=view.getUint16(at+8,little);return orientation>=1&&orientation<=8?orientation:1;}}return 1;}
      pos+=size+2;
    }}catch(_){}return 1;
  }
  async function canvasJpeg(blob){
    let image,url,bitmap=false;
    try{
      if(typeof createImageBitmap==='function'){image=await createImageBitmap(blob,{imageOrientation:'from-image'});bitmap=true;}
      else {url=URL.createObjectURL(blob);image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Image could not be decoded'));image.src=url;});}
      const width=image.width||image.naturalWidth,height=image.height||image.naturalHeight;
      if(!width||!height)throw new Error('Image has no dimensions');
      const scale=Math.min(1,2400/Math.max(width,height)),canvas=document.createElement('canvas');canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image conversion is unavailable');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
      const converted=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Image conversion failed')),'image/jpeg',.94));return new Uint8Array(await converted.arrayBuffer());
    }finally{if(bitmap)image?.close();if(url)URL.revokeObjectURL(url);}
  }
  async function embedPhoto(pdf,photo,cache){
    if(!photo?.blob||typeof photo.blob.arrayBuffer!=='function')throw new Error('Stored photo file is missing');
    const previous=cache.get(photo.blob);if(previous)return previous;
    const bytes=new Uint8Array(await photo.blob.arrayBuffer());let image;
    if(bytes[0]===255&&bytes[1]===216){image=await pdf.embedJpg(exifOrientation(bytes)===1?bytes:await canvasJpeg(photo.blob));}
    else if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71){image=await pdf.embedPng(bytes);}
    else {image=await pdf.embedJpg(await canvasJpeg(photo.blob));}
    if(!image.width||!image.height)throw new Error('Stored photo dimensions are invalid');cache.set(photo.blob,image);return image;
  }
  function validRange(from,to){return /^\d{4}-\d{2}-\d{2}$/.test(from)&&/^\d{4}-\d{2}-\d{2}$/.test(to)&&from<=to;}
  function groupBlocks(groups){const map=new Map();for(const g of groups){const block=Number(g.block);if(!map.has(block))map.set(block,[]);map.get(block).push(g);}return [...map].sort((a,b)=>a[0]-b[0]);}
  async function buildPdf(groups,zone,from,to,onProgress=()=>{}){
    if(!groups.length)throw new Error('No stored photos in this selection');
    if(!window.PDFLib?.PDFDocument)throw new Error('PDF library is unavailable. Reload the ELU app and try again');
    const {PDFDocument,StandardFonts,rgb}=window.PDFLib,pdf=await PDFDocument.create();
    const font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold),cache=new WeakMap();
    pdf.setTitle(`ELU Photo Report | Zone ${zone} | ${from} to ${to}`);pdf.setSubject('Block-wise unit photo records');pdf.setCreator('ELU Photo Report V206');
    let pageNumber=0,completed=0;
    for(const[block,blockRows]of groupBlocks(groups))for(let offset=0;offset<blockRows.length;offset+=ROWS){
      const page=pdf.addPage(PAGE);pageNumber++;
      center(page,`ELECTRICAL LOAD UPGRADING WORKS (ELU) AT BLOCK ${block} PASIR RIS STREET 51`,LEFT,PAGE[1]-TOP-8,WIDTH,bold,9);
      center(page,`ZONE ${zone} | ${safeDate(from)} TO ${safeDate(to)}`,LEFT,PAGE[1]-TOP-20,WIDTH,font,8);
      let top=PAGE[1]-TOP-29;
      for(const row of blockRows.slice(offset,offset+ROWS)){
        const bottom=top-HEADER-BODY,xs=[LEFT];for(const width of COLUMNS)xs.push(xs.at(-1)+width);
        page.drawRectangle({x:LEFT,y:top-HEADER,width:WIDTH,height:HEADER,color:rgb(.95,.96,.97)});
        const labels=['DATE',`Blk ${block} ${row.unitDisplay||''}`,'BEFORE','AFTER'];
        labels.forEach((label,i)=>center(page,label,xs[i],top-11,COLUMNS[i],bold,8));
        const date=String(row.date).split('-'),month=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][Number(date[1])-1]||date[1];
        center(page,date[2],xs[0],bottom+BODY/2+12,COLUMNS[0],bold,11);
        center(page,month,xs[0],bottom+BODY/2-1,COLUMNS[0],font,8);
        center(page,date[0],xs[0],bottom+BODY/2-14,COLUMNS[0],font,8);
        const cells=photoReportCells(row.photos);
        for(let i=0;i<3;i++){const photo=cells[i];if(!photo)continue;
          let image;try{image=await embedPhoto(pdf,photo,cache);}catch(err){throw new Error(`Blk ${block} ${row.unitDisplay||row.unitKey}, ${row.date}: ${err.message}`);}
          const width=COLUMNS[i+1]-8,height=BODY-8,scale=Math.min(width/image.width,height/image.height),w=image.width*scale,h=image.height*scale;
          page.drawImage(image,{x:xs[i+1]+(COLUMNS[i+1]-w)/2,y:bottom+(BODY-h)/2,width:w,height:h});
        }
        page.drawRectangle({x:LEFT,y:bottom,width:WIDTH,height:HEADER+BODY,borderColor:rgb(.25,.25,.25),borderWidth:.5});
        for(const x of xs.slice(1,-1))page.drawLine({start:{x,y:bottom},end:{x,y:top},thickness:.5,color:rgb(.25,.25,.25)});
        page.drawLine({start:{x:LEFT,y:top-HEADER},end:{x:LEFT+WIDTH,y:top-HEADER},thickness:.5,color:rgb(.25,.25,.25)});
        top=bottom;completed++;onProgress(`Preparing Blk ${block}: ${completed}/${groups.length} unit-days`);
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      center(page,`Block ${block} | Page ${pageNumber}`,LEFT,14,WIDTH,font,7);
    }
    return pdf.save();
  }
  function filters(scope){const monthly=scope==='monthly';return {zone:Number(document.getElementById(monthly?'photoZone':'photoBlockReportZone').value),block:monthly?'all':document.getElementById('photoBlockReportBlock').value,from:document.getElementById(monthly?'photoReportFrom':'photoBlockReportFrom').value,to:document.getElementById(monthly?'photoReportTo':'photoBlockReportTo').value};}
  async function run(button,scope,zipMode){
    if(busy)return;const f=filters(scope);
    if(!ZONE_BLOCKS[f.zone]||!f.block||!validRange(f.from,f.to)){toast('Choose a zone, block and valid From / To dates');return;}
    if(!window.PDFLib?.PDFDocument){toast('PDF library is unavailable. Reload the ELU app');return;}
    busy=true;const buttons=[...document.querySelectorAll('[data-photo-pdf-download]')],labels=buttons.map(b=>b.textContent);buttons.forEach(b=>b.disabled=true);
    try{
      progress(button,'Reading stored photos...');
      // ZIP always includes all blocks in the chosen zone, just like the Word ZIP.
      const groups=await blockPhotoGroups(zipMode?'all':f.block,f.from,f.to,f.zone);
      if(!groups.length){toast('No stored photos in this zone and date range');progress(null,'No stored photos in this selection.');return;}
      if(zipMode){
        if(typeof JSZip==='undefined')throw new Error('ZIP library is unavailable. Reload the ELU app');
        const zip=new JSZip(),index=['Block,Unit-days,Stored photos,Report photos,PDF file'];let count=0;
        for(const block of ZONE_BLOCKS[f.zone]){const rows=groups.filter(g=>Number(g.block)===Number(block));if(!rows.length){index.push(`${block},0,0,0,`);continue;}
          const data=await buildPdf(rows,f.zone,f.from,f.to,message=>progress(button,message)),path=`Blk_${block}/ELU_Photo_Report_Blk${block}_${f.from}_to_${f.to}.pdf`;
          zip.file(path,data);index.push(`${block},${rows.length},${rows.reduce((n,g)=>n+Number(g.storedCount||g.photos.length),0)},${rows.reduce((n,g)=>n+photoReportCells(g.photos).filter(Boolean).length,0)},${path}`);count++;
        }
        zip.file('Block_PDF_Report_Index.csv','\ufeff'+index.join('\r\n')+'\r\n');progress(button,'Creating PDF ZIP...');
        const blob=await zip.generateAsync({type:'blob',compression:'STORE'});
        downloadBlob(`ELU_Photo_Report_Zone${f.zone}_Blockwise_PDF_${f.from}_to_${f.to}.zip`,blob);progress(null,`${count} separate block PDFs downloaded in one ZIP.`);toast('Separate block PDF reports downloaded');
      }else{
        const data=await buildPdf(groups,f.zone,f.from,f.to,message=>progress(button,message)),label=f.block==='all'?`Zone${f.zone}_All_Blocks`:`Blk${f.block}`;
        downloadBlob(`ELU_Photo_Report_${label}_${f.from}_to_${f.to}.pdf`,new Blob([data],{type:'application/pdf'}));progress(null,'PDF report downloaded.');toast('PDF photo report downloaded');
      }
    }catch(err){console.error(err);progress(null,'PDF download stopped: '+err.message);toast('PDF download stopped: '+err.message);}
    finally{busy=false;buttons.forEach((b,i)=>{b.disabled=false;b.textContent=labels[i];});}
  }
  function bind(id,scope,zipMode=false){const button=document.getElementById(id);if(!button)return;button.dataset.photoPdfDownload='';button.addEventListener('click',()=>run(button,scope,zipMode));}
  bind('photoDownloadPdfBtn','monthly');bind('photoBlockDownloadPdfBtn','block');bind('photoAllBlocksPdfZipBtn','block',true);
  window.__eluPhotoPdf={buildPdf,run,exifOrientation,groupBlocks};
})();
