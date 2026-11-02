# HistoryBox — Box

HistoryBox is the WorldBox mod that records a world's history for exploration in the [HistoryBox Viewer](../Viewer/README.md).

**Contents**

- [User Guide](#user-guide)
- [Development](#development)
- [Changelog](#changelog)

## User Guide

### Recording a world

Follow the [installation guide](../README.md), open a world, and turn **Activator** on. Recording begins as the game advances into the next year. Turning it off preserves existing history; switching worlds turns it off automatically. Years spent without recording remain gaps.

**Duplicator** controls what happens when saving to another slot. When enabled, HistoryBox copies the recorded history and continues in the new copy. When disabled, recording stays with the existing history. Both controls start off.

Each world folder contains `overview.json` and `annual.jsonl`. Pause the game before copying them, then select both together in Viewer. Keep them as a pair; files from different saves or recording times cannot be combined. See the installation guide for your platform's history-folder location.

### Understanding the record

HistoryBox records observations, not everything that happens between them. Characters enter the record through leadership appointments and remain tracked afterward; they are not a census of every person. Names reflect the latest recorded name.

If an error panel appears, its date is the last successfully saved observation. Dismiss closes the panel; another failure opens it again. Preserve the files and game log when reporting a problem. Dismissing an error does not disable recording.

## Development

### Source and build

All recorder code lives in `HistoryBox.cs`. Build a managed class library for the game's Unity/Mono runtime using .NET Framework 4.8 references. Reference the installed game's `Assembly-CSharp.dll`, `UnityEngine.CoreModule.dll`, `UnityEngine.IMGUIModule.dll` and, where required, `UnityEngine.dll`/`netstandard.dll`, plus `System.Runtime.Serialization`. The resulting file is `HistoryBox.dll`; do not distribute proprietary game assemblies.

The implementation was checked against WorldBox 0.51.2 build 719. Internal APIs may change. Compile against the target installation and test recording, restart and duplication in-game before releasing. The native experimental mod loader is used; no additional loader is required.

### Recording and storage

The component captures a pre-transition snapshot on the main thread and publishes it only after a confirmed year transition. A transition from `N` to `N+1` records `N`; skipped years are not backfilled. Failed publication retries the same snapshot. WorldBox and Unity objects remain on the main thread.

`HistorySession` maintains the committed overview and zone state. `HistoryStorage` appends observations and uses a flushed `commit.pending` journal to recover publication of the paired files. Registry additions and observations referencing them are committed together. Restart replays sparse map changes; duplication preserves registry identities while trimming observations to its cutoff. Ordinary appends do not rewrite earlier annual lines.

Files live under `Application.persistentDataPath/HistoryBox/`. Folder names use a normalized world name and optional save-slot suffix. Save detection uses file monitoring. `HISTORYBOX_PROFILE=1` enables timing logs; `HISTORYBOX_TRACE_OFFICES=1` enables appointment diagnostics. Capture and storage exceptions retain the last committed year and report details in the game log.

### Output contract

`overview.json` contains these properties in order:

| Property | Contents |
| --- | --- |
| `metadata` | `id` (world GUID), `name`, `slot` (integer or null), `year` (last observation) |
| `registry` | `biomes`, `terrain`, `species` arrays of exact, case-sensitive asset IDs |
| `map` | `width`, `height`, `zone` baseline |
| `ages` | `name`, `start_year`, `end_year` |
| `kingdoms` / `villages` | `id`, `name`, `founding_species`, `birth_year`, `start_year`, `end_year` |
| `characters` | `id`, `name`, `species`, `gender`, `birth_year`, `start_year`, `end_year`, `p`, `s`, `c` |
| `wars` | `id`, `name`, `war_type`, `birth_year`, `start_year`, `end_year`, `instigator`, `kingdoms` |
| `alliances` | `id`, `name`, `birth_year`, `start_year`, `end_year`, `kingdoms` |

War/alliance `kingdoms` entries contain `kingdom_id` and an `involvement` array. Each interval has `start_year`/`end_year`; wars also have `side` (`attacker` or `defender`). Rejoining adds an interval. Character `p`/`s`/`c` arrays identify enrolled parents, siblings and children; `gender` and `instigator` may be null.

`annual.jsonl` begins with exactly one immutable header: `{"metadata":{"id":"world-guid","slot":1}}`. Slot may be null. Each subsequent line contains one observation in this order:

| Category | Fields |
| --- | --- |
| `map` | Sparse `[zoneId, terrainIndex, biomeIndex, structureCode]` replacements |
| `world` | `year`, `population` |
| `kingdoms` | `id`, `cities`, `king_id` |
| `villages` | `id`, `kingdom_id`, `population`, `army`, `loyalty`, `structures`, `food`, `coins`, `leader_id`, `territory` |
| `characters` | `id`, `kingdom_id`, `village_id`, `role`, `level`, `coins`, `kills` |
| `wars` | `id`, `attacker_deaths`, `defender_deaths` |

There is no annual `alliances` array: membership intervals define participating kingdoms. War counters are cumulative casualties. Character `role` is `king`, `leader`, `captain`, `warrior`, `citizen` or null; measurements and unavailable affiliations/appointments can be null. Village `structures` is the game's housing-structure count, distinct from the map's broader structure classification.

### Indices, maps and dates

- Registry indices never move. `biomes` starts with null for absence; terrain and biome prefixes use the verified raw asset lists in `MapCodec`. `species` starts `human`, `elf`, `orc`, `dwarf`. New IDs append in ordinal order per observation. Entity species fields are integer indices, not names.
- `population` is `[total, species0, species1, ...]`. New rows cover the current registry; omitted historical trailing counts mean zero. World total equals living sapient counts; village species counts cannot exceed its authoritative total. `Actor.isSapient()` and `Subspecies.get_species_id()` supply eligibility and identity.
- Map zones retain the game's zone resolution, normally 8 × 8 tiles, in bottom-left row-major order: `zoneId = y * width + x`. The baseline has `width × height` `[terrain, biome, structure]` triples. The first annual patch is empty; later patches are sorted, unique full replacements for changed zones.
- Terrain/biome plurality uses actual tile asset IDs. Ties choose the ordinally smaller ID; an identified biome beats absence on ties. Structures use occupied footprint tiles: `0` none, `1` ruins, `2` generic, `3 + speciesIndex`. Building architecture is matched to verified species assets, never inferred from ownership; unresolved/shared architecture becomes generic with a diagnostic. Removed/environmental buildings are excluded.
- Kingdom `cities` begins with the capital village ID, or `-1` when unavailable, followed by sorted remaining villages. An empty kingdom has `[-1]`. Village `territory` similarly begins with its bonfire zone or `-1`, then sorted remaining zones. Sentinels are never entities or territory counts.
- Appointments come from `Kingdom.king` and `City.leader`; actor affiliations are independent. A character may hold multiple offices, while its `role` prioritizes `king`. Vacant or unconfirmed appointments are null.
- `birth_year` is frozen at first enrollment. Non-character entities use the game's creation timestamp. Characters use recording year minus in-game age at enrollment, including spawn age and prior artificial aging; negative effective births are valid. Later aging never rewrites birth.
- `start_year`/`end_year` describe recorded duration. An integer is exact, `"X-Y"` means a transition after `X` and by `Y`, and null means no recorded ending. Birth through end is lifespan; selected year minus birth is age. Activity includes the start and excludes the end. Gaps are never filled from birth dates. Each entity retains one birth/start/end pair; reappearance reopens its end.

Pair validation requires matching `id`/`slot` and a final annual `year` equal to `overview.metadata.year`. Preserve existing schemas unless a change is explicitly authorized.

## Changelog