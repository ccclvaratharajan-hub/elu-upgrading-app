/* Menu presentation only; original navigation remains in app.js. */
(()=>{
  const menu=document.getElementById('appStartMenu');
  const toggle=document.getElementById('menuCollapse');
  const search=document.getElementById('moduleSearch');
  const buttons=[...menu.querySelectorAll('.nav-item')];
  const empty=document.getElementById('moduleSearchEmpty');
  const filter=()=>{const q=search.value.trim().toLowerCase();let count=0;
    buttons.forEach(b=>{b.hidden=!b.textContent.toLowerCase().includes(q);if(!b.hidden)count++});
    empty.hidden=count>0;};
  buttons.forEach(b=>{b.title=b.textContent.trim();b.setAttribute('aria-label',b.textContent.trim())});
  toggle.addEventListener('click',()=>{
    const compact=menu.classList.toggle('is-compact');
    toggle.textContent=compact?'›':'‹';toggle.setAttribute('aria-expanded',String(!compact));
    toggle.setAttribute('aria-label',compact?'Expand menu':'Collapse menu');toggle.title=compact?'Expand menu':'Collapse menu';
    if(compact){search.value='';filter()}
  });
  search.addEventListener('input',filter);
})();

/* Read the existing report values; never change project data. */
(()=>{
  const bar=document.getElementById('dashboardCompletionBar');
  const total=document.getElementById('kpiTotalDU');
  const done=document.getElementById('kpiCompleted');
  const dial=document.querySelector('.completion-dial');
  const update=()=>{
    const n=Number(total.textContent.replace(/[^0-9]/g,''))||0;
    const d=Number(done.textContent.replace(/[^0-9]/g,''))||0;
    dial.style.setProperty('--completion',Math.max(0,Math.min(100,bar.value))+'%');
    document.getElementById('homeProgressDone').textContent=done.textContent;
    document.getElementById('homeProgressTotal').textContent=total.textContent;
    document.getElementById('homeProgressRemaining').textContent=Math.max(0,n-d).toLocaleString('en-SG');
  };
  const observer=new MutationObserver(update);
  observer.observe(bar,{attributes:true,attributeFilter:['value']});
  [total,done].forEach(el=>observer.observe(el,{childList:true,subtree:true,characterData:true}));
  update();
})();
