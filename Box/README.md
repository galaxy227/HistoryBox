# HistoryBox — Box

HistoryBox is a C# mod for [WorldBox](https://www.superworldbox.com/) that records historical world data into external JSON files.

The mod tracks world population, kingdoms, villages, characters, wars, alliances, and historical changes over time.

## Requirements

- WorldBox (developed against version 0.51.2, build 719)
- C# compiler compatible with WorldBox's Unity/Mono runtime
- .NET Framework 4.8 reference assemblies
- WorldBox's native experimental mod loader

The mod does not require NeoModLoader or third-party libraries.

## Building

The source code is contained in `HistoryBox.cs` and can be compiled into `HistoryBox.dll` using Visual Studio or another compatible C# development environment.

1. Create a C# Class Library project targeting .NET Framework 4.8.
2. Add `HistoryBox.cs` to the project.
3. Reference the following assemblies:

   - `Assembly-CSharp.dll`
   - `UnityEngine.dll`
   - `UnityEngine.CoreModule.dll`
   - `UnityEngine.IMGUIModule.dll`
   - `System.Runtime.Serialization`

4. Compile the project to produce `HistoryBox.dll`.

The WorldBox and Unity assemblies are available within the game's installation directory, typically under `worldbox_Data/Managed/`.

Do not distribute proprietary WorldBox or Unity assemblies with the project.

## Installation

Download the platform archive described in the [getting-started guide](../README.md), extract it, and copy its managed `HistoryBox.dll` into the native loader's `mods` directory:

| Platform | Directory relative to the game installation |
| --- | --- |
| Windows | `worldbox_Data/StreamingAssets/mods/` |
| macOS | `worldbox.app/Contents/Resources/Data/StreamingAssets/mods/` |
| Linux | `worldbox_Data/StreamingAssets/mods/` |

Use the existing directory's capitalization. Enable Experimental Mode in WorldBox settings and restart. All three archives contain a managed DLL; no native `.so` or `.dylib` conversion is needed. Release builds should be checked against each platform's installed game assemblies and tested in-game before publication. The installation layout follows the [native-loader entry point documented by WorldBoxOpenMods](https://github.com/WorldBoxOpenMods/ModLoader) and its [platform installation guide](https://worldboxopenmods.gitbook.io/mod-tutorial-en/player-manual/install); HistoryBox itself does not require that additional loader.

## Controls

HistoryBox adds two buttons to the top-right corner of the game.

### Activator

Enables or disables historical recording.

- OFF by default when WorldBox launches.
- Records the current world when enabled.
- Stops recording without deleting existing data when disabled.
- Resumes recording when re-enabled.
- Automatically disables when switching worlds.

Only observed years are recorded. Missing years are not reconstructed.

### Recording errors

A capture or storage exception opens a separate panel below the controls, showing **⚠ ERROR**, the last successfully committed year, and **Dismiss**. Detailed errors remain in the game log. The panel does not switch Activator off: recording retries after five real-time seconds (including while paused), and the displayed year advances after a successful commit. Dismiss hides the panel until another error occurs. An em dash is shown when no observation has been committed.

### Duplicator

Controls how HistoryBox handles saving an existing world to another WorldBox save slot.

- OFF by default.
- When OFF, saving to another slot does not change the active HistoryBox history.
- When ON, saving to another slot duplicates the current history and switches recording to the new copy.

Each HistoryBox history is associated with a world GUID and an optional WorldBox save slot.

Save detection uses native file monitoring and may not detect every save operation.

## Data Storage

HistoryBox writes files to Unity's persistent application-data directory:

`Application.persistentDataPath/HistoryBox/`

On Windows, this normally corresponds to:

`%USERPROFILE%\AppData\LocalLow\mkarpenko\WorldBox\HistoryBox\`

Each tracked world has its own directory containing:

- `annual.jsonl` — One metadata header, followed by one JSON object per recorded year.
- `overview.json` — Persistent information about historical entities, their lifespans, and the initial zone map.

### Directory Naming

World names are converted to lowercase, with spaces replaced by underscores.

Examples:

| World | Save Slot | Directory |
|---|---|---|
| Songs of Red | Unassigned | `songs_of_red_` |
| Songs of Red | 29 | `songs_of_red_slot29` |
| Songs of Red | 29 (collision) | `songs_of_red_slot29_1` |

Unnamed worlds use numbered directories such as `HistoryBox_0`.

## Data Format

### annual.jsonl

Begins with one immutable header, `{ "metadata": { "id": "world-guid", "slot": 1 } }`. An unassigned save uses `null` for slot. Only the world GUID and slot belong in this header; the mutable name and last recorded year belong in overview. Subsequent lines contain six annual categories:

1. `map` — Sorted sparse changes as `[zoneId, terrain, biome, structure]` full-zone replacements.
2. `world` — Year and global population by species.
3. `kingdoms` — Kingdom IDs, owned village IDs (capital first when available), and the current `king_id` (or null).
4. `villages` — Population, species breakdown, army, loyalty, housing, food, coins, territory zone lists, and the current `leader_id` (or null).
5. `characters` — Current kingdom, village, confirmed office or occupation, level, personal coins, and cumulative kills.
6. `wars` — Cumulative attacker and defender casualties.

Each line after the header represents one recorded year. Exact serialized record fields are:

| Category | Fields, in output order |
| --- | --- |
| world | year, global_population, human, elf, orc, dwarf |
| kingdoms | id, cities, king_id |
| villages | id, kingdom_id, population, human, elf, orc, dwarf, army, loyalty, structures, food, coins, leader_id, territory |
| characters | id, kingdom_id, village_id, role, level, coins, kills |
| wars | id, attacker_deaths, defender_deaths |

The village `structures` field is the renamed existing game housing-structure counter; its quantity is unchanged. Map structure categories independently include all qualifying civilization assets. IDs link annual records to overview entries. Nullable owner, office-holder and affiliation IDs mean unavailable or no applicable current entity, never ID zero. Character role is king, leader, captain, warrior, citizen, or null when unconfirmed; personal level/coins/kills are nullable measurements. War counts are cumulative casualties, not yearly changes. There is no annual alliance array: active overview membership intervals identify its kingdoms. Missing years represent unrecorded history, not zero values.

In a kingdom's cities array, the first village is its capital **when a valid capital is available**; the remaining villages are sorted by ID. During a capital vacancy the entire array is sorted, with no extra flag distinguishing that case. Consumers must not treat the first-city convention as proof a capital exists. Empty means no owned villages. Village territory ordering and its -1 sentinel are described below.

### overview.json

Contains eight major categories:

1. `metadata` — Persistent world GUID (`id`), name, save slot, and last recorded `year`.
2. `map` — Zone-grid `width`, `height`, the `biomes` legend, and initial `zone` triples, in that order.
3. `ages` — Historical world ages and their recording intervals.
4. `kingdoms` — Kingdom identities, founding species (`founding_species`), birth years, and recording boundaries.
5. `villages` — Village identities, founding species (`founding_species`), birth years, and recording boundaries.
6. `characters` — Identities, species, gender, birth years, recording boundaries, and cumulative parent, sibling, and child relationships (`p`, `s`, `c`).
7. `wars` — War identities, participants, sides, and involvement intervals.
8. `alliances` — Alliance identities and kingdom membership intervals.

Every kingdom, village, character, war and alliance now has integer **birth_year immediately before start_year**, followed by end_year. No birth_year is added to ages, participation intervals, or annual.jsonl. Entity fields, in order:

| Collection | Fields |
| --- | --- |
| kingdoms / villages | id, name, founding_species, birth_year, start_year, end_year |
| characters | id, name, species, gender, birth_year, start_year, end_year, p, s, c |
| wars | id, name, war_type, birth_year, start_year, end_year, instigator, kingdoms |
| alliances | id, name, birth_year, start_year, end_year, kingdoms |

The metadata object is id, name, slot, year; slot may be null. Age entries retain name, start_year, end_year. War/alliance kingdoms entries contain kingdom_id and an involvement array. War involvement stores side (attacker/defender), start_year, end_year; alliance involvement stores only the two dates. Rejoining creates another involvement interval, not a duplicate entity. Instigator is a kingdom ID or null. Character p/s/c are cumulative parent/sibling/child ID arrays among enrolled characters; empty arrays do not prove no untracked relatives exist. Gender is male, female, or null. Names use the latest recorded name; identities remain stable IDs.

Overview information is updated with every committed observation. The annual header never changes within a stream; every annual observation retains its own `world.year`.

### Map Recording

The map is recorded at WorldBox zone resolution, normally 8 × 8 tiles per zone. Exported zone IDs are canonical bottom-left row-major positions: `zoneId = y * width + x`. They are independent of the game's zone IDs or enumeration order. Partial edge zones retain their actual tile coverage.

`overview.map.zone` contains exactly `width * height` triples `[terrain, biome, structure]`. Terrain categories are **0 water, 1 plain, 2 hill, 3 mountain, 4 lava**. All underlying tiles vote; ties favor the higher code. Lava is tested before plain terrain. Unknown terrain, incomplete grids, duplicate tiles, and inconsistent coordinates abort the observation.

The mandatory `overview.map.biomes` prefix is exactly:

```json
[null,"arcane_desert","birch","candy","celestial","clover","corrupted","crystal","enchanted","flower","garlic","grass","infernal","jungle","lemon","maple","mushroom","paradox","permafrost","rocklands","savanna","singularity_swamp","swamp","wasteland","sand","hill","tumor","biomass","pumpkin","cyber"]
```

The biome integer indexes this legend: 0 means no identified biome; 1–29 retain these fixed meanings. Exact installed-game asset IDs map to these slots: `biome_` plus the canonical name, except Arcane Desert → `biome_desert`, Singularity Swamp → `biome_singularity`, and Cyber → `biome_cybertile`. Each tile's actual biome asset votes; a tied identified biome beats null, and remaining ties choose the ordinally smaller raw asset ID. Special categories require their actual asset; terrain is never used to invent a biome.

Only unfamiliar **winning** raw IDs are appended at 30+, in ordinal order within each observation. Existing indices never change. Case is preserved. A raw ID colliding with any fixed canonical name, or beginning with `asset:`, is escaped by prepending `asset:` once. Remove exactly one prefix to recover an extended entry's raw ID; for example, raw `grass` becomes `asset:grass`, while raw `asset:grass` becomes `asset:asset:grass`. The null entry and fixed names are never escaped.

Structure codes are **0 none, 1 human, 2 elf, 3 orc, 4 dwarf, 5 generic architecture, 6 verified ruin**. These summarize civilization structures, not just homes. Each currently occupied footprint tile contributes once, including footprints spanning zones; empty tiles do not vote. Highest occupied-tile count wins, with higher code breaking ties. Live `WorldTile.building` occupancy resolves overlapping references. Eligible assets have `city_building` or the verified `civ_building` group; architecture comes from exact `BuildingAsset.civ_kingdom` IDs human/elf/orc/dwarf, not owners or residents. Other verified civilization structures, including shared and modded styles, are generic. Trees, minerals, roads, environment objects, and removed buildings do not count. Standing unowned buildings and physical construction footprints remain eligible. A zone icon is a dominant-category summary, not a building count or exact location. A zone can record both a structure category and a village bonfire: the Viewer displays only the bonfire marker there, but the recorded triple is not discarded. Selected-zone details prioritize the bonfire (Village or Capital under the first-city convention) over the underlying structure category. These presentation changes do not alter the output schema.

A qualifying occupied structure contributes **6** when the installed game’s `Building.isRuin()` reports its distinct ruin state (`BuildingData.state == BuildingState.ruin`). Ruins participate in the same occupied-tile vote as intact architecture; they do not automatically override a larger intact footprint. Removed/dead buildings and environmental objects remain excluded. The game refills footprint references when changing state and clears them on final removal. These paths were checked in the installed 0.51.2 assembly and in the harness; physical in-game rendering still needs a gameplay check.

The baseline is immutable at the **first recorded year**, whose annual `map` is empty. Later patches replace complete triples, e.g. `[12,4,0,5]`, only when terrain, biome, or structure changed. IDs must be increasing and unique. Empty means no recorded zone changes. The legend may grow, but the baseline does not change. Replay applies patches to a copy; gaps never invent intermediate states.

Each village's `territory` is a complete zone list for that year. Its first element is the current verified bonfire zone, or `-1` when no unique bonfire zone can be established within the village's territory. Multiple normal bonfires in different owned zones produce this existing unknown-location sentinel rather than aborting recording; multiple bonfires in one zone still establish that zone. Remaining zone IDs are sorted, unique, and never repeat the first zone. For example, `[5,4,6,9]` owns four zones, `[-1,7,11]` owns two, and `[-1]` owns none. Villages cannot claim the same zone in one observation. A bonfire can move during a village's history; it is not a founding location.

Territory is now measured in **zones**, replacing the old tile-count integer. Do not multiply zone counts by 64 and present that as an exact tile count. Kingdom territory comes from its villages, including capital-first ordering when available; independent villages keep their own territory. No additional capital or dynamic-child field is introduced.

Zone-triple comparison uses the last successfully committed observation. Failed captures/commits do not advance this state. Resume reconstructs it from the baseline and patches; duplicated histories retain the original baseline, the complete ordered legend (including entries unused before the cutoff), and only their retained annual changes. Newly allocated biome indices and patches publish through the same recoverable paired commit. Registry changes, out-of-range components, and malformed baseline or patch lengths are rejected. A replay target must be a recorded year, and the first patch must be empty. A duplicate cutoff before the first observation keeps the registry but establishes its own baseline on its first recording; it cannot reuse a future observation’s map.

### Historical Dates

Dates are recorded as:

- `150` — An observed year.
- `"100-150"` — An uncertain date between two recorded observations.
- `null` — An open end: no ending has been recorded.

**birth_year** is frozen at first enrollment. For kingdoms, villages, wars and alliances it is Date.getYear(data.created_time), read as a double from the game's stored creation timestamp. This remains a single exact calendar year even if creation fell in an unrecorded gap.

For characters the agreed rule is an **effective birth year**: recording year minus Actor.getAge() at first enrollment. The installed game computes age from created_time plus age_overgrowth; the latter contains both spawn age and prior artificial aging, which cannot be separated afterward. Thus an 18-year-old first recorded in year 1 gets birth_year -17. Later age changes never rewrite that frozen value. It is not a claim to reconstruct biological birth or future accelerated aging. Family validation checks references and cycles, not relative effective birth order.

**Duration** uses start_year/end_year: first enrollment and first confirmed absence, with previous-current ranges across recording gaps. Character enrollment no longer reuses its birth date. **Lifespan** uses birth_year/end_year; **Age** is selected year minus birth_year while the entity is known to be present. An uncertain or open ending cannot supply an exact completed lifespan. Birth dates do not fill missing observations or resolve uncertain endings. Historical events that occur entirely while recording is disabled may not be captured.

Histories missing the required birth_year fields cannot be resumed or imported by the new version; no historical birth dates are guessed. Preserve the old paired files outside the active HistoryBox folder before starting a fresh recording for the same world/save. Existing unrelated old histories do not block discovery of a different world.

### Paired file integrity

The first line of annual.jsonl is `{ "metadata": { "id": "GUID", "slot": 1 } }`. Its identity must match the `id` and `slot` in overview.json.metadata, which also retains `name` and the last recorded `year`. The last complete annual observation’s `world.year` must equal overview.metadata.year. The Viewer rejects identity, slot, or final-year mismatches. Renaming a world updates overview without rewriting the annual header.

Ordinary recording appends only the new observation. A small `commit.pending` journal stages that line, the proposed overview, the previous annual byte length/year, and the new year. Each staged file is flushed before the ready marker is written. Recovery verifies the old prefix and any appended suffix, completes a matching partial append, and publishes overview. Repeating recovery cannot duplicate the year. A conflicting suffix or unjournaled partial final line is rejected rather than silently discarded. The ready marker is removed only after both files are durable.

The session retains the last durable year. Startup and recovery read the final complete annual line by seeking backward; historical-cutoff queries and terrain reconstruction still traverse the required history. Failed captures or publication never advance the session’s year or terrain baseline before recovery confirms durability.

Initial slot assignment and duplication create a new stream with a new immutable header, copying or trimming observations as appropriate. They do not edit the source stream’s header. Metadata-only updates rewrite overview without rewriting annual observations. Pair publication is recoverable, not a filesystem-wide atomic two-file operation: pause recording before copying both files.

Capture derives kingdom village lists from each active village's owner. Non-civilization or inactive owners are represented as null rather than an unresolved civilization ID. War and alliance memberships exclude inactive civilizations. Missing required measurements, invalid counts, or a changing capture year abort the observation instead of substituting zero. Failed captures are retried; unrecorded gaps retain uncertain transition ranges. A failed commit does not advance in-memory history before the staged pair can be recovered.

These checks cannot reconstruct events that happened between observations, or repair contradictory values already present in older exports. The Viewer retains diagnostics for such records rather than inventing replacements.

### Capture and Storage Performance

Terrain capture uses typed zone/tile access, a cached canonical zone mapping, cached reflection lookups where needed, and a 64-bit tile-position mask per zone. Geometry is checked every capture; the cache is invalidated on world/session changes. Terrain, biome assets, and occupied structure tiles are rescanned annually so player edits and simulation changes remain visible. There is no speculative dirty-zone shortcut.

Set `HISTORYBOX_PROFILE=1` in the game process environment to log Stopwatch timings for map capture, entity capture, preparation, staging, and publication. Ordinary annual I/O no longer grows with the existing annual file length, although serializing the new observation and expanding overview still has a cost. Storage remains synchronous and durably flushed; no background thread accesses Unity objects. Earlier terrain-only benchmarks are not predictions for the expanded capture. Profile on the target world; local harness timings are not WorldBox frame-time guarantees.

## Compatibility

HistoryBox uses WorldBox's internal C# APIs, which may change between game versions.

The current format requires the fixed id/slot annual header, the biome legend and zone-triple baseline, four-integer annual patches, and zone-array territory. The previous elevation-only baseline and two-integer patches are incompatible; keep old paired files safe and start a fresh history. Headers containing mutable name/year fields and pre-map histories are not migrated automatically; preserve those files and start a separate current-format history. No terrain or territory is invented from old counts.

The mod is intended to remain platform-independent, but compatibility with Windows, macOS, and Linux should be verified individually. The paired-file recorder has been compiled and exercised with a test harness; its latest changes still require an in-game check against the installed WorldBox version.

## Names and Lifespans

Later observations replace each entity's catalog name with its latest observed name. All historical references use that one current name; rename events and additional schema fields are not recorded. Annual observations refer to entities by ID, so old annual rows need no name rewrite. The current observed world name is retained in overview metadata only.

Each entity retains one frozen birth year and one recording start/end pair. If an ID unexpectedly reappears, its end is cleared while it is present and set again when it disappears. The original birth and start remain unchanged. No missing observations are inferred and no additional recording intervals are introduced.

## License

Distributed under the MIT License. See the repository's `LICENSE` file.

### Character capture integrity

Characters enroll through actual `Kingdom.king` or `City.leader` appointments and remain tracked afterward. Annual affiliations come from live `Actor.kingdom` and `Actor.city` references, not save-time `ActorData.civ_kingdom_id` / `cityID`. Profession flags alone do not establish an office. Other recognized occupations remain available; an unconfirmed former office is null. Missing API members fail capture instead of silently supplying a false vacancy.

The recorder rejects duplicate or unverified rulers, missing appointed characters, and disagreement between a character and their home village owner before committing either file. Annual `king_id` and `leader_id` support independent Viewer validation. A null appointment means no observed live office holder. Validation failures leave the previous paired files intact. Historical exports made with the former profession/save-ID implementation cannot be reconstructed reliably from those files alone; the Viewer reports and withholds contradictory derived values without changing source records.

The revised recorder compiles against the locally installed WorldBox/Unity assemblies. The harness tests stale save IDs, stale profession flags, actual appointments, missing-capital handling, the authorized map/birth-year schema, frozen effective character ages, negative birth years, zone validation, terrain replay, resume/duplication, and paired-file failure recovery; an in-game run remains required to validate capture timing on each supported game version.

## Capital transitions

WorldBox can temporarily have villages without a valid capital during creation or ownership transitions. This does not abort recording. The recorder retains every owned village in the existing `cities` array, moving the capital to the first position when it is available. Without a valid capital, villages retain their sorted order. No new output fields are added.
