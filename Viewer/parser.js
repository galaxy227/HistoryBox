/* HistoryBox data layer. No DOM, selected UI state, network, or rendering dependencies. */
(function (root) {
  'use strict';
  const TYPES = ['kingdoms', 'villages', 'wars', 'alliances'];
  const SPECIES = ['human', 'elf', 'orc', 'dwarf'];
  const ADDITIVE = ['population', ...SPECIES, 'army', 'territory', 'houses', 'food', 'coins'];
  const numeric = value => typeof value === 'number' && Number.isFinite(value);
  const number = value => numeric(value) ? value : null;
  const key = value => String(value);
  const validId = value => (Number.isSafeInteger(value) && value >= 0) || (typeof value === 'string' && value.length > 0);
  const ratio = (a, b) => numeric(a) && numeric(b) && b > 0 ? a / b : null;
  const sum = values => values.every(numeric) ? values.reduce((a, b) => a + b, 0) : null;
  const pause = () => new Promise(resolve => setTimeout(resolve, 0));
  function boundedSet(map, id, value, limit) {
    // Evict in batches: restarting a Map iterator for each eviction can repeatedly scan tombstones.
    if (map.size >= limit && !map.has(id)) {
      let count = Math.max(1, Math.floor(limit / 3));
      for (const old of map.keys()) { map.delete(old); if (--count === 0) break; }
    }
    map.set(id, value);
  }

  // Box records transitions at the first observation of the new state: [start, end).
  // A range "a-b" means the transition happened after observation a, by observation b.
  function boundary(value) {
    if (Number.isSafeInteger(value) && value >= 0) return { lo: value, hi: value, exact: true };
    if (typeof value === 'string' && /^\d+-\d+$/.test(value)) {
      const [lo, hi] = value.split('-').map(Number);
      if (Number.isSafeInteger(lo) && Number.isSafeInteger(hi) && lo < hi) return { lo, hi, exact: false };
    }
    return null;
  }
  function intervalStatus(interval, year) {
    if (!numeric(year) || !interval) return 'unknown';
    const start = boundary(interval.start_year), end = boundary(interval.end_year);
    if (!start || (interval.end_year !== null && !end) || (end && start.hi > end.lo)) return 'unknown';
    if (year < start.lo || (!start.exact && year === start.lo) || (end && year >= end.hi)) return 'inactive';
    if (year < start.hi || (end && year >= end.lo && (end.exact || year > end.lo))) return 'uncertain';
    return 'active';
  }
  function duration(entity) {
    const a = boundary(entity.start_year), b = boundary(entity.end_year);
    return a?.exact && b?.exact && b.lo >= a.lo ? b.lo - a.lo : null;
  }
  function compare(a, b, direction = 1) {
    if (a === null || a === undefined) return b === null || b === undefined ? 0 : 1;
    if (b === null || b === undefined) return -1;
    if (numeric(a) && numeric(b)) return (a - b) * direction;
    return String(a).localeCompare(String(b), undefined, { numeric: true }) * direction;
  }
  class Dataset {
    constructor(metadata) {
      if (!metadata || typeof metadata !== 'object' || !metadata.world || typeof metadata.world.id !== 'string') throw new Error('metadata.json requires a world object with a string id.');
      this.raw = metadata;
      this.world = metadata.world;
      this.warnings = [];
      this.warningCount = 0;
      this.entities = new Map();
      this.records = new Map();
      this.observations = new Map();
      this.reverse = new Map();
      this.cache = new Map();
      this.seriesCache = new Map();
      this.summaryCache = new Map();
      this.ownershipCache = new Map();
      this.rankCache = new Map();
      this.ages = metadata.ages;
      if (!Array.isArray(this.ages)) throw new Error('metadata.ages must be an array.');
      this.ages.forEach((age, i) => this.validateInterval(age, `Age ${i + 1}`));
      // Unknown entity collections remain addressable by the same identity/query API.
      const types = [...new Set([...TYPES, ...Object.keys(metadata).filter(t => t !== 'ages' && Array.isArray(metadata[t]) && metadata[t].some(e => e && validId(e.id)))])];
      for (const type of types) {
        if (!Array.isArray(metadata[type])) throw new Error(`metadata.${type} must be an array.`);
        const index = new Map();
        for (const entity of metadata[type]) {
          if (!entity || !validId(entity.id)) throw new Error(`Invalid identity in metadata.${type}.`);
          if (index.has(key(entity.id))) throw new Error(`Duplicate ${type} identity: ${entity.id}.`);
          index.set(key(entity.id), entity);
          this.validateInterval(entity, `${type} ${entity.id}`);
        }
        this.entities.set(type, index);
        this.observations.set(type, new Map());
      }
      for (const type of ['wars', 'alliances']) {
        for (const entity of this.catalog(type)) {
          if (!Array.isArray(entity.kingdoms)) throw new Error(`${type} ${entity.id}: kingdoms must be an array.`);
          const seen = new Set();
          for (const member of entity.kingdoms) {
            if (!member || !validId(member.kingdom_id)) throw new Error(`${type} ${entity.id}: invalid member identity.`);
            if (seen.has(key(member.kingdom_id))) throw new Error(`${type} ${entity.id}: duplicate member ${member.kingdom_id}.`);
            seen.add(key(member.kingdom_id));
            this.checkReference('kingdoms', member.kingdom_id, `${type} ${entity.id}`);
            const relation = { type, entity, member };
            const k = key(member.kingdom_id);
            if (!this.reverse.has(k)) this.reverse.set(k, []);
            this.reverse.get(k).push(relation);
            if (!Array.isArray(member.involvement)) throw new Error(`${type} ${entity.id}: involvement must be an array.`);
            member.involvement.forEach((interval, i) => {
              this.validateInterval(interval, `${type} ${entity.id}, member ${k}, interval ${i + 1}`);
              if (type === 'wars' && !['attacker', 'defender'].includes(interval.side)) this.warn(`War ${entity.id}: unknown side ${interval.side}.`);
              const a = boundary(interval.start_year), b = boundary(interval.end_year);
              const parentA = boundary(entity.start_year), parentB = boundary(entity.end_year);
              if ((a && parentA && a.hi < parentA.lo) || (b && parentB && b.lo > parentB.hi)) this.warn(`${type} ${entity.id}: involvement outside entity lifespan.`);
              for (const other of member.involvement.slice(0, i)) {
                const c = boundary(other.start_year), d = boundary(other.end_year);
                if (a && c && a.hi < (d?.lo ?? Infinity) && c.hi < (b?.lo ?? Infinity)) this.warn(`${type} ${entity.id}: overlapping involvement for kingdom ${k}.`);
              }
            });
          }
          if (type === 'wars' && entity.instigator !== null) this.checkReference('kingdoms', entity.instigator, `War ${entity.id} instigator`);
        }
      }
    }
    warn(message) { this.warningCount++; if (this.warnings.length < 2000) this.warnings.push(message); }
    validateInterval(interval, label) {
      if (!interval || typeof interval !== 'object') throw new Error(`${label}: invalid interval object.`);
      const a = boundary(interval.start_year), b = boundary(interval.end_year);
      if (!a || (interval.end_year !== null && !b)) this.warn(`${label}: invalid or missing start_year/end_year; interval statistics unavailable.`);
      else if (b && a.hi > b.lo) this.warn(`${label}: contradictory or overlapping boundary ranges; activity is uncertain.`);
    }
    checkReference(type, id, label) { if (!this.entity(type, id)) this.warn(`${label}: unresolved ${type} reference ${id}.`); }
    entity(type, id) { return this.entities.get(type)?.get(key(id)) || null; }
    catalog(type) { return Array.from(this.entities.get(type)?.values() || []); }
    addRecord(record, line) {
      const year = record?.world?.year;
      if (!Number.isSafeInteger(year) || year < 0) throw new Error(`Line ${line}: world.year must be a nonnegative safe integer.`);
      if (this.records.has(year)) throw new Error(`Line ${line}: duplicate recorded year ${year}.`);
      const indexes = new Map(), badOwners = new Set();
      for (const type of ['kingdoms', 'villages', 'wars']) {
        if (!Array.isArray(record[type])) throw new Error(`Line ${line}: ${type} must be an array.`);
        const index = new Map();
        for (const item of record[type]) {
          if (!item || !validId(item.id)) throw new Error(`Line ${line}: invalid ${type} identity.`);
          const id = key(item.id);
          if (index.has(id)) throw new Error(`Line ${line}: duplicate ${type} identity ${id}.`);
          index.set(id, item);
          this.checkReference(type, id, `Year ${year}`);
          const histories = this.observations.get(type);
          if (!histories.has(id)) histories.set(id, []);
          histories.get(id).push({ year, record: item });
          const fields = type === 'villages' ? [...ADDITIVE, 'loyalty'] : type === 'wars' ? ['attacker_deaths', 'defender_deaths'] : [];
          for (const field of fields) if (!numeric(item[field]) || (field !== 'loyalty' && item[field] < 0)) this.warn(`Year ${year}, ${type} ${id}: invalid or missing ${field}.`);
          const meta = this.entity(type, id);
          if (meta && intervalStatus(meta, year) === 'inactive') this.warn(`Year ${year}, ${type} ${id}: observation contradicts metadata lifespan.`);
        }
        indexes.set(type, index);
      }
      for (const field of ['global_population', ...SPECIES]) if (!numeric(record.world[field]) || record.world[field] < 0) this.warn(`Year ${year}: invalid or missing world.${field}.`);
      const owners = new Map();
      for (const kingdom of record.kingdoms) {
        if (!Array.isArray(kingdom.cities)) { this.warn(`Year ${year}, kingdom ${kingdom.id}: missing cities array.`); badOwners.add(key(kingdom.id)); continue; }
        const seen = new Set();
        for (const id of kingdom.cities) {
          const village = indexes.get('villages').get(key(id));
          if (!village || key(village.kingdom_id) !== key(kingdom.id) || seen.has(key(id)) || owners.has(key(id))) {
            this.warn(`Year ${year}: contradictory or unavailable ownership for village ${id}.`);
            badOwners.add(key(kingdom.id));
            if (village) badOwners.add(key(village.kingdom_id));
            if (owners.has(key(id))) badOwners.add(owners.get(key(id)));
          }
          seen.add(key(id)); owners.set(key(id), key(kingdom.id));
        }
      }
      for (const village of record.villages) {
        if (village.kingdom_id !== null && (!validId(village.kingdom_id) || !indexes.get('kingdoms').has(key(village.kingdom_id)))) this.warn(`Year ${year}, village ${village.id}: unresolved observed owner ${village.kingdom_id}.`);
        if (village.kingdom_id !== null && owners.get(key(village.id)) !== key(village.kingdom_id)) {
          badOwners.add(key(village.kingdom_id));
          this.warn(`Year ${year}, village ${village.id}: ownership differs from kingdom city lists.`);
        }
      }
      this.records.set(year, { raw: record, indexes, badOwners });
    }
    finish() {
      this.years = [...this.records.keys()].sort((a, b) => a - b);
      if (!this.years.length) throw new Error('annual.jsonl has no observations.');
      this.yearIndex = new Map(this.years.map((y, i) => [y, i]));
      this.gaps = this.years.slice(1).flatMap((y, i) => y > this.years[i] + 1 ? [[this.years[i], y]] : []);
      for (const histories of this.observations.values()) for (const history of histories.values()) history.sort((a, b) => a.year - b.year);
      for (const [id, history] of this.observations.get('wars')) {
        for (let i = 1; i < history.length; i++) for (const field of ['attacker_deaths', 'defender_deaths']) {
          if (history[i].record[field] < history[i - 1].record[field]) this.warn(`War ${id}: ${field} decreased between ${history[i - 1].year} and ${history[i].year}; casualty change unavailable.`);
        }
      }
      return this;
    }
    history(type, id) { return this.observations.get(type)?.get(key(id)) || []; }
    observed(type, id, year) { return this.records.get(year)?.indexes.get(type)?.get(key(id)) || null; }
    periodYears(ageIndex = null) { const age = this.ages[ageIndex]; return ageIndex === null ? this.years : this.years.filter(y => intervalStatus(age, y) === 'active'); }
    nearest(year, years = this.years) {
      if (!years.length) return null;
      let lo = 0, hi = years.length;
      while (lo < hi) { const mid = (lo + hi) >>> 1; if (years[mid] < year) lo = mid + 1; else hi = mid; }
      if (!lo) return years[0];
      if (lo === years.length) return years.at(-1);
      return year - years[lo - 1] <= years[lo] - year ? years[lo - 1] : years[lo];
    }
    memberships(type, id, year) {
      const entity = this.entity(type, id);
      const output = [];
      for (const member of entity?.kingdoms || []) {
        const intervals = Array.isArray(member.involvement) ? member.involvement : [];
        const active = intervals.filter(i => intervalStatus(i, year) === 'active');
        const uncertain = intervals.some(i => ['uncertain', 'unknown'].includes(intervalStatus(i, year)));
        const validSide = type !== 'wars' || ['attacker', 'defender'].includes(active[0]?.side);
        if (active.length || uncertain) output.push({ id: member.kingdom_id, side: active.length === 1 ? active[0].side : null, status: active.length === 1 && !uncertain && validSide ? 'active' : 'uncertain' });
      }
      return output;
    }
    relations(id, type) { return (this.reverse.get(key(id)) || []).filter(r => !type || r.type === type); }
    aggregate(rows, complete = true) {
      const out = { complete };
      for (const field of ADDITIVE) out[field] = complete ? sum(rows.map(r => r?.[field])) : null;
      return out;
    }
    participantSnapshot(type, id, year, side = null) {
      const members = this.memberships(type, id, year);
      const known = members.filter(m => m.status === 'active' && (!side || m.side === side));
      const rows = known.map(m => this.snapshot('kingdoms', m.id, year));
      const complete = Array.isArray(this.entity(type,id)?.kingdoms) && members.every(m => m.status === 'active') && rows.every(r => r && r.complete !== false);
      const out = this.aggregate(rows,complete);
      out.members = complete ? known.length : null;
      out.confirmed_members = known.length;
      return this.ratios(out,year);
    }
    ratios(out, year) {
      out.army_ratio = ratio(out.army, out.population);
      for (const metric of ['food','coins','houses']) out[`${metric}_per_resident`] = ratio(out[metric],out.population);
      out.population_share = ratio(out.population,this.validStat(this.records.get(year)?.raw.world.global_population));
      for (const species of SPECIES) out[`${species}_share`] = ratio(out[species],out.population);
      return out;
    }
    warSideSeries(id, side, metric) {
      const k = `war-side:${id}:${side}:${metric}`;
      if (!this.seriesCache.has(k)) boundedSet(this.seriesCache,k,this.years.map(year => ({year,value:this.observed('wars',id,year) ? number(this.participantSnapshot('wars',id,year,side)[metric]) : null})),250);
      return this.seriesCache.get(k);
    }
    validStat(value, allowNegative = false) { return numeric(value) && (allowNegative || value >= 0) ? value : null; }
    snapshot(type, id, year) {
      if (!this.records.has(year)) return null;
      const cacheKey = `${type}:${id}:${year}`;
      if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
      let out = null;
      const record = this.records.get(year), item = this.observed(type, id, year);
      if (type === 'world') {
        out = { complete: true };
        for (const field of ADDITIVE) out[field] = sum(record.raw.villages.map(v => this.validStat(v[field])));
        out.population = this.validStat(record.raw.world.global_population);
        SPECIES.forEach(s => { out[s] = this.validStat(record.raw.world[s]); });
        out.kingdoms = record.raw.kingdoms.length; out.villages = record.raw.villages.length; out.wars = record.raw.wars.length;
      } else if (type === 'villages' && item) {
        out = { kingdom_id: item.kingdom_id, complete: true };
        [...ADDITIVE, 'loyalty'].forEach(f => { out[f] = this.validStat(item[f], f === 'loyalty'); });
      } else if (type === 'kingdoms' && item) {
        const complete = !record.badOwners.has(key(id));
        const villages = Array.isArray(item.cities) ? item.cities : [];
        out = this.aggregate(villages.map(v => this.snapshot('villages', v, year)), complete);
        out.villages = complete ? villages.length : null;
        for (const t of ['wars', 'alliances']) out[t] = this.relations(id, t).filter(r => intervalStatus(r.entity, year) === 'active' && this.memberships(t, r.entity.id, year).some(m => key(m.id) === key(id) && m.status === 'active')).length;
      } else if (type === 'wars' && item) {
        const members = this.memberships(type, id, year);
        out = { ...this.participantSnapshot(type,id,year), attacker_deaths: this.validStat(item.attacker_deaths), defender_deaths: this.validStat(item.defender_deaths) };
        out.total_deaths = sum([out.attacker_deaths, out.defender_deaths]);
        out.attackers = members.filter(m => m.status === 'active' && m.side === 'attacker').length;
        out.defenders = members.filter(m => m.status === 'active' && m.side === 'defender').length;
        out.members = members.filter(m => m.status === 'active').length;
        const history = this.history(type, id), index = history.findIndex(p => p.year === year), previous = history[index - 1];
        out.change_from = previous?.year ?? null;
        for (const field of ['attacker_deaths', 'defender_deaths']) out[`change_${field}`] = previous && numeric(out[field]) && numeric(previous.record[field]) && out[field] >= previous.record[field] ? out[field] - previous.record[field] : null;
        out.change_total_deaths = sum([out.change_attacker_deaths, out.change_defender_deaths]);
      } else if (type === 'alliances' && intervalStatus(this.entity(type, id), year) === 'active') {
        out = this.participantSnapshot(type,id,year);
      }
      if (out) {
        this.ratios(out,year);
        if (type === 'alliances') out.territory_share = ratio(out.territory, this.snapshot('world', '', year)?.territory);
      }
      boundedSet(this.cache, cacheKey, out, 30000);
      return out;
    }
    series(type, id, metric) {
      const k = `${type}:${id}:${metric}`;
      if (!this.seriesCache.has(k)) {
        const points = this.years.map(year => ({ year, value: number(this.snapshot(type, id, year)?.[metric]) }));
        boundedSet(this.seriesCache, k, points, 250);
      }
      return this.seriesCache.get(k);
    }
    stats(type, id, metric, years = this.years) {
      const memo = `stats:${type}:${id}:${metric}:${years === this.years ? 'all' : years.join(',')}`;
      if (this.summaryCache.has(memo)) return this.summaryCache.get(memo);
      const allowed = years === this.years ? null : new Set(years);
      let peak = null, minimum = null, first = null, last = null;
      for (const p of this.series(type, id, metric)) {
        if (!numeric(p.value) || (allowed && !allowed.has(p.year))) continue;
        if (!first) first = p; last = p;
        if (!peak || p.value > peak.value) peak = p;
        if (!minimum || p.value < minimum.value) minimum = p;
      }
      const result = { peak, minimum, first, last, change: first && last && first.year !== last.year ? last.value - first.value : null };
      this.summaryCache.set(memo, result); return result;
    }
    rankings(type, year, metric) {
      const k = `${type}:${year}:${metric}`;
      if (!this.rankCache.has(k)) {
        const rows = this.catalog(type).map(e => ({ entity: e, value: this.snapshot(type, e.id, year)?.[metric] })).filter(r => numeric(r.value)).sort((a, b) => b.value - a.value || compare(a.entity.name, b.entity.name));
        let rank = 0, previous;
        rows.forEach((r, i) => { if (r.value !== previous) rank = i + 1; r.rank = rank; previous = r.value; });
        boundedSet(this.rankCache, k, rows, 1000);
      }
      return this.rankCache.get(k);
    }
    rankSeries(type, id, metric) { return this.years.map(year => ({ year, value: this.rankings(type, year, metric).find(r => key(r.entity.id) === key(id))?.rank ?? null })); }
    averageSeries(type, metric) {
      const k = `average:${type}:${metric}`;
      if (!this.seriesCache.has(k)) this.seriesCache.set(k, this.years.map(year => {
        const records = type === 'alliances' ? this.catalog(type).filter(e => intervalStatus(e,year) === 'active') : this.records.get(year).raw[type] || [];
        const values = records.map(e => this.snapshot(type, e.id, year)?.[metric]);
        return { year, value: values.length ? ratio(sum(values), values.length) : null };
      }));
      return this.seriesCache.get(k);
    }
    peerSeries(villageId, metric) {
      const k = `peers:${villageId}:${metric}`;
      if (!this.seriesCache.has(k)) boundedSet(this.seriesCache, k, this.years.map(year => {
        const village = this.observed('villages', villageId, year), owner = village?.kingdom_id;
        const kingdom = owner !== null && owner !== undefined ? this.observed('kingdoms', owner, year) : null;
        if (!kingdom || this.records.get(year).badOwners.has(key(owner))) return { year, value: null };
        const ids = kingdom.cities.filter(id => key(id) !== key(villageId));
        return { year, value: ids.length ? ratio(sum(ids.map(id => this.snapshot('villages', id, year)?.[metric])), ids.length) : null };
      }), 250);
      return this.seriesCache.get(k);
    }
    overlappingAges(type, id) {
      const entity = this.entity(type, id), start = boundary(entity?.start_year), end = boundary(entity?.end_year);
      if (!start) return [];
      return this.ages.filter(age => {
        const a = boundary(age.start_year), b = boundary(age.end_year);
        return a && Math.max(start.hi, a.hi) < Math.min(end?.lo ?? Infinity, b?.lo ?? Infinity, this.years.at(-1) + 1);
      });
    }
    changes(type, id, metric, proportional = false) {
      const series = this.series(type, id, metric);
      return series.map((p, i) => {
        const before = series[i - 1];
        const delta = before && numeric(before.value) && numeric(p.value) ? p.value - before.value : null;
        return { year: p.year, from: before?.year ?? null, value: proportional ? ratio(delta, before?.value) : delta };
      });
    }
    relatedNames(type, id, year = null, role = '') {
      const entity = this.entity(type, id), names = [];
      const add = (t, v) => names.push(`${this.entity(t, v)?.name || ''} ${v}`);
      if (type === 'kingdoms') {
        for (const r of this.relations(id)) if (year === null || this.memberships(r.type, r.entity.id, year).some(m => key(m.id) === key(id) && m.status === 'active')) add(r.type, r.entity.id);
      } else if (type === 'villages') {
        if (year !== null) { const owner = this.observed(type, id, year)?.kingdom_id; if (owner !== null && owner !== undefined) add('kingdoms', owner); }
        else for (const owner of new Set(this.history(type, id).map(p => p.record.kingdom_id))) if (owner !== null) add('kingdoms', owner);
      } else {
        if (role === 'instigator') { if (entity.instigator !== null) add('kingdoms', entity.instigator); }
        else if (year !== null) {
          for (const m of this.memberships(type, id, year)) if (m.status === 'active' && (!role || m.side === role)) add('kingdoms', m.id);
        } else for (const m of entity.kingdoms || []) if (!role || m.involvement?.some(i => i.side === role)) add('kingdoms', m.kingdom_id);
      }
      return names.join(' ');
    }
    ownership(id) {
      if (this.ownershipCache.has(key(id))) return this.ownershipCache.get(key(id));
      const runs = [], changes = [];
      let previous = null, run = null;
      for (const point of this.history('villages', id)) {
        const owner = point.record.kingdom_id;
        if (!previous || key(owner) !== key(previous.record.kingdom_id) || point.year !== previous.year + 1) {
          run = { owner, start_year: point.year, end_year: point.year, observed: true };
          runs.push(run);
        } else run.end_year = point.year;
        if (previous && key(owner) !== key(previous.record.kingdom_id)) changes.push({ from: previous.year, to: point.year, previous: previous.record.kingdom_id, owner });
        previous = point;
      }
      const result = { runs, changes };
      this.ownershipCache.set(key(id), result); return result;
    }
    summary(type, id) {
      const k = `${type}:${id}`;
      if (this.summaryCache.has(k)) return this.summaryCache.get(k);
      const entity = this.entity(type, id);
      if (!entity) return {};
      const out = { ...entity, duration: duration(entity) };
      const metrics = [...ADDITIVE, 'villages', 'loyalty', 'members'];
      for (const metric of metrics) out[`peak_${metric}`] = null;
      const years = type === 'alliances' ? this.years : this.history(type, id).map(p => p.year);
      for (const year of years) {
        const snapshot = this.snapshot(type, id, year);
        if (!snapshot) continue;
        for (const metric of metrics) if (numeric(snapshot[metric]) && (out[`peak_${metric}`] === null || snapshot[metric] > out[`peak_${metric}`])) out[`peak_${metric}`] = snapshot[metric];
      }
      if (type === 'kingdoms') for (const t of ['wars', 'alliances']) out[`distinct_${t}`] = new Set(this.relations(id, t).map(r => key(r.entity.id))).size;
      if (type === 'villages') {
        out.owners = new Set(this.history(type, id).map(p => p.record.kingdom_id).filter(v => v !== null && this.entity('kingdoms', v)).map(key)).size;
        out.ownership_changes = this.ownership(id).changes.length;
      }
      if (type === 'wars' || type === 'alliances') {
        const members = entity.kingdoms || [];
        out.historical_members = new Set(members.map(m => key(m.kingdom_id))).size;
        out.intervals = members.reduce((n, m) => n + (m.involvement?.length || 0), 0);
        out.rejoining = members.filter(m => (m.involvement?.length || 0) > 1).length;
        out.participation_changes = members.reduce((n, m) => n + (m.involvement || []).reduce((a, i) => a + 1 + (i.end_year !== null ? 1 : 0), 0), 0);
        for (const side of ['attacker', 'defender']) out[`distinct_${side}s`] = members.filter(m => m.involvement?.some(i => i.side === side)).length;
      }
      if (type === 'wars') {
        const last = this.history(type, id).at(-1);
        out.latest_year = last?.year ?? null;
        for (const f of ['attacker_deaths', 'defender_deaths', 'total_deaths']) out[`latest_${f}`] = last ? this.snapshot(type, id, last.year)?.[f] : null;
      }
      this.summaryCache.set(k, out); return out;
    }
    casualtySeries(metric = 'total_deaths') {
      const latest = new Map();
      return this.years.map(year => {
        for (const war of this.records.get(year).raw.wars) latest.set(key(war.id), this.snapshot('wars', war.id, year)?.[metric]);
        return { year, value: sum([...latest.values()]) };
      });
    }
    period(ageIndex) {
      const years = this.periodYears(ageIndex), allowed = new Set(years), out = { years, population: this.stats('world', '', 'population', years) };
      for (const type of ['kingdoms', 'villages']) {
        const inPeriod = value => ageIndex === null ? value <= this.years.at(-1) : intervalStatus(this.ages[ageIndex],value) === 'active';
        out[`${type}_founded`] = this.catalog(type).filter(e => { const start = boundary(e.start_year); return start?.exact && inPeriod(start.lo); }).length;
        out[`${type}_observed`] = this.catalog(type).filter(e => !boundary(e.start_year)?.exact && allowed.has(this.history(type,e.id)[0]?.year)).length;
        out[`${type}_ended`] = this.catalog(type).filter(e => { const b = boundary(e.end_year); return b && inPeriod(b.lo) && inPeriod(b.hi); }).length;
      }
      out.wars_observed = this.catalog('wars').filter(e => this.history('wars', e.id).some(p => allowed.has(p.year))).length;
      let total = 0, count = 0;
      for (const e of this.catalog('wars')) {
        const h = this.history('wars', e.id);
        for (let i = 1; i < h.length; i++) if (allowed.has(h[i - 1].year) && allowed.has(h[i].year)) {
          const change = this.snapshot('wars', e.id, h[i].year).change_total_deaths;
          if (numeric(change)) { total += change; count++; }
        }
      }
      out.casualty_change = count ? total : null;
      return out;
    }
    milestones(type = null, id = null) {
      const cacheKey = `events:${type}:${id}`;
      if (this.summaryCache.has(cacheKey)) return this.summaryCache.get(cacheKey);
      const events = [], add = (year, text, t, entityId, from = null) => events.push({ year, text, type: t, id: entityId, from });
      for (const t of TYPES) for (const e of this.catalog(t)) {
        if (type && (t !== type || key(e.id) !== key(id))) continue;
        const h = this.history(t, e.id), name = e.name || `#${e.id}`;
        const start = boundary(e.start_year), civilization = t === 'kingdoms' || t === 'villages';
        if (start?.exact && start.lo >= this.years[0] && start.lo <= this.years.at(-1)) add(start.lo, `${name}: ${civilization ? 'founded' : 'began'}`, t, e.id);
        else if (h.length) add(h[0].year, `${name}: observed`, t, e.id);
        const end = boundary(e.end_year);
        if (end) add(end.hi, `${name}: ${end.exact ? 'ended' : 'observed ended by'} ${end.hi}`, t, e.id);
        if (t === 'villages') for (const c of this.ownership(e.id).changes) add(c.to, `${name}: recorded owner changed from ${this.entity('kingdoms', c.previous)?.name || c.previous || 'none'} to ${this.entity('kingdoms', c.owner)?.name || c.owner || 'none'}`, t, e.id, c.from);
        if (t === 'wars' || t === 'alliances') for (const m of e.kingdoms || []) for (const interval of m.involvement || []) {
          const start = boundary(interval.start_year), finish = boundary(interval.end_year), member = this.entity('kingdoms', m.kingdom_id)?.name || `#${m.kingdom_id}`;
          if (start) add(start.hi, `${name}: ${member} ${start.exact ? 'involvement began' : 'observed participating by'} ${start.hi}${interval.side ? ` (${interval.side})` : ''}`, t, e.id);
          if (finish) add(finish.hi, `${name}: ${member} ${finish.exact ? 'involvement ended' : 'observed participation ended by'} ${finish.hi}`, t, e.id);
        }
      }
      if (type === 'kingdoms') {
        for (const village of this.catalog('villages')) for (const c of this.ownership(village.id).changes) {
          if (key(c.previous) === key(id) || key(c.owner) === key(id)) add(c.to, `${village.name}: recorded ownership ${key(c.owner) === key(id) ? 'entered' : 'left'} this kingdom`, 'villages', village.id, c.from);
        }
        for (const relation of this.relations(id)) for (const i of relation.member.involvement) {
          const a = boundary(i.start_year), b = boundary(i.end_year);
          if (a) add(a.hi, `${relation.entity.name}: ${a.exact ? 'involvement began' : 'observed participating by'} ${a.hi}${i.side ? ` (${i.side})` : ''}`, relation.type, relation.entity.id);
          if (b) add(b.hi, `${relation.entity.name}: ${b.exact ? 'involvement ended' : 'observed participation ended by'} ${b.hi}`, relation.type, relation.entity.id);
        }
      }
      events.sort((a, b) => a.year - b.year);
      this.summaryCache.set(cacheKey, events); return events;
    }
  }
  // Warm shared results cooperatively once, rather than scanning history on every UI change.
  async function prepare(dataset, progress = () => {}) {
    const fields = ['population', ...SPECIES, 'kingdoms', 'villages', 'wars', 'army', 'army_ratio', 'territory', 'houses', 'food', 'coins', 'food_per_resident', 'coins_per_resident', 'houses_per_resident'];
    const series = new Map(fields.map(f => [f, []]));
    let yieldedAt = Date.now();
    for (let i = 0; i < dataset.years.length; i++) {
      const year = dataset.years[i], snap = dataset.snapshot('world', '', year);
      for (const field of fields) series.get(field).push({ year, value: number(snap[field]) });
      if (Date.now() - yieldedAt > 12) { progress(`Preparing world observations ${i + 1}/${dataset.years.length}…`); await pause(); yieldedAt = Date.now(); }
    }
    for (const [field, points] of series) dataset.seriesCache.set(`world::${field}`, points);
    let count = 0;
    for (const type of TYPES) for (const entity of dataset.catalog(type)) {
      dataset.summary(type, entity.id);
      if (type === 'villages') dataset.ownership(entity.id);
      count++;
      if (Date.now() - yieldedAt > 12) { progress(`Preparing historical catalog: ${count} entities…`); await pause(); yieldedAt = Date.now(); }
    }
    progress('Preparing historical milestones…'); await pause();
    dataset.milestones();
    return dataset;
  }
  async function parse(metadataText, annualSource, onProgress = () => {}) {
    let metadata;
    try { metadata = JSON.parse(metadataText.replace(/^\uFEFF/, '')); } catch (e) { throw new Error(`metadata.json: ${e.message}`); }
    const dataset = new Dataset(metadata);
    let buffer = '', line = 0, count = 0, yieldedAt = Date.now();
    async function consume(chunk, final = false) {
      buffer += chunk;
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0 || (final && buffer.length)) {
        const text = newline >= 0 ? buffer.slice(0, newline) : buffer;
        buffer = newline >= 0 ? buffer.slice(newline + 1) : '';
        line++;
        if (text.trim()) {
          let record;
          try { record = JSON.parse(text.replace(/^\uFEFF/, '')); } catch (e) { throw new Error(`annual.jsonl line ${line}: ${e.message}`); }
          dataset.addRecord(record, line); count++;
          if (Date.now() - yieldedAt > 12) { onProgress(count); await pause(); yieldedAt = Date.now(); }
        }
      }
    }
    if (typeof annualSource === 'string') {
      for (let offset = 0; offset < annualSource.length; offset += 262144) await consume(annualSource.slice(offset, offset + 262144));
    } else {
      const reader = annualSource.stream().getReader(), decoder = new TextDecoder();
      try { while (true) { const { value, done } = await reader.read(); if (done) break; await consume(decoder.decode(value, { stream: true })); } await consume(decoder.decode()); }
      finally { reader.releaseLock(); }
    }
    await consume('', true); onProgress(count);
    return dataset.finish();
  }
  root.HistoryBox = { parse, prepare, Dataset, TYPES, SPECIES, ADDITIVE, boundary, intervalStatus, duration, compare, numeric, ratio, sum };
})(typeof globalThis !== 'undefined' ? globalThis : window);
