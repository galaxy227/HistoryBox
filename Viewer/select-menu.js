/* Scrollable select menus keep native select values and change events. */
(() => {
  'use strict';
  let select = null, menu = null, active = 0, prefix = '', typedAt = 0;
  function close() {
    if (select) { select.removeAttribute('aria-expanded'); select.removeAttribute('aria-controls'); }
    menu?.remove(); menu = null; select = null;
  }
  function highlight() {
    for (const row of menu.children) row.setAttribute('aria-selected', String(Number(row.dataset.index) === active));
    const row=menu.children[active];
    if(row){if(row.offsetTop<menu.scrollTop)menu.scrollTop=row.offsetTop;else if(row.offsetTop+row.offsetHeight>menu.scrollTop+menu.clientHeight)menu.scrollTop=row.offsetTop+row.offsetHeight-menu.clientHeight;menu.setAttribute('aria-activedescendant',row.id);}
  }
  function choose(index) {
    const source = select;
    if (!source || source.options[index].disabled) return;
    source.selectedIndex = index; close(); source.focus({preventScroll:true});
    source.dispatchEvent(new Event('change', {bubbles:true}));
  }
  function position() {
    if(!menu || !select)return;
    const rect=select.getBoundingClientRect();
    if(!select.isConnected || rect.bottom<0 || rect.top>innerHeight){close();return;}
    const below=innerHeight-rect.bottom-8,above=rect.top-8,height=Math.min(select.options.length,10)*36+2;
    const useBelow=below>=Math.min(height,180),space=useBelow?below:above;
    menu.style.maxHeight=Math.min(height,Math.max(38,space))+'px';
    menu.style.width=Math.min(innerWidth-16,Math.max(rect.width,220))+'px';
    menu.style.left=Math.max(8,Math.min(rect.left,innerWidth-menu.offsetWidth-8))+'px';
    menu.style.top=(useBelow?rect.bottom+4:Math.max(8,rect.top-menu.offsetHeight-4))+'px';
  }
  function open(source) {
    close(); select = source; active = Math.max(0, source.selectedIndex);
    menu = document.createElement('div'); menu.id = 'select-menu'; menu.className = 'select-menu';
    menu.setAttribute('role','listbox'); menu.tabIndex = 0;
    menu.setAttribute('aria-label', source.getAttribute('aria-label') || source.labels?.[0]?.textContent.trim() || 'Options');
    for (const [index, option] of [...source.options].entries()) {
      const row = document.createElement('div'); row.setAttribute('role','option'); row.id='select-option-'+index;
      row.dataset.index = index; row.textContent = option.text; row.title = option.text; row.setAttribute('aria-disabled',String(option.disabled));
      menu.append(row);
    }
    document.body.append(menu);
    position();
    source.setAttribute('aria-expanded','true'); source.setAttribute('aria-controls',menu.id);
    menu.focus({preventScroll:true}); highlight();
    menu.addEventListener('click', e => { const row=e.target.closest('[data-index]');if(row)choose(Number(row.dataset.index)); });
    menu.addEventListener('keydown', e => {
      if (e.key==='Escape' || e.key==='Tab') {const source=select;close();source?.focus({preventScroll:true});if(e.key==='Escape')e.preventDefault();return;}
      if (e.key==='Enter' || e.key===' ') {e.preventDefault();choose(active);return;}
      if (['ArrowDown','ArrowUp','Home','End','PageDown','PageUp'].includes(e.key)) {
        e.preventDefault();const n=select.options.length;
        active=e.key==='Home'?0:e.key==='End'?n-1:Math.max(0,Math.min(n-1,active+({ArrowDown:1,ArrowUp:-1,PageDown:10,PageUp:-10}[e.key])));
        highlight();return;
      }
      if(e.key.length===1){prefix=performance.now()-typedAt>700?'':prefix;prefix+=e.key.toLowerCase();typedAt=performance.now();const found=[...select.options].findIndex(o=>o.text.toLowerCase().startsWith(prefix));if(found>=0){active=found;highlight();}}
    });
  }
  document.addEventListener('pointerdown', e => {
    const source=e.target.closest('select');
    if(source && !source.disabled && !source.multiple){e.preventDefault();if(source===select)close();else open(source);}
    else if(menu && !menu.contains(e.target)) close();
  },true);
  document.addEventListener('click',e=>{if(e.target.closest('select'))e.preventDefault();},true);
  document.addEventListener('keydown',e=>{if(e.target.matches('select') && !e.target.disabled && ['Enter',' ','ArrowDown','ArrowUp','F4'].includes(e.key)){e.preventDefault();open(e.target);}},true);
  document.addEventListener('scroll',e=>{if(menu && e.target!==menu && !menu.contains(e.target))position();},true);
  window.addEventListener('resize',close);
  window.addEventListener('hashchange',close);
})();
