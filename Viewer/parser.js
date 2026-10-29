/* HistoryBox data layer. No DOM, selected UI state, network, or rendering dependencies. */
(function (root) {
  'use strict';
  const TYPES = ['kingdoms', 'villages', 'characters', 'wars', 'alliances'];
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
    const missing = v => v == null || v === '—' || (typeof v === 'number' && !Number.isFinite(v));
    if (missing(a) || missing(b)) return (missing(a) === missing(b) ? 0 : missing(a) ? -1 : 1) * direction;
    if (numeric(a) && numeric(b)) return (a - b) * direction;
    return String(a).localeCompare(String(b), undefined, { numeric: true }) * direction;
  }
  class Dataset {
    constructor(metadata) {
      if (!metadata || typeof metadata !== 'object' || !metadata.metadata || typeof metadata.metadata.id !== 'string' || !metadata.metadata.id || !(metadata.metadata.name === null || typeof metadata.metadata.name === 'string') || !(metadata.metadata.slot === null || Number.isSafeInteger(metadata.metadata.slot) && metadata.metadata.slot >= 0) || !Number.isSafeInteger(metadata.metadata.year) || metadata.metadata.year < 0) throw new Error('overview.json requires metadata with id, name, slot, and last recorded year. Re-export older histories with the updated Box.');
      const map=metadata.map;
      if(!map || !Number.isSafeInteger(map.width) || !Number.isSafeInteger(map.height) || map.width<1 || map.height<1 || !Number.isSafeInteger(map.width*map.height) || !Array.isArray(map.elevation) || map.elevation.length!==map.width*map.height || map.elevation.some(v=>!Number.isInteger(v)||v<0||v>3)) throw new Error('Unsupported or invalid map baseline.');
      this.mapWidth=map.width;this.mapHeight=map.height;
      this.mapBaseline=Uint8Array.from(map.elevation);
      this.mapCheckpoints=new Map();
      this.raw = metadata;
      this.hasCharacters = Object.hasOwn(metadata,'characters');
      this.familyCache = new Map();
      this.world = metadata.metadata;
      this.warnings = [];
      this.warningCount = 0;
      this.warningGroups = new Map();
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
        if (type === 'characters' && !this.hasCharacters) { this.entities.set(type,new Map()); this.observations.set(type,new Map()); continue; }
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
      for (const e of this.catalog('characters')) {
        if (!Number.isSafeInteger(e.start_year) || e.start_year < 0) throw new Error('Character birth year must be exact.');
        if (!SPECIES.includes(e.species)) this.warn('Character '+e.id+': unknown species.');
        for (const field of ['p','s','c']) {
          if (!Array.isArray(e[field])) throw new Error('Character '+e.id+': family must be an array.');
          const seen=new Set();
          for (const id of e[field]) { if (!validId(id) || key(id)===key(e.id) || seen.has(key(id))) throw new Error('Character '+e.id+': invalid family reference.'); seen.add(key(id));this.checkReference('characters',id,'Character '+e.id); }
          for (const id of e[field]) {
            const relative=this.entity('characters',id),reverse={p:'c',c:'p',s:'s'}[field];
            if(relative && !relative[reverse]?.some(other=>key(other)===key(e.id))) this.warn('Character '+e.id+': family relationship with '+id+' is not reciprocal.');
          }
        }
        const ancestors=[...e.p],seen=new Set();
        while(ancestors.length) {const id=ancestors.pop();if(key(id)===key(e.id))throw new Error('Character ancestry contains a cycle.');if(seen.has(key(id)))continue;seen.add(key(id));ancestors.push(...(this.entity('characters',id)?.p || []));}
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
    warn(message) {
      this.warningCount++;
      this.warnings.push(message);
      const categories = [
        [/multiple claimed rulers/, 'Conflicting rulers', 'More than one character claims the same office. Rulers are withheld; check the recorder’s appointment data.'],
        [/kingdom disagrees with home village/, 'Conflicting affiliations', 'A character’s kingdom differs from their home village’s kingdom. The conflicting affiliation and office are withheld.'],
        [/appointment|appointed/, 'Unverified appointments', 'Ruler appointments are missing or disagree with character records. Re-record with the current Box to obtain verified appointments.'],
        [/ownership|observed owner|cities array/, 'Conflicting village ownership', 'Village ownership and kingdom village lists disagree or are incomplete. Check both records for the affected year.'],
        [/reference|not present in this observation/, 'Missing references', 'A referenced entity is absent. Check that overview and annual records contain the referenced entity.'],
        [/family|parent .*born/, 'Family inconsistencies', 'Family links or birth dates disagree. Check parent, child and sibling references.'],
        [/lifespan|boundary|start_year|involvement|side/, 'Timeline inconsistencies', 'Dates or membership intervals are missing, contradictory, or outside an entity’s lifespan. Check the corresponding overview entries.'],
        [/decreased/, 'Decreasing cumulative counts', 'A cumulative count decreased between observations. Check the source records for a reset or recording error.'],
        [/population|army exceeds/, 'Population inconsistencies', 'Population, species or army totals disagree. Check the corresponding annual observation.'],
        [/invalid or missing|observations are missing|unknown species|unknown role/, 'Missing or invalid values', 'An expected value is absent or invalid. Unavailable values display as an em dash. Check the listed source fields.']
      ];
      const category = categories.find(([pattern]) => pattern.test(message)) || [null, 'Other inconsistencies', 'Check the source records described below.'];
      let group = this.warningGroups.get(category[1]);
      if (!group) { group = { title:category[1], description:category[2], count:0, examples:[] }; this.warningGroups.set(category[1],group); }
      group.count++;
      if (group.examples.length < 3 && !group.examples.includes(message)) group.examples.push(message);
    }
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
      if(!Array.isArray(record.map)) throw new Error('Missing annual map changes.');
      let previousZone=-1;
      for(const patch of record.map) {
        if(!Array.isArray(patch)||patch.length!==2||!Number.isSafeInteger(patch[0])||patch[0]<=previousZone||patch[0]>=this.mapBaseline.length||!Number.isInteger(patch[1])||patch[1]<0||patch[1]>3) throw new Error('Invalid annual map changes.');
        previousZone=patch[0];
      }
      const claimedZones=new Set();
      for(const village of record.villages||[]) {
        const zones=village.territory;
        if(!Array.isArray(zones)||!zones.length)throw new Error('Invalid village map territory.');
        let previous=-1;
        for(let i=0;i<zones.length;i++) {
          const zone=zones[i];
          if(!Number.isSafeInteger(zone)||zone < (i===0?-1:0)||zone>=this.mapBaseline.length||(i>0&&zone<=previous)||claimedZones.has(zone))throw new Error('Invalid or overlapping village map territory.');
          if(zone>=0)claimedZones.add(zone);
          if(i>0)previous=zone;
        }
      }
      const indexes = new Map(), badOwners = new Set();
      for (const type of ['kingdoms', 'villages', 'characters', 'wars']) {
        if (type === 'characters' && record.characters === undefined) { if(this.hasCharacters)this.warn('Year '+year+': character observations are missing; character coverage is unavailable.');indexes.set(type,new Map()); continue; }
        if (!Array.isArray(record[type])) throw new Error(`Line ${line}: ${type} must be an array.`);
        const index = new Map();
        for (const rawItem of record[type]) {
          const item = type === 'characters' ? {...rawItem} : rawItem;
          if (!item || !validId(item.id)) throw new Error(`Line ${line}: invalid ${type} identity.`);
          const id = key(item.id);
          if (index.has(id)) throw new Error(`Line ${line}: duplicate ${type} identity ${id}.`);
          index.set(id, item);
          this.checkReference(type, id, `Year ${year}`);
          const histories = this.observations.get(type);
          if (!histories.has(id)) histories.set(id, []);
          histories.get(id).push({ year, record: item });
          const fields = type === 'villages' ? [...ADDITIVE.filter(f=>f!=='territory'), 'loyalty'] : type === 'wars' ? ['attacker_deaths', 'defender_deaths'] : type === 'characters' ? ['level','coins','kills'] : [];
          for (const field of fields) if (!numeric(item[field]) || (field !== 'loyalty' && item[field] < 0)) this.warn(`Year ${year}, ${type} ${id}: invalid or missing ${field}.`);
          if (type === 'characters') {
            for (const [field,target] of [['kingdom_id','kingdoms'],['village_id','villages']]) if (item[field] !== null) this.checkReference(target,item[field],'Character '+id);
            if (item.role !== null && !['king','leader','captain','warrior','citizen'].includes(item.role)) this.warn('Character '+id+': unknown role.');
          }
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
      // Keep source rows intact; contradictory fields are unavailable in derived views.
      const characters=indexes.get('characters'), offices=new Map();
      const describe=(type,id)=>(this.entity(type,id)?.name || 'Unknown '+type.slice(0,-1))+' (#'+id+')';
      for(const c of characters.values()) {
        const context='Year '+year+', '+describe('characters',c.id);
        const village=indexes.get('villages').get(key(c.village_id));
        for(const [field,target] of [['kingdom_id','kingdoms'],['village_id','villages']]) if(c[field]!=null && (!validId(c[field]) || !indexes.get(target).has(key(c[field])))) {this.warn(context+': '+field+' is not present in this observation; affiliation unavailable.');c[field]=null;}
        if(village && key(village.kingdom_id)!==key(c.kingdom_id)) {this.warn(context+': kingdom disagrees with home village '+describe('villages',village.id)+'; kingdom and office unavailable.');c.kingdom_id=null;c.role=null;c.affiliation_uncertain=true;}
        if(![null,'king','leader','captain','warrior','citizen'].includes(c.role)) c.role=null;
        if(c.role==='king'||c.role==='leader') {
          const target=c.role==='king'?'kingdoms':'villages',id=c[c.role==='king'?'kingdom_id':'village_id'],owner=indexes.get(target).get(key(id)),field=c.role==='king'?'king_id':'leader_id';
          if(!owner || (Object.hasOwn(owner,field) && owner[field]!==c.id)) {this.warn(context+': claimed '+c.role+' is not confirmed by the '+target+' appointment; office unavailable.');c.role=null;continue;}
          const k=target+':'+id;if(!offices.has(k))offices.set(k,[]);offices.get(k).push(c);
        }
      }
      for(const [office,claims] of offices) if(claims.length>1){this.warn('Year '+year+', '+office+': multiple claimed rulers ('+claims.map(c=>describe('characters',c.id)).join(', ')+'); no ruler can be established.');for(const c of claims)c.role=null;}
      for(const [target,field,role,association] of [['kingdoms','king_id','king','kingdom_id'],['villages','leader_id','leader','village_id']]) for(const owner of indexes.get(target).values()) if(Object.hasOwn(owner,field)&&owner[field]!=null) {const c=characters.get(key(owner[field]));if(!c||c.role!==role||key(c[association])!==key(owner.id))this.warn('Year '+year+', '+describe(target,owner.id)+': appointed '+role+' is missing or contradictory.');}
      const speciesTotal=sum(SPECIES.map(f=>record.world[f]));
      if(numeric(speciesTotal)&&numeric(record.world.global_population)&&speciesTotal!==record.world.global_population)this.warn('Year '+year+': global population differs from its species total.');
      for(const v of record.villages){const total=sum(SPECIES.map(f=>v[f]));if(numeric(total)&&numeric(v.population)&&total>v.population)this.warn('Year '+year+', village '+v.id+': species total exceeds population.');if(numeric(v.army)&&numeric(v.population)&&v.army>v.population)this.warn('Year '+year+', village '+v.id+': army exceeds population.');}
      this.records.set(year, { raw: record, indexes, badOwners });
    }
    finish() {
      this.years = [...this.records.keys()].sort((a, b) => a - b);
      if (!this.years.length) throw new Error('annual.jsonl has no observations.');
      if(this.records.get(this.years[0]).raw.map.length)throw new Error('First annual map must match the map baseline.');
      this.yearIndex = new Map(this.years.map((y, i) => [y, i]));
      if(this.hasCharacters && [...this.records.values()].some(r=>r.raw.kingdoms.some(k=>!Object.hasOwn(k,'king_id')) || r.raw.villages.some(v=>!Object.hasOwn(v,'leader_id'))))this.warn('Older observations lack ruler appointment IDs. A single recorded king or leader claim cannot be independently verified; contradictory claims are withheld.');
      this.gaps = this.years.slice(1).flatMap((y, i) => y > this.years[i] + 1 ? [[this.years[i], y]] : []);
      for (const histories of this.observations.values()) for (const history of histories.values()) history.sort((a, b) => a.year - b.year);
      for(const e of this.catalog('characters')) for(const parent of e.p||[]){const p=this.entity('characters',parent);if(p && p.start_year>=e.start_year)this.warn('Character '+e.id+': parent '+parent+' was not born before this character.');}
      for (const [id,history] of this.observations.get('characters')) for(let i=1;i<history.length;i++) if(numeric(history[i].record.kills)&&numeric(history[i-1].record.kills)&&history[i].record.kills<history[i-1].record.kills) this.warn('Character '+id+': cumulative kills decreased; check the source observations.');
      for (const [id, history] of this.observations.get('wars')) {
        for (let i = 1; i < history.length; i++) for (const field of ['attacker_deaths', 'defender_deaths']) {
          if (history[i].record[field] < history[i - 1].record[field]) this.warn(`War ${id}: ${field} decreased between ${history[i - 1].year} and ${history[i].year}; check the source observations.`);
        }
      }
      return this;
    }
    // Reconstruct absolute terrain from an immutable baseline; bounded checkpoints
    // make backward seeking safe without retaining a full map for every year.
    terrainAt(year) {
      const target=this.yearIndex.get(year);
      if(target===undefined)return null;
      let from=-1,source=this.mapBaseline;
      for(const [index,state] of this.mapCheckpoints)if(index<=target&&index>from){from=index;source=state;}
      const terrain=source.slice();
      for(let i=from+1;i<=target;i++)for(const [zone,value] of this.records.get(this.years[i]).raw.map)terrain[zone]=value;
      boundedSet(this.mapCheckpoints,target,terrain.slice(),12);
      return terrain;
    }
    territoryCount(village) { return village.territory.length-(village.territory[0]===-1?1:0); }
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
      out.tracked_characters = complete ? sum(rows.map(r=>r.tracked_characters)) : null;
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
        for (const field of ADDITIVE) out[field] = sum(record.raw.villages.map(v => field==='territory'?this.territoryCount(v):this.validStat(v[field])));
        out.population = this.validStat(record.raw.world.global_population);
        SPECIES.forEach(s => { out[s] = this.validStat(record.raw.world[s]); });
        out.kingdoms = record.raw.kingdoms.length; out.villages = record.raw.villages.length; out.wars = record.raw.wars.length;
        out.tracked_characters = Array.isArray(record.raw.characters) ? record.raw.characters.length : null;
      } else if (type === 'characters' && item) {
        out={kingdom_id:item.kingdom_id,village_id:item.village_id,role:item.role,complete:!item.affiliation_uncertain};
        for(const field of ['level','coins','kills']) out[field]=this.validStat(item[field]);
      } else if (type === 'villages' && item) {
        out = { kingdom_id: item.kingdom_id, complete: true };
        [...ADDITIVE, 'loyalty'].forEach(f => { out[f] = f==='territory'?this.territoryCount(item):this.validStat(item[f], f === 'loyalty'); });
      } else if (type === 'kingdoms' && item) {
        const complete = !record.badOwners.has(key(id));
        const villages = Array.isArray(item.cities) ? item.cities : [];
        out = this.aggregate(villages.map(v => this.snapshot('villages', v, year)), complete);
        out.villages = complete ? villages.length : null;
        out.capital_id = complete && Object.hasOwn(record.raw,'characters') ? villages[0] ?? null : null;
        for (const t of ['wars', 'alliances']) out[t] = this.relations(id, t).filter(r => intervalStatus(r.entity, year) === 'active' && this.memberships(t, r.entity.id, year).some(m => key(m.id) === key(id) && m.status === 'active')).length;
      } else if (type === 'wars' && item) {
        const members = this.memberships(type, id, year);
        out = { ...this.participantSnapshot(type,id,year), attacker_deaths: this.validStat(item.attacker_deaths), defender_deaths: this.validStat(item.defender_deaths) };
        out.total_deaths = sum([out.attacker_deaths, out.defender_deaths]);
        out.attackers = members.filter(m => m.status === 'active' && m.side === 'attacker').length;
        out.defenders = members.filter(m => m.status === 'active' && m.side === 'defender').length;
        out.members = members.filter(m => m.status === 'active').length;
      } else if (type === 'alliances' && intervalStatus(this.entity(type, id), year) === 'active') {
        out = this.participantSnapshot(type,id,year);
      }
      if (out) {
        if(type==='kingdoms' || type==='villages') out.tracked_characters=Array.isArray(record.raw.characters) && !(type==='kingdoms' && [...record.indexes.get('characters').values()].some(c=>c.affiliation_uncertain)) ? [...record.indexes.get('characters').values()].filter(c=>c[type==='kingdoms'?'kingdom_id':'village_id']!=null && key(c[type==='kingdoms'?'kingdom_id':'village_id'])===key(id)).length : null;
        this.ratios(out,year);
        if (type === 'alliances') out.territory_share = ratio(out.territory, this.snapshot('world', '', year)?.territory);
      }
      boundedSet(this.cache, cacheKey, out, 30000);
      return out;
    }
    series(type, id, metric) {
      const k = `${type}:${id}:${metric}`;
      if (!this.seriesCache.has(k)) {
        const points = this.years.map(year => { const snapshot=this.snapshot(type,id,year); return { year, value:number(snapshot?.[metric]) }; });
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
    averageSeries(type, metric) {
      const k = `average:${type}:${metric}`;
      if (!this.seriesCache.has(k)) this.seriesCache.set(k, this.years.map(year => {
        const records = type === 'alliances' ? this.catalog(type).filter(e => intervalStatus(e,year) === 'active') : this.records.get(year).raw[type] || [];
        const values = records.map(e => this.snapshot(type, e.id, year)?.[metric]);
        return { year, value: values.length ? ratio(sum(values), values.length) : null };
      }));
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
    relatedNames(type, id, year = null, role = '') {
      const entity = this.entity(type, id), names = [];
      const add = (t, v) => names.push(`${this.entity(t, v)?.name || ''} ${v}`);
      if (type === 'kingdoms') {
        for (const r of this.relations(id)) if (year === null || this.memberships(r.type, r.entity.id, year).some(m => key(m.id) === key(id) && m.status === 'active')) add(r.type, r.entity.id);
      } else if (type === 'characters') {
        const points=year === null ? this.history(type,id) : [{record:this.observed(type,id,year)}];
        for(const p of points) if(p.record) {add('kingdoms',p.record.kingdom_id);add('villages',p.record.village_id);}
        for(const relative of this.family(id)) add('characters',relative.id);
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
    observationRuns(type,id,field,select = record => record[field]) {
      const runs=[],changes=[];let previous=null,run=null;
      for(const p of this.history(type,id)) {const value=select(p.record,p.year);
        if(!previous || key(previous.value)!==key(value) || p.year!==previous.year+1) {run={value,start_year:p.year,end_year:p.year,observed:true};runs.push(run);} else run.end_year=p.year;
        if(previous && key(previous.value)!==key(value)) changes.push({from:previous.year,to:p.year,previous:previous.value,value});
        previous={year:p.year,value};
      }return {runs,changes};
    }
    rulers(type,id,year) {
      return this.catalog('characters').filter(e=>{const s=this.observed('characters',e.id,year);return s && s.role===(type==='kingdoms'?'king':'leader') && key(s[type==='kingdoms'?'kingdom_id':'village_id'])===key(id);});
    }
    family(id) {
      const cacheKey=key(id);if(this.familyCache.has(cacheKey))return this.familyCache.get(cacheKey);
      const queue=[{id:cacheKey,up:0,down:0,side:false}],seen=new Set([cacheKey+':up']),found=new Map();
      for(let at=0;at<queue.length;at++) {const current=queue[at],e=this.entity('characters',current.id);if(!e)continue;
        for(const field of current.down||current.side ? ['c'] : ['p','s','c']) for(const next of e[field]||[]) {
          const k=key(next);if(k===cacheKey||!this.entity('characters',k))continue;
          const up=current.up+(field==='p'),down=current.down+(field==='c'),side=current.side||field==='s',visit=k+':'+(down||side?'down':'up');if(seen.has(visit))continue;seen.add(visit);
          const relationship=side ? up===0&&down===0?'Sibling':up===1&&down===0?'Aunt / uncle':up===1&&down===1?'Cousin':'Extended' : !down ? up===1?'Parent':up===2?'Grandparent':'Extended' : !up ? down===1?'Child':down===2?'Grandchild':'Extended' : up===1&&down===1?'Sibling':up===2&&down===1?'Aunt / uncle':up===2&&down===2?'Cousin':'Extended';
          if(!found.has(k))found.set(k,{id:next,relationship});queue.push({id:k,up,down,side});
        }
      }
      for(const child of this.entity('characters',id)?.c||[]) for(const parent of this.entity('characters',child)?.p||[]) if(key(parent)!==cacheKey && this.entity('characters',parent)) found.set(key(parent),{id:parent,relationship:'Spouse'});
      const order=['Spouse','Grandparent','Parent','Sibling','Child','Grandchild','Aunt','Uncle','Cousin','Extended'];
      const result=[...found.values()].map(r=>{let relationship=r.relationship;if(relationship==='Aunt / uncle') relationship=this.entity('characters',r.id)?.gender==='female'?'Aunt':this.entity('characters',r.id)?.gender==='male'?'Uncle':'Extended';if(!order.includes(relationship))relationship='Extended';return {...r,relationship};}).sort((a,b)=>order.indexOf(a.relationship)-order.indexOf(b.relationship)||String(this.entity('characters',a.id)?.name||a.id).localeCompare(String(this.entity('characters',b.id)?.name||b.id)));
      this.familyCache.set(cacheKey,result);return result;
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
      const metrics = type === 'characters' ? ['level','coins','kills'] : [...ADDITIVE, 'villages', 'loyalty', 'members'];
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
    period(ageIndex, selectedYears = this.periodYears(ageIndex), bounds = null) {
      const years = selectedYears, allowed = new Set(years), out = { years, population: this.stats('world', '', 'population', years) };
      for (const type of ['kingdoms', 'villages']) {
        const inPeriod = value => bounds ? value >= bounds[0] && value <= bounds[1] : ageIndex === null ? value >= this.years[0] && value <= this.years.at(-1) : intervalStatus(this.ages[ageIndex],value) === 'active';
        out[`${type}_observed`] = this.catalog(type).filter(e => allowed.has(this.history(type,e.id)[0]?.year)).length;
        out[`${type}_ended`] = this.catalog(type).filter(e => { const b = boundary(e.end_year); return b && inPeriod(b.lo) && inPeriod(b.hi); }).length;
      }
      const endpoints = [years[0],years.at(-1)];
      const count = (type,y) => {
        if(y == null)return null;
        if(type==='alliances') { const statuses=this.catalog(type).map(e=>intervalStatus(e,y));return statuses.some(s=>s==='uncertain'||s==='unknown')?null:statuses.filter(s=>s==='active').length; }
        return this.records.get(y)?.raw[type]?.length ?? null;
      };
      out.recorded = {}; out.ended = {};
      const [lo,hi]=bounds || [years[0],years.at(-1)];
      for(const type of TYPES) {
        out.recorded[type]=this.catalog(type).filter(e=> type==='alliances' ? years.some(y=>intervalStatus(e,y)==='active') : this.history(type,e.id).some(p=>allowed.has(p.year))).length;
        out.ended[type]=this.catalog(type).filter(e=>{const end=boundary(e.end_year);return end && end.lo>=lo && end.hi<=hi;}).length;
      }
      out.changes = {};
      for(const metric of ['population',...SPECIES,...TYPES]) {
        const values=endpoints.map(y=>TYPES.includes(metric)?count(metric,y):this.snapshot('world','',y)?.[metric]);
        out.changes[metric]=values.every(numeric)?values[1]-values[0]:null;
      }
      out.tracked_characters = years.some(y=>Array.isArray(this.records.get(y).raw.characters)) ? this.catalog('characters').filter(e=>this.history('characters',e.id).some(p=>allowed.has(p.year))).length : null;
      out.alliances_observed = this.catalog('alliances').filter(e => years.some(y => intervalStatus(e,y)==='active')).length;
      out.wars_observed = this.catalog('wars').filter(e => this.history('wars', e.id).some(p => allowed.has(p.year))).length;
      return out;
    }
    milestones(type = null, id = null) {
      const cacheKey = `events:${type}:${id}`;
      if (this.summaryCache.has(cacheKey)) return this.summaryCache.get(cacheKey);
      const events = [], add = (year, text, t, entityId, from = null) => events.push({ year, text, type: t, id: entityId, from });
      for (const t of TYPES) for (const e of this.catalog(t)) {
        if ((!type && t==='characters') || (type && (t !== type || key(e.id) !== key(id)))) continue;
        const h = this.history(t, e.id), name = e.name || `#${e.id}`;
        const start = boundary(e.start_year);
        if (t === 'characters') { if (h.length) add(h[0].year, `${name}: first observed`, t,e.id); }
        else if (start?.exact && start.lo >= this.years[0] && start.lo <= this.years.at(-1)) add(start.lo, `${name}: first observed`, t, e.id);
        else if (h.length) add(h[0].year, `${name}: first observed`, t, e.id);
        const end = boundary(e.end_year);
        if (end) add(end.hi, `${name}: ${end.exact ? 'ended' : 'no longer observed'}`, t, e.id);
        if (t === 'characters') for(const field of ['role','kingdom_id','village_id']) for(const c of this.observationRuns(t,e.id,field).changes) {
          const target=field==='kingdom_id'?'kingdoms':'villages', value=field==='role' ? c.value || '—' : this.entity(target,c.value)?.name || '—';
          add(c.to, name+': '+(field==='role'?'observed as '+value:field==='kingdom_id'?'kingdom changed to '+value:'home village changed to '+value),t,e.id,c.from);
        }
        if (t === 'villages') for (const c of this.ownership(e.id).changes) add(c.to, `${name}: ownership changed from ${this.entity('kingdoms', c.previous)?.name || c.previous || 'none'} to ${this.entity('kingdoms', c.owner)?.name || c.owner || 'none'}`, t, e.id, c.from);
        if (t === 'wars' || t === 'alliances') for (const m of e.kingdoms || []) for (const interval of m.involvement || []) {
          const start = boundary(interval.start_year), finish = boundary(interval.end_year), member = this.entity('kingdoms', m.kingdom_id)?.name || `#${m.kingdom_id}`;
          if (start) add(start.hi, `${name}: ${member} ${start.exact ? 'joined' : 'first observed participating'}${interval.side ? ` as ${interval.side === 'attacker' ? 'an attacker' : 'a defender'}` : ''}`, t, e.id);
          if (finish) add(finish.hi, `${name}: ${member} ${finish.exact ? 'left' : 'no longer observed participating'}`, t, e.id);
        }
      }
      if (type === 'kingdoms') {
        for (const village of this.catalog('villages')) for (const c of this.ownership(village.id).changes) {
          if (key(c.previous) === key(id) || key(c.owner) === key(id)) add(c.to, `${village.name}: ownership ${key(c.owner) === key(id) ? 'entered' : 'left'} this kingdom`, 'villages', village.id, c.from);
        }
        for (const relation of this.relations(id)) for (const i of relation.member.involvement) {
          const a = boundary(i.start_year), b = boundary(i.end_year);
          if (a) add(a.hi, `${relation.entity.name}: ${a.exact ? 'joined' : 'first observed participating'}${i.side ? ` as ${i.side === 'attacker' ? 'an attacker' : 'a defender'}` : ''}`, relation.type, relation.entity.id);
          if (b) add(b.hi, `${relation.entity.name}: ${b.exact ? 'left' : 'no longer observed participating'}`, relation.type, relation.entity.id);
        }
      }
      if(type==='kingdoms'||type==='villages') {
        const role=type==='kingdoms'?'king':'leader',field=type==='kingdoms'?'kingdom_id':'village_id';
        for(const e of this.catalog('characters')) {
          const runs=this.observationRuns('characters',e.id,'office',r=>r.role===role && key(r[field])===key(id)).runs;
          for(const run of runs.filter(r=>r.value)) {
            add(run.start_year,e.name+': first observed as '+role,'characters',e.id);
            const next=this.history('characters',e.id).find(p=>p.year>run.end_year);
            if(next && !(next.record.role===role && key(next.record[field])===key(id)))add(next.year,e.name+': no longer observed as '+role,'characters',e.id);
          }
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
      if (type === 'characters') dataset.family(entity.id);
      count++;
      if (Date.now() - yieldedAt > 12) { progress(`Preparing historical catalog: ${count} entities…`); await pause(); yieldedAt = Date.now(); }
    }
    progress('Preparing historical milestones…'); await pause();
    dataset.milestones();
    return dataset;
  }
  async function parse(metadataText, annualSource, onProgress = () => {}) {
    let metadata;
    try { metadata = JSON.parse(metadataText.replace(/^\uFEFF/, '')); } catch (e) { throw new Error(`overview.json: ${e.message}`); }
    const dataset = new Dataset(metadata);
    let buffer = '', line = 0, count = 0, header = false, previousYear = -1, yieldedAt = Date.now();
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
          if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error(`annual.jsonl line ${line}: expected an object.`);
          if (!header) {
            if (Object.keys(record).length !== 1 || !record.metadata) throw new Error('annual.jsonl must begin with a single metadata header.');
            const identity=record.metadata;
            if(!identity || typeof identity!=='object' || Array.isArray(identity) || Object.keys(identity).sort().join(',')!=='id,slot')throw new Error('annual.jsonl requires the fixed metadata header.');
            if(identity.id!==metadata.metadata.id)throw new Error('Files describe a different world.');
            if(identity.slot!==metadata.metadata.slot)throw new Error('Files describe a different save.');
            header = true; continue;
          }
          if (record.metadata !== undefined) throw new Error('annual.jsonl metadata must appear only once, at the beginning.');
          if (!Number.isSafeInteger(record.world?.year) || record.world.year <= previousYear) throw new Error('annual.jsonl observation years must be strictly increasing, without duplicate years.');
          previousYear = record.world.year;
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
    if (!header || previousYear !== metadata.metadata.year) throw new Error('The last annual observation does not match metadata.year.');
    return dataset.finish();
  }
  root.HistoryBox = { parse, prepare, Dataset, TYPES, SPECIES, ADDITIVE, boundary, intervalStatus, duration, compare, numeric, ratio, sum };
})(typeof globalThis !== 'undefined' ? globalThis : window);
