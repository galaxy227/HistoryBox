# HistoryBox — Viewer

The [HistoryBox Viewer](https://galaxy227.github.io/HistoryBox/) is a standalone browser application for exploring histories recorded by the [HistoryBox](../Box/README.md) mod. Your uploaded files are processed in your browser.

**Contents**

- [User Guide](#user-guide)
- [Development](#development)
- [Changelog](#changelog)

## User Guide

### Opening a history

Select `overview.json` and `annual.jsonl` together, then choose **Open world**. **Preview example world** opens the site's supplied example when available. Loading errors appear beneath the buttons. Loading another history replaces the current view only after validation succeeds.

The browser remembers the last world and viewing position where storage is available. Refresh restores it; clearing browser storage removes that saved copy. **Load world** lets you choose another pair or return to the current history.

### Exploring

- **World overview** summarizes the selected period and shows global statistics, chronology and milestones.
- **Entity browser** searches and filters kingdoms, villages, characters, wars and alliances. Select rows to compare their histories and current rankings. Entity links open detailed records; tabs keep frequently visited entities nearby.
- **Map** combines physical terrain or biomes with optional political territories and structures. Pan and zoom to explore. Clicking owned territory selects its kingdom or village; clicking again opens a zone. Further clicks inside that entity keep inspecting zones. Clicking another entity opens its preview.

The bottom timeline controls the selected year and viewing window. Choose a named age or enter Custom bounds. **View duration** on an entity record uses its recorded window. Charts also support year selection by clicking or dragging. Play advances through the window; arrow keys navigate time when another control does not need them.

Population charts offer several views. **Ranking** lists each recorded species separately, including species otherwise grouped as Other. Optional Global, Total and Other series start off; saved choices are retained. Rankings in entity comparisons include only selected entities, not Global.

Map legends list categories seen anywhere in the loaded history and remain stable as years change. Layer settings control which sections appear. Non-species legend swatches can be recolored. A selected area has a white outline and translucent overlay; its preview links to the relevant records.

### Reading the data

Missing observations remain gaps. An em dash means unavailable, not zero. **Lifespan** runs from birth to the recorded ending; **age** is relative to the selected year; **duration** is the recorded period. Uncertain dates remain ranges. Character birth dates reflect their age when first recorded, including earlier artificial aging.

**Data notes** groups inconsistencies and offers a complete downloadable log. The Viewer does not repair source files or infer events that were never recorded. Settings control animations and the history shown inside dynamic cards.

## Development

### Files and hosting

| File | Responsibility |
| --- | --- |
| `index.html` | Loader, managers, dialogs and application shell |
| `styles.css` | Responsive layout and palette-based styling |
| `parser.js` | Validation, indexes, historical queries and calculations; no DOM or view state |
| `viewer.js` | Palette, rendering, navigation, persistence, controls and map interactions |

Open `index.html` in a modern browser or serve the directory through a static host. No build step, backend, account or external chart/font library is required. The example button fetches `overview.json` and `annual.jsonl` from this directory; local-file security may require using the file picker instead. Uploaded histories need no network connection. `IndexedDB` stores the last pair; `localStorage` stores preferences.

Keep production JavaScript in `parser.js` and `viewer.js`. All colors belong in `THEME` at the top of `viewer.js`. Human, elf, orc and dwarf retain their species colors; additional species use Other (`#A075CF`). Unknown terrain/biome assets use `#FF00FF`. Global values are white; war/alliance identities use off-white.

### Data and calculations

The [Box output contract](../Box/README.md#output-contract) defines the current format. Imports require the registry, map baseline, indexed species identities and population arrays. Identity, save slot, final year, indices and map patches are validated; older formats are not migrated.

`HistoryBox.parse` creates a `Dataset`; `HistoryBox.prepare` builds common queries. Annual `record.source` retains the original parsed observation, while `record.raw` contains normalized measurements. Unchanged validated rows share storage with normalized/source rows; corrections retain separate rows. Catalog identities decode species indices without altering the input. Important queries include `snapshot`, `series`, `populationBreakdown`, `rankings`, `memberships`, `milestones`, `family` and `zonesAt`.

Kingdom totals sum confirmed owned villages. War/alliance totals sum confirmed participating kingdoms. Uncertain or contradictory relationships withhold affected derived values. Entity averages use the arithmetic mean of available numeric measurements, including zero; undefined measurements (such as food per resident with no residents) are excluded, and no contributors means unavailable. This differs from pooled world/group ratios, which divide summed quantities; population Ranking uses individual registry counts, with omitted trailing counts treated as zero. Other views aggregate additional species. Ranking ties share a rank; unavailable values sort below all numbers.

Derived caches use conservative byte estimates and entry limits where applicable; oversized query results remain available without being cached. Source observations are never evicted. Map reconstruction applies sparse changes to the immutable baseline using byte-bounded checkpoints and returns isolated buffers. Rendering reuses its paint canvas at full resolution; successful world replacement releases old dataset references. Legend presence is collected from the baseline and all observations at import, not the selected year. Political previews and selection geometry use the current observation. Milestone links carry entity identity rather than relying on unique display names.

### Extending and checking

Preserve missing-value semantics, uncertain dates and original records. Add calculations in `parser.js` and presentation in `viewer.js`; do not expose raw JSON as ordinary UI. Reuse established chart/panel layouts, maintain stable heights across timeline changes, and keep controls usable during playback.

Check imports, malformed data, duplicate names, registry growth, missing observations, navigation, refresh restoration and responsive layouts when changing behavior. Browser automation is not proof of physical iOS or every browser's compatibility. Large histories still require memory proportional to their observations; caches and rendering work should remain bounded.

## Changelog