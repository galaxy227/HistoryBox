# HistoryBox — Box

HistoryBox is a C# mod for [WorldBox](https://www.superworldbox.com/) that records historical world data into external JSON files.

The mod tracks world population, kingdoms, villages, wars, alliances, and historical changes over time.

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

1. Locate the WorldBox installation directory.
2. Copy `HistoryBox.dll` into:

   `worldbox_Data/StreamingAssets/Mods/`

3. Enable Experimental Mode in WorldBox settings.
4. Restart WorldBox.

Installation paths and native mod-loader support may vary by operating system and game version.

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

- `annual.jsonl` — Historical snapshots, one JSON object per recorded year.
- `metadata.json` — Persistent information about historical entities and their lifespans.

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

Contains four major categories:

1. `world` — Year and global population by species.
2. `kingdoms` — Kingdom IDs and owned village IDs.
3. `villages` — Population, species breakdown, army, loyalty, territory, housing, food, and coins.
4. `wars` — Cumulative attacker and defender casualties.

Each line represents one recorded year.

### metadata.json

Contains six major categories:

1. `world` — Persistent world GUID, name, and save slot.
2. `ages` — Historical world ages and their lifespans.
3. `kingdoms` — Kingdom identities, founding species, and lifespans.
4. `villages` — Village identities, founding species, and lifespans.
5. `wars` — War identities, participants, sides, and involvement intervals.
6. `alliances` — Alliance identities and kingdom membership intervals.

Metadata is updated when recorded historical information changes.

### Historical Dates

Dates are recorded as:

- `150` — An observed year.
- `"100-150"` — An uncertain date between two recorded observations.
- `null` — An entity or involvement interval that remains active.

Historical events that occur entirely while recording is disabled may not be captured.

## Compatibility

HistoryBox uses WorldBox's internal C# APIs, which may change between game versions.

The mod is intended to remain platform-independent, but compatibility with Windows, macOS, and Linux should be verified individually.

## License

Distributed under the MIT License. See the repository's `LICENSE` file.

