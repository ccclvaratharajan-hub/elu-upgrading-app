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
