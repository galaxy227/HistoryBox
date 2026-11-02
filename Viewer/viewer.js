/* Shared palette for the Viewer and root loading page. */
(function () {
  'use strict';
  // EDIT PALETTE HERE: all Viewer colors are defined in this single block.
  const THEME = {
    'unknown': '#FF00FF',
    // Vibrant colors are reserved for species data.
    'human': '#4c8dcb',
    'elf': '#e0bc49',
    'orc': '#78ce45',
    'dwarf': '#cf6767',
    'other': '#A075CF',
    // Data with no species designation.
    'global-data': '#ffffff',
    'entity-data': '#e6e1d5',
    'comparison-secondary': '#858b93',
    'comparison-1': '#d0d2d4',
    'comparison-2': '#a6abb1',
    'comparison-3': '#787f88',
    'comparison-4': '#bac0c6',
    'comparison-5': '#626a75',
    'attacker-data': "#C09F6F",
    'defender-data': "#674F42",
    // Site surfaces, typography, and controls.
    // Map landforms and political boundaries.
    'terrain-deep_ocean': '#242c34', 'terrain-close_ocean': '#30414b',
    'terrain-shallow_waters': '#425965', 'terrain-pit_deep_ocean': '#192128',
    'terrain-pit_close_ocean': '#24323c', 'terrain-pit_shallow_waters': '#354750',
    'terrain-sand': '#b2a380', 'terrain-soil_low': '#626158', 'terrain-soil_high': '#716d60',
    'terrain-lava0': '#342424', 'terrain-lava1': '#50302a',
    'terrain-lava2': '#694034', 'terrain-lava3': '#82503b',
    'terrain-hills': '#858177', 'terrain-mountains': '#b6b2a7',
    'terrain-summit': '#d0cdc2', 'terrain-grey_goo': '#656975',
    // Vanilla biome ground colors; custom biome assets use unknown above.
    'biome-0': '#242c34',
    'biome-1': '#d6b27b', 'biome-2': '#91a568', 'biome-3': '#dc98bf',
    'biome-4': '#d7cb87', 'biome-5': '#65a846', 'biome-6': '#66546e',
    'biome-7': '#8bbdc8', 'biome-8': '#62b59b', 'biome-9': '#b59caf',
    'biome-10': '#b0ba8f', 'biome-11': '#69934a', 'biome-12': '#9b4a40',
    'biome-13': '#467e43', 'biome-14': '#b9b748', 'biome-15': '#b16a46',
    'biome-16': '#998298', 'biome-17': '#7a70a6', 'biome-18': '#a4c3cb',
    'biome-19': '#8c867a', 'biome-20': '#b4a55e', 'biome-21': '#68658f',
    'biome-22': '#64774d', 'biome-23': '#8e8763', 'biome-24': '#cfbf8b',
    'biome-25': '#858177', 'biome-26': '#a45465', 'biome-27': '#889549',
    'biome-28': '#bd803b', 'biome-29': '#83a7ac',
    'map-boundary': '#ffffff',
    'map-grid': '#14171b80',
    'map-label': '#000000',
    'bg': '#101113',
    'panel': '#1b1e23',
    'panel2': '#252a31',
    'line': '#3b424c',
    'text': '#f0f0ed',
    'muted': '#b0b5bd',
    'accent': '#d3d9e1',
    'neutral-card': '#c3cad3',
    'gain': "#35cda3",
    'loss': "#f47797",
    'sticky-surface': '#171a1ff5',
    'active-surface': '#363d47',
    'active-border': '#89929e',
    'heading-border': '#aeb5bf',
    'hover-surface': '#343a43',
    'inset-surface': '#171a1f',
    'tooltip-surface': '#14171bf5',
    'tooltip-border': '#69717c',
    'timeline-surface': '#111316',
    'link-hover': '#ffffff',
    // Logo, warnings, and errors.
    'logo-light': "#9ca4ad",
    'logo-dark': "#30363d",
    'logo-shadow': "#13161a",
    'warning-border': "#655a43",
    'warning-surface': "#292722",
    'warning-text': "#c1b9a9",
    'error-text': "#b39090",
    // Chart markers, overlays, highlights, and shadows.
    'selected-year': '#ffffff',
    'hover-year': '#ffffff60',
    'chart-gap': "#797d8322",
    'gap-dark': "#14171abb",
    'gap-light': "#64686e55",
    'button-glint': '#ffffff0a',
    'button-shadow': '#090f1880',
    'nav-glint': '#ffffff25',
    'nav-shadow': '#0c1522',
    'heading-glint': '#ffffff0c',
    'panel-glint': '#ffffff08',
    'shadow-soft': '#0002',
    'shadow-medium': '#0004',
    'shadow-strong': '#0008',
    'modal-backdrop': '#0009',
    'row-stripe': '#ffffff02',
    'row-hover': '#ffffff04',
    'bar-border': '#ffffff55',
    'bar-glint': '#ffffff35',
    'transparent': '#00000000',
    'print-paper': '#ffffff',
    'print-ink': '#000000',
  };
  for (const [name, value] of Object.entries(THEME)) document.documentElement.style.setProperty(`--${name}`, value);
  globalThis.HistoryBoxTheme = Object.freeze(THEME);
})();

/* Presentation and navigation. Historical calculations live in parser.js. */
(function initializeViewer() {
  'use strict';
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',initializeViewer,{once:true});return;}
  if(!document.getElementById('main'))return;
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
  function choose(index, keyboard = false) {
    const source = select;
    if (!source || source.options[index].disabled) return;
    source.selectedIndex = index; close(); if(keyboard)source.focus({preventScroll:true});
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
      if (e.key==='Enter' || e.key===' ') {e.preventDefault();choose(active,true);return;}
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
  document.addEventListener('click',e=>{if(e.target.closest('select')){e.preventDefault();e.stopPropagation();}},true);
  document.addEventListener('keydown',e=>{if(e.target.matches('select') && !e.target.disabled && ['Enter',' ','ArrowDown','ArrowUp','F4'].includes(e.key)){e.preventDefault();open(e.target);}},true);
  document.addEventListener('scroll',e=>{if(menu && e.target!==menu && !menu.contains(e.target))position();},true);
  window.addEventListener('resize',close);
  window.addEventListener('hashchange',close);
})();

  'use strict';
  const THEME = HistoryBoxTheme;
  const H = HistoryBox, $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const singular = type => ({ kingdoms: 'kingdom', villages: 'village', characters: 'character', wars: 'war', alliances: 'alliance' }[type] || type);
  const colors = { human: THEME.human, elf: THEME.elf, orc: THEME.orc, dwarf: THEME.dwarf, other: THEME.other, attacker: THEME['attacker-data'], defender: THEME['defender-data'] };
  const palette = [THEME['global-data']];
  const legendHidden = new Map(), eventViews = new Map(), timelineViews = new Map(), scrollPositions = new Map();
  const speciesColor = species => ['human','elf','orc','dwarf'].includes(species) ? colors[species] : THEME.other;
  const entityColor = (type,id) => type === 'world' ? THEME['global-data'] : (['kingdoms','villages','characters'].includes(type)?speciesColor(data?.entity(type,id)?.founding_species || data?.entity(type,id)?.species):THEME['entity-data']);
  const metricColor = metric => colors[metric] || THEME['global-data'];
  const typeLabel = type => type.charAt(0).toUpperCase() + type.slice(1);
  const labels = { characters:'Characters', tracked_characters:'Characters', species:'Species', gender:'Gender', role:'Role', level:'Level', kills:'Total kills', village_id:'Home village', capital_id:'Capital', birth_year:'Birth year', alliances_observed:'Alliances', entity_age: 'Age', population: 'Population', kingdoms: 'Kingdoms', villages: 'Villages', wars: 'Wars', alliances: 'Alliances', army: 'Army', territory: 'Territory', structures: 'Structures', food: 'Food holdings', coins: 'Coin holdings', loyalty: 'Loyalty', population_share: 'Share of global population', territory_share: 'Share of village territory', army_ratio: 'Army / population', food_per_resident: 'Food / resident', coins_per_resident: 'Coins / resident', structures_per_resident: 'Structures / resident', attacker_deaths: 'Attacker casualties', defender_deaths: 'Defender casualties', total_deaths: 'Casualties', members: 'Members', attackers: 'Attackers', defenders: 'Defenders', historical_members: 'Distinct historical members', intervals: 'Involvement intervals', rejoining: 'Members with repeated intervals', participation_changes: 'Membership changes', lifespan: 'Lifespan', owners: 'Distinct known owners', ownership_changes: 'Owner changes', distinct_wars: 'Distinct wars', distinct_alliances: 'Distinct alliances', distinct_attackers: 'Distinct attackers', distinct_defenders: 'Distinct defenders', name: 'Name', id: 'ID', founding_species: 'Founding species', start_year: 'Start year', end_year: 'End year', war_type: 'War type', instigator: 'Instigator', kingdom_id: 'Kingdom', latest_year: 'Last casualty observation' };
  function label(metric) {
    if (metric === 'wars_observed') return 'Wars';
    if (labels[metric]) return labels[metric];
    if (metric.startsWith('peak_')) return `Peak ${label(metric.slice(5)).toLowerCase()}`;
    if (metric.startsWith('latest_')) return `Latest ${label(metric.slice(7)).toLowerCase()}`;
    if (metric.endsWith('_share')) return `${label(metric.slice(0, -6))} proportion`;
    return metric.charAt(0).toUpperCase() + metric.slice(1).replaceAll('_', ' ');
  }
  const percent = m => m.endsWith('_share') || m === 'army_ratio';
  const format = (v, metric = '') => H.numeric(v) ? percent(metric) ? `${(v * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%` : v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—';
  const date = v => v == null ? '—' : String(v);
  // Unavailable values are smaller than every numeric value, in either sort direction.
  const compareValues = H.compare;
  let data = null, year = null, age = null, customWindow = false, windowStart = null, windowEnd = null, renderToken = 0;
  const requestedHash = location.hash;
  let displayedHash = location.hash;
  let lastBrowserHash = "#/browser/kingdoms";
  const pageScroll = new Map();
  const openTabs = new Map();
  history.scrollRestoration = 'manual';
  window.addEventListener('scroll', () => {
    if (data && !$('main').hidden && location.hash === displayedHash) {
      pageScroll.set(displayedHash, scrollY);
      history.replaceState({...history.state, route:displayedHash, scroll:scrollY}, '');
    }
  }, {passive:true});
  const preferences = new Map(), pages = new Map(), charts = new Map(), browserStates = new Map(), tableStates = new Map();
  let chartNumber = 0, playback = null, drag = null;
  const animated = new Set();
  let animations = true;
  let trendYears = 50;
  try { animations = localStorage.getItem('historybox-animations') !== 'false'; } catch {}
  try { const saved = Number(localStorage.getItem('historybox-trend-years')); if (Number.isInteger(saved) && saved >= 10 && saved <= 100) trendYears = saved; } catch {}
  // Parse animation tokens using the same locale as format(); dates and labels are never enrolled.
  const localeParts = new Intl.NumberFormat().formatToParts(12345.6);
  const decimalMark = localeParts.find(p => p.type === 'decimal')?.value || '.';
  const groupMark = localeParts.find(p => p.type === 'group')?.value || ',';
  function interpolateNumberText(text, progress) {
    return text.replace(/-?\d[\d.,\u00a0\u202f]*/g, token => {
      const normalized = token.split(groupMark).join('').replace(decimalMark,'.');
      const value = Number(normalized);
      if (!Number.isFinite(value)) return token;
      const places = normalized.includes('.') ? normalized.split('.')[1].length : 0;
      return (value * progress).toLocaleString(undefined,{minimumFractionDigits:places,maximumFractionDigits:places});
    });
  }
  const numberSeen = new Set(), numberRuns = new Set();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const numberObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target; numberObserver.unobserve(el);
    for (const item of el._numberEntries || []) {
      if (numberSeen.has(item.key)) continue;
      numberSeen.add(item.key);
      if (!animations || reducedMotion.matches || !item.allowAnimation) continue;
      const start = performance.now(), run = {node:item.node, text:item.text, frame:0};
      numberRuns.add(run);
      const frame = now => {
        if (!run.node.isConnected) { numberRuns.delete(run); return; }
        const fraction = Math.min(1,(now-start)/260), progress = 1-Math.pow(1-fraction,3);
        run.node.nodeValue = fraction === 1 ? run.text : interpolateNumberText(run.text, progress);
        if (fraction < 1) run.frame = requestAnimationFrame(frame); else numberRuns.delete(run);
      };
      run.frame = requestAnimationFrame(frame);
    }
  }), {threshold:0.1});
  function finishNumbers() {
    numberObserver.disconnect();
    for (const run of numberRuns) { cancelAnimationFrame(run.frame); run.node.nodeValue = run.text; }
    numberRuns.clear();
  }
  function observeNumbers(allowAnimation) {
    const walker = document.createTreeWalker($('main'),NodeFilter.SHOW_TEXT);
    const parents = new Set(); let node, index = 0;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement, text = node.nodeValue;
      if (!/\d/.test(text) || !parent.matches('[data-number],.card > strong,.value-change,.static-summary dd,.share-highlights text,.donut .total,.donut-key strong,.donut-key .tooltip-row > span:last-child,.ranking > strong,.comparison-table td:nth-child(2)') || parent.children.length) continue;
      const key = location.hash + ':' + index++ + ':' + text.replace(/-?\d[\d,.]*/g,'#');
      if (!parents.has(parent)) { parent._numberEntries = []; parents.add(parent); }
      parent._numberEntries.push({node,text,key,allowAnimation});
    }
    parents.forEach(el => numberObserver.observe(el));
  }
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    if (animations && el.dataset.animate !== 'false' && !animated.has(el.dataset.animation)) el.classList.add('chart-enter');
    animated.add(el.dataset.animation); observer.unobserve(el);
  }));
  function saveView() {
    if (!data) return;
    try { localStorage.setItem('historybox-view', JSON.stringify({ worldKey: JSON.stringify(data.world), year, age, customWindow, windowStart, windowEnd, hash: location.hash, lastBrowserHash, pageScroll:[...pageScroll], preferences: [...preferences], pages: [...pages], browserStates: [...browserStates], openTabs:[...openTabs], tableStates: [...tableStates], legends: [...legendHidden].map(([k,v]) => [k,[...v]]), speed: $('speed').value, scroll: scrollY })); } catch {}
  }
  function worldStore(value) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('historybox-viewer', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('world');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('world', value ? 'readwrite' : 'readonly');
        const op = value ? tx.objectStore('world').put(value, 'current') : tx.objectStore('world').get('current');
        tx.oncomplete = () => { resolve(op.result); db.close(); };
        tx.onerror = () => { reject(tx.error); db.close(); };
      };
    });
  }
  function stopPlayback() { clearTimeout(playback); playback = null; $('play').textContent = '▶'; $('play').setAttribute('aria-label','Play history'); $('play').setAttribute('aria-pressed','false'); }
  let pointerHeld = false;
  document.addEventListener('pointerdown',()=>{pointerHeld=true;},true);
  const releaseInteraction=()=>setTimeout(()=>{pointerHeld=false;},0);
  document.addEventListener('pointerup',releaseInteraction,true);
  document.addEventListener('pointercancel',releaseInteraction,true);
  window.addEventListener('blur',()=>{pointerHeld=false;});
  function interactionActive() {
    return pointerHeld || !!document.querySelector('#select-menu') || document.activeElement?.matches('input:not([type="range"]):not([type="checkbox"]),textarea,[contenteditable="true"]');
  }
  function play() {
    clearTimeout(playback);
    $('play').textContent = 'Ⅱ'; $('play').setAttribute('aria-label','Pause history'); $('play').setAttribute('aria-pressed','true');
    playback = setTimeout(() => {
      if(interactionActive()){play();return;}
      const ys = scopeYears();
      if (!ys.length) { stopPlayback(); return; }
      selectYear(ys[(ys.indexOf(year) + 1) % ys.length], true); play();
    }, 1000 / Number($('speed').value));
  }
  function simpleTooltip(event, text) {
    clearTimeout(tooltipHideTimer);
    const tip = $('chart-tooltip'); tip.textContent = text; tip.hidden = false;
    positionTooltip(event);
  }
  function positionTooltip(event) {
    const tip = $('chart-tooltip'), margin = 8, gap = 16;
    // Measure at the viewport origin so a previous edge position cannot constrain width.
    tip.style.left = '0px'; tip.style.top = '0px';
    tip.querySelector('.tooltip-more')?.remove();
    const rows=[...tip.querySelectorAll('.tooltip-row')];rows.forEach(r=>r.hidden=false);
    let hidden=0;const limit=Math.min(innerHeight-2*margin,parseFloat(getComputedStyle(tip).maxHeight)||innerHeight);
    if(rows.length){const more=document.createElement('div');more.className='tooltip-more';
      while(tip.scrollHeight>limit && rows.length>hidden){rows[rows.length-1-hidden++].hidden=true;more.textContent='+'+hidden+' more';if(!more.isConnected)tip.append(more);}
    }
    const box = tip.getBoundingClientRect();
    const left = event.clientX + gap + box.width <= innerWidth - margin ? event.clientX + gap : event.clientX - gap - box.width;
    const top = event.clientY - gap - box.height >= margin ? event.clientY - gap - box.height : event.clientY + gap;
    tip.style.left = Math.max(margin,Math.min(innerWidth-box.width-margin,left)) + 'px';
    tip.style.top = Math.max(margin,Math.min(innerHeight-box.height-margin,top)) + 'px';
  }
  const pref = (id, initial) => preferences.has(id) ? preferences.get(id) : initial;
  function entityIcon(type) {
    const shapes = { characters:'<circle cx="12" cy="5" r="4"/><path d="M3 23v-6c0-4 4-6 9-6s9 2 9 6v6z"/>', kingdoms: '<path d="M12 1l3.4 7 7.6 1.1-5.5 5.4 1.3 7.5-6.8-3.6-6.8 3.6 1.3-7.5L1 9.1 8.6 8z"/>', villages: '<path d="M12 1.6L24 22.4H0z"/>', wars: '<path d="M5 1l7 7 7-7 4 4-7 7 7 7-4 4-7-7-7 7-4-4 7-7-7-7z"/>', alliances: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="3"/>' };
    return '<svg class="entity-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">' + (shapes[type] || '') + '</svg>';
  }
  function link(type, id, text) {
    const entity = data.entity(type, id);
    return entity ? `<a class="entity-link" data-tip="${esc(`${date(entity.birth_year)} → ${date(entity.end_year)}`)}" style="--series:${entityColor(type, id)}" href="#/${singular(type)}/${encodeURIComponent(id)}">${entityIcon(type)}${esc(text ?? entity.name ?? `#${id}`)}</a>` : `<span title="Entity unavailable">${esc(text ?? `Unknown ${singular(type)} #${id}`)}</span>`;
  }
  function ageName(index) {
    const a = data.ages[index]; if (!a) return 'All ages';
    const peers = data.ages.filter(other => other.name === a.name).sort((a,b) => (H.boundary(a.start_year)?.lo ?? Infinity)-(H.boundary(b.start_year)?.lo ?? Infinity));
    if (peers.length < 2) return a.name;
    const n = peers.indexOf(a)+1;
    const suffix = n%100 >= 11 && n%100 <= 13 ? 'th' : ({1:'st',2:'nd',3:'rd'}[n%10] || 'th');
    return (n+suffix)+' '+a.name;
  }
  function ageLink(index, text) {
    return `<a href="#" data-tip="${esc(index === null ? `${data.years[0]} → ${data.years.at(-1)}` : `${date(data.ages[index]?.start_year)} → ${date(data.ages[index]?.end_year)}`)}" data-age="${index === null ? 'all' : index}">${esc(text ?? ageName(index))}</a>`;
  }
  function options(values, selected, labeler = label) { return values.map(v => `<option value="${esc(v)}"${String(v) === String(selected) ? ' selected' : ''}>${esc(labeler(v))}</option>`).join(''); }
  function selector(id, title, values, selected, labeler = label) { return `<label>${esc(title)}<select data-pref="${esc(id)}">${options(values, selected, labeler)}</select></label>`; }
  function section(title, body, controls = '') { return `<section class="section"><div class="section-head"><h2>${esc(title)}</h2>${controls}</div>${body}</section>`; }
  function panel(title, body, controls = '', wide = false) { return `<section class="panel${wide ? ' wide' : ''}"><div class="section-head"><h2>${esc(title)}</h2>${controls}</div>${body}</section>`; }
  function scopeYears() {
    const [lo, hi] = range();
    return data.periodYears(age).filter(y => y >= lo && y <= hi);
  }
  function rangeBounds() {
    const first = data.years[0], last = data.years.at(-1);
    if (age === null) return [first,last];
    const a = data.ages[age], start = H.boundary(a?.start_year), end = H.boundary(a?.end_year);
    const lo = Math.min(last,Math.max(first,start?.hi ?? first)), hi = Math.min(last,end?.lo ?? last);
    return [lo,Math.max(lo,hi)];
  }
  function range() {
    const [lo, hi] = rangeBounds();
    if (!customWindow) return [lo, hi];
    const clamp = (value, fallback) => Number.isFinite(value) ? Math.max(lo,Math.min(hi,Math.trunc(value))) : fallback;
    const start = clamp(windowStart,lo), end = Math.max(start,clamp(windowEnd,hi));
    return [start,end];
  }
  function syncWindow() {
    [windowStart,windowEnd] = range();
    year = data.nearest(year ?? windowStart,scopeYears());
    context(); render(false,false);
  }
  function context() {
    const years = scopeYears();
    $('year-label').textContent = year === null ? '—' : `Year ${year}`;
    $('year').min = years[0] ?? 0; $('year').max = years.at(-1) ?? 1; $('year').value = year ?? 0;
    $('year').disabled = !years.length; $('year').setAttribute('aria-valuetext', year === null ? 'No observation in this window' : `Recorded year ${year}`);
    const index = years.indexOf(year);
    $('previous').disabled = index <= 0; $('next').disabled = index < 0 || index === years.length - 1;
    $('age').value = customWindow ? 'custom' : age === null ? 'all' : String(age);
    const [lo, hi] = range();
    const bounds = rangeBounds();
    $('window-start').min = bounds[0]; $('window-start').max = hi; $('window-start').value = lo; $('window-start').disabled = !customWindow;
    $('window-end').min = lo; $('window-end').max = bounds[1]; $('window-end').value = hi; $('window-end').disabled = !customWindow;
  }
  function selectYear(value, live = false) {
    year = data.nearest(Number(value), scopeYears());
    context(); render(live, false);
  }
  function sparkline(type, id, metric) {
    const end = year, start = end === null ? null : end - trendYears + 1;
    const points = end === null ? [] : Array.from({length:trendYears}, (_, i) => ({year:start+i, value:data.snapshot(type,id,start+i)?.[metric]}));
    const values = points.map(p => p.value).filter(H.numeric), low = Math.min(0,...values), high = Math.max(0,...values), span = high-low || 1;
    let path = '', connected = false;
    for (const p of points) {
      if (!H.numeric(p.value)) { connected = false; continue; }
      const x = (p.year-start)/(trendYears-1)*100, y = 1-(p.value-low)/span;
      path += (connected ? 'L' : 'M') + x.toFixed(3) + ',' + y.toFixed(5) + ' '; connected = true;
    }
    return `<svg class="sparkline" data-trend="${metric}" data-start="${start ?? ''}" data-end="${end ?? ''}" viewBox="0 -0.05 100 1.1" preserveAspectRatio="none" aria-hidden="true"><path d="${path}" fill="none" vector-effect="non-scaling-stroke"/></svg>`;
  }
  function cards(snapshot, metrics, previous = null, previousYear = null, trend = null, group = '') {
    const baseColor = THEME['global-data'];
    const end = trend && trend.type !== 'world' ? H.boundary(data.entity(trend.type,trend.id)?.end_year) : null;
    const ended = end && year !== null && year >= end.hi;
    return `<div class="cards" data-card-group="${esc(group)}" role="group" aria-label="${esc(group)}">${metrics.map(m => {
      const v = snapshot?.[m], hasTrend = trend && m !== 'entity_age';
      const old = hasTrend && year !== null ? data.snapshot(trend.type,trend.id,year-1)?.[m] : previous?.[m];
      const delta = H.numeric(v) && H.numeric(old) ? v - old : null;
      const changeColor = delta > 0 ? THEME.gain : delta < 0 ? THEME.loss : THEME.muted;
      return `<div class="card" style="--series:${H.SPECIES.includes(m) ? colors[m] : baseColor};--trend-color:${changeColor}"><span class="metric">${esc(label(m))}</span><strong>${format(v, m)}</strong>${hasTrend ? `<small class="value-change">${delta === null ? '—' : `${delta > 0 ? '+' : ''}${format(delta,m)}${old !== 0 ? ` (${(delta / Math.abs(old) * 100).toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1})}%)` : ''}`}</small>` : '<small aria-hidden="true">&nbsp;</small>'}${hasTrend ? ended ? '<div class="trend-space" aria-hidden="true"></div>' : sparkline(trend.type,trend.id,m) : ''}</div>`;
    }).join('')}</div>`;
  }
  function snapshotCards(snapshot, type, id, previous, previousYear) {
    const quantities = ['population','army','territory','structures','food','coins'];
    const groups = type === 'characters' ? [['Character',['entity_age','level','coins','kills']]] : type === 'world' ? [
      ['Civilizations', ['kingdoms','villages','wars',...(data.hasCharacters ? ['tracked_characters'] : [])]], ['Quantities', quantities], ['Species population', H.SPECIES]
    ] : [
      ['Context', ['entity_age', ...(type === 'kingdoms' ? ['villages','wars','alliances'] : type === 'villages' ? ['loyalty'] : type === 'wars' ? ['members','attackers','defenders'] : ['members'])]],
      ['Quantities', quantities], ['Species population', H.SPECIES],
      ['Proportions', ['population_share','army_ratio', ...(type === 'alliances' ? ['territory_share'] : [])]],
      ['Per resident', ['food_per_resident','coins_per_resident','structures_per_resident']]
    ];
    return groups.map(([name,metrics]) => cards(snapshot,metrics,previous,previousYear,{type,id},name)).join('');
  }
  function staticSummary(values, groups, changes = false) {
    return '<div class="static-summary">' + groups.map(([title, metrics]) => `<section><h4>${esc(title)}</h4><dl>${metrics.map(m => `<div><dt>${esc(changes&&m==='population'?'Global':label(m))}</dt><dd${changes ? ` style="color:${values[m] > 0 ? THEME.gain : values[m] < 0 ? THEME.loss : THEME['global-data']}"` : ''}>${format(values[m],m)}</dd></div>`).join('')}</dl></section>`).join('') + '</div>';
  }
  function staticBar(value, maximum) {
    return H.numeric(value) && value >= 0 && maximum > 0 ? '<span class="static-bar" aria-hidden="true"><i style="width:'+Math.min(100,value/maximum*100)+'%"></i></span>' : '';
  }
  function lifetimeHighlights(stats, metric, color) {
    const points = [['Peak',stats.peak],['Minimum',stats.minimum],['First available',stats.first],['Latest available',stats.last]];
    // Only bounded shares represent parts of a whole; other ratios stay in the ledger.
    if ((metric.endsWith('_share') || metric === 'army_ratio') && points.every(([,p]) => !p || (p.value >= 0 && p.value <= 1))) {
      return `<div class="share-highlights" style="--series:${color}">${points.map(([title,p]) => `<figure${p ? ` data-tip-year="${p.year}" data-tip="${esc(title + ': ' + format(p.value,metric))}"` : ''}><figcaption>${title}</figcaption>${p ? `<svg viewBox="0 0 120 120" role="img" aria-label="${esc(title + ': ' + format(p.value,metric))}"><circle class="share-track" cx="60" cy="60" r="46"/><circle class="share-value" cx="60" cy="60" r="46" pathLength="100" stroke-dasharray="${p.value*100} 100" transform="rotate(-90 60 60)"/><text x="60" y="65">${format(p.value,metric)}</text></svg><button data-event-year="${p.year}">Year ${p.year}</button>` : '<p>—</p>'}</figure>`).join('')}</div>`;
    }
    return `<table class="highlight-ledger"><thead><tr><th class="year-column">Year</th><th>Record</th><th>${esc(label(metric))}</th></tr></thead><tbody>${points.map(([title,p]) => `<tr><td class="year-column">${p ? `<button data-event-year="${p.year}">${p.year}</button>` : '—'}</td><th scope="row">${title}</th><td><span data-number>${format(p?.value,metric)}</span>${staticBar(p?.value,stats.peak?.value)}</td></tr>`).join('')}</tbody></table>`;
  }
  function chart(series, metric, { stacked = false, proportions = false, inverted = false, legendControls = true, solid = true, id = '' } = {}) {
    const [lo, hi] = range(), allowed = new Set(scopeYears());
    const width = 1100, height = 330, left = 76, right = 24, top = 24, bottom = 40;
    const cid = 'chart-' + (++chartNumber);
    const chartKey = location.hash + ':' + (id || series.map(s => s.name).join('|'));
    if(legendControls&&!legendHidden.has(chartKey))legendHidden.set(chartKey,new Set(series.filter(s=>s.defaultHidden).map(s=>s.name)));
    const hidden = legendControls ? legendHidden.get(chartKey) : new Set();
    const all = series.map((s, i) => ({ ...s, index: i, color: s.color || colors[s.name.toLowerCase()] || colors[metric] || palette[0], points: s.points.filter(p => p.year >= lo && p.year <= hi && allowed.has(p.year)) }));
    const clipped = all.filter(s => !hidden.has(s.name));
    const years = scopeYears().filter(y => y >= lo && y <= hi);
    let maximum = 0, minimum = 0;
    for (const s of clipped) for (const p of s.points) if (H.numeric(p.value)) { maximum = Math.max(maximum, p.value); minimum = Math.min(minimum, p.value); }
    if (stacked) for (let i = 0; i < (clipped[0]?.points.length || 0); i++) {
      const values = clipped.map(s => s.points[i]?.value);
      if (values.every(H.numeric)) maximum = Math.max(maximum, H.sum(values));
    }
    if (proportions) { maximum = 1; minimum = 0; }
    if (inverted) { minimum = 1; maximum = Math.max(2, maximum); }
    if (maximum === minimum) maximum = minimum + 1;
    const x = y => left + (y - lo) / Math.max(1, hi - lo) * (width - left - right);
    const y = value => inverted ? top + (value - minimum) / (maximum - minimum) * (height - top - bottom) : height - bottom - (value - minimum) / (maximum - minimum) * (height - top - bottom);
    charts.set(cid, { series: clipped, all, years, lo, hi, metric, proportions, chartKey, left, right, width, height, top, bottom });
    const gaps = data.gaps.filter(([a, b]) => a < hi && b > lo).map(([a, b]) => '<rect x="' + x(Math.max(a, lo)) + '" y="' + top + '" width="' + (x(Math.min(b, hi)) - x(Math.max(a, lo))) + '" height="' + (height - top - bottom) + '" fill="' + THEME['chart-gap'] + '"/>').join('');
    const tickValues = [0, .25, .5, .75, 1].map(t => minimum + (maximum - minimum) * t);
    const grid = (inverted ? [...new Set(tickValues.map(Math.round))] : tickValues).map(v => {
      return '<line class="gridline" x1="' + left + '" x2="' + (width - right) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (left - 12) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + format(v, proportions ? 'population_share' : metric) + '</text>';
    }).join('');
    let marks = '';
    if (stacked) {
      const count = clipped[0]?.points.length || 0, stride = Math.max(1, Math.ceil(count / 650));
      const barWidth = Math.min(16, Math.max(1, (width - left - right) / Math.max(1, hi - lo + 1) * .85));
      for (let i = 0; i < count; i++) {
        if (i % stride !== 0 && i !== count - 1 && clipped[0].points[i].year !== year) continue;
        const total = H.sum(all.map(s => s.points[i]?.value));
        if (total === null || (proportions && total === 0)) continue;
        let base = 0;
        for (const s of clipped) {
          const v = proportions ? s.points[i].value / total : s.points[i].value;
          marks += '<rect data-mark="' + s.index + '" x="' + (x(s.points[i].year) - barWidth / 2) + '" y="' + y(base + v) + '" width="' + barWidth + '" height="' + Math.max(0, y(base) - y(base + v)) + '" fill="' + s.color + '"/>';
          base += v;
        }
      }
    } else for (const s of clipped) {
      let path = '', previous = null;
      for (const p of s.points) {
        if (!H.numeric(p.value)) { previous = null; continue; }
        path += (previous && p.year === previous.year + 1 ? 'L' : 'M') + x(p.year).toFixed(2) + ',' + y(p.value).toFixed(2) + ' ';
        previous = p;
      }
      const duplicateColor = clipped.filter(other => other.color === s.color).length > 1;
      const dash = !solid && duplicateColor ? ['', '8 4', '3 4', '12 4 3 4', '2 3'][s.index % 5] : '';
      marks += '<path data-mark="' + s.index + '" d="' + path + '" stroke="' + s.color + '" stroke-width="2.5" stroke-dasharray="' + dash + '" fill="none"/>';
      const stride = Math.max(1, Math.ceil(s.points.length / 350));
      s.points.forEach((p, i) => { if (H.numeric(p.value) && (i % stride === 0 || p.year === year)) marks += '<circle data-mark="' + s.index + '" cx="' + x(p.year) + '" cy="' + y(p.value) + '" r="' + (p.year === year ? 4 : 2) + '" fill="' + s.color + '"/>'; });
    }
    const selected = year !== null && year >= lo && year <= hi ? '<line class="selected" x1="' + x(year) + '" x2="' + x(year) + '" y1="' + top + '" y2="' + (height - bottom) + '"/>' : '';
    const axis = [0, .25, .5, .75, 1].map(t => { const value = Math.round(lo + (hi - lo) * t); return '<text x="' + x(value) + '" y="' + (height - 10) + '" text-anchor="middle">' + value + '</text>'; }).join('');
    const legend = all.map(s => {
      const dash = !solid && all.filter(other => other.color === s.color).length > 1 ? ['', '8 4', '3 4', '12 4 3 4', '2 3'][s.index % 5] : '';
      const sample = '<svg width="24" height="12" aria-hidden="true"><line x1="0" x2="24" y1="6" y2="6" stroke="' + s.color + '" stroke-width="3" stroke-dasharray="' + dash + '"/></svg>';
      return '<label data-key-chart="' + cid + '" data-key-series="' + s.index + '" tabindex="0">' + (legendControls && all.length > 1 ? '<input type="checkbox" data-legend="' + cid + '" data-series="' + esc(s.name) + '"' + (hidden.has(s.name) ? '' : ' checked') + '>' : '') + sample + (s.type && s.id !== undefined ? link(s.type,s.id,s.name) : references(s.name)) + '</label>';
    }).join('');
    return '<div class="chart-frame"><svg class="chart" data-chart="' + cid + '" viewBox="0 0 ' + width + ' ' + height + '">' + gaps + grid + marks + selected + axis + '<line class="hover-line" hidden y1="' + top + '" y2="' + (height - bottom) + '"/><rect class="interaction" data-plot="' + cid + '" x="' + left + '" y="' + top + '" width="' + (width - left - right) + '" height="' + (height - top - bottom) + '" tabindex="0" role="slider" aria-label="' + esc(label(metric)) + ': hover to inspect, click or use arrow keys to select a recorded year" aria-valuemin="' + lo + '" aria-valuemax="' + hi + '" aria-valuenow="' + (year ?? lo) + '"/></svg></div><div class="legend">' + (legendControls && all.length > 1 ? '<button data-all-legend="' + cid + '">' + (all.some(s=>hidden.has(s.name)) ? 'Select all' : 'Deselect all') + '</button>' : '') + legend + '</div>';
  }
  function showChartTooltip(event, plot, targetYear = null) {
    const c = charts.get(plot.dataset.plot);
    if (!c || !c.years.length) return null;
    const bounds = plot.getBoundingClientRect();
    const approximate = c.lo + Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)) * (c.hi - c.lo);
    const selected = targetYear ?? data.nearest(approximate, c.years);
    clearTimeout(tooltipHideTimer);
    const tooltip = $('chart-tooltip');
    const total = H.sum(c.all.map(s => s.points.find(p => p.year === selected)?.value));
    const rows = c.series.filter(s => Number.isFinite(s.points.find(p => p.year === selected)?.value) && (!c.proportions || total > 0)).sort((a,b) => compareValues(a.points.find(p => p.year === selected)?.value, b.points.find(p => p.year === selected)?.value, -1)).map(s => {
      const point = s.points.find(p => p.year === selected), value = point?.value;
      return '<div class="tooltip-row"><span><i class="swatch" style="--series:' + s.color + '"></i>' + esc(s.name) + (point?.from != null ? ' · '+point.from+'–'+selected : '') + '</span><strong>' + format(c.proportions ? H.ratio(value, total) : value, c.proportions ? 'population_share' : c.metric) + '</strong></div>';
    }).join('');
    const gap = data.gaps.find(([a, b]) => approximate > a && approximate < b && b - a > 1);
    tooltip.innerHTML = '<strong>Year ' + selected + '</strong>' + rows + (gap ? '<small>No observations between ' + gap[0] + ' and ' + gap[1] + '</small>' : '');
    tooltip.hidden = false;
    positionTooltip(event);
    const line = plot.parentNode.querySelector('.hover-line');
    line.removeAttribute('hidden');
    const x = c.left + ((targetYear ?? approximate) - c.lo) / Math.max(1, c.hi - c.lo) * (c.width - c.left - c.right);
    line.setAttribute('x1', x); line.setAttribute('x2', x);
    return selected;
  }
  function showTimelineTooltip(event, track) {
    const c = timelineViews.get(track.dataset.track);
    if (!c?.years.length) return null;
    const bounds = track.getBoundingClientRect();
    const approximate = c.lo + Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)) * (c.hi - c.lo);
    const selected = data.nearest(approximate, c.years);
    const intervals = c.row.intervals.filter(i => i.observed ? selected >= i.start_year && selected <= i.end_year : ['active', 'uncertain'].includes(H.intervalStatus(i, selected)));
    clearTimeout(tooltipHideTimer);
    const tooltip = $('chart-tooltip');
    tooltip.innerHTML = '<strong>Year ' + selected + '</strong><div>' + esc(c.row.name) + '</div>' + (intervals.length ? intervals.map(i => '<div>' + esc(date(i.start_year)) + ' → ' + esc(date(i.end_year)) + (i.side ? ' · ' + esc(i.side) : '') + '</div>').join('') : '');
    if (track.dataset.track.endsWith(':space')) tooltip.innerHTML = '<strong>Year ' + selected + '</strong>';
    tooltip.hidden = false;
    positionTooltip(event);
    const position = Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100)) + '%';
    track.closest('.timeline-content').querySelectorAll('.track-hover').forEach(line => { line.hidden = false; line.style.left = position; });
    return selected;
  }
  function populationPie(type, id) {
    const snapshot = data.snapshot(type, id, year), values = H.SPECIES.map(s => snapshot?.[s]);
    const total = H.sum(values);
    if (total === null || total <= 0) return '<div class="donut-layout"><p class="empty">' + (total === 0 ? '0' : '—') + '</p></div>';
    let offset = 0;
    const rings = H.SPECIES.map((s, i) => {
      const length = values[i] / total * 100;
      const ring = '<circle data-pie-mark="' + s + '" data-tip="' + esc(label(s) + ': ' + format(values[i]) + ' · ' + format(values[i] / total, 'population_share')) + '" cx="110" cy="110" r="82" pathLength="100" fill="none" stroke="' + colors[s] + '" stroke-width="32" stroke-dasharray="' + length + ' ' + (100 - length) + '" stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 110 110)"></circle>';
      offset += length; return ring;
    }).join('');
    return '<div class="donut-layout"><svg class="donut" viewBox="0 0 220 220" role="img" aria-label="Population by species, year ' + year + '">' + rings + '<text class="total" x="110" y="108">' + format(total) + '</text></svg><div class="donut-key">' + H.SPECIES.map((s, i) => '<div class="tooltip-row" data-pie-key="' + s + '" tabindex="0"><span><i class="swatch" style="--series:' + colors[s] + '"></i>' + label(s) + '</span><strong>' + format(values[i]) + '</strong><span>' + format(values[i] / total, 'population_share') + '</span></div>').join('') + '</div></div>';
  }

  function populationRanking(type,id) {
    const rows=(data.populationBreakdown(type,id,year)||[]).sort((a,b)=>compareValues(a.value,b.value,-1)||a.species.localeCompare(b.species));
    const maximum=rows[0]?.value||1;let rank=0,previous;
    return '<div class="ranking-scroll" data-scroll="population-ranking-'+type+'">'+(rows.map((row,i)=>{if(row.value!==previous)rank=i+1;previous=row.value;
      return '<div class="ranking"><span>'+rank+'. '+esc(label(row.species))+'</span><span class="ranking-bar" data-tip="'+esc('Year '+year+'\n'+label(row.species)+': '+format(row.value))+'" style="--series:'+speciesColor(row.species)+';width:'+Math.max(0,row.value/maximum*100)+'%"></span><strong>'+format(row.value)+'</strong></div>';
    }).join('')||'<p class="empty">—</p>')+'</div>';
  }
  function demographics(type, id, chartId) {
    const saved = pref(chartId+'-mode','lines'), mode = saved === 'total' ? 'lines' : saved;
    const series = H.SPECIES.map(s => ({ name:label(s),defaultHidden:s==='other',color:colors[s],points:data.series(type,id,s) }));
    if (mode === 'lines') series.unshift({name:type === 'world' ? 'Global' : 'Total',defaultHidden:true,color:THEME['global-data'],points:data.series(type,id,'population')});
    return panel('Population',mode === 'ranking' ? populationRanking(type,id) : mode === 'pie' ? populationPie(type,id) : chart(series,'population',{stacked:mode !== 'lines',proportions:mode === 'percentage',id:chartId}),selector(chartId+'-mode','View',['lines','absolute','percentage','pie','ranking'],mode,v=>({lines:'Lines',absolute:'Stacked',percentage:'Percentage',pie:'Population pie',ranking:'Ranking'}[v])));
  }

  function cell(value, field) {
    if (field === 'kingdom_id' || field === 'instigator') return value === null ? '—' : value === undefined ? '—' : link('kingdoms', value);
    if (field === 'birth_year' || field === 'start_year' || field === 'end_year') return esc(date(value));
    if (field === 'village_id' || field === 'capital_id') return value == null ? '—' : link('villages',value);
    if (field === 'founding_species' || field === 'species') return `<span class="species" style="--series:${speciesColor(value)}">${esc(value ?? '—')}</span>`;
    return H.numeric(value) ? format(value, field) : esc(value ?? '—');
  }
  function sorted(rows, field, direction) {
    return [...rows].sort((a, b) => {
      let av = a.values[field], bv = b.values[field];
      if (field === 'birth_year' || field === 'start_year' || field === 'end_year') { av = field === 'birth_year' && Number.isSafeInteger(av) ? av : H.boundary(av)?.lo ?? null; bv = field === 'birth_year' && Number.isSafeInteger(bv) ? bv : H.boundary(bv)?.lo ?? null; }
      return compareValues(av, bv, direction) || H.compare(a.entity.id, b.entity.id);
    });
  }
  function table(type, rows, columns, id, { limit = 100, selectable = false, selected = [] } = {}) {
    const state = tableStates.get(id) || { field: columns.includes('level') ? 'level' : columns.includes('peak_level') ? 'peak_level' : columns.includes('population') ? 'population' : 'name', direction: columns.includes('population') ? -1 : 1 };
    tableStates.set(id, state);
    rows = sorted(rows, state.field, state.direction);
    const maxPage = Math.max(0, Math.ceil(rows.length / limit) - 1), page = Math.min(pages.get(id) || 0, maxPage);
    pages.set(id, page);
    return `<div class="table-wrap">
<table${id.endsWith('-year') ? ' class="table-dynamic"' : ''}>
<thead>
<tr>${selectable ? '<th><button data-all-compare="' + type + '">' + (selected.length ? 'Deselect all' : 'Select all') + '</button></th>' : ''}${columns.map(c => `<th aria-sort="${state.field === c ? state.direction === 1 ? 'ascending' : 'descending' : 'none'}">
<button data-sort="${id}" data-field="${c}">${esc(label(c))}${state.field === c ? state.direction === 1 ? ' ↑' : ' ↓' : ''}</button>
</th>`).join('')}</tr>
</thead>
<tbody>${rows.slice(page * limit, (page + 1) * limit).map(r => `<tr>${selectable ? `<td>
<input type="checkbox" aria-label="Compare ${esc(r.entity.name)}" data-compare="${esc(r.entity.id)}"${selected.includes(String(r.entity.id)) ? ' checked' : ''}>
</td>` : ''}${columns.map(c => `<td${H.numeric(r.values[c]) ? ' class="number"' : ''}${H.numeric(r.values[c]) && !['id','kingdom_id','instigator','birth_year','start_year','end_year','latest_year'].includes(c) ? ' data-number' : ''}>${c === 'name' ? link(type, r.entity.id) : cell(r.values[c], c)}</td>`).join('')}</tr>`).join('') || `<tr>
<td colspan="${columns.length + (selectable ? 1 : 0)}" class="empty">No matching entities.</td>
</tr>`}</tbody>
</table>
</div>${rows.length > limit ? `<div class="pagination">
<span>${rows.length} records · page ${page + 1} of ${maxPage + 1}</span>
<button data-page="${id}" data-step="-1"${page === 0 ? ' disabled' : ''}>Previous</button>
<button data-page="${id}" data-step="1"${page === maxPage ? ' disabled' : ''}>Next</button>
</div>` : '<div class="pagination" aria-hidden="true"></div>'}`;
  }
  function overlapsWindow(interval,lo,hi) {
    const a=H.boundary(interval.start_year),b=H.boundary(interval.end_year);
    return a && (a.exact?a.lo<=hi:a.lo<hi) && (!b || (interval.observed?b.hi>=lo:b.hi>lo));
  }
  function timeline(rows, id) {
    const species = pref(`${id}-species`, '');
    rows=rows.map(r=>({...r,species:r.species || (r.type ? data.entity(r.type,r.id)?.founding_species || data.entity(r.type,r.id)?.species : null)}));
    const [lo, hi] = id === 'ages' ? [data.years[0], data.years.at(-1)] : range(), pos = n => Math.max(0, Math.min(100, (n - lo) / Math.max(1, hi - lo) * 100));
    const filtered = rows.filter(r => (id==='ages' || r.intervals.some(i=>overlapsWindow(i,lo,hi))) && (!species || r.species === species)).sort((a, b) => compareValues(H.boundary(a.intervals[0]?.start_year)?.lo, H.boundary(b.intervals[0]?.start_year)?.lo));
    const controls = rows.some(r=>r.species) ? `<div class="controls">${selector(`${id}-species`, 'Species', ['', ...data.registry.species], species, v => v ? label(v) : 'All species')}</div>` : '';
    const gaps = data.gaps.filter(([a, b]) => a < hi && b > lo).map(([a, b]) => `<span class="time-gap" style="left:${pos(a)}%;width:${pos(b) - pos(a)}%" aria-label="No observations between ${a} and ${b}"></span>`).join('');
    const content = filtered.map((r, index) => {
      const trackId = id + ":" + index;
      timelineViews.set(trackId, { row: r, lo, hi, years: (id === 'ages' ? data.years : scopeYears()).filter(y => y >= lo && y <= hi) });
      const bars = r.intervals.map(interval => {
        const a = H.boundary(interval.start_year), b = H.boundary(interval.end_year), end = b?.hi ?? hi;
        if (!overlapsWindow(interval,lo,hi)) return '';
        const color = (r.type ? entityColor(r.type, r.id) : null) || palette[0];
        const active = id === 'ages' ? year !== null && H.intervalStatus(interval, year) === 'active' : interval.observed ? year >= a.lo && year <= end : id.startsWith('life-') ? !!data.observed(r.type, r.id, year) : H.intervalStatus(interval, year) === 'active';
        const title = `${r.name}: ${date(interval.start_year)} → ${date(interval.end_year)}${interval.side ? ` · ${interval.side}` : ''}${interval.observed ? ' · observed ownership only' : ''}`;
        return `<span class="interval${active ? ' active' : ''}${interval.end_year === null ? ' open' : ''}" style="--series:${color};left:${Math.min(99.75,pos(a.hi))}%;width:${Math.max(.25, pos(b?.lo ?? hi) - pos(a.hi))}%" aria-label="${esc(title)}"></span>${[a, b].filter(v => v && !v.exact).map(v => `<span class="interval uncertain" style="--series:${color};left:${pos(v.lo)}%;width:${pos(v.hi) - pos(v.lo)}%" aria-label="${esc(title)} · uncertain boundary"></span>`).join('')}`;
      }).join('');
      return `<div class="timeline-row"><span>${id === 'ages' ? ageLink(r.id, r.name) : r.role ? esc(label(r.role)) + (r.id == null ? '' : ' of ' + link(r.type,r.id)) : r.type ? link(r.type, r.id, r.name) : esc(r.name)}</span><div class="timeline-track" data-track="${trackId}" tabindex="0" role="slider" aria-label="${esc(r.name)} year" aria-valuemin="${lo}" aria-valuemax="${hi}" aria-valuenow="${year ?? lo}">${bars}${gaps}<span class="track-hover" hidden></span>${year !== null ? `<span class="year-marker" style="left:${pos(year)}%"></span>` : ''}</div></div>`;
    }).join('');
    const spaceId = id + ':space';
    timelineViews.set(spaceId, { row: { name: 'Year', intervals: [] }, lo, hi, years: (id === 'ages' ? data.years : scopeYears()).filter(y => y >= lo && y <= hi) });
    const space = `<div class="timeline-row timeline-space"><span></span><div class="timeline-track" data-track="${spaceId}" aria-label="Select year in timeline" tabindex="0" role="slider" aria-valuemin="${lo}" aria-valuemax="${hi}" aria-valuenow="${year ?? lo}">${gaps}<span class="track-hover" hidden></span>${year !== null ? `<span class="year-marker" style="left:${pos(year)}%"></span>` : ''}</div></div>`;
    return `${controls}<div class="axis"><span>${lo}</span><span>${hi}</span></div><div class="timeline-scroll" data-scroll="${id}"><div class="timeline-content">${content}${space}</div></div>`;
  }
  function rankings(type, metric, ids = null) {
    const rows = data.rankings(type, year, metric).filter(r=>!ids || ids.has(String(r.entity.id)));
    rows.sort((a,b)=>compareValues(a.value,b.value,-1));
    const max=rows[0]?.value||1;
    let rank=0, previous;
    const ranked = rows.map((r,i)=>{if(r.value!==previous)rank=i+1;previous=r.value;return {...r,rank};});
    return '<div class="ranking-scroll" data-scroll="ranking-' + type + '">' + (ranked.map(r => `<div class="ranking"><span>${r.rank}. ${r.entity.id==null?'Global':link(type, r.entity.id)}</span><span class="ranking-bar" data-tip="${esc(r.entity.name + ': ' + format(r.value, metric))}" style="--series:${r.entity.id==null?THEME['global-data']:entityColor(type,r.entity.id)};width:${Math.max(0, r.value / max * 100)}%"></span><strong>${format(r.value, metric)}</strong></div>`).join('') || '<p class="empty">—</p>') + '</div>';
  }
  let namedEntities = [];
  function references(text, primary = null) {
    const names = namedEntities.filter(e => text.includes(e.name));
    if (primary?.name) { const i = names.findIndex(e => e.name === primary.name); if (i >= 0) names.splice(i,1); names.push(primary); }
    names.sort((a,b) => b.name.length - a.name.length);
    let result = '', at = 0;
    while (at < text.length) {
      const match = names.find(e => text.startsWith(e.name,at) && (at === 0 || !/[\p{L}\p{N}_]/u.test(text[at-1])) && (at + e.name.length === text.length || !/[\p{L}\p{N}_]/u.test(text[at+e.name.length])));
      if (match) { result += link(match.type,match.id,match.name); at += match.name.length; }
      else { result += esc(text[at]); at++; }
    }
    return result;
  }
  function eventText(e) {
    if(e.parts)return e.parts.map(part=>typeof part==='string'?esc(part):link(part.type,part.id,part.text)).join('');
    const entity = e.type && data.entity(e.type,e.id);
    const text = e.text;
    return references(text, entity ? {...entity,type:e.type} : null);
  }
  const milestoneIcons = {
    war: ['War recorded', '<path d="M5 3l14 14m-2-2l-4 4m4-4l4 6M19 3L5 17m2-2l4 4m-4-4l-4 6M5 3l1 5 3-3M19 3l-1 5-3-3"/>'],
    peace: ['War ended', '<path d="M3 17l5-4-3-8c5 1 7 4 8 7l3-3c2-2 5-1 5 1l2 1-3 1c-1 6-7 9-12 6l-5 1z"/><path d="M12 17l4 3m-2-1l4-1"/>'],
    beginning: ['First observation', '<path d="M5 21V3m0 1c5-4 8 4 14 0v9c-6 4-9-4-14 0"/>'],
    ending: ['Recorded ending', '<path d="M5 21V10a7 7 0 0114 0v11M3 21h18M9 10h6m-6 4h6"/>'],
    ownership: ['Ownership change', '<path d="M3 7h17l-4-4m4 4l-4 4M21 17H4l4-4m-4 4l4 4"/>'],
    joining: ['Participation began', '<path d="M10 8l3-3a5 5 0 017 7l-3 3M14 16l-3 3a5 5 0 01-7-7l3-3m1 7l8-8"/>'],
    leaving: ['Participation ended', '<path d="M13 5a5 5 0 017 7l-3 3M11 19a5 5 0 01-7-7l3-3M3 3l18 18M3 8V3h5m8 18h5v-5"/>'],
    record: ['Historical record', '<path d="M6 3h12v18H6zM9 7h6m-6 5h6m-6 5h4"/>']
  };
  function milestoneKind(event) {
    const text = event.text;
    if (/:.*(?:owner changed|ownership (?:entered|left))/.test(text)) return 'ownership';
    if (/joined|first observed participating/.test(text)) return 'joining';
    if (/left|no longer observed participating/.test(text)) return 'leaving';
    if (/: (?:ended|no longer observed)$/.test(text)) return event.type === 'wars' ? 'peace' : 'ending';
    if (/: first observed$/.test(text)) return event.type === 'wars' ? 'war' : 'beginning';
    return 'record';
  }
  function milestoneIcon(event) {
    const kind = milestoneKind(event), [name, drawing] = milestoneIcons[kind];
    return '<svg class="milestone-icon" data-milestone-kind="' + kind + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="' + name + '"><title>' + name + '</title>' + drawing + '</svg>';
  }
  function eventRows(list, start, end) {
    return list.slice(start, end).map(e => '<li>' + milestoneIcon(e) + '<button data-year="' + e.year + '">' + e.year + '</button><span tabindex="0">' + eventText(e) + '</span></li>').join('');
  }
  function paintEvents(element) {
    const list = eventViews.get(element.dataset.events) || [], rowHeight = 92;
    if (!list.length) { element.innerHTML = '<li class="empty">No events in this period.</li>'; return; }
    const start = Math.max(0, Math.floor(element.scrollTop / rowHeight) - 5), end = Math.min(list.length, start + 25);
    if (element.dataset.start === String(start)) return;
    element.dataset.start = start;
    element.innerHTML = '<li class="event-spacer" aria-hidden="true" style="height:' + start * rowHeight + 'px"></li>' + eventRows(list, start, end) + '<li class="event-spacer" aria-hidden="true" style="height:' + (list.length - end) * rowHeight + 'px"></li>';
  }
  function events(type = null, id = null) {
    const [lo, hi] = range(), pid = 'events-' + type + '-' + id;
    const list = data.milestones(type, id).filter(e => e.year >= lo && e.year <= hi && (age === null || H.intervalStatus(data.ages[age],e.year) === 'active')).reverse();
    eventViews.set(pid, list);
    return '<ul class="events" data-events="' + pid + '" data-event-range="' + lo + ':' + hi + ':' + age + '" tabindex="0" aria-label="Historical events">' + (list.length ? '' : '<li>No events in this period.</li>') + '</ul>';
  }

  function overview() {
    const snapshot = data.snapshot('world', '', year), previousYear = data.years[data.yearIndex.get(year) - 1], previous = data.snapshot('world', '', previousYear);
    let ageContent = '';
    {
      const stats = data.period(age,scopeYears(),range()), a = {start_year:range()[0],end_year:range()[1]};
      const periodCards = stats.changes;
      ageContent = section('Summary', `<div class="panel age-analysis">
<h3 class="age-title">${customWindow ? 'Custom' : esc(ageName(age))} <span>· ${esc(date(a.start_year))} → ${esc(date(a.end_year))}</span></h3>${stats.years.length ? staticSummary(periodCards, [['Population change', ['population',...H.SPECIES]]], true) + staticSummary(stats.recorded,[['Entities recorded',H.TYPES]]) + staticSummary(stats.ended,[['Entities ended',H.TYPES]]) : '<p class="warning">No observations in this window.</p>'}

</div>`);
    }
    const observationMetric = worldMetrics.includes(pref('world-observations-metric','army')) ? pref('world-observations-metric','army') : 'army';
    const observations = panel('Historical observations',chart([{name:label(observationMetric),points:worldSeries(observationMetric)}],observationMetric),selector('world-observations-metric','Measure',worldMetrics,observationMetric));
    return `<div class="page-head">
<div>

<h1>World overview</h1>

</div>

</div>${year === null ? '<p class="warning">Selected age has no confident observations. Snapshot values are unavailable.</p>' : ''}${section('Snapshot', snapshotCards(snapshot, 'world', '', previous, previousYear))}${ageContent}${section('Statistics', `<div class="grid">${demographics('world', '', 'world-species')}${observations}</div>`)}${section('Chronology', `<div class="grid">${panel('Ages',timeline(data.ages.map((a,i)=>({name:ageName(i),intervals:[a],id:i})), 'ages'))}${['kingdoms','villages','wars','alliances'].map(t => panel(typeLabel(t),timeline(data.catalog(t).map(e=>({name:e.name || `#${e.id}`,id:e.id,type:t,species:e.founding_species||e.species,intervals:[e]})),`life-${t}`))).join('')}</div>`)}${section('Historical milestones', `<div class="panel">${events()}</div>`)}`;
  }
  const populationMetrics = ['population',...H.SPECIES];
  const commonMetrics = [...populationMetrics, 'army', 'territory', 'structures', 'food', 'coins', 'population_share', 'army_ratio', 'food_per_resident', 'coins_per_resident', 'structures_per_resident'];
  const warMetrics = ['total_deaths','attacker_deaths','defender_deaths','attackers','defenders'];
  const standardMetrics = type => type === 'characters' ? ['level','coins','kills'] : [...commonMetrics, 'tracked_characters', ...(type === 'villages' ? ['loyalty'] : type === 'kingdoms' ? ['villages'] : ['members']), ...(type === 'alliances' ? ['territory_share'] : [])];
  const observationMetrics = type => [...standardMetrics(type).filter(m=>!populationMetrics.includes(m)), ...(type === 'wars' ? ['total_deaths','attackers','defenders'] : [])];
  const worldMetrics = [...commonMetrics.filter(m=>!populationMetrics.includes(m) && m !== 'population_share'),'kingdoms','villages','wars','tracked_characters','total_deaths'];
  const worldSeries = metric => metric.endsWith('_deaths') ? data.casualtySeries(metric) : data.series('world','',metric);
  const metricsFor = type => [...standardMetrics(type), ...(type === 'wars' ? warMetrics : [])];
  function entityAge(entity) { return H.age(entity,year); }
  function entityDuration(type,id) {
    const observed=type==='alliances' ? data.years.filter(y=>data.snapshot(type,id,y)) : data.history(type,id).map(p=>p.year), end=H.boundary(data.entity(type,id)?.end_year);
    return observed.length ? [observed[0],Math.min(data.years.at(-1),Math.max(observed.at(-1),end?.hi ?? observed.at(-1)))] : null;
  }
  function entityPage(type, id) {
    const durationWindow = entityDuration(type,id);
    const entity = data.entity(type, id);
    if (!entity) return '<h1>Record not found</h1><p>This entity is not in the loaded metadata.</p><a href="#/overview">Return to overview</a>';
    const snapshot = data.snapshot(type, id, year), previousYear = data.years[data.yearIndex.get(year) - 1], previous = data.snapshot(type, id, previousYear);
    const metrics = standardMetrics(type);
    const summary = data.summary(type, id);
    const intervals = [], relationshipRecords = [];
    if (type === 'wars' || type === 'alliances') {
      for (const member of entity.kingdoms || []) {
        intervals.push({ name: data.entity('kingdoms', member.kingdom_id)?.name || `Unknown kingdom #${member.kingdom_id}`, type: 'kingdoms', id: member.kingdom_id, intervals: member.involvement || [] });
        for (const interval of member.involvement || []) relationshipRecords.push({ type: 'kingdoms', id: member.kingdom_id, ...interval });
      }
    } else if (type === 'kingdoms') {
      for (const relation of data.relations(id)) {
        intervals.push({ name: relation.entity.name, type: relation.type, id: relation.entity.id, intervals: relation.member.involvement || [] });
        for (const interval of relation.member.involvement || []) relationshipRecords.push({ type: relation.type, id: relation.entity.id, ...interval });
      }
    }
    let ownership = '';
    if (type === 'villages') {
      const history = data.ownership(id);
      const owners = new Map();
      for (const run of history.runs) {
        const key = run.owner === null ? null : String(run.owner);
        if (!owners.has(key)) owners.set(key, { name: run.owner === null ? '—' : data.entity('kingdoms', run.owner)?.name || `Unknown kingdom #${run.owner}`, type: run.owner === null ? null : 'kingdoms', id: run.owner, intervals: [] });
        owners.get(key).intervals.push(run);
      }
      ownership = panel('Kingdoms',timeline([...owners.values()], 'ownership'));
    } else if (type === 'kingdoms') {
      const rows = data.catalog('villages').flatMap(v => { const runs = data.ownership(v.id).runs.filter(r => String(r.owner) === String(id)); return runs.length ? [{ name: v.name, id: v.id, type: 'villages', species: v.founding_species, intervals: runs }] : []; });
      ownership = panel('Villages',timeline(rows, 'owned-villages'));
    }
    const relationshipPanel = (title, rows, records, chartId) => panel(title,timeline(rows,chartId));
    const relations = type === 'kingdoms'
      ? ['wars','alliances'].map(t => relationshipPanel(typeLabel(t), intervals.filter(r => r.type === t), relationshipRecords.filter(r => r.type === t), 'involvement-' + t)).join('')
      : intervals.length ? relationshipPanel('Kingdoms', intervals, relationshipRecords, 'involvement') : '';
    const highlightMetric = metrics.includes(pref(`entity-highlight-${type}`,type === 'characters' ? 'level' : 'population')) ? pref(`entity-highlight-${type}`,type === 'characters' ? 'level' : 'population') : metrics[0], stats = data.stats(type, id, highlightMetric);
    const historical = `<div class="panel"><div class="controls">${selector(`entity-highlight-${type}`, 'Measure', metrics, highlightMetric)}</div>${lifetimeHighlights(stats, highlightMetric, metricColor(highlightMetric))}</div>`;
    const chartId = `entity-${type}`, observationOptions = observationMetrics(type), historicalMetric = observationOptions.includes(pref(`${chartId}-metric`,type === 'characters' ? 'level' : 'army')) ? pref(`${chartId}-metric`,type === 'characters' ? 'level' : 'army') : observationOptions[0];
    const observationSeries = [{name:type === 'wars' ? 'Total' : entity.name,defaultHidden:type==='wars',type,id,color:type==='wars' && historicalMetric.startsWith('attacker')?colors.attacker:type==='wars' && historicalMetric.startsWith('defender')?colors.defender:entityColor(type,id),points:data.series(type,id,historicalMetric)}];
    if(type === 'wars' && (!warMetrics.includes(historicalMetric) || historicalMetric==='total_deaths')) for(const side of ['attacker','defender']) observationSeries.push({name:typeLabel(side+'s'),color:colors[side],points:historicalMetric==='total_deaths'?data.series(type,id,side+'_deaths'):data.warSideSeries(id,side,historicalMetric)});
    observationSeries.push({name:`Global ${singular(type)} average`,defaultHidden:true,color:THEME['global-data'],points:data.averageSeries(type,historicalMetric)});
    const baseCharts = panel('Historical observations',chart(observationSeries,historicalMetric,{id:'entity-observations-'+type}),selector(`${chartId}-metric`,'Measure',observationOptions,historicalMetric));
    const secondary = type === 'characters' ? '' : demographics(type,id,`entity-${type}-species`);
    const characterSections = type === 'characters' ? characterHistory(id) : {chronology:'',family:''};
    if (type === 'kingdoms' || type === 'villages') ownership += leadershipHistory(type,id);
    return `<div class="page-head entity-record" style="--record-color:${entityColor(type,id)}">
<div>
<p class="eyebrow">${singular(type).toUpperCase()} RECORD</p>
<h1>${esc(entity.name ?? '—')}</h1>
<dl class="definition">
<div>
<dt>Birth year</dt>
<dd>${esc(date(entity.birth_year))}</dd>
</div>
<div>
<dt>End year</dt>
<dd>${esc(date(entity.end_year))}</dd>
</div>
<div>
<dt>Lifespan</dt>
<dd data-number>${H.lifespan(entity) === null ? '—' : format(H.lifespan(entity)) + ' years'}</dd>
</div>${type === 'characters' ? `<div><dt>Species</dt><dd>${cell(entity.species,'species')}</dd></div><div><dt>Gender</dt><dd>${esc(entity.gender ?? '—')}</dd></div>` : ''}${entity.founding_species ? `<div>
<dt>Founding species</dt>
<dd>${cell(entity.founding_species, 'founding_species')}</dd>
</div>` : ''}${type === 'wars' ? `<div>
<dt>War type</dt>
<dd>${esc(entity.war_type ?? '—')}</dd>
</div>
<div>
<dt>Instigator</dt>
<dd>${cell(entity.instigator, 'instigator')}</dd>
</div>` : ''}</dl><div class="controls"><button data-entity-window="${esc(id)}" data-entity-type="${type}">View duration</button>${durationWindow ? `<span class="muted">${durationWindow.join(' → ')}</span>` : ''}</div><div class="controls">${data.overlappingAges(type, id).map(a => `<span class="pill">${ageLink(data.ages.indexOf(a), ageName(data.ages.indexOf(a)))}</span>`).join('')}</div>
</div>

</div>${snapshot?.complete === false ? '<p class="warning">Some relationships could not be confirmed. See Data notes.</p>' : ''}${section('Snapshot', snapshotAssociations(type,id,snapshot) + snapshotCards({ ...snapshot, entity_age: snapshot ? entityAge(entity) : null }, type, id, previous, previousYear) + (type === 'wars' ? warParticipants(id) : type==='alliances'?allianceParticipants(id):''))}${section('Highlights', historical)}${section('Statistics',`<div class="grid">${secondary}${baseCharts}</div>`)}${section('Chronology',`<div class="grid">${characterSections.chronology}${ownership}${relations}</div>`)}${characterSections.family}${section('Historical milestones', `<div class="panel">${events(type, id)}</div>`)}`;
  }
  function allianceParticipants(id) {
    const members=data.memberships('alliances',id,year).filter(m=>m.status==='active');
    return panel('Participants','<div class="participant-tables alliance-participants"><div class="table-wrap war-participants"><table aria-label="Participants"><thead><tr><th>Kingdom</th></tr></thead><tbody>'+(members.map(m=>'<tr><td>'+link('kingdoms',m.id)+'</td></tr>').join('')||'<tr><td>—</td></tr>')+'</tbody></table></div></div>');
  }
  function warParticipants(id) {
    const members=data.memberships('wars',id,year).filter(m=>m.status==='active');
    return panel('Participants','<div class="participant-tables">'+['attacker','defender'].map(side=>'<div class="table-wrap war-participants"><table aria-label="'+label(side+'s')+'"><thead><tr><th>'+label(side+'s')+'</th></tr></thead><tbody>'+(members.filter(m=>m.side===side).map(m=>'<tr><td>'+link('kingdoms',m.id)+'</td></tr>').join('')||'<tr><td>—</td></tr>')+'</tbody></table></div>').join('')+'</div>');
  }
  function sizeParticipantTables() {
    const ledger=$('main').querySelector('.highlight-ledger'),tables=$('main').querySelector('.participant-tables');
    if(ledger && tables)tables.style.setProperty('--highlight-table-height',ledger.getBoundingClientRect().height+'px');
  }
  function snapshotAssociations(type,id,snapshot) {
    if(type==='villages') {
      const owner=snapshot?.kingdom_id,capital=owner==null?null:data.snapshot('kingdoms',owner,year)?.capital_id;
      return '<dl class="definition snapshot-associations"><div><dt>Kingdom</dt><dd>'+cell(owner,'kingdom_id')+'</dd></div><div><dt>Capital</dt><dd>'+(capital==null?'—':String(capital)===String(id)?'Yes':'No')+'</dd></div><div><dt>Leader</dt><dd>'+(data.rulers(type,id,year).map(e=>link('characters',e.id)).join(', ')||'—')+'</dd></div></dl>';
    }
    const entries=type==='characters' ? [['Kingdom',cell(snapshot?.kingdom_id,'kingdom_id')],['Home village',cell(snapshot?.village_id,'village_id')],['Role',esc(snapshot?.role ?? '—')]] : type==='kingdoms' ? [['Capital',cell(snapshot?.capital_id,'capital_id')],['King',data.rulers(type,id,year).map(e=>link('characters',e.id)).join(', ')||'—']] : type==='villages' ? [['Leader',data.rulers(type,id,year).map(e=>link('characters',e.id)).join(', ')||'—']] : [];
    return entries.length ? '<dl class="definition snapshot-associations">'+entries.map(([name,value])=>'<div><dt>'+name+'</dt><dd>'+value+'</dd></div>').join('')+'</dl>' : '';
  }
  function observationTimeline(type,id,field,target,title) {
    const runs=data.observationRuns(type,id,field).runs,rows=new Map();
    for(const r of runs) {const k=String(r.value);if(!rows.has(k)) rows.set(k,{name:r.value==null?'—':target?data.entity(target,r.value)?.name||'#'+r.value:label(r.value),type:target,id:r.value,intervals:[]});rows.get(k).intervals.push(r);}
    return panel(title,timeline([...rows.values()],type+'-'+id+'-'+field));
  }
  function characterHistory(id) {
    const relatives=data.family(id), ids=new Set([String(id),...relatives.map(r=>String(r.id))]);
    const family='<div class="table-wrap"><table><thead><tr><th>Relation</th><th>Character</th></tr></thead><tbody>'+relatives.map(r=>'<tr><td>'+esc(r.relationship)+'</td><td>'+link('characters',r.id)+'</td></tr>').join('')+'</tbody></table></div>';
    const roles=new Map();
    for(const run of data.observationRuns('characters',id,'office',(r,y)=>JSON.stringify(data.characterOffices(id,y).length?data.characterOffices(id,y):[[r.role,'kingdoms',r.kingdom_id]])).runs) for(const office of JSON.parse(run.value)){
      const [role,type,target]=office, k=JSON.stringify(office);
      if(!roles.has(k))roles.set(k,{role,type:role?type:null,id:role?target:null,name:role ? label(role)+(target==null?'':' of '+(data.entity(type,target)?.name || '—')):'—',intervals:[]});
      roles.get(k).intervals.push(run);
    }
    const choices=standardMetrics('characters'), metric=choices.includes(pref('family-ranking','level'))?pref('family-ranking','level'):'level';
    return {chronology:panel('Roles',timeline([...roles.values()],'character-roles-'+id))+observationTimeline('characters',id,'kingdom_id','kingdoms','Kingdoms')+observationTimeline('characters',id,'village_id','villages','Villages'),family:section('Family','<div class="grid">'+panel('Relatives',relatives.length?family:'<p class="empty">—</p>')+panel('Rankings','<p class="ranking-year">Year '+(year ?? '—')+'</p>'+rankings('characters',metric,ids),selector('family-ranking','Measure',choices,metric))+'</div>')};
  }
  function leadershipHistory(type,id) {
    const rows=data.officeHistory(type,id);
    let content=panel(type==='kingdoms'?'Kings':'Leaders',timeline(rows,'rulers-'+type+'-'+id));
    if(type==='kingdoms') {
      const rows=new Map(),history=data.observationRuns(type,id,'capital',(r,y)=>data.snapshot(type,id,y)?.capital_id??null);
      for(const r of history.runs){const k=String(r.value);if(!rows.has(k))rows.set(k,{name:r.value==null?'—':data.entity('villages',r.value)?.name||'#'+r.value,type:'villages',id:r.value,intervals:[]});rows.get(k).intervals.push(r);}
      content=panel('Capitals',timeline([...rows.values()],'capitals-'+id))+content;
    }return content;
  }
  function tabsFor(type) {
    let tabs=openTabs.get(type);
    if(!Array.isArray(tabs))tabs=[];
    const seen=new Set(); tabs=tabs.filter(t=>t && data.entity(type,t.id) && !seen.has(String(t.id)) && seen.add(String(t.id))).slice(0,5);
    let locks=0;tabs.forEach((t,i)=>{t.order=Number.isFinite(t.order)?t.order:i;t.locked=!!t.locked && ++locks<=4;});
    tabs.sort((a,b)=>Number(b.locked)-Number(a.locked)||a.order-b.order);openTabs.set(type,tabs);return tabs;
  }
  function rememberTab(type,id) {
    const tabs=tabsFor(type);if(tabs.some(t=>String(t.id)===String(id)))return;
    const order=Math.max(-1,...tabs.map(t=>t.order))+1;
    if(tabs.length===5){const oldest=tabs.filter(t=>!t.locked).sort((a,b)=>a.order-b.order)[0];tabs.splice(tabs.indexOf(oldest),1);}
    tabs.push({id,locked:false,order});
  }
  function renderTabs(type,selected) {
    const tabs=tabsFor(type);if(!tabs.length)return '';
    return '<div class="record-tabs" aria-label="Open '+singular(type)+' records">'+tabs.map((t,i)=>{
      const lock=t.locked || (tabs.filter(t=>t.locked).length<4);
      return '<div class="record-tab'+(String(t.id)===String(selected)?' selected':'')+'" style="--series:'+entityColor(type,t.id)+'">'+(lock?'<button class="tab-lock'+(t.locked?' locked':'')+'" data-tab-lock="'+esc(t.id)+'" data-tab-type="'+type+'" aria-label="'+(t.locked?'Unlock':'Lock')+' '+esc(data.entity(type,t.id).name)+'"><svg viewBox="0 0 24 28" aria-hidden="true">'+(t.locked?'<path class="lock-solid" fill-rule="evenodd" d="M6 11V8a6 6 0 0112 0v3h2v14H4V11zm3 0h6V8a3 3 0 00-6 0z"/>':'<rect x="4" y="15" width="16" height="10" rx="1"/><path d="M7 15V7a5 5 0 0110 0v2"/>')+'</svg></button>':'')+'<a href="#/'+singular(type)+'/'+encodeURIComponent(t.id)+'"'+(String(t.id)===String(selected)?' aria-current="page"':'')+'>'+esc(data.entity(type,t.id).name)+'</a><button class="tab-close" data-tab-close="'+esc(t.id)+'" data-tab-type="'+type+'" aria-label="Close '+esc(data.entity(type,t.id).name)+'">×</button></div>';
    }).join('')+'</div>';
  }
  $('entity-manager').addEventListener('click',e=>{
    const button=e.target.closest('[data-tab-close],[data-tab-lock]');if(!button)return;e.preventDefault();
    const type=button.dataset.tabType,tabs=tabsFor(type),id=button.dataset.tabClose ?? button.dataset.tabLock,index=tabs.findIndex(t=>String(t.id)===id);if(index<0)return;
    if(button.dataset.tabClose!==undefined){tabs.splice(index,1);const r=route();if(!tabs.length || (r.name===singular(type)&&String(r.id)===id)){location.hash=tabs.length?'#/'+singular(type)+'/'+encodeURIComponent(tabs[Math.min(index,tabs.length-1)].id):'#/browser/'+type;}}
    else {const t=tabs[index];if(t.locked || (tabs.filter(t=>t.locked).length<4))t.locked=!t.locked;}
    render(false,false);
  });
  function entityTabs(type) {
    return '<nav class="entity-tabs" aria-label="Entity types">' + H.TYPES.map(t => '<a href="#/browser/' + t + '"' + (t === type ? ' aria-current="page"' : '') + '>' + entityIcon(t) + typeLabel(t) + '</a>').join('') + '</nav>';
  }
  function browserColumns(type, mode) {
    if (type === 'characters') return ['name','id','species','gender','birth_year','start_year','end_year','lifespan',...(mode === 'year' ? ['entity_age','role','kingdom_id','village_id','level','coins','kills'] : ['peak_level','peak_coins','peak_kills'])];
    const identity = ['name', 'id', ...(type === 'kingdoms' || type === 'villages' ? ['founding_species'] : []), 'birth_year', 'start_year', 'end_year', 'lifespan'];
    if (mode === 'year') return [...identity, 'entity_age', ...(type === 'villages' ? ['kingdom_id'] : type === 'wars' ? ['war_type', 'instigator'] : []), ...metricsFor(type), ...(type === 'kingdoms' ? ['wars', 'alliances'] : [])];
    if (type === 'wars') return [...identity, 'war_type', 'instigator', 'latest_attacker_deaths', 'latest_defender_deaths', 'latest_total_deaths', 'latest_year', 'historical_members', 'distinct_attackers', 'distinct_defenders', 'participation_changes'];
    return [...identity, ...['population', 'army', 'territory', 'structures', 'food', 'coins', ...(type === 'kingdoms' ? ['villages'] : type === 'villages' ? ['loyalty'] : ['members'])].map(m => `peak_${m}`), ...(type === 'kingdoms' ? ['distinct_wars', 'distinct_alliances'] : type === 'villages' ? ['owners', 'ownership_changes'] : ['historical_members', 'intervals', 'rejoining', 'participation_changes'])];
  }
  function globalComparison(metric) {
    if (['population', ...H.SPECIES, 'army', 'territory', 'structures', 'food', 'coins', 'kingdoms', 'villages', 'wars', 'tracked_characters', 'army_ratio', 'food_per_resident', 'coins_per_resident', 'structures_per_resident'].includes(metric)) return data.series('world', '', metric);
    if (['population_share', 'territory_share'].includes(metric)) return data.series('world', '', metric === 'population_share' ? 'population' : 'territory').map(p => ({ year: p.year, value: H.numeric(p.value) && p.value > 0 ? 1 : null }));
    if (['total_deaths','attacker_deaths','defender_deaths'].includes(metric)) return data.casualtySeries(metric);
    return null;
  }
  function browserState(type) {
    if (!browserStates.has(type)) browserStates.set(type, { mode: 'history', search: '', species: '', relationship: '', role: '', gender:'', kingdom:'', village:'', warType: '', dateMin: '', dateMax: '', min: '', max: '', filterMetric: '', columns: {}, selected: [], compareMetric: type === 'characters' ? 'level' : type === 'wars' ? 'total_deaths' : 'population' });
    return browserStates.get(type);
  }
  function browser(type) {
    if (!H.TYPES.includes(type)) type = 'kingdoms';
    const s = browserState(type), available = browserColumns(type, s.mode);
    if(!metricsFor(type).includes(s.compareMetric)) s.compareMetric=metricsFor(type)[0];
    if (s.columns[s.mode]) s.columns[s.mode] = s.columns[s.mode].map(c => c === 'duration' ? 'lifespan' : c).filter(c => available.includes(c));
    else s.columns[s.mode] = available.filter(c => ['name', 'founding_species', 'species','gender','role','level','kills','peak_level','peak_kills', 'birth_year', 'start_year', 'end_year', 'population', 'army', 'members', 'kingdom_id', 'war_type', 'peak_population', 'peak_army', 'total_deaths', 'latest_total_deaths', 'historical_members'].includes(c));
    if (!available.includes(s.filterMetric)) s.filterMetric = type === 'characters' ? s.mode === 'history' ? 'peak_level' : 'level' : s.mode === 'history' ? type === 'wars' ? 'latest_total_deaths' : 'peak_population' : type === 'wars' ? 'total_deaths' : 'population';
    const rows = data.catalog(type).flatMap(e => {
      const snap = data.snapshot(type, e.id, year);
      if (s.mode === 'year' && !snap) return [];
      const values = s.mode === 'history' ? data.summary(type, e.id) : { ...e, lifespan: H.lifespan(e), ...snap, entity_age: snap ? entityAge(e) : null };
      if (s.species && (e.founding_species || e.species) !== s.species) return [];
      if (s.warType && e.war_type !== s.warType) return [];
      if (type === 'characters') {
        if(s.gender && e.gender!==s.gender)return [];
        const states=s.mode==='year'?[snap]:data.history(type,e.id).map(p=>p.record);
        if((s.role || s.kingdom || s.village) && !states.some(p=>p && (!s.role || p.role===s.role) && (!s.kingdom || String(p.kingdom_id)===s.kingdom) && (!s.village || String(p.village_id)===s.village)))return [];
      }
      const start = H.boundary(e.start_year), end = H.boundary(e.end_year);
      if (s.dateMin !== '' && (!start || start.lo < Number(s.dateMin))) return [];
      if (s.dateMax !== '' && (!end || end.hi > Number(s.dateMax))) return [];
      if (s.min !== '' && (!H.numeric(values[s.filterMetric]) || values[s.filterMetric] < Number(s.min))) return [];
      if (s.max !== '' && (!H.numeric(values[s.filterMetric]) || values[s.filterMetric] > Number(s.max))) return [];
      const related = data.relatedNames(type, e.id, s.mode === 'year' ? year : null, s.role);
      if (type !== 'characters' && s.role && !related) return [];
      if (s.relationship && !related.toLowerCase().includes(s.relationship.toLowerCase())) return [];
      if (s.search && !`${e.name} ${e.id} ${related}`.toLowerCase().includes(s.search.toLowerCase())) return [];
      return [{ entity: e, values }];
    });
    const bindSelect = (name, title, values, current, labeler = label) => `<label>${title}<select aria-label="${esc(title || label(name))}" data-browser="${name}" data-type="${type}">${options(values, current, labeler)}</select></label>`;
    const bindInput = (name, title, inputType = 'text', placeholder = '') => `<label>${title}<input aria-label="${esc(title || label(name))}" type="${inputType}" data-browser="${name}" data-type="${type}" value="${esc(s[name])}" placeholder="${esc(placeholder)}"></label>`;
    const filterCount = ['relationship', 'role', 'gender', 'kingdom', 'village', 'warType', 'dateMin', 'dateMax', 'min', 'max'].filter(k => String(s[k] ?? '').trim() !== '').length;
    const filtersOpen = pref('filters', false), columnsOpen = pref('columns', false);
    const controls = '<div class="browser-toolbar">' + bindSelect('mode', '', ['history', 'year'], s.mode, m => m === 'history' ? 'All history' : 'Selected year') + '<div class="search">' + bindInput('search', '', 'search', 'Search ' + type + '…') + '</div>' + (type === 'kingdoms' || type === 'villages' || type === 'characters' ? bindSelect('species', '', ['', ...data.registry.species], s.species, v => v ? label(v) : 'All species') : '') + '<button data-toggle="filters" aria-expanded="' + filtersOpen + '">Filters' + (filterCount ? ' <span class="filter-count">' + filterCount + '</span>' : '') + '</button><button data-toggle="columns" aria-expanded="' + columnsOpen + '">Columns</button><button data-reset="' + type + '">Reset</button></div>' +
      '<div class="filter-panel"' + (filtersOpen ? '' : ' hidden') + '><div class="filter-row filter-relationships">' + bindInput('relationship', 'Related name / ID') + (type === 'characters' ? bindSelect('gender','Gender',['','male','female'],s.gender,v=>v||'Any gender')+bindSelect('role','Role',['','king','leader','captain','warrior','citizen'],s.role,v=>v||'Any role')+bindSelect('kingdom','Kingdom',['',...data.catalog('kingdoms').map(e=>String(e.id))],s.kingdom,v=>v?data.entity('kingdoms',v)?.name||v:'Any kingdom')+bindSelect('village','Home village',['',...data.catalog('villages').map(e=>String(e.id))],s.village,v=>v?data.entity('villages',v)?.name||v:'Any village') : '') + (type === 'wars' ? bindSelect('role', 'Role', ['', 'attacker', 'defender', 'instigator'], s.role, v => v || 'Any role') + bindSelect('warType', 'War type', ['', ...new Set(data.catalog(type).map(e => e.war_type))], s.warType, v => v || 'Any type') : '') + '</div><div class="filter-row filter-dates">' + bindInput('dateMin', 'Start from year', 'number') + bindInput('dateMax', 'Ended by year', 'number') + '</div><div class="filter-row filter-quantities">' + bindSelect('filterMetric', 'Measure', available.filter(c => !['name', 'id', 'founding_species', 'birth_year', 'start_year', 'end_year', 'war_type', 'instigator', 'kingdom_id'].includes(c)), s.filterMetric) + bindInput('min', 'Minimum', 'number') + bindInput('max', 'Maximum', 'number') + '</div></div>' +
      '<div class="column-panel"' + (columnsOpen ? '' : ' hidden') + '><div class="columns">' + available.map(c => '<label><input type="checkbox" data-column="' + c + '" data-type="' + type + '"' + (s.columns[s.mode].includes(c) ? ' checked' : '') + (c === 'name' ? ' disabled' : '') + '>' + esc(label(c)) + '</label>').join('') + '</div>' + '<button data-all-columns="' + type + '">' + (s.columns[s.mode].length === available.length ? 'Deselect all' : 'Select all') + '</button>' + '</div>';
    s.filteredIds = rows.map(r => String(r.entity.id));
    const globalPoints = type === 'characters' ? null : globalComparison(s.compareMetric);
    const comparisonSeries = s.selected.map((id,index) => ({ type, id, name: data.entity(type, id)?.name || id, color: entityColor(type,id), points: data.series(type, id, s.compareMetric) }));
    if (s.showGlobal && globalPoints) comparisonSeries.push({name:'Global', color:THEME['global-data'], points:globalPoints});
    const compare = s.selected.length ? '<div class="controls">'+bindSelect('compareMetric','Measure',metricsFor(type),s.compareMetric)+(globalPoints?'<label><input type="checkbox" data-global="'+type+'"'+(s.showGlobal?' checked':'')+'>Global</label>':'')+'</div>'+panel('Historical observations',chart(comparisonSeries,s.compareMetric,{legendControls:false,solid:true,id:'comparison'}))+panel('Rankings','<p class="ranking-year">Year '+(year??'—')+'</p>'+rankings(type,s.compareMetric,new Set(s.selected.map(String)))) : '<p class="muted">Select entities to compare.</p>';
    return '<div class="page-head"><div><p class="eyebrow">Entity browser</p><h1>' + typeLabel(type) + '</h1></div></div>' + '<section class="panel">' + controls + '<div class="catalog-count">' + rows.length + ' ' + type + ' · ' + (s.mode === 'history' ? 'All history' : 'Selected year') + '</div>' + table(type, rows, available.filter(c => s.columns[s.mode].includes(c)), 'browser-' + type + '-' + s.mode, { selectable: true, selected: s.selected }) + '</section>' + section('Compare', '<div class="grid">' + compare + '</div>');
  }
  // Map coordinates are bottom-left zone IDs; camera coordinates use screen rows.
  let mapCamera=null,mapPhysical='terrain',mapPolitical=true,mapLayer='kingdoms',mapSelection=null,mapEntitySelection=null,mapSelectionOwner=null,mapFrame=null,mapSettings=false,mapStructures=true,mapLegendVisible=true,mapZoomVisible=true,mapColorKey=null;
  const mapPointers=new Map();let mapGesture=null;
  const mapColors=new Map();
  try { for(const [key,value] of Object.entries(JSON.parse(localStorage.getItem('historybox-map-colors'))||{}))if(/^#[0-9a-f]{6}$/i.test(value))mapColors.set(key,value); } catch {}
  const politicalMap=()=>mapPolitical;
  const structuresMap=()=>mapStructures||mapPolitical;
  const biomeMap=()=>mapPhysical==='biome';
  const terrainLabel=i=>label(data.mapTerrain[i]);
  const terrainKey=i=>'terrain:'+data.mapTerrain[i];
  const biomeKey=i=>'biome:'+data.mapBiomes[i];
  function biomeLabel(i){return i===0?'—':label(i<30?data.mapBiomes[i].replace(/^biome_/,''):data.mapBiomes[i]);}
  function mapColor(key){
    if(H.SPECIES.includes(key))return THEME[key];
    if(data.registry.species.includes(key))return THEME.other;
    if(mapColors.has(key))return mapColors.get(key);
    if(key.startsWith('terrain:')){return THEME['terrain-'+key.slice(8)] || THEME.unknown;}
    if(key.startsWith('biome:')){const i=key==='biome:null'?0:data.mapBiomes.indexOf(key.slice(6));return THEME[i>=0&&i<30?'biome-'+i:'unknown'];}
    return THEME[key]||THEME.unknown;
  }
  function mapEntityColor(type,id){return mapColor(data.entity(type,id)?.founding_species||data.entity(type,id)?.species||'entity-data');}
  function mapLegend() {
    const used=data.mapUsed,groups=[];
    if(mapStructures)groups.push(['Structures',[[2,'entity-data','Generic'],[1,'panel2','Ruins']].filter(([code])=>used.structures.has(code)).map(([,key,name])=>[key,name])]);
    if(mapPolitical||mapStructures)groups.push(['Species',H.SPECIES.filter(k=>used.species.has(k)).map(k=>[k,label(k)])]);
    if(biomeMap()) {
      groups.push(['Biome',[...used.biomes].sort((a,b)=>a-b).map(i=>[biomeKey(i),biomeLabel(i)])]);
    }
    groups.push(['Terrain',[...used.terrain].sort((a,b)=>a-b).map(i=>[terrainKey(i),terrainLabel(i)])]);
    return (mapColorKey?'<label class="map-color-editor">Hex color<input id="map-color" aria-label="Map legend hex color" maxlength="7" spellcheck="false" value="'+esc(mapColor(mapColorKey))+'" pattern="#[0-9a-fA-F]{6}"></label>':'')+groups.filter(([,keys])=>keys.length).map(([title,keys])=>'<section><h3>'+title+'</h3><div>'+keys.map(([k,n])=>'<span>'+(H.SPECIES.includes(k)?'<i class="map-species-swatch" style="background:'+mapColor(k)+'"></i>':'<button class="map-swatch" data-map-color="'+esc(k)+'" style="background:'+mapColor(k)+'" aria-label="Edit '+esc(n)+' color" aria-pressed="'+(mapColorKey===k)+'"></button>')+esc(n)+'</span>').join('')+'</div></section>').join('');
  }
  function mapPage() {
    return '<section class="map-page"><div class="map-toolbar"><h1>Map</h1><label>Physical<select id="map-physical">'+['terrain','biome'].map(v=>'<option value="'+v+'"'+(v===mapPhysical?' selected':'')+'>'+typeLabel(v)+'</option>').join('')+'</select></label><label>Political<select id="map-layer">'+['villages','kingdoms'].map(v=>'<option value="'+v+'"'+(v===mapLayer?' selected':'')+'>'+typeLabel(v)+'</option>').join('')+'</select></label><button data-map-settings aria-label="Map settings" aria-controls="map-settings" aria-expanded="'+mapSettings+'"><svg viewBox="0 0 20 14" aria-hidden="true"><path d="M2 2 L10 11 L18 2"/></svg></button></div><div class="map-stage"><canvas id="world-map" tabindex="0" aria-label="World map. Drag to pan, scroll or pinch to zoom. Click territory to inspect its village and kingdom."></canvas><div id="map-settings" class="map-settings"'+(mapSettings?'':' hidden')+'><label>Political<input id="map-political" type="checkbox"'+(mapPolitical?' checked':'')+'></label><label id="map-structures-control">Structures<input id="map-structures" type="checkbox"'+(mapStructures?' checked':'')+'></label><label>Legend<input id="map-legend-toggle" type="checkbox"'+(mapLegendVisible?' checked':'')+'></label><label>Zoom<input id="map-zoom-toggle" type="checkbox"'+(mapZoomVisible?' checked':'')+'></label></div><div class="map-tools"'+(mapLegendVisible?'':' hidden')+'><div class="map-legend">'+mapLegend()+'</div></div><div class="map-zoom"'+(mapZoomVisible?'':' hidden')+'><button data-map-zoom="0.6666667" aria-label="Zoom out">−</button><button data-map-zoom="1.5" aria-label="Zoom in">+</button></div><div id="map-selection" class="map-selection" hidden></div><p id="map-empty" hidden>No observation for this year</p></div></section>';
  }
  function mapZoomBounds(width,base,height) {
    const min=Math.min(width/data.mapWidth,height/data.mapHeight)/1.5/base;
    return [min,Math.max(min,width/8/base)];
  }
  function mapTransform() {
    const c=$('world-map');if(!c)return null;
    const box=c.getBoundingClientRect(),base=Math.min(box.width/data.mapWidth,box.height/data.mapHeight)*.94;
    if(!mapCamera)mapCamera={x:data.mapWidth/2,y:data.mapHeight/2,zoom:1};
    const [minZoom,maxZoom]=mapZoomBounds(box.width,base,box.height);
    mapCamera.zoom=Math.max(minZoom,Math.min(maxZoom,mapCamera.zoom));
    const scale=base*mapCamera.zoom;
    const clamp=(v,size)=>Math.max(.5,Math.min(size-.5,v));
    mapCamera.x=clamp(mapCamera.x,data.mapWidth);mapCamera.y=clamp(mapCamera.y,data.mapHeight);
    return {box,base,scale,x:box.width/2-mapCamera.x*scale,y:box.height/2-mapCamera.y*scale};
  }
  function mapZone(event) {
    const t=mapTransform();if(!t)return null;
    const x=Math.floor((event.clientX-t.box.left-t.x)/t.scale),row=Math.floor((event.clientY-t.box.top-t.y)/t.scale);
    return x>=0&&row>=0&&x<data.mapWidth&&row<data.mapHeight?(data.mapHeight-1-row)*data.mapWidth+x:null;
  }
  function mapObservation() {
    if(mapFrame?.data===data && mapFrame.year===year)return mapFrame;
    const record=data.records.get(year),owners=new Map();
    for(const v of record?.raw.villages || [])for(const z of v.territory)if(z>=0)owners.set(z,v);
    return mapFrame={data,year,record,owners,capitals:new Map((record?.raw.kingdoms||[]).filter(k=>k.cities?.length&&k.cities[0]!==-1).map(k=>[String(k.cities[0]),k.id])),zones:data.zonesAt(year),labels:new Map()};
  }
  function mapDetails(zone) {
    const frame=mapObservation();if(zone==null||!frame.record)return null;
    const village=frame.owners.get(zone);
    return {village,kingdom:village?.kingdom_id,bonfire:village?.territory[0]===zone,capital:village?.kingdom_id!=null&&String(frame.capitals.get(String(village.id)))===String(village.kingdom_id),terrain:frame.zones[zone*3],biome:frame.zones[zone*3+1],structure:frame.zones[zone*3+2]};
  }
  function mapStructureLabel(info) {
    return info.bonfire?(info.capital?'Capital':'Village'):info.structure===0?null:info.structure===1?'Ruined Structure':info.structure===2?'Generic Structure':label(data.registry.species[info.structure-3])+' Structure';
  }
  function mapTip(event) {
    const info=mapDetails(mapZone(event));if(!info){$('chart-tooltip').hidden=true;return;}
    const details=[terrainLabel(info.terrain),info.biome?biomeLabel(info.biome):null,mapStructureLabel(info),data.entity('villages',info.village?.id)?.name,data.entity('kingdoms',info.kingdom)?.name];
    simpleTooltip(event,details.filter(value=>value!=null&&value!=='—'&&value!=='').join('\n'));
  }
  function updateMapSelection() {
    const panel=$('map-selection');if(!panel)return;
    if(mapEntitySelection){
      const {type,id}=mapEntitySelection,snapshot=data.snapshot(type,id,year),ruler=data.rulers(type,id,year)[0];
      panel.hidden=false;
      const rows=[[type==='kingdoms'?'King':'Leader',ruler?link('characters',ruler.id):'—'],[type==='kingdoms'?'Villages':'Structures',format(snapshot?.[type==='kingdoms'?'villages':'structures'])],['Population',format(snapshot?.population)],['Army',format(snapshot?.army)]];
      const content='<div class="map-selection-header"><div class="map-detail">'+link(type,id)+'</div><button class="map-dismiss" data-map-dismiss aria-label="Close map selection">×</button></div><div class="map-selection-content">'+rows.map(([name,value])=>'<div class="map-detail map-political-row"><span class="muted">'+name+'</span><span class="map-political-value">'+value+'</span></div>').join('')+'</div>';
      if(panel.innerHTML!==content)panel.innerHTML=content;
      return;
    }
    const info=mapDetails(mapSelection);panel.hidden=!info;
    if(!info)return;
    const structure=mapStructureLabel(info)||'—';
    const rows=[['terrain',esc(terrainLabel(info.terrain))],['biome',esc(biomeLabel(info.biome))],['structure',esc(structure)],['village',info.village?link('villages',info.village.id):'—'],['kingdom',info.kingdom!=null?link('kingdoms',info.kingdom):'—']];
    const content='<div class="map-selection-header"><div class="map-detail" data-map-detail="zone"><strong>Zone '+mapSelection+'</strong></div><button class="map-dismiss" data-map-dismiss aria-label="Close map selection">×</button></div><div class="map-selection-content">'+rows.map(([kind,value])=>'<div class="map-detail" data-map-detail="'+kind+'">'+value+'</div>').join('')+'</div>';
    if(panel.innerHTML!==content)panel.innerHTML=content;

  }
  // Geometry and fitted glyphs use zone coordinates, independent of zoom. Each
  // connected component has its own centroid so islands never receive ocean labels.
  function mapLabelAreas(frame,ownerKey) {
    if(frame.labels.has(mapLayer))return frame.labels.get(mapLayer);
    const unseen=new Set(frame.owners.keys()),areas=[];
    while(unseen.size){
      const first=unseen.values().next().value,key=ownerKey(first),zones=[],queue=[first];unseen.delete(first);
      for(let n=0;n<queue.length;n++){const z=queue[n],x=z%data.mapWidth;zones.push(z);for(const next of [x>0?z-1:-1,x<data.mapWidth-1?z+1:-1,z-data.mapWidth,z+data.mapWidth])if(unseen.has(next)&&ownerKey(next)===key){unseen.delete(next);queue.push(next);}}
      const points=zones.map(z=>({x:z%data.mapWidth+.5,y:data.mapHeight-.5-Math.floor(z/data.mapWidth)}));
      const cx=points.reduce((n,p)=>n+p.x,0)/points.length,cy=points.reduce((n,p)=>n+p.y,0)/points.length;
      const columns=new Map();for(const p of points){const x=Math.floor(p.x);if(!columns.has(x))columns.set(x,[]);columns.get(x).push(p.y);}
      for(const ys of columns.values())ys.sort((a,b)=>a-b);
      // Erode one zone around the coast to separate broad lobes joined by
      // narrow corridors. Fit in the largest interior, not on the bridge
      // where the combined centroid can fall. Keep thin territories usable.
      const owned=new Set(zones),core=new Set(zones.filter(z=>{
        const x=z%data.mapWidth;
        return x>0&&x<data.mapWidth-1&&[-1,0,1].every(dy=>[-1,0,1].every(dx=>owned.has(z+dy*data.mapWidth+dx)));
      })),clumps=[];
      while(core.size){
        const seed=core.values().next().value,clump=[seed];core.delete(seed);
        for(let i=0;i<clump.length;i++)for(const next of [clump[i]-1,clump[i]+1,clump[i]-data.mapWidth,clump[i]+data.mapWidth])if(core.delete(next))clump.push(next);
        clumps.push(clump);
      }
      clumps.sort((a,b)=>b.length-a.length);
      const interior=clumps.length>1?clumps[0].map(z=>({x:z%data.mapWidth+.5,y:data.mapHeight-.5-Math.floor(z/data.mapWidth)})):points;
      const anchor=clumps.length>1?{x:interior.reduce((n,p)=>n+p.x,0)/interior.length,y:interior.reduce((n,p)=>n+p.y,0)/interior.length}:{x:cx,y:cy};
      const candidates=[anchor,...interior.sort((a,b)=>(a.x-anchor.x)**2+(a.y-anchor.y)**2-(b.x-anchor.x)**2-(b.y-anchor.y)**2).slice(0,128)];
      const v=frame.owners.get(first),type=mapLayer==='kingdoms'&&v.kingdom_id!=null?'kingdoms':'villages',id=type==='kingdoms'?v.kingdom_id:v.id;
      areas.push({zones:new Set(zones),columns,candidates,name:(data.entity(type,id)?.name || '').toLocaleUpperCase(),layout:undefined});
    }
    frame.labels.set(mapLayer,areas);return areas;
  }
  function fitMapLabel(ctx,area) {
    const inside=(x,y)=>x>=0&&x<data.mapWidth&&y>=0&&y<data.mapHeight&&area.zones.has((data.mapHeight-1-Math.floor(y))*data.mapWidth+Math.floor(x));
    const columns=[...area.columns.keys()],lo=Math.min(...columns)+.5,hi=Math.max(...columns)+.5;
    // Follow the center of the nearest continuous vertical strip. On a square
    // these centers are level; a U's outer strips rise relative to its bottom.
    const stripCenter=(x,y)=>{
      const ys=area.columns.get(Math.floor(x));if(!ys)return y;
      let best=y,distance=Infinity,start=0;
      for(let i=1;i<=ys.length;i++)if(i===ys.length||ys[i]-ys[i-1]>1){const mid=(ys[start]+ys[i-1])/2,d=Math.abs(mid-y);if(d<distance){best=mid;distance=d;}start=i;}
      return best;
    };
    const chars=Array.from(area.name);ctx.font='bold 100px "Trebuchet MS", sans-serif';
    const units=chars.map(c=>ctx.measureText(c).width/100);
    const initial=Math.min(2.2,Math.max(.3,Math.sqrt(area.zones.size)*.22));
    // Allow a modest size reduction for a more central position, never the
    // drastic shrink needed to squeeze a name onto a narrow connecting bridge.
    let best=null,bestIndex=Infinity,largest=0;
    for(let size=initial;size>=.12;size*=.88){
      if(best&&size<largest*.8)return best;
      for(let index=0;index<area.candidates.length;index++){
        if(index>=bestIndex)break;
        const center=area.candidates[index];
        if(!inside(center.x,center.y))continue;
        const widths=units.map(w=>w*size),tracking=size*.06,total=widths.reduce((a,b)=>a+b,0)+tracking*(chars.length-1);
        const span=Math.max(1,(hi-lo)/2),middle=stripCenter(center.x,center.y),left=stripCenter(Math.max(lo,center.x-span),center.y),right=stripCenter(Math.min(hi,center.x+span),center.y);
        let slope=(right-left)/(2*span),curve=(left+right-2*middle)/(2*span*span);
        // Space glyphs by distance along the curve, not by horizontal projection.
        // Limit the curve itself so glyph angles and baseline always agree.
        const limit=Math.tan(Math.PI/6),steepest=Math.max(Math.abs(slope-curve*total),Math.abs(slope+curve*total));
        if(steepest>limit){slope*=limit/steepest;curve*=limit/steepest;}
        const path=[];let length=0;
        for(let j=0;j<=128;j++){
          const x=-total/2+total*j/128,y=slope*x+curve*x*x,prior=path.at(-1);
          if(prior)length+=Math.hypot(x-prior.x,y-prior.y);path.push({x,y,length});
        }
        let offset=(length-total)/2,cursor=1;const letters=[];
        for(let i=0;i<chars.length;i++){
          const distance=offset+widths[i]/2;
          while(cursor<path.length-1&&path[cursor].length<distance)cursor++;
          const a=path[cursor-1],b=path[cursor],fraction=(distance-a.length)/(b.length-a.length||1),dx=a.x+(b.x-a.x)*fraction;
          letters.push({char:chars[i],x:center.x+dx,y:center.y+slope*dx+curve*dx*dx,angle:Math.atan(slope+2*curve*dx),width:widths[i],distance});offset+=widths[i]+tracking;
        }
        const mass=letters.reduce((n,g)=>n+g.width,0);
        const shiftX=letters.reduce((n,g)=>n+(g.x-center.x)*g.width,0)/mass,shiftY=letters.reduce((n,g)=>n+(g.y-center.y)*g.width,0)/mass;
        for(const g of letters){g.x-=shiftX;g.y-=shiftY;}
        // Sample whole rotated bounding boxes, not only corners: holes and
        // concave coastlines must not cut through the middle of a letter.
        const fits=letters.every(g=>{
          const halfW=g.width/2+size*.06,halfH=size*.58,stepsX=Math.max(2,Math.ceil(halfW*2/.15)),stepsY=Math.max(2,Math.ceil(halfH*2/.15));
          for(let ix=0;ix<=stepsX;ix++)for(let iy=0;iy<=stepsY;iy++){
            const dx=-halfW+2*halfW*ix/stepsX,dy=-halfH+2*halfH*iy/stepsY;
            if(!inside(g.x+dx*Math.cos(g.angle)-dy*Math.sin(g.angle),g.y+dx*Math.sin(g.angle)+dy*Math.cos(g.angle)))return false;
          }return true;
        });
        if(fits){
          if(!largest)largest=size;
          best={size,letters};bestIndex=index;
          if(index===0)return best;
          break;
        }
      }
    }
    return best;
  }
  const mapNameFade={value:1,from:1,target:1,start:0};
  let mapFadeFrame=0;
  function mapNameOpacity(t) {
    const now=performance.now(),fade=mapNameFade,elapsed=Math.min(1,(now-fade.start)/220);
    fade.value=fade.from+(fade.target-fade.from)*elapsed*elapsed*(3-2*elapsed);
    const [minimum,maximum]=mapZoomBounds(t.box.width,t.base,t.box.height);
    const zoomedOut=maximum>minimum?(maximum-mapCamera.zoom)/(maximum-minimum):1;
    const target=mapPolitical&&zoomedOut>=.1?1:0;
    if(target!==fade.target){fade.from=fade.value;fade.target=target;fade.start=now;}
    if(!animations)fade.value=fade.target;
    if(Math.abs(fade.value-fade.target)>.001&&!mapFadeFrame)mapFadeFrame=requestAnimationFrame(()=>{mapFadeFrame=0;drawMap();});
    return fade.value;
  }
  function drawMapNames(ctx,t,frame,ownerKey,opacity) {
    for(const area of mapLabelAreas(frame,ownerKey)) {
      if(!area.name)continue;
      if(area.layout===undefined)area.layout=fitMapLabel(ctx,area);
      const layout=area.layout;if(!layout||layout.size*t.scale<7)continue;
      ctx.save();ctx.beginPath();for(const z of area.zones)ctx.rect(t.x+(z%data.mapWidth)*t.scale,t.y+(data.mapHeight-1-Math.floor(z/data.mapWidth))*t.scale,t.scale,t.scale);ctx.clip();
      ctx.fillStyle=THEME['map-label'];ctx.globalAlpha=.78*opacity;ctx.font='bold '+layout.size*t.scale+'px "Trebuchet MS", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      for(const g of layout.letters){ctx.save();ctx.translate(t.x+g.x*t.scale,t.y+g.y*t.scale);ctx.rotate(g.angle);ctx.fillText(g.char,0,0);ctx.restore();}ctx.restore();
    }
  }
  function drawMapSelectionOverlay(ctx,t,frame) {
    if(mapSelection==null)return;
    ctx.save();ctx.fillStyle=THEME['global-data'];ctx.globalAlpha=.33;ctx.beginPath();
    const add=zone=>ctx.rect(t.x+(zone%data.mapWidth)*t.scale,t.y+(data.mapHeight-1-Math.floor(zone/data.mapWidth))*t.scale,t.scale,t.scale);
    if(mapEntitySelection){
      const {type,id}=mapEntitySelection;
      for(const [zone,village] of frame.owners){const owner=type==='kingdoms'?village.kingdom_id:village.id;if(owner!=null&&String(owner)===String(id))add(zone);}
    }else add(mapSelection);
    ctx.fill();ctx.restore();
  }
  let mapPaintCache=null;
  function drawMap() {
    const c=$('world-map');if(!c||$('main').hidden)return;
    const main=$('main'),bottom=$('timeline-shell').getBoundingClientRect().top;
    const notes=$('diagnostics-button'),reserve=notes && !notes.hidden ? notes.getBoundingClientRect().height+16 : 8;
    main.style.height=Math.max(40,bottom-main.getBoundingClientRect().top-reserve)+'px';
    const t=mapTransform(),dpr=Math.min(devicePixelRatio||1,2),w=Math.round(t.box.width*dpr),h=Math.round(t.box.height*dpr);
    const legend=document.querySelector('.map-legend');if(legend)legend.style.maxHeight=Math.max(0,t.box.height-20-(mapZoomVisible?(document.querySelector('.map-zoom')?.getBoundingClientRect().height||40)+10:0))+'px';
    if(c.width!==w)c.width=w;if(c.height!==h)c.height=h;
    const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,t.box.width,t.box.height);
    const frame=mapObservation(),{zones,owners,record}=frame;$('map-empty').hidden=!!zones;
    if(!zones){updateMapSelection();return;}
    const x0=Math.max(0,Math.floor(-t.x/t.scale)),x1=Math.min(data.mapWidth,Math.ceil((t.box.width-t.x)/t.scale));
    const r0=Math.max(0,Math.floor(-t.y/t.scale)),r1=Math.min(data.mapHeight,Math.ceil((t.box.height-t.y)/t.scale));
    const ownerKey=z=>{const v=owners.get(z);return v?(mapLayer==='kingdoms'&&v.kingdom_id!=null?'k'+v.kingdom_id:'v'+v.id):null;};
    const paintKey=JSON.stringify([year,w,h,t.x,t.y,t.scale,mapPhysical,mapPolitical,mapLayer,mapStructures,mapSelection,mapEntitySelection,[...mapColors]]);
    if(mapPaintCache?.frame===frame&&mapPaintCache.key===paintKey){ctx.drawImage(mapPaintCache.canvas,0,0,w/dpr,h/dpr);const opacity=mapNameOpacity(t);drawMapSelectionOverlay(ctx,t,frame);if(opacity>.001)drawMapNames(ctx,t,frame,ownerKey,opacity);updateMapSelection();return;}
    for(let row=r0;row<r1;row++)for(let x=x0;x<x1;x++) {
      const z=(data.mapHeight-1-row)*data.mapWidth+x,px=t.x+x*t.scale,py=t.y+row*t.scale,v=owners.get(z);
      ctx.fillStyle=mapColor(biomeMap()&&zones[z*3+1]!==0?biomeKey(zones[z*3+1]):terrainKey(zones[z*3]));ctx.fillRect(px,py,t.scale+.3,t.scale+.3);
      if(v&&mapPolitical){ctx.globalAlpha=.65;ctx.fillStyle=mapEntityColor(mapLayer==='kingdoms'&&v.kingdom_id!=null?'kingdoms':'villages',mapLayer==='kingdoms'&&v.kingdom_id!=null?v.kingdom_id:v.id);ctx.fillRect(px,py,t.scale+.3,t.scale+.3);ctx.globalAlpha=1;}
    }
    // Suppress subpixel grids when fitted very far out; never draw dense moire.
    const gridStroke=1.25;
    if(t.scale>=5){ctx.strokeStyle=THEME['map-grid'];ctx.lineWidth=gridStroke;ctx.beginPath();for(let x=x0;x<=x1;x++){ctx.moveTo(t.x+x*t.scale,t.y+r0*t.scale);ctx.lineTo(t.x+x*t.scale,t.y+r1*t.scale);}for(let row=r0;row<=r1;row++){ctx.moveTo(t.x+x0*t.scale,t.y+row*t.scale);ctx.lineTo(t.x+x1*t.scale,t.y+row*t.scale);}ctx.stroke();}
    if(mapSelection!=null&&!mapEntitySelection){ctx.strokeStyle=THEME['global-data'];ctx.lineWidth=gridStroke*4;ctx.strokeRect(t.x+(mapSelection%data.mapWidth)*t.scale,t.y+(data.mapHeight-1-Math.floor(mapSelection/data.mapWidth))*t.scale,t.scale,t.scale);}
    if(politicalMap()) {
      ctx.strokeStyle=THEME['map-boundary'];ctx.lineWidth=gridStroke*2;ctx.beginPath();
      for(let row=r0;row<r1;row++)for(let x=x0;x<x1;x++){const z=(data.mapHeight-1-row)*data.mapWidth+x,px=t.x+x*t.scale,py=t.y+row*t.scale;if(!owners.has(z))continue;ctx.beginPath();ctx.strokeStyle=THEME['map-boundary'];
        const selectedKey=mapEntitySelection?(mapEntitySelection.type==='kingdoms'?'k':'v')+mapEntitySelection.id:null;
        ctx.lineWidth=gridStroke*(selectedKey===ownerKey(z)?4:2);
        if(selectedKey===ownerKey(z))ctx.strokeStyle=THEME['global-data'];
        if(x===0||ownerKey(z-1)!==ownerKey(z)){ctx.moveTo(px,py);ctx.lineTo(px,py+t.scale);}
        if(x===data.mapWidth-1||ownerKey(z+1)!==ownerKey(z)){ctx.moveTo(px+t.scale,py);ctx.lineTo(px+t.scale,py+t.scale);}
        if(row===0||ownerKey(z+data.mapWidth)!==ownerKey(z)){ctx.moveTo(px,py);ctx.lineTo(px+t.scale,py);}
        if(row===data.mapHeight-1||ownerKey(z-data.mapWidth)!==ownerKey(z)){ctx.moveTo(px,py+t.scale);ctx.lineTo(px+t.scale,py+t.scale);}
        ctx.stroke();
      }
    }
    const nameOpacity=mapNameOpacity(t);
    if(structuresMap()) {
      if(mapStructures)for(let row=r0;row<r1;row++)for(let x=x0;x<x1;x++){
        const z=(data.mapHeight-1-row)*data.mapWidth+x,structure=zones[z*3+2];if(!structure)continue;
        const v=owners.get(z);if(v?.territory[0]===z)continue;
        const px=t.x+(x+.5)*t.scale,py=t.y+(row+.5)*t.scale,r=t.scale*.2;
        ctx.fillStyle=mapColor(structure>=3?(H.SPECIES.slice(0,4).includes(data.registry.species[structure-3])?data.registry.species[structure-3]:'other'):structure===2?'entity-data':'panel2');ctx.strokeStyle=THEME['global-data'];ctx.lineWidth=gridStroke;
        ctx.beginPath();ctx.moveTo(px,py-r);ctx.lineTo(px+r,py+r);ctx.lineTo(px-r,py+r);ctx.closePath();ctx.fill();ctx.stroke();
      }
      const capitals=frame.capitals;
      for(const v of record.raw.villages){
        const capital=capitals.get(String(v.id));
        if(v.territory[0]<0)continue;
        const isCapital=capital!=null && String(capital)===String(v.kingdom_id);
        const z=v.territory[0],px=t.x+(z%data.mapWidth+.5)*t.scale,py=t.y+(data.mapHeight-1-Math.floor(z/data.mapWidth)+.5)*t.scale,r=t.scale*.4;
        ctx.fillStyle=mapEntityColor('villages',v.id);ctx.strokeStyle=THEME['global-data'];ctx.lineWidth=gridStroke*2;ctx.beginPath();
        if(isCapital)for(let point=0;point<10;point++){const a=-Math.PI/2+point*Math.PI/5,radius=point%2?r*.45:r,x=px+Math.cos(a)*radius,y=py+Math.sin(a)*radius;if(point===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
        else{ctx.moveTo(px,py-r);ctx.lineTo(px+r,py+r);ctx.lineTo(px-r,py+r);}
        ctx.closePath();ctx.fill();ctx.stroke();
      }

    }

	const painted=mapPaintCache?.canvas || document.createElement('canvas');if(painted.width!==w)painted.width=w;if(painted.height!==h)painted.height=h;const paintContext=painted.getContext('2d');paintContext.clearRect(0,0,w,h);paintContext.drawImage(c,0,0);mapPaintCache={frame,key:paintKey,canvas:painted};
	drawMapSelectionOverlay(ctx,t,frame);
	if(nameOpacity>.001)drawMapNames(ctx,t,frame,ownerKey,nameOpacity);
	updateMapSelection();
  }
  function zoomMap(factor,event) {
    const t=mapTransform();if(!t)return;
    const x=event?event.clientX-t.box.left:t.box.width/2,y=event?event.clientY-t.box.top:t.box.height/2;
    const gx=(x-t.x)/t.scale,gy=(y-t.y)/t.scale,oldZoom=mapCamera.zoom;
    const [minZoom,maxZoom]=mapZoomBounds(t.box.width,t.base,t.box.height);
    mapCamera.zoom=Math.max(minZoom,Math.min(maxZoom,mapCamera.zoom*factor));
    const scale=t.scale*mapCamera.zoom/oldZoom;
    mapCamera.x=gx-(x-t.box.width/2)/scale;mapCamera.y=gy-(y-t.box.height/2)/scale;drawMap();
  }
  $('main').addEventListener('wheel',e=>{if(e.target.id==='world-map'){e.preventDefault();zoomMap(Math.exp(-e.deltaY*.002),e);}},{passive:false});
  $('main').addEventListener('pointerdown',e=>{if(e.target.id!=='world-map')return;e.preventDefault();e.target.setPointerCapture(e.pointerId);mapPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});mapGesture={x:e.clientX,y:e.clientY,moved:false};});
  $('main').addEventListener('pointermove',e=>{
    if(e.target.id!=='world-map')return;
    if(mapPointers.has(e.pointerId)){
      const old=mapPointers.get(e.pointerId),others=[...mapPointers].filter(([id])=>id!==e.pointerId);mapPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(others.length){const q=others[0][1],before=Math.hypot(old.x-q.x,old.y-q.y),after=Math.hypot(e.clientX-q.x,e.clientY-q.y);if(before)zoomMap(after/before,{clientX:(e.clientX+q.x)/2,clientY:(e.clientY+q.y)/2});}
      else{const t=mapTransform();mapCamera.x-=(e.clientX-old.x)/t.scale;mapCamera.y-=(e.clientY-old.y)/t.scale;drawMap();}
      if(Math.hypot(e.clientX-mapGesture.x,e.clientY-mapGesture.y)>3||others.length)mapGesture.moved=true;
      $('chart-tooltip').hidden=true;return;
    }
    mapTip(e);
  });
  function endMapGesture(e){if(!mapPointers.has(e.pointerId))return;mapPointers.delete(e.pointerId);if(!mapGesture?.moved&&e.type!=='pointercancel'){
    mapSelection=mapZone(e);
    const info=mapDetails(mapSelection),id=mapLayer==='kingdoms'?info?.kingdom:info?.village?.id;
    const same=mapSelectionOwner?.type===mapLayer&&String(mapSelectionOwner.id)===String(id);
    mapEntitySelection=mapPolitical&&id!=null&&!same?{type:mapLayer,id}:null;
    mapSelectionOwner=mapPolitical&&id!=null?{type:mapLayer,id}:null;
    drawMap();
  }if(!mapPointers.size)mapGesture=null;}
  $('main').addEventListener('pointerup',endMapGesture);$('main').addEventListener('pointercancel',endMapGesture);
  $('main').addEventListener('click',e=>{const b=e.target.closest('[data-map-zoom],[data-map-settings],[data-map-dismiss]');if(!b)return;if(b.hasAttribute('data-map-settings')){mapSettings=!mapSettings;$('map-settings').hidden=!mapSettings;b.setAttribute('aria-expanded',String(mapSettings));}else if(b.hasAttribute('data-map-dismiss')){mapSelection=null;mapEntitySelection=null;mapSelectionOwner=null;}else zoomMap(Number(b.dataset.mapZoom));drawMap();});
  $('main').addEventListener('change',e=>{
    if(e.target.id==='map-layer'||e.target.id==='map-physical'){if(e.target.id==='map-layer'){mapLayer=e.target.value;mapEntitySelection=null;mapSelectionOwner=null;}else mapPhysical=e.target.value;mapColorKey=null;document.querySelector('.map-legend').innerHTML=mapLegend();drawMap();refreshHover();}
    else if(e.target.id==='map-political'){mapPolitical=e.target.checked;if(!mapPolitical){mapEntitySelection=null;mapSelectionOwner=null;}document.querySelector('.map-legend').innerHTML=mapLegend();drawMap();refreshHover();}
    else if(e.target.id==='map-structures'){mapStructures=e.target.checked;document.querySelector('.map-legend').innerHTML=mapLegend();drawMap();}
    else if(e.target.id==='map-legend-toggle'){mapLegendVisible=e.target.checked;document.querySelector('.map-tools').hidden=!mapLegendVisible;drawMap();}
    else if(e.target.id==='map-zoom-toggle'){mapZoomVisible=e.target.checked;document.querySelector('.map-zoom').hidden=!mapZoomVisible;drawMap();}
  });
  $('main').addEventListener('click',e=>{const swatch=e.target.closest('[data-map-color]');if(!swatch)return;mapColorKey=mapColorKey===swatch.dataset.mapColor?null:swatch.dataset.mapColor;document.querySelector('.map-legend').innerHTML=mapLegend();$('map-color')?.focus();});
  $('main').addEventListener('input',e=>{if(e.target.id!=='map-color'||!mapColorKey)return;const value=e.target.value;const valid=/^#[0-9a-f]{6}$/i.test(value);e.target.setCustomValidity(valid?'':'Use a hex color such as #123456.');if(!valid)return;mapColors.set(mapColorKey,value);try{localStorage.setItem('historybox-map-colors',JSON.stringify(Object.fromEntries(mapColors)));}catch{}for(const swatch of document.querySelectorAll('[data-map-color]'))swatch.style.background=mapColor(swatch.dataset.mapColor);drawMap();});
  $('main').addEventListener('keydown',e=>{if(e.target.id==='world-map'&&['+','=','-','Home'].includes(e.key)){e.preventDefault();if(e.key==='Home'){mapCamera=null;drawMap();}else zoomMap(e.key==='-'?1/1.5:1.5);}});
  new ResizeObserver(()=>{if($('world-map'))requestAnimationFrame(drawMap);else sizeParticipantTables();}).observe($('main'));
  window.visualViewport?.addEventListener('resize',()=>requestAnimationFrame(drawMap));
  window.addEventListener('resize',()=>requestAnimationFrame(drawMap));

  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    let id; try { id = decodeURIComponent(parts[1] || ''); } catch { id = ''; }
    return { name: parts[0] || 'overview', id };
  }
  // Playback updates existing nodes so hover, focus, and native controls survive each tick.
  function patchChildren(parent, incoming) {
    const fresh = [...incoming.childNodes];
    for (let i = 0; i < fresh.length; i++) {
      const next = fresh[i], old = parent.childNodes[i];
      if (!old) { parent.appendChild(next.cloneNode(true)); continue; }
      if (old.nodeType !== next.nodeType || old.nodeName !== next.nodeName) { old.replaceWith(next.cloneNode(true)); continue; }
      if (old.nodeType === Node.TEXT_NODE) { if (old.nodeValue !== next.nodeValue) old.nodeValue = next.nodeValue; continue; }
      if (old.nodeType !== Node.ELEMENT_NODE) continue;
      if (old === document.activeElement && old.matches('input,select,textarea')) continue;
      if (old.dataset.events && old.dataset.eventRange !== next.dataset.eventRange) old.removeAttribute('data-start');
      for (const attr of [...old.attributes]) if (!next.hasAttribute(attr.name) && !['data-start','data-animation'].includes(attr.name)) old.removeAttribute(attr.name);
      for (const attr of [...next.attributes]) if (old.getAttribute(attr.name) !== attr.value) old.setAttribute(attr.name, attr.value);
      if (old.matches('input')) { old.checked = next.checked; old.value = next.value; }
      if (!old.matches('[data-events]')) patchChildren(old, next);
    }
    while (parent.childNodes.length > fresh.length) parent.lastChild.remove();
  }
  let pointer = null, tooltipHideTimer, linkTipTimer, linkTipTarget=null, linkTipReady=false;
  function cancelLinkTip() { clearTimeout(linkTipTimer);linkTipTarget=null;linkTipReady=false; }
  function hoverTip(event, target) {
    if(!target.matches('a.entity-link,a[data-age]')) {cancelLinkTip();simpleTooltip(event,(target.closest('.chart-frame,.donut-layout,.ranking-scroll,.share-highlights') ? 'Year '+(target.dataset.tipYear ?? year ?? '—')+'\n' : '')+target.dataset.tip);return;}
    if(linkTipTarget!==target) {cancelLinkTip();linkTipTarget=target;$('chart-tooltip').hidden=true;linkTipTimer=setTimeout(()=>{if(linkTipTarget===target && target.isConnected){linkTipReady=true;simpleTooltip(pointer||event,target.dataset.tip);}},500);}
    else if(linkTipReady) simpleTooltip(event,target.dataset.tip);
  }
  function deferTooltipHide() { clearTimeout(tooltipHideTimer); tooltipHideTimer = setTimeout(() => { if (!$('chart-tooltip').matches(':hover')) $('chart-tooltip').hidden = true; }, 180); }
  $('chart-tooltip').addEventListener('pointerenter', () => clearTimeout(tooltipHideTimer));
  $('chart-tooltip').addEventListener('pointerleave', deferTooltipHide);
  $('chart-tooltip').addEventListener('keydown', e => { if (e.key === 'Escape') $('chart-tooltip').hidden = true; });
  $('main').addEventListener('animationend', refreshHover);
  document.addEventListener('scroll', () => requestAnimationFrame(refreshHover), true);
  function highlightKey(target) {
    document.querySelectorAll('.series-focus,.series-muted').forEach(el => el.classList.remove('series-focus','series-muted'));
    const key = target?.closest('[data-key-chart],[data-pie-key]');
    if (!key) return;
    const marks = key.dataset.keyChart ? document.querySelector('[data-chart="' + key.dataset.keyChart + '"]')?.querySelectorAll('[data-mark]') : key.closest('.donut-layout')?.querySelectorAll('[data-pie-mark]');
    if (![...(marks || [])].some(mark => key.dataset.keyChart ? mark.dataset.mark === key.dataset.keySeries : mark.dataset.pieMark === key.dataset.pieKey)) return;
    marks?.forEach(mark => mark.classList.add((key.dataset.keyChart ? mark.dataset.mark === key.dataset.keySeries : mark.dataset.pieMark === key.dataset.pieKey) ? 'series-focus' : 'series-muted'));
  }
  function refreshHover() {
    if (!pointer || drag) return;
    const target = document.elementFromPoint(pointer.clientX, pointer.clientY);
    if (target?.closest('#chart-tooltip')) return;
    highlightKey(target);
    const plot = target?.closest('[data-plot]'), track = target?.closest('[data-track]'), tip = target?.closest('[data-tip]');
    if(target?.id==='world-map')mapTip(pointer);
    else if (plot) showChartTooltip(pointer, plot);
    else if (track) showTimelineTooltip(pointer, track);
    else if (tip) hoverTip(pointer, tip);
    else $('chart-tooltip').hidden = true;
  }
  document.addEventListener('pointermove', e => { pointer = {clientX:e.clientX,clientY:e.clientY}; highlightKey(e.target); });
  document.addEventListener('pointerleave', () => { pointer = null; cancelLinkTip(); highlightKey(null); $('chart-tooltip').hidden = true; });
  $('main').addEventListener('focusin', e => highlightKey(e.target));
  $('main').addEventListener('focusout', () => highlightKey(null));
  function render(live = false, allowAnimation = true) {
    if (!data) return;
    finishNumbers();
    const active = document.activeElement, start = active?.selectionStart, end = active?.selectionEnd;
    const focusData = $('main').contains(active) ? { ...active.dataset } : null;
    observer.disconnect(); charts.clear(); timelineViews.clear(); chartNumber = 0;
    const r = route(), type = H.TYPES.find(t => singular(t) === r.name);
    if (!live) $('chart-tooltip').hidden = true;
    $('main').dataset.view = type ? 'entity' : r.name === 'browser' ? 'browser' : r.name === 'map' ? 'map' : 'overview';
    for (const list of $('main').querySelectorAll('[data-events]')) scrollPositions.set(list.dataset.events, list.scrollTop);
    document.body.classList.toggle('map-open',r.name==='map');
    if(r.name!=='map')$('main').style.height='';
    const markup = r.name === 'map' ? mapPage() : r.name === 'browser' ? browser(r.id || 'kingdoms') : type ? entityPage(type, r.id) : overview();
    if(r.name==='map' && $('world-map')) { /* Keep the live canvas and its backing store across year changes. */ }
    else if (live) { const template = document.createElement('template'); template.innerHTML = markup; patchChildren($('main'), template.content); }
    else $('main').innerHTML = markup;
    if(type || r.name==='browser')lastBrowserHash=location.hash;
    document.querySelector('#view-nav a:nth-child(2)').href=lastBrowserHash;
    const entityType = type || (r.name === 'browser' ? (H.TYPES.includes(r.id) ? r.id : 'kingdoms') : null);
    $('entity-manager').hidden = !entityType;
    if(type && data.entity(type,r.id)) rememberTab(type,r.id);
    const manager = entityType ? entityTabs(entityType) + renderTabs(entityType,type ? r.id : null) : '';
    if ($('entity-manager').innerHTML !== manager) $('entity-manager').innerHTML = manager;
    document.querySelectorAll('#view-nav a').forEach(a => { if (a === document.querySelector('#view-nav a:nth-child(2)') ? !!(r.name==='browser'||type) : !type && r.name!=='browser' && a.hash === (r.name==='map'?'#/map':'#/overview')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    for (const list of $('main').querySelectorAll('[data-events]')) { paintEvents(list); list.scrollTop = scrollPositions.get(list.dataset.events) || 0; paintEvents(list); }
    for (const element of $('main').querySelectorAll('[data-scroll]')) element.scrollTop = scrollPositions.get(element.dataset.scroll) || 0;
    $('main').querySelectorAll('.chart-frame,.donut-layout,.ranking-scroll,.timeline-scroll,.share-highlights').forEach((el,i) => { el.classList.remove('chart-enter'); el.dataset.animation = location.hash + ':' + i; el.dataset.animate = String(allowAnimation); observer.observe(el); });
    sizeParticipantTables();
    observeNumbers(allowAnimation);
    if(r.name==='map')drawMap();
    if (live) refreshHover();
    saveView();
    document.title = `${type ? data.entity(type, r.id)?.name || 'Record' : r.name === 'browser' ? 'Entity browser' : r.name === 'map' ? 'Map' : data.world.name || 'World overview'} — HistoryBox`;
    if (focusData && Object.keys(focusData).length) {
      const replacement = [...$('main').querySelectorAll('input,select,button,a[data-age],[data-plot],[data-track]')].find(e => Object.entries(focusData).every(([key, value]) => e.dataset[key] === value));
      if (replacement) { replacement.focus({ preventScroll: true }); if (start !== null && start !== undefined && replacement.setSelectionRange && ['text', 'search'].includes(replacement.type)) replacement.setSelectionRange(start, end); }
    }
  }
  function loadError(error) {
    const m=error.message || '';
    if (/registry format|map registry layout/.test(m)) return 'This history uses an older format. Keep your files safe and record a new history with the current HistoryBox mod.';
    if (/registry|species reference|population array|Population total/i.test(m)) return 'Some terrain, species, or population records are inconsistent. Pause recording and copy a fresh matching pair of history files.';
    if (/Unsupported or invalid (map baseline|biome legend)/.test(m)) return 'This history needs the current map format. Keep your older files safe and record a new history with the updated HistoryBox mod.';
    if (/map|territory|biome/i.test(m)) return 'This history has missing or inconsistent map records. Choose a matching pair of files recorded with the map-enabled HistoryBox mod.';
    if (/different world/.test(m)) return 'These files belong to different worlds. Choose both files from the same world folder.';
    if (/different save/.test(m)) return 'These files belong to different save slots. Choose both files from the same save folder.';
    if (/different recording|last annual|metadata disagree/.test(m)) return 'These files were saved at different times. Pause recording and copy both files together again.';
    if (/Unsupported birth-year format|overview.json requires|single metadata header|fixed metadata header/.test(m)) return 'This history uses an older or unsupported format. Record a new history with the current HistoryBox mod.';
    if (/overview.json:/.test(m)) return 'The world records file could not be read. Select overview.json from your history folder.';
    if (/Annual history must/.test(m)) return 'Choose annual.jsonl for the annual history file.';
    if (/no observations/.test(m)) return 'This history has no recorded years yet. Enable recording in WorldBox and try again after a year passes.';
    if (/strictly increasing|only once/.test(m)) return 'The annual history contains repeated or out-of-order years. Copy a fresh pair of history files and try again.';
    if (/annual.jsonl/.test(m)) return 'The annual history is incomplete or damaged. Copy both history files again after pausing recording.';
    if (/array|identity|interval|metadata|reference/i.test(m)) return 'Some world records are incomplete or invalid. Copy a fresh pair of files from the current HistoryBox mod.';
    return 'This history could not be opened. Check that you selected both files from the same history folder, then try again.';
  }
  $('history-files').addEventListener('change',()=>{if($('history-files').files.length>2){$('history-files').value='';$('load-status').className='error';$('load-status').textContent='Select only overview.json and annual.jsonl together.';}else $('load-status').textContent='';});
  async function loadWorld(event, saved = null) {
    event?.preventDefault();
    const files=saved?[]:[...$('history-files').files];
    const metadata=saved?new Blob([saved.metadata]):files.find(f=>/\.json$/i.test(f.name)), annual=saved?saved.annual:files.find(f=>/\.(jsonl|ndjson|txt)$/i.test(f.name));
    if(!saved&&(files.length!==2||!metadata||!annual)){$('load-status').className='error';$('load-status').textContent='Select exactly two files together: overview.json and annual.jsonl.';return;}
    if (!metadata || !annual) { $('load-status').className='error'; $('load-status').textContent='Choose both your world records and annual history before opening a world.'; return; }
    $('load').disabled = true; $('load-status').className = ''; $('load-status').textContent = 'Reading history…';
    try {
      if (!saved && !/\.(jsonl|ndjson|txt)$/i.test(annual.name)) throw new Error('Annual history must be a .jsonl, .ndjson, or .txt file.');
      const metadataText = await metadata.text();
      const next = await H.parse(metadataText, annual, count => { $('load-status').textContent = `Indexed ${count.toLocaleString()} observations…`; });
      await H.prepare(next, message => { $('load-status').textContent = message; });
      stopPlayback(); finishNumbers(); animated.clear(); numberSeen.clear();
      $('history-files').value = '';
      mapCamera=null;mapSelection=null;mapEntitySelection=null;mapSelectionOwner=null;mapFrame=null;mapPaintCache=null;
      mapPointers.clear();mapGesture=null;drag=null;pointer=null;pointerHeld=false;
      clearTimeout(linkTipTimer);clearTimeout(tooltipHideTimer);linkTipTarget=null;linkTipReady=false;
      charts.clear();timelineViews.clear();
      openTabs.clear();
      data = next; year = next.years.at(-1); age = null; customWindow = false; windowStart = null; windowEnd = null;
      legendHidden.clear(); eventViews.clear(); scrollPositions.clear(); preferences.clear(); pages.clear(); browserStates.clear(); tableStates.clear();
      const allNames = H.TYPES.flatMap(type => data.catalog(type).filter(e => e.name).map(e => ({name:e.name,id:e.id,type})));
      const counts = new Map(); for (const e of allNames) counts.set(e.name, (counts.get(e.name) || 0) + 1);
      namedEntities = allNames.filter(e => counts.get(e.name) === 1);
      $('age').innerHTML = '<option value="custom">Custom</option><option value="all">All ages</option>' + data.ages.map((a, i) => `<option value="${i}">${esc(ageName(i))}</option>`).join('');
      $('view-nav').hidden = false; $('nav-world').textContent = data.world.name || '—';
      $('replace').hidden = false; $('diagnostics-button').hidden = false;
      $('diagnostics-button').textContent = `Data notes (${data.warningCount})`;
      $('diagnostics-button').hidden = data.warningCount === 0;
      $('diagnostics-content').innerHTML = '<p>'+format(data.warningCount)+' warnings · '+format(data.warningGroups.size)+' types</p>' + [...data.warningGroups.values()].sort((a,b)=>b.count-a.count).map(g=>'<section class="warning-group"><h3>'+esc(g.title)+' <span class="badge">'+format(g.count)+'</span></h3><p>'+esc(g.description)+'</p><details><summary>Examples</summary><ul>'+g.examples.map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul></details></section>').join('') + (data.warningCount ? '' : '<p>No validation warnings.</p>');
      let restored = null;
      if (saved && !saved.example) {
        try { restored = JSON.parse(localStorage.getItem('historybox-view')); } catch {}
        if (restored?.worldKey !== JSON.stringify(data.world)) restored = null;
        if (restored) {
          lastBrowserHash = restored.lastBrowserHash || "#/browser/kingdoms";
          for(const [hash,position] of restored.pageScroll || []) pageScroll.set(hash,position);
          age = restored.age; if (age !== null && !data.ages[age]) age = null;
          customWindow = age === null && (restored.customWindow ?? (restored.windowSize !== undefined && restored.windowSize !== 'all'));
          windowStart = restored.windowStart;
          windowEnd = restored.windowEnd ?? (customWindow && Number.isFinite(Number(restored.windowSize)) ? (windowStart ?? data.years[0])+Number(restored.windowSize) : null);
          [windowStart,windowEnd] = range(); year = data.nearest(restored.year, scopeYears());
          for (const [map, key] of [[preferences,'preferences'],[pages,'pages'],[browserStates,'browserStates'],[tableStates,'tableStates'],[openTabs,'openTabs']]) for (const [k,v] of restored[key] || []) map.set(k,v);
          for (const [k,v] of restored.legends || []) legendHidden.set(k,new Set(v));
          $('speed').value = restored.speed || '1';
          history.replaceState(history.state, '', requestedHash || restored.hash || '#/overview');
        }
      } else {
        try { await worldStore({metadata: metadataText, annual}); } catch { $('announcement').textContent = 'Browser storage unavailable. Reload restoration is unavailable.'; }
        lastBrowserHash='#/browser/kingdoms';pageScroll.clear();
        history.replaceState(null, '', '#/overview');
      }
      displayedHash = location.hash;
      context(); render(); showWorld(true);
      if (restored && (!requestedHash || requestedHash === restored.hash)) requestAnimationFrame(() => window.scrollTo(0, restored.scroll || 0));
      $('announcement').textContent = `Loaded ${data.world.name || 'world'}, ${data.years.length} observations.`;
    } catch (error) { showWorld(false); $('load-status').className = 'error'; $('load-status').textContent = loadError(error); }
    finally { $('load').disabled = false; }
  }
  $('play').addEventListener('click', () => playback ? stopPlayback() : play());
  $('speed').addEventListener('change', () => { if (playback) play(); saveView(); });
  $('settings-button').addEventListener('click', () => $('settings').showModal());
  $('animations').checked = animations;
  $('animations').addEventListener('change', e => {
    animations = e.target.checked;
    try { localStorage.setItem('historybox-animations', String(animations)); } catch {}
    if (!animations) { finishNumbers(); document.querySelectorAll('.chart-enter').forEach(el => el.classList.remove('chart-enter')); }
  });
  function syncTrendSetting() { $('trend-years').value = trendYears; $('trend-years-value').textContent = trendYears + ' years'; }
  syncTrendSetting();
  $('trend-years').addEventListener('input', e => {
    trendYears = Math.max(10,Math.min(100,Number(e.target.value))); syncTrendSetting();
    try { localStorage.setItem('historybox-trend-years',String(trendYears)); } catch {}
    render(true);
  });
  $('reset-settings').addEventListener('click', () => {
    animations = true; trendYears = 50; $('animations').checked = true; syncTrendSetting();
    try { localStorage.removeItem('historybox-animations'); localStorage.removeItem('historybox-trend-years'); } catch {}
    render(true);
  });
  window.addEventListener('pagehide', saveView);
  $('main').addEventListener('pointerdown', e => {
    const el = e.target.closest('[data-plot],[data-track]'); if (!el || e.button !== 0) return;
    e.preventDefault(); window.getSelection()?.removeAllRanges(); document.body.classList.add('chart-dragging');
    const c = el.dataset.plot ? charts.get(el.dataset.plot) : timelineViews.get(el.dataset.track);
    drag = { ...c, bounds: el.getBoundingClientRect(), pointerId: e.pointerId, plot: el.dataset.plot, track: el.dataset.track };
    $('main').setPointerCapture(e.pointerId); stopPlayback(); scrub(e);
  });
  function scrub(e) {
    if (!drag) return;
    const fraction = Math.max(0, Math.min(1, (e.clientX - drag.bounds.left) / drag.bounds.width));
    const next = data.nearest(drag.lo + fraction * (drag.hi - drag.lo), drag.years);
    if (next !== null && next !== year) selectYear(next);
    const current = [...$('main').querySelectorAll(drag.plot ? '[data-plot]' : '[data-track]')].find(el => drag.plot ? el.dataset.plot === drag.plot : el.dataset.track === drag.track);
    if (current) { if (drag.plot) showChartTooltip(e, current); else showTimelineTooltip(e, current); }
  }
  window.addEventListener('pointermove', e => { if (drag) scrub(e); });
  window.addEventListener('pointerup', e => { if (drag) { scrub(e); drag = null; document.body.classList.remove('chart-dragging'); } });
  function cancelDrag() { drag = null; document.body.classList.remove('chart-dragging'); }
  window.addEventListener('pointercancel', cancelDrag);
  window.addEventListener('blur', cancelDrag);
  $('main').addEventListener('lostpointercapture', cancelDrag);
  function updateTimelineSpace() {
    document.documentElement.style.setProperty('--timeline-height', $('timeline-shell').hidden ? '0px' : $('timeline-shell').getBoundingClientRect().height + 'px');
  }
  new ResizeObserver(updateTimelineSpace).observe($('timeline-shell'));
  new ResizeObserver(() => document.documentElement.style.setProperty('--navigation-height', $('navigation-shell').getBoundingClientRect().height + 'px')).observe($('navigation-shell'));
  function showWorld(visible) {
    const open = visible && !!data;
    $('restore-status').hidden = true;
    $('settings-button').hidden = !open; $('replace').hidden = !open;
    $('loader').hidden = open; $('main').hidden = !open;
    $('navigation-shell').hidden = !open; $('timeline-shell').hidden = !open;
    $('view-nav').hidden = !open; $('context').hidden = !open;
    $('cancel-load').hidden = !data;
    document.body.classList.toggle('map-open',open && route().name==='map');
    if (!open) { stopPlayback(); $('chart-tooltip').hidden = true; }
    updateTimelineSpace();
  }
  worldStore().then(async saved => { if (saved && !data) await loadWorld(null, saved); else showWorld(!!data); }).catch(() => showWorld(!!data));
  $('preview-example').addEventListener('click',async()=>{
    const button=$('preview-example');button.disabled=true;$('load').disabled=true;
    $('load-status').className='';$('load-status').textContent='Opening example world…';
    try {
      const responses=await Promise.all(['overview.json','annual.jsonl'].map(name=>fetch(new URL(name,location.href))));
      if(responses.some(r=>r.status===404))throw new Error('The example world is not available yet. Its history files have not been provided.');
      if(responses.some(r=>!r.ok))throw new Error('The example world could not be downloaded. Please try again.');
      await loadWorld(null,{metadata:await responses[0].text(),annual:await responses[1].blob(),example:true});
    } catch(error){$('load-status').className='error';$('load-status').textContent=location.protocol==='file:'?'The browser cannot open example files from this local page. Use the hosted Viewer or select both example files with the file picker.':error.message;}
    finally{button.disabled=false;$('load').disabled=false;}
  });
  $('load-form').addEventListener('submit', loadWorld);
  document.querySelector('.skip').addEventListener('click', e => { e.preventDefault(); $('main').focus(); });
  $('replace').addEventListener('click', () => { showWorld(false); $('load-status').textContent = ''; });
  $('cancel-load').addEventListener('click', () => { if (data) showWorld(true); });
  $('download-notes').addEventListener('click',()=>{
    if(!data)return;
    const content=['HistoryBox data notes',data.world.name || 'Unnamed world',data.warningCount+' warnings','',...data.warnings].join('\n');
    const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='HistoryBox-data-notes.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  $('diagnostics-button').addEventListener('click', () => $('diagnostics').showModal());
  $('previous').addEventListener('click', () => { const ys = scopeYears(); selectYear(ys[ys.indexOf(year) - 1]); });
  $('next').addEventListener('click', () => { const ys = scopeYears(); selectYear(ys[ys.indexOf(year) + 1]); });
  $('year').addEventListener('input', e => {
    const token = ++renderToken;
    requestAnimationFrame(() => { if (token === renderToken) selectYear(e.target.value); });
  });
  $('year').addEventListener('keydown', e => {
    const ys = scopeYears(), index = ys.indexOf(year);
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      e.preventDefault(); const target = e.key === 'Home' ? 0 : e.key === 'End' ? ys.length - 1 : index + (['ArrowLeft', 'ArrowDown'].includes(e.key) ? -1 : 1);
      selectYear(ys[Math.max(0, Math.min(ys.length - 1, target))]);
    }
  });
  function selectAge(value) {
    const previous = range();
    customWindow = value === 'custom'; age = value === 'all' || customWindow ? null : Number(value);
    [windowStart,windowEnd] = previous;
    const [lo,hi]=range();
    const years=scopeYears();if(!years.includes(year))year=years[0] ?? null;
    syncWindow();
  }
  $('age').addEventListener('change', e => selectAge(e.target.value));
  document.addEventListener('keydown',e=>{
    if(!data || $('timeline-shell').hidden || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || (e.target.closest('input:not([type=checkbox]),textarea,select,[contenteditable],dialog,#select-menu') && !(e.target.id==='year' && ['ArrowUp','ArrowDown'].includes(e.key))))return;
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
      e.preventDefault();const ys=scopeYears(),i=ys.indexOf(year);if(ys.length)selectYear(ys[Math.max(0,Math.min(ys.length-1,i+(e.key==='ArrowRight'?1:-1)))]);
    } else if(e.key==='ArrowUp'||e.key==='ArrowDown'){
      e.preventDefault();const menu=$('age'),i=Math.max(0,Math.min(menu.options.length-1,menu.selectedIndex+(e.key==='ArrowDown'?1:-1)));selectAge(menu.options[i].value);
    }
  });
  function setWindow(e) {
    if (!customWindow) return;
    const [lo,hi] = range(), bounds = rangeBounds(), value = e.target.valueAsNumber;
    if (e.target.id === 'window-start') windowStart = Number.isFinite(value) ? Math.max(bounds[0],Math.min(hi,Math.trunc(value))) : lo;
    else windowEnd = Number.isFinite(value) ? Math.max(lo,Math.min(bounds[1],Math.trunc(value))) : hi;
    syncWindow();
  }
  $('window-start').addEventListener('change', setWindow);
  $('window-end').addEventListener('change', setWindow);
  document.addEventListener('click', e => {
    const anchor=e.target.closest('a[href^="#/"]');
    if(data && anchor && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button===0)pageScroll.set(displayedHash,scrollY);
  },true);
  window.addEventListener('hashchange', () => {
    if (!data) return;
    displayedHash = location.hash;
    pages.delete('entity-records'); render();
    // Native fragment navigation may already have scrolled to zero. Use the
    // outgoing click/scroll snapshot, never that post-navigation position.
    const position = pageScroll.get(displayedHash) ?? (history.state?.route === displayedHash ? history.state.scroll : 0);
    window.scrollTo({top:position || 0,behavior:'instant'});
  });
  $('main').addEventListener('click', e => {
    const track = e.target.closest('[data-track]');
    if (track) { const value = showTimelineTooltip(e, track); if (value !== null) selectYear(value); return; }
    const plot = e.target.closest('[data-plot]');
    if (plot) { const value = showChartTooltip(e, plot); if (value !== null) selectYear(value); return; }
    const target = e.target.closest('button,a,[data-year]'); if (!target) return;
    if (target.dataset.allLegend) {
      const c = charts.get(target.dataset.allLegend), hidden = legendHidden.get(c.chartKey);
      const next=new Set(hidden || []),show=c.all.some(s=>next.has(s.name));
      for(const series of c.all)if(show)next.delete(series.name);else next.add(series.name);
      legendHidden.set(c.chartKey,next); render();
    }
    if (target.dataset.allCompare) { const s = browserState(target.dataset.allCompare); s.selected = s.selected.length ? [] : [...s.filteredIds]; render(); }
    if (target.dataset.allColumns) { const s = browserState(target.dataset.allColumns), available = browserColumns(target.dataset.allColumns, s.mode); s.columns[s.mode] = s.columns[s.mode].length === available.length ? ['name'] : available; render(); }
    if (target.dataset.toggle) { preferences.set(target.dataset.toggle, !pref(target.dataset.toggle, false)); render(); }
    if (target.dataset.year) selectYear(target.dataset.year);
    if (target.dataset.entityWindow) {
      const type=target.dataset.entityType, id=target.dataset.entityWindow;
      const duration=entityDuration(type,id);
      if(duration){age=null;customWindow=true;[windowStart,windowEnd]=duration;const years=scopeYears();if(!years.includes(year))year=years[0]??null;syncWindow();}
    }
    if (target.dataset.eventYear) { const y = Number(target.dataset.eventYear); if (!scopeYears().includes(y)) { age = null; customWindow = false; windowStart = null; windowEnd = null; } selectYear(y); }
    if (target.dataset.age !== undefined) { e.preventDefault(); selectAge(target.dataset.age); }
    if (target.dataset.sort) { const s = tableStates.get(target.dataset.sort); if (s.field === target.dataset.field) s.direction *= -1; else { s.field = target.dataset.field; s.direction = 1; } render(); }
    if (target.dataset.page) { pages.set(target.dataset.page, Math.max(0, (pages.get(target.dataset.page) || 0) + Number(target.dataset.step))); render(); }
    if (target.dataset.reset) { const old = browserState(target.dataset.reset); browserStates.delete(target.dataset.reset); const fresh = browserState(target.dataset.reset); fresh.selected = old.selected; fresh.columns = old.columns; fresh.mode = old.mode; render(); }

  });
  function handleChange(e) {
    const target = e.target;
    if (target.dataset.global) { browserState(target.dataset.global).showGlobal = target.checked; render(); }
    if (target.dataset.legend) {
      const c = charts.get(target.dataset.legend), hidden = legendHidden.get(c.chartKey) || new Set();
      if (target.checked) hidden.delete(target.dataset.series); else hidden.add(target.dataset.series);
      legendHidden.set(c.chartKey, hidden); render();
    }
    if (target.dataset.pref) { preferences.set(target.dataset.pref, target.value); render(); }
    if (target.dataset.browser) { const s = browserState(target.dataset.type); s[target.dataset.browser] = target.value.trim(); pages.set(`browser-${target.dataset.type}-${s.mode}`, 0); render(); }
    if (target.dataset.column) { const s = browserState(target.dataset.type), cols = s.columns[s.mode]; const chosen = new Set(cols); if (target.checked) chosen.add(target.dataset.column); else chosen.delete(target.dataset.column); s.columns[s.mode] = browserColumns(target.dataset.type, s.mode).filter(c => chosen.has(c)); render(); }
    if (target.dataset.compare) {
      const type = H.TYPES.includes(route().id) ? route().id : 'kingdoms', s = browserState(type), id = target.dataset.compare;
      
      s.selected = target.checked ? [...s.selected, id] : s.selected.filter(v => v !== id); render();
    }

  }
  $('main').addEventListener('pointermove', event => {
    const tip = event.target.closest('[data-tip]'); if (tip) hoverTip(event, tip);
    const plot = event.target.closest('[data-plot]');
    if (plot) showChartTooltip(event, plot);
    const track = event.target.closest('[data-track]');
    if (track) showTimelineTooltip(event, track);
  });
  $('main').addEventListener('pointerout', event => {
    if(event.target.id==='world-map')deferTooltipHide();
    const plot = event.target.closest('[data-plot]');
    const track = event.target.closest('[data-track]');
    const tip=event.target.closest('[data-tip]');if(tip && !tip.contains(event.relatedTarget)){cancelLinkTip();deferTooltipHide();}
    if (track && !track.contains(event.relatedTarget)) { deferTooltipHide(); track.closest('.timeline-content').querySelectorAll('.track-hover').forEach(line => line.hidden = true); }
    if (plot && !plot.contains(event.relatedTarget)) { deferTooltipHide(); plot.parentNode.querySelector('.hover-line').setAttribute('hidden', ''); }
  });
  $('main').addEventListener('keydown', event => {
    const plot = event.target.closest('[data-plot],[data-track]');
    if (!plot) return;
    const c = plot.dataset.plot ? charts.get(plot.dataset.plot) : timelineViews.get(plot.dataset.track);
    if (!c.years.length) return;
    const index = c.years.indexOf(data.nearest(year, c.years));
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? c.years.length - 1 : index + (['ArrowLeft', 'ArrowDown'].includes(event.key) ? -1 : 1);
      selectYear(c.years[Math.max(0, Math.min(c.years.length - 1, next))]);
    }
    if (event.key === 'Escape') $('chart-tooltip').hidden = true;
  });
  $('main').addEventListener('scroll', event => {
    if (event.target.dataset.scroll) scrollPositions.set(event.target.dataset.scroll, event.target.scrollTop);
    if (event.target.dataset.events) { scrollPositions.set(event.target.dataset.events, event.target.scrollTop); paintEvents(event.target); }
  }, true);
  $('main').addEventListener('change', handleChange);
  let searchTimer;
  $('main').addEventListener('input', e => { if (e.target.type === 'search' || (e.target.type === 'text' && e.target.dataset.browser)) { clearTimeout(searchTimer); searchTimer = setTimeout(() => handleChange(e), 220); } });
})();





