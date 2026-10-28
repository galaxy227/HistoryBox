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

A capture or storage exception opens a separate panel below the controls, showing **⚠ ERROR**, the last successfully committed year, and **Dismiss**. Detailed errors remain in the game log. The panel does not switch Activator off: recording retries after five seconds, and the displayed year advances after a successful commit. Dismiss hides the panel until another error occurs. An em dash is shown when no observation has been committed.

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
- `overview.json` — Persistent information about historical entities and their lifespans.

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

Begins with a single `metadata` header identifying the world, name, slot, and last recorded year. Subsequent lines contain five annual categories:

1. `world` — Year and global population by species.
2. `kingdoms` — Kingdom IDs, owned village IDs (capital first when available), and the current `king_id` (or null).
3. `villages` — Population, species breakdown, army, loyalty, territory, housing, food, coins, and the current `leader_id` (or null).
4. `characters` — Current kingdom, village, confirmed office or occupation, level, personal coins, and cumulative kills.
5. `wars` — Cumulative attacker and defender casualties.

Each line after the header represents one recorded year.

### overview.json

Contains seven major categories:

1. `metadata` — Persistent world GUID (`id`), name, save slot, and last recorded `year`.
2. `ages` — Historical world ages and their lifespans.
3. `kingdoms` — Kingdom identities, founding species (`founding_species`), and observed lifespans.
4. `villages` — Village identities, founding species (`founding_species`), and observed lifespans.
5. `characters` — Identities, species, gender, birth/end years, and cumulative parent, sibling, and child relationships (`p`, `s`, `c`).
6. `wars` — War identities, participants, sides, and involvement intervals.
7. `alliances` — Alliance identities and kingdom membership intervals.

Overview information and both metadata headers are updated with every committed observation.

### Historical Dates

Dates are recorded as:

- `150` — An observed year.
- `"100-150"` — An uncertain date between two recorded observations.
- `null` — An open end: no ending has been recorded.

Historical events that occur entirely while recording is disabled may not be captured.

### Paired file integrity

The first line of annual.jsonl is `{ "metadata": { "id": "GUID", "name": "World name", "slot": 1, "year": 123 } }`. This object exactly matches overview.json.metadata. It occurs only once, before annual observations; annual world.year fields remain unchanged. Every committed observation updates both copies of metadata.year. Viewer rejects mismatched headers or a final observation with a different year.

Both files are staged and flushed before publication. A commit.pending directory with a ready marker permits replay after an interrupted publication. An incomplete pair copied during recording is rejected; pause recording before copying files. Pair publication is recoverable, not a filesystem-wide atomic two-file operation. Rewriting the annual stream uses bounded memory but adds disk I/O as histories grow. Slot assignment and duplication update both headers. Old metadata.json folders are preserved; the updated recorder starts a separate new-format history rather than asserting an unverifiable legacy pairing.

Capture derives kingdom village lists from each active village's owner. Non-civilization or inactive owners are represented as null rather than an unresolved civilization ID. War and alliance memberships exclude inactive civilizations. Missing required measurements, invalid counts, or a changing capture year abort the observation instead of substituting zero. Failed captures are retried; unrecorded gaps retain uncertain transition ranges. A failed commit does not advance in-memory history before the staged pair can be recovered.

These checks cannot reconstruct events that happened between observations, or repair contradictory values already present in older exports. The Viewer retains diagnostics for such records rather than inventing replacements.

## Compatibility

HistoryBox uses WorldBox's internal C# APIs, which may change between game versions.

The mod is intended to remain platform-independent, but compatibility with Windows, macOS, and Linux should be verified individually. The paired-file recorder has been compiled and exercised with a test harness; its latest changes still require an in-game check against the installed WorldBox version.

## Names and Lifespans

Later observations replace each entity's catalog name with its latest observed name. All historical references use that one current name; rename events and additional schema fields are not recorded. Annual observations refer to entities by ID, so old annual rows need no name rewrite. The paired world headers likewise retain the current observed world name.

Each entity retains one start/end pair. If an ID unexpectedly reappears, its end is cleared while it is present and set again when it disappears. The original start remains unchanged. No missing observations are inferred and no additional lifespan intervals are introduced.

## License

Distributed under the MIT License. See the repository's `LICENSE` file.

### Character capture integrity

Characters enroll through actual `Kingdom.king` or `City.leader` appointments and remain tracked afterward. Annual affiliations come from live `Actor.kingdom` and `Actor.city` references, not save-time `ActorData.civ_kingdom_id` / `cityID`. Profession flags alone do not establish an office. Other recognized occupations remain available; an unconfirmed former office is null. Missing API members fail capture instead of silently supplying a false vacancy.

The recorder rejects duplicate or unverified rulers, missing appointed characters, and disagreement between a character and their home village owner before committing either file. Annual `king_id` and `leader_id` support independent Viewer validation. A null appointment means no observed live office holder. Validation failures leave the previous paired files intact. Historical exports made with the former profession/save-ID implementation cannot be reconstructed reliably from those files alone; the Viewer reports and withholds contradictory derived values without changing source records.

The revised recorder compiles against the locally installed WorldBox/Unity assemblies. The harness tests stale save IDs, stale profession flags, actual appointments, missing-capital handling, unchanged output fields, and paired-file failure recovery; an in-game run remains required to validate capture timing on each supported game version.

## Capital transitions

WorldBox can temporarily have villages without a valid capital during creation or ownership transitions. This does not abort recording. The recorder retains every owned village in the existing `cities` array, moving the capital to the first position when it is available. Without a valid capital, villages retain their sorted order. No new output fields are added.
