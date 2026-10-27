/* Presentation and navigation. Historical calculations live in parser.js. */
(function () {
  'use strict';
  const THEME = HistoryBoxTheme;
  const H = HistoryBox, $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const singular = type => ({ kingdoms: 'kingdom', villages: 'village', characters: 'character', wars: 'war', alliances: 'alliance' }[type] || type);
  const colors = { human: THEME.human, elf: THEME.elf, orc: THEME.orc, dwarf: THEME.dwarf, attacker: THEME['attacker-data'], defender: THEME['defender-data'] };
  const palette = [THEME['global-data']];
  const legendHidden = new Map(), eventViews = new Map(), timelineViews = new Map(), scrollPositions = new Map();
  const entityColor = (type,id) => type === 'world' ? THEME['global-data'] : colors[data?.entity(type,id)?.founding_species || data?.entity(type,id)?.species] || THEME['entity-data'];
  const metricColor = metric => colors[metric] || THEME['global-data'];
  const typeLabel = type => type.charAt(0).toUpperCase() + type.slice(1);
  const labels = { characters:'Characters', tracked_characters:'Characters', species:'Species', gender:'Gender', role:'Role', level:'Level', kills:'Total kills', kill_change:'Kill change', village_id:'Home village', capital_id:'Capital', birth_year:'Birth year', first_observed:'First observed', alliances_observed:'Alliances', entity_age: 'Age', period_peak_population: 'Peak population', population: 'Population', kingdoms: 'Kingdoms', villages: 'Villages', wars: 'Wars', alliances: 'Alliance memberships', army: 'Army', territory: 'Territory', houses: 'Houses', food: 'Food holdings', coins: 'Coin holdings', loyalty: 'Loyalty', population_share: 'Share of global population', territory_share: 'Share of village territory', army_ratio: 'Army / population', food_per_resident: 'Food / resident', coins_per_resident: 'Coins / resident', houses_per_resident: 'Houses / resident', attacker_deaths: 'Attacker deaths', defender_deaths: 'Defender deaths', total_deaths: 'Total deaths', change_total_deaths: 'Casualty change', change_attacker_deaths: 'Attacker casualty change', change_defender_deaths: 'Defender casualty change', members: 'Members', attackers: 'Attackers', defenders: 'Defenders', historical_members: 'Distinct historical members', intervals: 'Involvement intervals', rejoining: 'Members with repeated intervals', participation_changes: 'Recorded participation transitions', duration: 'Exact duration (years)', owners: 'Distinct known owners', ownership_changes: 'Observed owner changes', distinct_wars: 'Distinct wars', distinct_alliances: 'Distinct alliances', distinct_attackers: 'Distinct attackers', distinct_defenders: 'Distinct defenders', name: 'Name', id: 'ID', founding_species: 'Founding species', start_year: 'Start year', end_year: 'End year', war_type: 'War type', instigator: 'Instigator', kingdom_id: 'Recorded owner', latest_year: 'Last casualty observation' };
  function label(metric) {
    if (metric === 'wars_observed') return 'Wars';
    if (labels[metric]) return labels[metric];
    if (metric.startsWith('peak_')) return `Lifetime peak ${label(metric.slice(5)).toLowerCase()}`;
    if (metric.startsWith('latest_')) return `Latest recorded ${label(metric.slice(7)).toLowerCase()}`;
    if (metric.endsWith('_share')) return `${label(metric.slice(0, -6))} proportion`;
    return metric.charAt(0).toUpperCase() + metric.slice(1).replaceAll('_', ' ');
  }
  const percent = m => m.endsWith('_share') || m === 'army_ratio';
  const format = (v, metric = '') => H.numeric(v) ? percent(metric) ? `${(v * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%` : v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—';
  const date = (v, qualify = true) => v == null ? '—' : (qualify && H.boundary(v)?.exact === false ? 'Observed ' : '') + String(v);
  // Unavailable values are smaller than every numeric value, in either sort direction.
  function compareValues(a, b, direction = 1) {
    const missing = v => v == null || v === '—' || (typeof v === 'number' && !Number.isFinite(v));
    if (missing(a) || missing(b)) return (missing(a) === missing(b) ? 0 : missing(a) ? -1 : 1) * direction;
    return H.compare(a, b, direction);
  }
  let data = null, year = null, age = null, customWindow = false, windowStart = null, windowEnd = null, renderToken = 0;
  const requestedHash = location.hash;
  let displayedHash = location.hash;
  const pageScroll = new Map();
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
    try { localStorage.setItem('historybox-view', JSON.stringify({ worldKey: JSON.stringify(data.world), year, age, customWindow, windowStart, windowEnd, hash: location.hash, preferences: [...preferences], pages: [...pages], browserStates: [...browserStates], tableStates: [...tableStates], legends: [...legendHidden].map(([k,v]) => [k,[...v]]), speed: $('speed').value, scroll: scrollY })); } catch {}
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
  function play() {
    clearTimeout(playback);
    $('play').textContent = 'Ⅱ'; $('play').setAttribute('aria-label','Pause history'); $('play').setAttribute('aria-pressed','true');
    playback = setTimeout(() => {
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
    const box = tip.getBoundingClientRect();
    const left = event.clientX + gap + box.width <= innerWidth - margin ? event.clientX + gap : event.clientX - gap - box.width;
    const top = event.clientY - gap - box.height >= margin ? event.clientY - gap - box.height : event.clientY + gap;
    tip.style.left = Math.max(margin,Math.min(innerWidth-box.width-margin,left)) + 'px';
    tip.style.top = Math.max(margin,Math.min(innerHeight-box.height-margin,top)) + 'px';
  }
  const pref = (id, initial) => preferences.has(id) ? preferences.get(id) : initial;
  function entityIcon(type) {
    const shapes = { characters:'<circle cx="12" cy="5" r="4"/><path d="M3 23v-7c0-3 4-5 9-5s9 2 9 5v7h-5v-6h-1v6H9v-6H8v6z"/>', kingdoms: '<path d="M12 1l3.4 7 7.6 1.1-5.5 5.4 1.3 7.5-6.8-3.6-6.8 3.6 1.3-7.5L1 9.1 8.6 8z"/>', villages: '<path d="M12 1.6L24 22.4H0z"/>', wars: '<path d="M5 1l7 7 7-7 4 4-7 7 7 7-4 4-7-7-7 7-4-4 7-7-7-7z"/>', alliances: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="3"/>' };
    return '<svg class="entity-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">' + (shapes[type] || '') + '</svg>';
  }
  function link(type, id, text) {
    const entity = data.entity(type, id);
    return entity ? `<a class="entity-link" data-tip="${esc(`${date(entity.start_year)} → ${date(entity.end_year)}`)}" style="--series:${entityColor(type, id)}" href="#/${singular(type)}/${encodeURIComponent(id)}">${entityIcon(type)}${esc(text ?? entity.name ?? `#${id}`)}</a>` : `<span title="Unresolved recorded reference">${esc(text ?? `Unknown ${singular(type)} #${id}`)}</span>`;
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
    return `<a href="#" data-age="${index === null ? 'all' : index}">${esc(text ?? ageName(index))}</a>`;
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
    $('year').disabled = !years.length; $('year').setAttribute('aria-valuetext', year === null ? 'No confident observation in this age' : `Recorded year ${year}`);
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
      return `<div class="card" style="--series:${baseColor};--trend-color:${changeColor}"><span class="metric">${esc(label(m))}</span><strong>${format(v, m)}</strong>${hasTrend ? `<small class="value-change">${delta === null ? '—' : `${delta > 0 ? '+' : ''}${format(delta,m)}${old !== 0 ? ` (${(delta / Math.abs(old) * 100).toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1})}%)` : ''}`}</small>` : '<small aria-hidden="true">&nbsp;</small>'}${hasTrend ? ended ? '<div class="trend-space" aria-hidden="true"></div>' : sparkline(trend.type,trend.id,m) : ''}</div>`;
    }).join('')}</div>`;
  }
  function snapshotCards(snapshot, type, id, previous, previousYear) {
    const quantities = ['population','army','territory','houses','food','coins'];
    const groups = type === 'characters' ? [['Character',['entity_age','level','coins','kills']]] : type === 'world' ? [
      ['Civilizations', ['kingdoms','villages','wars',...(data.hasCharacters ? ['tracked_characters'] : [])]], ['Quantities', quantities], ['Species population', H.SPECIES]
    ] : [
      ['Context', ['entity_age', ...(type === 'kingdoms' ? ['villages','wars','alliances'] : type === 'villages' ? ['loyalty'] : type === 'wars' ? ['members','attackers','defenders'] : ['members'])]],
      ['Quantities', quantities], ['Species population', H.SPECIES],
      ['Proportions', ['population_share','army_ratio', ...(type === 'alliances' ? ['territory_share'] : [])]],
      ['Per resident', ['food_per_resident','coins_per_resident','houses_per_resident']]
    ];
    return groups.map(([name,metrics]) => cards(snapshot,metrics,previous,previousYear,{type,id},name)).join('');
  }
  function staticSummary(values, groups) {
    return '<div class="static-summary">' + groups.map(([title, metrics]) => `<section><h4>${esc(title)}</h4><dl>${metrics.map(m => `<div><dt>${esc(label(m))}</dt><dd>${format(values[m],m)}</dd></div>`).join('')}</dl></section>`).join('') + '</div>';
  }
  function staticBar(value, maximum) {
    return H.numeric(value) && value >= 0 && maximum > 0 ? '<span class="static-bar" aria-hidden="true"><i style="width:'+Math.min(100,value/maximum*100)+'%"></i></span>' : '';
  }
  function lifetimeHighlights(stats, metric, color) {
    const points = [['Peak',stats.peak],['Minimum',stats.minimum],['First available',stats.first],['Latest available',stats.last]];
    // Only bounded shares represent parts of a whole; other ratios stay in the ledger.
    if ((metric.endsWith('_share') || metric === 'army_ratio') && points.every(([,p]) => !p || (p.value >= 0 && p.value <= 1))) {
      return `<div class="share-highlights" style="--series:${color}">${points.map(([title,p]) => `<figure${p ? ` data-tip="${esc(title + ': ' + format(p.value,metric))}"` : ''}><figcaption>${title}</figcaption>${p ? `<svg viewBox="0 0 120 120" role="img" aria-label="${esc(title + ': ' + format(p.value,metric))}"><circle class="share-track" cx="60" cy="60" r="46"/><circle class="share-value" cx="60" cy="60" r="46" pathLength="100" stroke-dasharray="${p.value*100} 100" transform="rotate(-90 60 60)"/><text x="60" y="65">${format(p.value,metric)}</text></svg><button data-event-year="${p.year}">Year ${p.year}</button>` : '<p>—</p>'}</figure>`).join('')}</div>`;
    }
    return `<table class="highlight-ledger"><thead><tr><th class="year-column">Year</th><th>Record</th><th>${esc(label(metric))}</th></tr></thead><tbody>${points.map(([title,p]) => `<tr><td class="year-column">${p ? `<button data-event-year="${p.year}">${p.year}</button>` : '—'}</td><th scope="row">${title}</th><td><span data-number>${format(p?.value,metric)}</span>${staticBar(p?.value,stats.peak?.value)}</td></tr>`).join('')}</tbody></table>`;
  }
  function chart(series, metric, { stacked = false, proportions = false, inverted = false, legendControls = true, solid = true, id = '' } = {}) {
    const [lo, hi] = range(), allowed = new Set(scopeYears());
    const width = 1100, height = 330, left = 76, right = 24, top = 24, bottom = 40;
    const cid = 'chart-' + (++chartNumber);
    const chartKey = location.hash + ':' + (id || series.map(s => s.name).join('|')) + ':' + metric;
    const hidden = legendControls ? legendHidden.get(chartKey) || new Set() : new Set();
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
    return '<div class="chart-frame"><svg class="chart" data-chart="' + cid + '" viewBox="0 0 ' + width + ' ' + height + '">' + gaps + grid + marks + selected + axis + '<line class="hover-line" hidden y1="' + top + '" y2="' + (height - bottom) + '"/><rect class="interaction" data-plot="' + cid + '" x="' + left + '" y="' + top + '" width="' + (width - left - right) + '" height="' + (height - top - bottom) + '" tabindex="0" role="slider" aria-label="' + esc(label(metric)) + ': hover to inspect, click or use arrow keys to select a recorded year" aria-valuemin="' + lo + '" aria-valuemax="' + hi + '" aria-valuenow="' + (year ?? lo) + '"/></svg></div><div class="legend">' + (legendControls && all.length > 1 ? '<button data-all-legend="' + cid + '">' + (hidden.size ? 'Select all' : 'Deselect all') + '</button>' : '') + legend + '</div>';
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
    tooltip.innerHTML = '<strong>' + esc(c.row.name) + ' · Year ' + selected + '</strong>' + (intervals.length ? intervals.map(i => '<div>' + esc(date(i.start_year)) + ' → ' + esc(date(i.end_year)) + (i.side ? ' · ' + esc(i.side) : '') + '</div>').join('') : '');
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

  function demographics(type, id, chartId) {
    const saved = pref(chartId+'-mode','lines'), mode = saved === 'total' ? 'lines' : saved;
    const series = H.SPECIES.map(s => ({ name:label(s),color:colors[s],points:data.series(type,id,s) }));
    if (mode === 'lines') series.unshift({name:type === 'world' ? 'Global' : 'Total',color:THEME['global-data'],points:data.series(type,id,'population')});
    return panel('Population',mode === 'pie' ? populationPie(type,id) : chart(series,'population',{stacked:mode !== 'lines',proportions:mode === 'percentage',id:chartId}),selector(chartId+'-mode','View',['lines','absolute','percentage','pie'],mode,v=>({lines:'Lines',absolute:'Stacked',percentage:'Percentage',pie:'Population pie'}[v])));
  }

  function cell(value, field) {
    if (field === 'kingdom_id' || field === 'instigator') return value === null ? '—' : value === undefined ? '—' : link('kingdoms', value);
    if (field === 'start_year' || field === 'end_year') return esc(date(value));
    if (field === 'village_id' || field === 'capital_id') return value == null ? '—' : link('villages',value);
    if (field === 'founding_species' || field === 'species') return `<span class="species" style="--series:${colors[value] || THEME['unknown-species']}">${esc(value ?? '—')}</span>`;
    return H.numeric(value) ? format(value, field) : esc(value ?? '—');
  }
  function sorted(rows, field, direction) {
    return [...rows].sort((a, b) => {
      let av = a.values[field], bv = b.values[field];
      if (field === 'start_year' || field === 'end_year') { av = H.boundary(av)?.lo ?? null; bv = H.boundary(bv)?.lo ?? null; }
      return compareValues(av, bv, direction) || H.compare(a.entity.id, b.entity.id);
    });
  }
  function table(type, rows, columns, id, { limit = 25, selectable = false, selected = [] } = {}) {
    const state = tableStates.get(id) || { field: columns.includes('level') ? 'level' : columns.includes('peak_level') ? 'peak_level' : columns.includes('population') ? 'population' : 'name', direction: columns.includes('population') ? -1 : 1 };
    tableStates.set(id, state);
    rows = sorted(rows, state.field, state.direction);
    const maxPage = Math.max(0, Math.ceil(rows.length / limit) - 1), page = Math.min(pages.get(id) || 0, maxPage);
    pages.set(id, page);
    return `<div class="table-wrap">
<table${id.endsWith('-year') ? ' class="table-dynamic"' : ''}>
<thead>
<tr>${selectable ? '<th><button data-all-compare="' + type + '">' + (selected.length ? 'Deselect all' : 'Select all') + '</button></th>' : ''}${columns.map(c => `<th aria-sort="${state.field === c ? state.direction === 1 ? 'ascending' : 'descending' : 'none'}">
<button data-sort="${id}" data-field="${c}">${esc(type === 'characters' && c === 'start_year' ? 'Birth year' : label(c))}${state.field === c ? state.direction === 1 ? ' ↑' : ' ↓' : ''}</button>
</th>`).join('')}</tr>
</thead>
<tbody>${rows.slice(page * limit, (page + 1) * limit).map(r => `<tr>${selectable ? `<td>
<input type="checkbox" aria-label="Compare ${esc(r.entity.name)}" data-compare="${esc(r.entity.id)}"${selected.includes(String(r.entity.id)) ? ' checked' : ''}>
</td>` : ''}${columns.map(c => `<td${H.numeric(r.values[c]) ? ' class="number"' : ''}${H.numeric(r.values[c]) && !['id','kingdom_id','instigator','start_year','end_year','latest_year'].includes(c) ? ' data-number' : ''}>${c === 'name' ? link(type, r.entity.id) : cell(r.values[c], c)}</td>`).join('')}</tr>`).join('') || `<tr>
<td colspan="${columns.length + (selectable ? 1 : 0)}" class="empty">No matching entities.</td>
</tr>`}</tbody>
</table>
</div>${rows.length > limit ? `<div class="pagination">
<span>${rows.length} records · page ${page + 1} of ${maxPage + 1}</span>
<button data-page="${id}" data-step="-1"${page === 0 ? ' disabled' : ''}>Previous</button>
<button data-page="${id}" data-step="1"${page === maxPage ? ' disabled' : ''}>Next</button>
</div>` : '<div class="pagination" aria-hidden="true"></div>'}`;
  }
  function timeline(rows, id, { filter = true, sideColors = false } = {}) {
    const query = pref(`${id}-search`, '').toLowerCase(), species = pref(`${id}-species`, ''), sort = pref(`${id}-sort`, 'start');
    const [lo, hi] = id === 'ages' ? [data.years[0], data.years.at(-1)] : range(), pos = n => Math.max(0, Math.min(100, (n - lo) / Math.max(1, hi - lo) * 100));
    const filtered = rows.filter(r => (!query || r.name.toLowerCase().includes(query)) && (!species || r.species === species)).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : compareValues(H.boundary(a.intervals[0]?.start_year)?.lo, H.boundary(b.intervals[0]?.start_year)?.lo));
    const page = Math.min(pages.get(id) || 0, Math.max(0, Math.ceil(filtered.length / 20) - 1)); pages.set(id, page);
    const controls = filter ? `<div class="controls"><input type="search" aria-label="Filter timeline" placeholder="Filter timeline…" data-pref="${id}-search" value="${esc(pref(`${id}-search`, ''))}">${selector(`${id}-species`, 'Species', ['', ...H.SPECIES], species, v => v ? label(v) : 'All species')}${selector(`${id}-sort`, 'Sort', ['start', 'name'], sort)}</div>` : '';
    const gaps = data.gaps.filter(([a, b]) => a < hi && b > lo).map(([a, b]) => `<span class="time-gap" style="left:${pos(a)}%;width:${pos(b) - pos(a)}%" aria-label="No observations between ${a} and ${b}"></span>`).join('');
    const content = filtered.map((r, index) => {
      const trackId = id + ":" + index;
      timelineViews.set(trackId, { row: r, lo, hi, years: (id === 'ages' ? data.years : scopeYears()).filter(y => y >= lo && y <= hi) });
      const bars = r.intervals.map(interval => {
        const a = H.boundary(interval.start_year), b = H.boundary(interval.end_year), end = b?.hi ?? hi;
        if (!a || end < lo || a.lo > hi) return '';
        const color = (sideColors && colors[interval.side]) || (r.type ? entityColor(r.type, r.id) : null) || palette[0];
        const active = id === 'ages' ? year !== null && H.intervalStatus(interval, year) === 'active' : interval.observed ? year >= a.lo && year <= end : id.startsWith('life-') ? !!data.observed(r.type, r.id, year) : H.intervalStatus(interval, year) === 'active';
        const title = `${r.name}: ${date(interval.start_year)} → ${date(interval.end_year)}${interval.side ? ` · ${interval.side}` : ''}${interval.observed ? ' · observed ownership only' : ''}`;
        return `<span class="interval${active ? ' active' : ''}${interval.end_year === null ? ' open' : ''}" style="--series:${color};left:${Math.min(99.75,pos(a.hi))}%;width:${Math.max(.25, pos(b?.lo ?? hi) - pos(a.hi))}%" aria-label="${esc(title)}"></span>${[a, b].filter(v => v && !v.exact).map(v => `<span class="interval uncertain" style="--series:${color};left:${pos(v.lo)}%;width:${pos(v.hi) - pos(v.lo)}%" aria-label="${esc(title)} · uncertain boundary"></span>`).join('')}`;
      }).join('');
      return `<div class="timeline-row"><span>${id === 'ages' ? ageLink(r.id, r.name) : r.type ? link(r.type, r.id, r.name) : esc(r.name)}</span><div class="timeline-track" data-track="${trackId}" tabindex="0" role="slider" aria-label="${esc(r.name)} year" aria-valuemin="${lo}" aria-valuemax="${hi}" aria-valuenow="${year ?? lo}">${bars}${gaps}<span class="track-hover" hidden></span>${year !== null ? `<span class="year-marker" style="left:${pos(year)}%"></span>` : ''}</div></div>`;
    }).join('');
    const spaceId = id + ':space';
    timelineViews.set(spaceId, { row: { name: 'Year', intervals: [] }, lo, hi, years: (id === 'ages' ? data.years : scopeYears()).filter(y => y >= lo && y <= hi) });
    const space = `<div class="timeline-row timeline-space"><span></span><div class="timeline-track" data-track="${spaceId}" aria-label="Select year in timeline" tabindex="0" role="slider" aria-valuemin="${lo}" aria-valuemax="${hi}" aria-valuenow="${year ?? lo}">${gaps}<span class="track-hover" hidden></span>${year !== null ? `<span class="year-marker" style="left:${pos(year)}%"></span>` : ''}</div></div>`;
    return `${controls}<div class="axis"><span>${lo}</span><span>${hi}</span></div><div class="timeline-scroll" data-scroll="${id}"><div class="timeline-content">${content}${space}</div></div>`;
  }
  function rankings(type, metric) {
    const rows = data.rankings(type, year, metric), max = rows[0]?.value || 1;
    return '<div class="ranking-scroll" data-scroll="ranking-' + type + '">' + (rows.map(r => `<div class="ranking" data-tip="${esc(r.entity.name + ': ' + format(r.value, metric))}"><span>${r.rank}. ${link(type, r.entity.id)}</span><span class="ranking-bar" style="--series:${entityColor(type, r.entity.id)};width:${Math.max(0, r.value / max * 100)}%"></span><strong>${format(r.value, metric)}</strong></div>`).join('') || '<p class="empty">—</p>') + '</div>';
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
      const stats = data.period(age), a = data.ages[age] || { name: 'All ages', start_year: data.years[0], end_year: data.years.at(-1) };
      if (age === null) for (const t of ['kingdoms', 'villages']) stats[t + '_ended'] = data.catalog(t).filter(e => { const b = H.boundary(e.end_year); return b && b.lo >= data.years[0] && b.hi <= data.years.at(-1); }).length;
      const periodCards = { population_change: stats.population.change, period_peak_population: stats.population.peak?.value, kingdoms_observed: stats.kingdoms_observed, kingdoms_ended: stats.kingdoms_ended, villages_observed: stats.villages_observed, villages_ended: stats.villages_ended, wars_observed: stats.wars_observed, alliances_observed: stats.alliances_observed, tracked_characters: stats.tracked_characters };
      ageContent = section('Ages', `<div class="panel age-analysis">
<h3 class="age-title">${ageLink(age, ageName(age))} <span>· ${esc(date(a.start_year))} → ${esc(date(a.end_year))}</span></h3>${stats.years.length ? staticSummary(periodCards, [['Population', ['population_change','period_peak_population']], ['Civilizations', ['kingdoms_observed','kingdoms_ended','villages_observed','villages_ended']], ['History', ['wars_observed','alliances_observed','tracked_characters']]]) : '<p class="warning">No recorded observation can confidently be assigned to this age.</p>'}
<div class="age-timeline"><h3>Historical ages</h3>${timeline(data.ages.map((a, i) => ({ name: `${ageName(data.ages.indexOf(a))}`, intervals: [a], id: i })), 'ages', { filter: false })}</div>
</div>`);
    }
    const observationMetric = worldMetrics.includes(pref('world-observations-metric','army')) ? pref('world-observations-metric','army') : 'army';
    const observations = panel('Historical observations',chart([{name:label(observationMetric),points:worldSeries(observationMetric)}],observationMetric),selector('world-observations-metric','Measure',worldMetrics,observationMetric));
    return `<div class="page-head">
<div>

<h1>World overview</h1>

</div>

</div>${year === null ? '<p class="warning">Selected age has no confident observations. Snapshot values are unavailable.</p>' : ''}${section('World snapshot', snapshotCards(snapshot, 'world', '', previous, previousYear))}${ageContent}${section('World statistics', `<div class="grid">${demographics('world', '', 'world-species')}${observations}</div>`)}${section('Chronology', `<div class="grid">${['kingdoms','villages','wars','alliances'].map(t => panel(typeLabel(t),timeline(data.catalog(t).map(e=>({name:e.name || `#${e.id}`,id:e.id,type:t,species:e.founding_species||e.species,intervals:[e]})),`life-${t}`,{filter:t==='kingdoms'||t==='villages'}))).join('')}</div>`)}${section('Rankings', `<div class="grid">${['kingdoms','villages','wars','alliances'].map(t=>{const choices=standardMetrics(t),metric=choices.includes(pref(`ranking-${t}`,choices[0]))?pref(`ranking-${t}`,choices[0]):choices[0];return panel(typeLabel(t),`<p class="ranking-year">Year ${year ?? '—'}</p>${rankings(t,metric)}`,selector(`ranking-${t}`,'Measure',choices,metric));}).join('')}</div>`)}${section('Historical milestones', `<div class="panel">${events()}</div>`)}`;
  }
  const populationMetrics = ['population',...H.SPECIES];
  const commonMetrics = [...populationMetrics, 'army', 'territory', 'houses', 'food', 'coins', 'population_share', 'army_ratio', 'food_per_resident', 'coins_per_resident', 'houses_per_resident'];
  const warMetrics = ['total_deaths','attacker_deaths','defender_deaths','attackers','defenders'];
  const standardMetrics = type => type === 'characters' ? ['level','coins','kills'] : [...commonMetrics, 'tracked_characters', ...(type === 'villages' ? ['loyalty'] : type === 'kingdoms' ? ['villages'] : ['members']), ...(type === 'alliances' ? ['territory_share'] : [])];
  const observationMetrics = type => [...standardMetrics(type).filter(m=>!populationMetrics.includes(m)), ...(type === 'wars' ? warMetrics : [])];
  const worldMetrics = [...commonMetrics.filter(m=>!populationMetrics.includes(m) && m !== 'population_share'),'kingdoms','villages','wars','tracked_characters','total_deaths','attacker_deaths','defender_deaths'];
  const worldSeries = metric => metric.endsWith('_deaths') ? data.casualtySeries(metric) : data.series('world','',metric);
  const metricsFor = type => [...standardMetrics(type), ...(type === 'wars' ? warMetrics : [])];
  function entityAge(entity) {
    const start = H.boundary(entity.start_year), end = H.boundary(entity.end_year);
    if (year === null || !start?.exact || year < start.lo || (end && year >= end.lo)) return null;
    return year - start.lo;
  }
  function entityPage(type, id) {
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
      ownership = section('Recorded kingdom allegiance', `<div class="panel">
<p>Owner: ${snapshot ? snapshot.kingdom_id === null ? '—' : link('kingdoms', snapshot.kingdom_id) : '—'}</p>${timeline([...owners.values()], 'ownership', { filter: false })}
<div class="table-wrap">
<table class="year-table">
<thead>
<tr>
<th class="year-column">Year</th>
<th>Previous owner</th>
<th>Next owner</th>
</tr>
</thead>
<tbody>${history.changes.map(c => `<tr>
<td class="year-column"><button data-event-year="${c.to}">${c.to}</button></td>
<td>${c.previous === null ? '—' : link('kingdoms', c.previous)}</td>
<td>${c.owner === null ? '—' : link('kingdoms', c.owner)}</td>
</tr>`).join('')}</tbody>
</table>
</div>
</div>`);
    } else if (type === 'kingdoms') {
      const rows = data.catalog('villages').flatMap(v => { const runs = data.ownership(v.id).runs.filter(r => String(r.owner) === String(id)); return runs.length ? [{ name: v.name, id: v.id, type: 'villages', species: v.founding_species, intervals: runs }] : []; });
      const current = data.observed('kingdoms', id, year)?.cities || [];
      ownership = section('Village ownership', `<div class="panel">${timeline(rows, 'owned-villages')}<div class="owned-village-list" tabindex="0" aria-label="Selected-year recorded villages">${current.map(v => link('villages', v)).join(', ') || '—'}</div></div>`);
    }
    const membership = data.memberships(type, id, year);
    const membershipText = membership.length ? membership.map(m => `${link('kingdoms', m.id)} <span class="pill">${esc(m.side || 'member')} · ${esc(m.status)}</span>`).join(' · ') : '—';
    const relationshipPanel = (title, rows, records, chartId, introduction = '') => section(title, `<div class="panel">${introduction}${timeline(rows, chartId, { filter: false, sideColors: type === 'wars' })}<div class="table-wrap"><table><thead><tr><th>Related entity</th><th>Role</th><th>Start</th><th>End</th><th>At selected year</th></tr></thead><tbody>${records.map(r => `<tr><td>${link(r.type, r.id)}</td><td>${esc(r.side || 'Member')}</td><td>${esc(date(r.start_year))}</td><td>${esc(date(r.end_year))}</td><td>${H.intervalStatus(r, year)}</td></tr>`).join('') || '<tr><td colspan="5">—</td></tr>'}</tbody></table></div></div>`);
    const relations = type === 'kingdoms'
      ? ['wars','alliances'].map(t => relationshipPanel(typeLabel(t), intervals.filter(r => r.type === t), relationshipRecords.filter(r => r.type === t), 'involvement-' + t)).join('')
      : intervals.length ? relationshipPanel(type === 'wars' ? 'War participation' : 'Alliance membership', intervals, relationshipRecords, 'involvement', `<p>${membershipText}</p>`) : '';
    const highlightMetric = metrics.includes(pref(`entity-highlight-${type}`,type === 'characters' ? 'level' : 'population')) ? pref(`entity-highlight-${type}`,type === 'characters' ? 'level' : 'population') : metrics[0], stats = data.stats(type, id, highlightMetric);
    const historical = `<div class="panel"><div class="controls">${selector(`entity-highlight-${type}`, 'Lifetime measure', metrics, highlightMetric)}</div>${lifetimeHighlights(stats, highlightMetric, metricColor(highlightMetric))}${type === 'alliances' ? staticSummary(summary, [['Membership', ['historical_members','peak_members']], ['Participation', ['intervals','rejoining','participation_changes']]]) : ''}</div>`;
    const chartId = `entity-${type}`, observationOptions = observationMetrics(type), historicalMetric = observationOptions.includes(pref(`${chartId}-metric`,type === 'characters' ? 'level' : 'army')) ? pref(`${chartId}-metric`,type === 'characters' ? 'level' : 'army') : observationOptions[0];
    const observationSeries = [{name:type === 'wars' ? 'Total' : entity.name,type,id,color:type==='wars' && historicalMetric.startsWith('attacker')?colors.attacker:type==='wars' && historicalMetric.startsWith('defender')?colors.defender:THEME['global-data'],points:data.series(type,id,historicalMetric)}];
    if(type === 'wars' && (!warMetrics.includes(historicalMetric) || historicalMetric==='total_deaths')) for(const side of ['attacker','defender']) observationSeries.push({name:typeLabel(side+'s'),color:colors[side],points:historicalMetric==='total_deaths'?data.series(type,id,side+'_deaths'):data.warSideSeries(id,side,historicalMetric)});
    observationSeries.push({name:`Global ${singular(type)} average`,color:THEME['comparison-secondary'],points:data.averageSeries(type,historicalMetric)});
    const baseCharts = panel('Historical observations',chart(observationSeries,historicalMetric,{id:'entity-observations-'+type}),selector(`${chartId}-metric`,'Measure',observationOptions,historicalMetric));
    const secondary = type === 'characters' ? '' : demographics(type,id,`entity-${type}-species`);
    let uniqueCharts = type === 'characters' ? characterHistory(id) : '';
    if (type === 'kingdoms' || type === 'villages') ownership += leadershipHistory(type,id);
    return `<div class="page-head entity-record" style="--record-color:${entityColor(type,id)}">
<div>
<p class="eyebrow">${singular(type).toUpperCase()} RECORD</p>
<h1>${esc(entity.name ?? '—')}</h1>
<dl class="definition">
<div>
<dt>${type === 'characters' ? 'Born' : 'First observed'}</dt>
<dd>${esc(date(entity.start_year, false))}</dd>
</div>
<div>
<dt>${!H.boundary(entity.end_year) || H.boundary(entity.end_year)?.exact ? 'Ended' : 'Observed end'}</dt>
<dd>${esc(date(entity.end_year, false))}</dd>
</div>
<div>
<dt>Exact duration</dt>
<dd data-number>${H.duration(entity) === null ? '—' : format(H.duration(entity)) + ' years'}</dd>
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
</div>` : ''}</dl><div class="controls">${data.overlappingAges(type, id).map(a => `<span class="pill">${ageLink(data.ages.indexOf(a), ageName(data.ages.indexOf(a)))}</span>`).join('')}</div>
</div>

</div>${snapshot?.complete === false ? '<p class="warning">Some relationships are unresolved or uncertain. Incomplete totals are unavailable; confirmed participant counts are lower bounds.</p>' : ''}${section(label(singular(type)) + ' snapshot', snapshotAssociations(type,id,snapshot) + snapshotCards({ ...snapshot, entity_age: type === 'characters' && !snapshot ? null : entityAge(entity) }, type, id, previous, previousYear))}${section('Lifetime recorded highlights', historical)}<div class="grid">${secondary}${baseCharts}${uniqueCharts}</div>${ownership}${relations}${section('Historical milestones', `<div class="panel">${events(type, id)}</div>`)}`;
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
    return panel(title,timeline([...rows.values()],type+'-'+id+'-'+field,{filter:false}));
  }
  function characterHistory(id) {
    const relatives=data.family(id);
    const family='<div class="table-wrap"><table><thead><tr><th>Relation</th><th>Character</th></tr></thead><tbody>'+relatives.map(r=>'<tr><td>'+esc(r.relationship)+'</td><td>'+link('characters',r.id)+'</td></tr>').join('')+'</tbody></table></div>';
    return observationTimeline('characters',id,'role',null,'Role history')+observationTimeline('characters',id,'kingdom_id','kingdoms','Kingdom history')+observationTimeline('characters',id,'village_id','villages','Home village history')+panel('Family',relatives.length?family:'<p class="empty">No relatives recorded.</p>');
  }
  function leadershipHistory(type,id) {
    const role=type==='kingdoms'?'king':'leader',field=type==='kingdoms'?'kingdom_id':'village_id',rows=[];
    for(const e of data.catalog('characters')) {
      const runs=data.observationRuns('characters',e.id,'ruler',s=>s.role===role && String(s[field])===String(id)).runs.filter(r=>r.value);
      if(runs.length)rows.push({name:e.name||'#'+e.id,id:e.id,type:'characters',intervals:runs});
    }
    let content=section(type==='kingdoms'?'Kings':'Village leaders','<div class="panel">'+timeline(rows,'rulers-'+type+'-'+id,{filter:false})+'</div>');
    if(type==='kingdoms') {
      const rows=new Map(),history=data.observationRuns(type,id,'capital',(r,y)=>data.records.get(y)?.raw.characters===undefined?null:r.cities?.[0]??null);
      for(const r of history.runs){const k=String(r.value);if(!rows.has(k))rows.set(k,{name:r.value==null?'—':data.entity('villages',r.value)?.name||'#'+r.value,type:'villages',id:r.value,intervals:[]});rows.get(k).intervals.push(r);}
      content=section('Capitals','<div class="panel">'+timeline([...rows.values()],'capitals-'+id,{filter:false})+'</div>')+content;
    }return content;
  }
  function entityTabs(type) {
    return '<nav class="entity-tabs" aria-label="Entity types">' + H.TYPES.map(t => '<a href="#/browser/' + t + '"' + (t === type ? ' aria-current="page"' : '') + '>' + entityIcon(t) + typeLabel(t) + '</a>').join('') + '</nav>';
  }
  function browserColumns(type, mode) {
    if (type === 'characters') return ['name','id','species','gender','start_year','end_year','duration',...(mode === 'year' ? ['role','kingdom_id','village_id','level','coins','kills'] : ['peak_level','peak_coins','peak_kills'])];
    const identity = ['name', 'id', ...(type === 'kingdoms' || type === 'villages' ? ['founding_species'] : []), 'start_year', 'end_year', 'duration'];
    if (mode === 'year') return [...identity, ...(type === 'villages' ? ['kingdom_id'] : type === 'wars' ? ['war_type', 'instigator'] : []), ...metricsFor(type), ...(type === 'kingdoms' ? ['wars', 'alliances'] : [])];
    if (type === 'wars') return [...identity, 'war_type', 'instigator', 'latest_attacker_deaths', 'latest_defender_deaths', 'latest_total_deaths', 'latest_year', 'historical_members', 'distinct_attackers', 'distinct_defenders', 'participation_changes'];
    return [...identity, ...['population', 'army', 'territory', 'houses', 'food', 'coins', ...(type === 'kingdoms' ? ['villages'] : type === 'villages' ? ['loyalty'] : ['members'])].map(m => `peak_${m}`), ...(type === 'kingdoms' ? ['distinct_wars', 'distinct_alliances'] : type === 'villages' ? ['owners', 'ownership_changes'] : ['historical_members', 'intervals', 'rejoining', 'participation_changes'])];
  }
  function globalComparison(metric) {
    if (['population', ...H.SPECIES, 'army', 'territory', 'houses', 'food', 'coins', 'kingdoms', 'villages', 'wars', 'tracked_characters', 'army_ratio', 'food_per_resident', 'coins_per_resident', 'houses_per_resident'].includes(metric)) return data.series('world', '', metric);
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
    if (!s.columns[s.mode]) s.columns[s.mode] = available.filter(c => ['name', 'founding_species', 'species','gender','role','level','kills','peak_level','peak_kills', 'start_year', 'end_year', 'population', 'army', 'members', 'kingdom_id', 'war_type', 'peak_population', 'peak_army', 'total_deaths', 'latest_total_deaths', 'historical_members'].includes(c));
    if (!available.includes(s.filterMetric)) s.filterMetric = type === 'characters' ? s.mode === 'history' ? 'peak_level' : 'level' : s.mode === 'history' ? type === 'wars' ? 'latest_total_deaths' : 'peak_population' : type === 'wars' ? 'total_deaths' : 'population';
    const rows = data.catalog(type).flatMap(e => {
      const snap = data.snapshot(type, e.id, year);
      if (s.mode === 'year' && !snap) return [];
      const values = s.mode === 'history' ? data.summary(type, e.id) : { ...e, duration: H.duration(e), ...snap };
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
    const controls = '<div class="browser-toolbar">' + bindSelect('mode', '', ['history', 'year'], s.mode, m => m === 'history' ? 'All history' : 'Selected year') + '<div class="search">' + bindInput('search', '', 'search', 'Search ' + type + '…') + '</div>' + (type === 'kingdoms' || type === 'villages' || type === 'characters' ? bindSelect('species', '', ['', ...H.SPECIES], s.species, v => v ? label(v) : 'All species') : '') + '<button data-toggle="filters" aria-expanded="' + filtersOpen + '">Filters' + (filterCount ? ' <span class="filter-count">' + filterCount + '</span>' : '') + '</button><button data-toggle="columns" aria-expanded="' + columnsOpen + '">Columns</button><button data-reset="' + type + '">Reset</button></div>' +
      '<div class="filter-panel"' + (filtersOpen ? '' : ' hidden') + '><div class="filter-row filter-relationships">' + bindInput('relationship', 'Related name / ID') + (type === 'characters' ? bindSelect('gender','Gender',['','male','female'],s.gender,v=>v||'Any gender')+bindSelect('role','Role',['','king','leader','captain','warrior','citizen'],s.role,v=>v||'Any role')+bindSelect('kingdom','Kingdom',['',...data.catalog('kingdoms').map(e=>String(e.id))],s.kingdom,v=>v?data.entity('kingdoms',v)?.name||v:'Any kingdom')+bindSelect('village','Home village',['',...data.catalog('villages').map(e=>String(e.id))],s.village,v=>v?data.entity('villages',v)?.name||v:'Any village') : '') + (type === 'wars' ? bindSelect('role', 'Role', ['', 'attacker', 'defender', 'instigator'], s.role, v => v || 'Any role') + bindSelect('warType', 'War type', ['', ...new Set(data.catalog(type).map(e => e.war_type))], s.warType, v => v || 'Any type') : '') + '</div><div class="filter-row filter-dates">' + bindInput('dateMin', 'Start from year', 'number') + bindInput('dateMax', 'Ended by year', 'number') + '</div><div class="filter-row filter-quantities">' + bindSelect('filterMetric', 'Measure', available.filter(c => !['name', 'id', 'founding_species', 'start_year', 'end_year', 'war_type', 'instigator', 'kingdom_id'].includes(c)), s.filterMetric) + bindInput('min', 'Minimum', 'number') + bindInput('max', 'Maximum', 'number') + '</div></div>' +
      '<div class="column-panel"' + (columnsOpen ? '' : ' hidden') + '><div class="columns">' + available.map(c => '<label><input type="checkbox" data-column="' + c + '" data-type="' + type + '"' + (s.columns[s.mode].includes(c) ? ' checked' : '') + (c === 'name' ? ' disabled' : '') + '>' + esc(type === 'characters' && c === 'start_year' ? 'Birth year' : label(c)) + '</label>').join('') + '</div>' + '<button data-all-columns="' + type + '">' + (s.columns[s.mode].length === available.length ? 'Deselect all' : 'Select all') + '</button>' + '</div>';
    s.filteredIds = rows.map(r => String(r.entity.id));
    const globalPoints = type === 'characters' ? null : globalComparison(s.compareMetric);
    const comparisonSeries = s.selected.map((id,index) => ({ type, id, name: data.entity(type, id)?.name || id, color: entityColor(type,id), points: data.series(type, id, s.compareMetric) }));
    if (s.showGlobal && globalPoints) comparisonSeries.push({name:'Global', color:THEME['global-data'], points:globalPoints});
    const comparisonId='comparison-'+type, comparisonState=tableStates.get(comparisonId)||{field:'name',direction:1};
    tableStates.set(comparisonId,comparisonState);
    const comparisonRows=s.selected.map(id=>({id,name:data.entity(type,id)?.name||String(id),value:data.snapshot(type,id,year)?.[s.compareMetric]}));
    if(s.showGlobal && globalPoints) comparisonRows.push({name:'Global',value:globalPoints.find(p=>p.year===year)?.value});
    comparisonRows.sort((a,b)=>compareValues(a[comparisonState.field],b[comparisonState.field],comparisonState.direction));
    const comparisonHeading=(field,text)=>`<th aria-sort="${comparisonState.field===field?(comparisonState.direction===1?'ascending':'descending'):'none'}"><button data-sort="${comparisonId}" data-field="${field}">${esc(text)}${comparisonState.field===field?(comparisonState.direction===1?' ↑':' ↓'):''}</button></th>`;
    const compare = s.selected.length ? `<div class="controls">${bindSelect('compareMetric', 'Compare measure', metricsFor(type), s.compareMetric)}${globalPoints ? `<label><input type="checkbox" data-global="${type}"${s.showGlobal ? ' checked' : ''}>Global</label>` : ''}</div>${chart(comparisonSeries, s.compareMetric, {legendControls:false, solid:true, id:'comparison'})}<div class="table-wrap"><table class="comparison-table"><thead><tr>${comparisonHeading('name','Entity')}${comparisonHeading('value',label(s.compareMetric))}</tr></thead><tbody>${comparisonRows.map(r=>`<tr><td>${r.id == null ? 'Global' : link(type,r.id)}</td><td>${format(r.value,s.compareMetric)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Select entities to compare.</p>';
    return '<div class="page-head"><div><p class="eyebrow">Entity browser</p><h1>' + typeLabel(type) + '</h1></div></div>' + '<section class="panel">' + controls + '<div class="catalog-count">' + rows.length + ' ' + type + ' · ' + (s.mode === 'history' ? 'All history' : 'Selected year') + '</div>' + table(type, rows, available.filter(c => s.columns[s.mode].includes(c)), 'browser-' + type + '-' + s.mode, { selectable: true, selected: s.selected }) + '</section>' + section('Compare', '<div class="panel">' + compare + '</div>');
  }
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
  let pointer = null, tooltipHideTimer;
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
    if (plot) showChartTooltip(pointer, plot);
    else if (track) showTimelineTooltip(pointer, track);
    else if (tip) simpleTooltip(pointer, tip.dataset.tip);
    else $('chart-tooltip').hidden = true;
  }
  document.addEventListener('pointermove', e => { pointer = {clientX:e.clientX,clientY:e.clientY}; highlightKey(e.target); });
  document.addEventListener('pointerleave', () => { pointer = null; highlightKey(null); $('chart-tooltip').hidden = true; });
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
    $('main').dataset.view = type ? 'entity' : r.name === 'browser' ? 'browser' : 'overview';
    for (const list of $('main').querySelectorAll('[data-events]')) scrollPositions.set(list.dataset.events, list.scrollTop);
    const markup = r.name === 'browser' ? browser(r.id || 'kingdoms') : type ? entityPage(type, r.id) : overview();
    if (live) { const template = document.createElement('template'); template.innerHTML = markup; patchChildren($('main'), template.content); }
    else $('main').innerHTML = markup;
    const entityType = type || (r.name === 'browser' ? (H.TYPES.includes(r.id) ? r.id : 'kingdoms') : null);
    $('entity-manager').hidden = !entityType;
    const manager = entityType ? entityTabs(entityType) + '<span class="manager-entity">' + esc(type ? data.entity(type,r.id)?.name || '' : '') + '</span>' : '';
    if ($('entity-manager').innerHTML !== manager) $('entity-manager').innerHTML = manager;
    document.querySelectorAll('#view-nav a').forEach(a => { if (a.hash.startsWith(r.name === 'browser' || type ? '#/browser' : '#/overview')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    for (const list of $('main').querySelectorAll('[data-events]')) { paintEvents(list); list.scrollTop = scrollPositions.get(list.dataset.events) || 0; paintEvents(list); }
    for (const element of $('main').querySelectorAll('[data-scroll]')) element.scrollTop = scrollPositions.get(element.dataset.scroll) || 0;
    $('main').querySelectorAll('.chart-frame,.donut-layout,.ranking-scroll,.timeline-scroll,.share-highlights').forEach((el,i) => { el.classList.remove('chart-enter'); el.dataset.animation = location.hash + ':' + i; el.dataset.animate = String(allowAnimation); observer.observe(el); });
    observeNumbers(allowAnimation);
    if (live) refreshHover();
    saveView();
    document.title = `${type ? data.entity(type, r.id)?.name || 'Record' : r.name === 'browser' ? 'Entity browser' : data.world.name || 'World overview'} — HistoryBox`;
    if (focusData && Object.keys(focusData).length) {
      const replacement = [...$('main').querySelectorAll('input,select,button,a[data-age],[data-plot],[data-track]')].find(e => Object.entries(focusData).every(([key, value]) => e.dataset[key] === value));
      if (replacement) { replacement.focus({ preventScroll: true }); if (start !== null && start !== undefined && replacement.setSelectionRange && ['text', 'search'].includes(replacement.type)) replacement.setSelectionRange(start, end); }
    }
  }
  function loadError(error) {
    const m=error.message || '';
    if (/different world/.test(m)) return 'These files belong to different worlds. Choose both files from the same world folder.';
    if (/different save/.test(m)) return 'These files belong to different save slots. Choose both files from the same save folder.';
    if (/different recording|last annual|metadata disagree/.test(m)) return 'These files were saved at different times. Pause recording and copy both files together again.';
    if (/overview.json requires|single metadata header/.test(m)) return 'This history uses an older or unsupported format. Record a new history with the current HistoryBox mod.';
    if (/overview.json:/.test(m)) return 'The world records file could not be read. Select overview.json from your history folder.';
    if (/Annual history must/.test(m)) return 'Choose annual.jsonl for the annual history file.';
    if (/no observations/.test(m)) return 'This history has no recorded years yet. Enable recording in WorldBox and try again after a year passes.';
    if (/strictly increasing|only once/.test(m)) return 'The annual history contains repeated or out-of-order years. Copy a fresh pair of history files and try again.';
    if (/annual.jsonl/.test(m)) return 'The annual history is incomplete or damaged. Copy both history files again after pausing recording.';
    if (/array|identity|interval|metadata|reference/i.test(m)) return 'Some world records are incomplete or invalid. Copy a fresh pair of files from the current HistoryBox mod.';
    return 'This history could not be opened. Check that you selected both files from the same history folder, then try again.';
  }
  async function loadWorld(event, saved = null) {
    event?.preventDefault();
    const metadata = saved ? new Blob([saved.metadata]) : $('metadata').files[0], annual = saved ? saved.annual : $('annual').files[0];
    if (!metadata || !annual) { $('load-status').className='error'; $('load-status').textContent='Choose both your world records and annual history before opening a world.'; return; }
    $('load').disabled = true; $('load-status').className = ''; $('load-status').textContent = 'Reading history…';
    try {
      if (!saved && !/\.(jsonl|ndjson|txt)$/i.test(annual.name)) throw new Error('Annual history must be a .jsonl, .ndjson, or .txt file.');
      const metadataText = await metadata.text();
      const next = await H.parse(metadataText, annual, count => { $('load-status').textContent = `Indexed ${count.toLocaleString()} observations…`; });
      await H.prepare(next, message => { $('load-status').textContent = message; });
      stopPlayback(); finishNumbers(); animated.clear(); numberSeen.clear();
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
      $('diagnostics-content').innerHTML = `<p>${data.years.length} observations · ${data.warningCount} warnings.</p><p>Both files have matching world, save-slot, name, and last-year metadata.</p><p>Missing values display as —. Original records are preserved. No historical files leave this browser.</p>${data.warnings.length ? `<ul>${data.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : '<p>No validation warnings.</p>'}${data.warningCount > data.warnings.length ? '<p>Only the first 2,000 warnings are displayed.</p>' : ''}`;
      let restored = null;
      if (saved) {
        try { restored = JSON.parse(localStorage.getItem('historybox-view')); } catch {}
        if (restored?.worldKey !== JSON.stringify(data.world)) restored = null;
        if (restored) {
          age = restored.age; if (age !== null && !data.ages[age]) age = null;
          customWindow = age === null && (restored.customWindow ?? (restored.windowSize !== undefined && restored.windowSize !== 'all'));
          windowStart = restored.windowStart;
          windowEnd = restored.windowEnd ?? (customWindow && Number.isFinite(Number(restored.windowSize)) ? (windowStart ?? data.years[0])+Number(restored.windowSize) : null);
          [windowStart,windowEnd] = range(); year = data.nearest(restored.year, scopeYears());
          for (const [map, key] of [[preferences,'preferences'],[pages,'pages'],[browserStates,'browserStates'],[tableStates,'tableStates']]) for (const [k,v] of restored[key] || []) map.set(k,v);
          for (const [k,v] of restored.legends || []) legendHidden.set(k,new Set(v));
          $('speed').value = restored.speed || '1';
          history.replaceState(history.state, '', requestedHash || restored.hash || '#/overview');
        }
      } else {
        try { await worldStore({metadata: metadataText, annual}); } catch { $('announcement').textContent = 'Browser storage unavailable. Reload restoration is unavailable.'; }
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
    $('settings-button').hidden = false;
    $('loader').hidden = open; $('main').hidden = !open;
    $('navigation-shell').hidden = !open; $('timeline-shell').hidden = !open;
    $('view-nav').hidden = !open; $('context').hidden = !open;
    $('cancel-load').hidden = !data;
    if (!open) { stopPlayback(); $('chart-tooltip').hidden = true; }
    updateTimelineSpace();
  }
  worldStore().then(async saved => { if (saved && !data) await loadWorld(null, saved); else showWorld(!!data); }).catch(() => showWorld(!!data));
  $('load-form').addEventListener('submit', loadWorld);
  document.querySelector('.skip').addEventListener('click', e => { e.preventDefault(); $('main').focus(); });
  $('replace').addEventListener('click', () => { showWorld(false); $('load-status').textContent = ''; });
  $('cancel-load').addEventListener('click', () => { if (data) showWorld(true); });
  $('diagnostics-button').addEventListener('click', () => $('diagnostics').showModal());
  $('previous').addEventListener('click', () => { const ys = scopeYears(); selectYear(ys[ys.indexOf(year) - 1]); });
  $('next').addEventListener('click', () => { const ys = scopeYears(); selectYear(ys[ys.indexOf(year) + 1]); });
  $('year').addEventListener('input', e => {
    const token = ++renderToken;
    requestAnimationFrame(() => { if (token === renderToken) selectYear(e.target.value); });
  });
  $('year').addEventListener('keydown', e => {
    const ys = scopeYears(), index = ys.indexOf(year);
    if (['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault(); const target = e.key === 'Home' ? 0 : e.key === 'End' ? ys.length - 1 : index + (['ArrowLeft', 'ArrowDown'].includes(e.key) ? -1 : 1);
      selectYear(ys[Math.max(0, Math.min(ys.length - 1, target))]);
    }
  });
  function selectAge(value) {
    const previous = range();
    customWindow = value === 'custom'; age = value === 'all' || customWindow ? null : Number(value);
    [windowStart,windowEnd] = previous;
    syncWindow();
  }
  $('age').addEventListener('change', e => selectAge(e.target.value));
  function setWindow(e) {
    if (!customWindow) return;
    const [lo,hi] = range(), bounds = rangeBounds(), value = e.target.valueAsNumber;
    if (e.target.id === 'window-start') windowStart = Number.isFinite(value) ? Math.max(bounds[0],Math.min(hi,Math.trunc(value))) : lo;
    else windowEnd = Number.isFinite(value) ? Math.max(lo,Math.min(bounds[1],Math.trunc(value))) : hi;
    syncWindow();
  }
  $('window-start').addEventListener('change', setWindow);
  $('window-end').addEventListener('change', setWindow);
  window.addEventListener('hashchange', () => {
    if (!data) return;
    pageScroll.set(displayedHash, scrollY);
    displayedHash = location.hash;
    pages.delete('entity-records'); render();
    // The route cache captures the exact outgoing position, even if a pending scroll
    // event has not yet updated this entry's persisted history state.
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
      legendHidden.set(c.chartKey, hidden?.size ? new Set() : new Set(c.all.map(s => s.name))); render();
    }
    if (target.dataset.allCompare) { const s = browserState(target.dataset.allCompare); s.selected = s.selected.length ? [] : [...s.filteredIds]; render(); }
    if (target.dataset.allColumns) { const s = browserState(target.dataset.allColumns), available = browserColumns(target.dataset.allColumns, s.mode); s.columns[s.mode] = s.columns[s.mode].length === available.length ? ['name'] : available; render(); }
    if (target.dataset.toggle) { preferences.set(target.dataset.toggle, !pref(target.dataset.toggle, false)); render(); }
    if (target.dataset.year) selectYear(target.dataset.year);
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
    const tip = event.target.closest('[data-tip]'); if (tip) simpleTooltip(event, tip.dataset.tip);
    const plot = event.target.closest('[data-plot]');
    if (plot) showChartTooltip(event, plot);
    const track = event.target.closest('[data-track]');
    if (track) showTimelineTooltip(event, track);
  });
  $('main').addEventListener('pointerout', event => {
    const plot = event.target.closest('[data-plot]');
    const track = event.target.closest('[data-track]');
    if (event.target.closest('[data-tip]')) deferTooltipHide();
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
