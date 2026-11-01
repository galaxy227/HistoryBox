# HistoryBox — Viewer

HistoryBox Viewer is a standalone browser application for exploring world histories recorded by [Box](../Box/README.md).

The Viewer presents population, resources, civilizations, characters, wars, alliances, relationships, historical changes, and recorded maps. Historical files are processed locally in the browser.

## Requirements

- A modern browser with JavaScript, SVG, Canvas 2D, the File API, and IndexedDB.
- `overview.json` and `annual.jsonl` from the same current-format HistoryBox history, with a fixed id/slot annual header and map records.

WorldBox, Unity, a backend, accounts, and application dependencies are not required. There is no build step.

## Opening the Viewer

1. Download the repository.
2. Open `Viewer/index.html` in a browser.
3. Select the world's `overview.json` and `annual.jsonl` together in the single file picker.
4. Select **Open world**.

Keep `index.html`, `styles.css`, `parser.js`, and `viewer.js` together. The same files can be served by any static web host. The repository-root entry point redirects to `/Viewer/` while sharing its loading screen and theme; for hosting this directory directly, its entry point is `index.html`.

The Viewer makes no network requests to load scripts, fonts, chart libraries, or historical data. The HistoryBox logo opens the public repository in a new tab only when clicked.

### Restoring a World

The browser stores the most recently opened files in IndexedDB and saves viewing preferences locally. Refresh restores the world, route, selected year, age, window, and available view settings without displaying the loader first. Browser storage is specific to the local-file location or hosting origin and may be unavailable or cleared in private browsing.

**Load world** opens the file selection screen, where the header’s Load world and Settings buttons are hidden. **Return to current world** returns to the existing dataset. Successful loading clears the file inputs; a failed replacement leaves the previous world available. Clearing the site's browser storage removes its saved history and preferences.

Entity links use fragments such as `#/kingdom/123`. Opening one in a new tab restores that entity when the corresponding world is available in browser storage. Links do not contain or transfer the historical files. Back and Forward restore page scroll positions. Switching to World overview or Map and then choosing Entity browser returns to the most recently viewed browser or entity page at its saved scroll position.

## Navigation and Timeline

The top manager contains World overview, Entity browser, Map, and the world name. Entity-type buttons remain visible while browsing entities. Open records appear in an embedded tab row beneath those buttons, showing only the selected entity type.

Each type keeps up to five unique tabs, each occupying one fifth of the row. New records replace the oldest unlocked tab. Hover or focus a tab to lock it; up to four tabs can be locked, and the fifth position cannot be locked. Locked tabs stay on the left and are not automatically replaced. Close buttons dismiss individual tabs; closing the last returns to that type’s browser. Tabs, locks, and viewing preferences survive refresh.

The bottom manager contains the timeline controls:

- **Year** — The slider and arrow buttons select recorded observations. With the slider focused, Left/Right step through observations, Up/Down select window options, and Home/End select the first/last observations in the window.
- **Playback** — Play advances through observations and loops within the selected window. Speeds are ½×, 1×, 2×, and 4×; 1× advances one observation per second. Chart dragging pauses playback.
- **Window** — Choose All ages, a historical age, or Custom. All ages and named ages set their bounds automatically. Custom enables the Start and End inputs.
- **Start / End** — Inclusive bounds of a custom window. Start 50 and End 70 display years 50–70. Values are clamped to available history and cannot cross; equal bounds select a single year.

View duration sets Custom bounds from the entity’s first observation through its ending year when known, otherwise its last observation. Uncertain endings use the upper boundary, clipped to available world history. The displayed X → Y beside the button matches these bounds. All ages and named ages lock Start and End. Custom initially retains the current bounds and enables editing. Switching to a window that excludes the current year selects its first recorded observation. The slider, arrow buttons, keyboard selection, and playback are confined to recorded observations between Start and End; changing bounds brings the selected year inside the window. A window containing no observations disables year selection. Exact age boundaries are used where available; uncertain boundaries use their confidently established interior, clipped to available history.

Outside text fields, dropdowns, dialogs, and controls that handle their own keys, Left/Right moves between recorded years and Up/Down selects the preceding/following window option. Up/Down also selects windows while the timeline slider is focused. Playback defers updates during pointer gestures, open dropdowns, and text editing so interactions finish before the next tick.

Historical charts use the window; the Ages chronology always shows the complete recorded history. Hover a plot to inspect values, or click and drag to select the nearest recorded year. A translucent cursor line previews selection and a thicker opaque line marks the selected year. Focused plots also support arrow keys, Home, and End.

Chart keys identify series and, where applicable, include visibility checkboxes and a select/deselect-all button. Key selections carry across measures of the same chart wherever that series applies. Hovering line or population keys emphasizes their series. Timeline row labels already align with their bars and do not trigger highlighting. Dropdowns show at most ten options with internal scrolling, keyboard navigation, and type-ahead. Chart tooltips put the relevant year alone on their first line. Tooltips flip near viewport edges and scroll internally when their contents exceed the viewport.

## World Overview

**Snapshot** groups selected-year civilization counts, quantities, and species populations into dynamic cards. When character data is present, Characters counts only enrolled characters with an observation that year; it is not a census.

**Summary** follows the selected window. Population change compares the first and last available observations for total population and each species: gains are green, losses red, and no change white. Entities recorded counts distinct kingdoms, villages, characters, wars, and alliances observed active within the window; entities already present at its beginning are included. Entities ended counts endings contained within the window, including uncertain endings only when both boundaries fit. Missing population endpoints stay unavailable. The selected window title is plain text; other age links still control the manager.

**Statistics** contains two charts:

1. **Population** — Lines, Stacked, Percentage, and Population pie views. Lines includes Global alongside Human, Elf, Orc, and Dwarf, with independent visibility checkboxes. The global total is excluded from stacked and percentage calculations to avoid double counting.
2. **Historical observations** — Army, territory, structures, food, coins, ratios, and per-resident measures, followed by world-specific kingdom, village, war, and character counts and casualty totals. Population counts belong exclusively to Population.

Chronology groups Ages, Kingdoms, Villages, Wars, and Alliances. Rankings includes the four non-character entity types. Each ranking chart shows the selected year. Characters are available through the entity browser instead. Every chronology chart has a species filter when relevant, a one-word foreground title, and no search field, appended ledger, or sorting controls. Historical milestones appear last. Timelines retain fixed-height scrolling regions. Their rows omit entities whose intervals do not overlap the selected window; Ages always retains the full historical extent.

## Map

Map is a separate viewport-height page aligned to the same content width and side margins as other pages. **Physical** selects Terrain or Biome; **Political** selects Villages or Kingdoms independently. Terrain always supplies the underlying zone color. Biome replaces it only where an identified biome exists, so hills and mountains without a biome remain visible. Vanilla defaults approximate the game’s ground colors; unknown modded biomes use the palette’s `unknown` color (#FF00FF).

Political overlays restore founding-species fills at 65% opacity with white boundary edges. Physical colors draw underneath; structure markers, bonfires, and automatic entity names draw above the fill. Village bonfires use triangles; when political Kingdoms is enabled, capital markers use stars under the first-city convention. Marker fills always use the village’s founding species. Unknown bonfire locations are not guessed. Structures use half-size triangles, with species colors for codes 1–4, light neutral Generic for 5, dark neutral Ruins for 6, and no marker for 0. A known bonfire supersedes the small structure marker for its zone, even if the zone also records a structure category. Bonfire and entity outlines are twice grid thickness; structure outlines match the grid and selected-zone outlines are four times it.

Legend sections appear in order: **Structures** (Generic/Ruins), **Species**, **Biome**, **Terrain**. Structures appears when enabled, Species when structures or politics are enabled, Biome for the physical Biome view, and Terrain always. Only identified biomes present in the selected observation are listed. The legend wraps within one quarter of viewport width and scrolls vertically as necessary. Click any non-species swatch to edit its six-digit hex color above the legend. Edits persist in this browser and affect only the map. Species swatches cannot be edited; their colors always match the rest of the Viewer.

Drag to pan and scroll or pinch to zoom. The camera center can reach the center of every corner zone but cannot move beyond those bounds, allowing zoom into map corners. The widest view fits the entire map with breathing room on both axes, including short landscape windows; the closest view spans eight zones horizontally (very small maps retain the wider bound). The legend is anchored at the lower left and −/+ buttons at the upper left with matching edge spacing. Its height stops below visible zoom buttons and expands when Zoom is disabled; excess legend rows scroll without a visible scrollbar; a focused map supports +, −, and Home to reset the camera within these limits.

The toolbar contains Physical and Political dropdowns and a Settings arrow. All checkboxes stay available: Political, Structures, Legend, Zoom. Political toggles borders and names independently of the physical layer; Structures toggles the small structure markers; Legend controls the legend; Zoom independently controls the −/+ buttons. Bonfire markers remain visible with structures or politics enabled. The arrow points up while open. Names are uppercase and slightly translucent. They appear automatically with politics enabled at or above 10% of the current maximum zoom and fade out below it. Threshold crossings use a 220 ms opacity fade; disabling site Animation makes the change immediate. There is no Names checkbox. Broad areas joined by narrow corridors are separated for placement, favoring the largest interior area rather than shrinking the label onto a bridge. Fitting prioritizes readable size, then proximity to that area’s center, while keeping every letter inside the territory and away from holes. Curvature follows the territory’s shape, with letter rotations limited to 30° and uniform spacing along the curve. Labels too small to read are withheld.

Map hover information omits the year: terrain comes first, then biome, structure, village, and kingdom, regardless of visibility settings. Missing entries are omitted rather than shown as em dashes. The bottom-right selected-zone panel always shows Zone ID, Terrain, Biome, Structure, Village, Kingdom, in that order, regardless of visibility settings. Structure descriptions distinguish no structure, species/generic structures, ruins, village bonfires, and capitals under the first-city convention. Missing biome, structure, or affiliation values use an em dash in the selected-zone panel. Its responsive width matches the map settings panel; both use smaller padding/text and bounded scrollable heights on narrow or short screens; long rows scroll horizontally without a visible scrollbar. No population is shown on the map. The selection outline is drawn below entity borders, markers, and names. Selection and terrain update with the timeline while retaining the canvas and camera to prevent flashes. No observation is invented for unrecorded years. The page has no document scrolling; both managers remain accessible. The masthead containing HistoryBox, Load world, and site Settings remains visible on Map, consistently with other pages; the map height fits the remaining space.

The saved biome legend and `[terrain, biome, structure]` baseline reconstruct all three components. Each annual `[zoneId, terrain, biome, structure]` patch replaces a complete zone through the selected observation. Bounded checkpoints support forward and backward seeking without changing the baseline. Zone IDs run left to right from the bottom row; the canvas reverses rows for screen display. Territory and bonfire locations come from each year's complete village zone lists. The map represents dominant landforms, biomes, and occupied-tile structure categories, not individual tiles, exact building positions/counts, textures, or unrecorded changes between years. The recorder now emits category 6 for verified occupied ruin states; older exports cannot recover ruins that were omitted at recording time.

## Entity Browser

**All history** displays the complete catalog with peak and historical metrics. **Selected year** displays observed entities and confidently established alliances at the selected year.

Search by name, ID, or related entity. Filters group relationships, dates, and measure bounds into separate rows; wars also support type and involvement role. Columns controls visible fields. Re-enabled columns return to their original position. Filter and column editors remain open when switching entity types, and active filters are counted against their defaults.

The browser shows up to 100 entities per page. Selected-year columns include Age, calculated from the frozen birth year. Birth year, Start year, End year and Lifespan are separate columns. Date ranges display only numbers (X-Y), without an Observed prefix. Column headings change sorting in both the catalog and comparison table. An unavailable value (`—`) sorts below every number, including negative values: first ascending and last descending. Uncertain dates sort by their lower boundary. Static tables do not highlight rows on hover.

Select any number of entities for comparison using their catalog checkboxes. These are the only entity visibility controls for the comparison chart. A Global checkbox appears when a meaningful global counterpart exists. Lines are solid. Tooltips omit unavailable numerical series. Kingdom/village identities use founding-species colors; characters use their recorded species. War/alliance identities use off-white. Characters have no global counterpart. Legend links carry entity type and ID, so duplicate names retain their correct destinations.

## Entity Pages

Every entity page follows the same structure:

1. Identity record, dates, View duration, and age links.
2. Snapshot.
3. Highlights.
4. Statistics: Population (except characters) and Historical observations.
5. Chronology.
6. Family for characters.
7. Historical milestones.

Population uses the same four views as World overview. Lines includes a white Total and its species series. Historical observations excludes population counts and offers shared quantity/ratio measures followed by type-specific measures. War observations compare Total, Attackers, and Defenders; casualties and participant counts are measures of the same chart. Attackers use light brown and defenders darker brown. Entity observation keys use their identity color; every global baseline is white. Every identity record includes links to the ages it overlaps.

Historical observations includes a checkbox below the chart for the global average of the same entity type. World and owner-peer baselines are not offered. Alliance averages use active-alliance snapshots. Character counts are available for global, kingdom, village, war, and alliance observations; participant totals count characters associated with the participating kingdoms. Missing character coverage stays unavailable.

Specialized views include:

- **Kingdoms** — Village ownership, capitals, kings, and Wars and Alliances chronology charts.
- **Villages** — Village leaders and kingdom allegiance. Repeated ownership uses distinct intervals on the same kingdom row.
- **Characters** — Role, kingdom, and home-village histories, plus family relationships. Role rows name and link the served village for leaders and kingdom for other roles.
- **Wars** — Two side-by-side Participants tables in Snapshot separate current attacker and defender kingdoms, with species-colored links. Each table matches the Highlights ledger height and scrolls independently. Participation intervals follow in Chronology, also colored by kingdom species; side-specific measurement lines in Historical observations retain the attacker/defender palette.
- **Alliances** — Membership intervals and shared measure highlights.

Highlights retain their exact values and observation-year links. Bounded percentage measures, including army/population and population shares, use proportion rings. Values outside 0–100% remain in a ledger rather than being clipped into a misleading pie. Nonnegative quantity highlights use small bars on a shared within-measure scale. Negative or unavailable values remain textual. Static data never uses dynamic snapshot cards.

Lifespan runs from birth_year to end_year; an uncertain or open ending does not yield an exact completed length. Age is the selected year minus birth_year, shown only with a current observation before the known ending. Duration refers exclusively to the recorded window, not the full lifespan. **View duration** selects a Custom window from the entity’s first available observation through its ending year when known, otherwise its last observation. An uncertain ending uses the upper boundary, clipped to available world history. This includes the first year of absence. Every entity record shows the resulting range as X → Y beside the button.

Entity links include a star for kingdoms, an upward triangle for villages, a head-and-shoulders silhouette for characters, a thick X for wars, and a hollow circle for alliances. Kingdom/village identities use founding species; characters use their recorded species. Population totals remain white. Hovering an entity or age link for 500 milliseconds shows only birth → end for entities and start → end for ages, preserving uncertain date ranges and an em dash for an unknown end. Ordinary Year columns appear first; their buttons retain a fixed column width and scroll horizontally for unusually long years.

### Characters, Family, and Leadership

Characters appear between Villages and Wars in the manager. Both all-history and selected-year browsing support species, gender, role, kingdom, home village, date, and numeric filters. All-history role/association filters match recorded observations; selected-year filters match that year only. Character comparisons offer level, personal coins, and cumulative kills.

Character birth years are fixed effective dates: Box subtracts the in-game age at first enrollment from that recording year. This includes initial adult age and any artificial aging before enrollment; later aging does not revise the date. Negative birth years are valid. Other entity types use their stored creation year. These dates are distinct from enrollment. Annual state remains unavailable before the first recorded appearance. The page follows the shared record, snapshot, highlights, observations, specialized history, and milestones structure; it omits population charts because an individual is not a population. Historical observations can include the global character average at each observation. Personal coins never contribute to settlement or world resource totals. Changes are shown in snapshot cards, not as selectable chart or table measures.

Recorded parents, siblings, and children come from cumulative `p`, `s`, and `c` lists. Family is a fixed-order two-column table: spouse, grandparent, parent, sibling, child, grandchild, aunt, uncle, cousin, extended. Other parents of recorded children are listed as spouses; this is a co-parent relationship, not a recorded marriage event. Great-grandparents, great-grandchildren, and more distant relatives are grouped as extended. The Relatives table is followed by Rankings for relatives observed in the selected year, with level, coins, and kills measures; the page’s character is included alongside relatives when observed that year. Missing relatives remain unknown.

Kingdom/village snapshots identify tracked kings/leaders from the corresponding annual role and association, checking appointment IDs when present and withholding contradictory affiliations or office claims. Timelines show observed service periods without joining gaps. Kingdom capitals use the existing first-city convention for character-enabled exports; display sorting never changes that array. The format has no separate indication of an unavailable capital, so a temporary capital vacancy cannot be distinguished from the first village in the list.

The current biome/structure map format is required; elevation-only baselines, two-integer patches, old numeric-territory and map-less histories are rejected rather than converted. A compatible history without a character collection can still be read. Missing annual character arrays mean character coverage is unavailable for that observation. Those older rows do not establish capital ordering, so the Viewer does not guess a capital from their first village.

## Cards, Milestones, and Settings

Dynamic cards use white values and borders, except species-population cards retain their species-colored top borders. Their miniature history graphs show the configured trailing timespan, ending at the selected year. Values normalize within each card; missing observations are not interpolated. Changes from the previous calendar year use green for increases, red for decreases, and gray for no change or unavailable comparisons. Constant-rate values such as entity age omit graphs. Graphs disappear after an entity ends while preserving card height.

World milestones omit characters. Office milestones appear on the corresponding kingdom/village page; character pages retain role and affiliation milestones. Milestones describe first observations, endings, ownership changes, participation, and character role/association changes. Dates appear in year buttons rather than being repeated in descriptions. Statistical peaks, population leadership changes, rank changes, percentage thresholds, and routine casualty increments are excluded. Each event has a type icon and a year button. Long entry text scrolls horizontally within its row without a visible horizontal scrollbar. Vertical milestone scrolling continues into normal page scrolling at the list boundaries.

Settings provides:

- **Animation** — Enabled by default. Charts reveal and actual numerical data count up on first viewing. Dates, labels, axes, and timeline changes do not animate. The browser's reduced-motion preference is respected.
- **Grid card timespan** — 10–100 years, default 50.
- **Reset defaults** — Restores both defaults.

Number animations use the browser locale for intermediate and final values. Playback preserves interactive elements so chart tooltips and button hover states remain usable.

## Historical Accuracy

### Dates

All five entity types require integer `birth_year` immediately before their recording `start_year` and `end_year`. Ages and membership intervals retain only start/end. Annual records are unchanged. Exports missing birth_year are rejected rather than assigning guessed dates; preserve old histories separately when starting a new recording.

- An integer is an exact recorded transition year.
- A range such as `"100-150"` places a transition after observation 100 and by observation 150.
- A null end is open, not a known final date.

Activity intervals include the start and exclude the end. Uncertain boundaries remain uncertain, and exact lifespan requires two exact dates. Entity and relationship starts describe recording boundaries; the separate birth_year describes creation or the frozen effective character birth date. First observations remain in milestones. Milestone dates name the first confirmed new-state year. Original transition ranges remain available in timelines and relationship records.

Entity age uses birth_year, not the recording start; it is unavailable without a selected-year observation or at/after the earliest possible ending. Ownership segments show consecutive observed ownership and preserve gaps. Charts do not interpolate missing years or convert missing values into zero. An em dash means unavailable; genuine zero remains zero.

### Calculations

- Kingdom totals sum villages whose annual ownership agrees with the kingdom's village list. Contradictions make affected totals unavailable.
- War and alliance totals aggregate canonical statistics for confidently established participating kingdoms. Wars also expose side-specific aggregates. Uncertain membership or missing member observations prevents complete affected totals; recorded casualty data remains independently usable.
- Ratios use aggregated numerators and denominators, not sums of member ratios. Denominators must be available and positive. Loyalty is not summed.
- Global population and species populations come from world observations. Global resource and territory quantities come from village observations. Territory counts nonnegative zone IDs in each village’s territory array, excluding the missing-bonfire sentinel. Kingdom, war, and alliance aggregates use those zone counts; no tile count is inferred.
- Species percentages use all species counts, including hidden series. Population shares use recorded global population.
- War casualties are cumulative. Decreasing counters are flagged rather than interpreted as negative deaths. World casualty histories retain each war's latest recorded total, including ended wars; these are not assumed final totals.
- Highlights use the full recorded history when changing windows; measure labels use Peak rather than Lifetime peak. Summary statistics use observations within the selected window, with age uncertainty respected.
- Rankings exclude unavailable values and give ties equal ranks. Overlapping alliance memberships mean alliance totals/averages need not partition the world.

Resources represent holdings, not production or income. Ownership changes do not establish conquests. Side-wide casualties cannot be assigned to individual kingdoms.

### Validation and Additional Fields

Data notes reports invalid measurements, unresolved references, ownership contradictions, interval problems, and decreasing casualty totals. Warnings are grouped by type with a count, an explanation, and up to three representative examples. Every warning contributes to its group and the overall total; there is no 2,000-warning cutoff. **Download log** exports every warning, without truncation, as a plain-text `.txt` file. The single annual metadata header must contain exactly id and slot, matching overview.json.metadata. The world name comes only from overview and is not part of paired-file validation. The last observation’s world.year must match overview.metadata.year; duplicate, out-of-order, repeated-header, or mismatched files are rejected. The map baseline must have valid dimensions, three-integer zones, terrain 0–4, structure 0–6, and in-range biome indices. The saved legend must retain its exact 30-entry vanilla prefix; appended raw asset IDs must be unique and canonically escaped. Annual four-integer patches must be sorted, unique, in range, and empty in the first observation. Village territory requires the leading bonfire ID or sentinel, sorted remaining IDs, and no duplicated ownership. Invalid map records reject the import with a plain-language explanation. Old headers containing name/year, unpaired metadata.json histories, and pre-map numeric-territory histories require a new recording from the updated Box; no legacy migration is performed.

Original additional fields remain in the data model. New entity types or specialized measures require presentation support; they are not automatically exposed as raw JSON in the interface.

## Source Layout and Customization

- `parser.js` — Parsing, validation, indexes, historical queries, aggregates, and calculations. Independent of the DOM and selected UI state.
- `viewer.js` — The shared palette at the top, bounded dropdown menus, navigation, persistence, controls, SVG charts, the canvas map, tables, and interactions. Its palette also initializes the root loading page; the application initializes only when the Viewer shell is present.
- `styles.css` — Layout, responsive behavior, and visual styles using palette variables.
- `index.html` — The application shell, local scripts/styles, loader, managers, and dialogs.

Edit the grouped `THEME` object at the top of `viewer.js` to change colors. It supplies CSS variables and SVG colors for species, global/non-species data, war sides, gains/losses, surfaces, controls, markers, warnings, and shadows. Eight-digit hex values include transparency. Refresh after editing.

The parser exposes `HistoryBox.parse`, `HistoryBox.prepare`, and dataset queries including `snapshot`, `series`, `warSideSeries`, `stats`, `rankings`, `ownership`, `memberships`, `summary`, `period`, `milestones`, `family`, `observationRuns`, `rulers`, and `zonesAt`.

JSONL ingestion and preparation yield between batches. Cached queries, virtualized milestones, paginated tables, and fixed-height scrolling regions keep large histories navigable. Charts limit dense point markers while retaining full-resolution hover values. Memory usage still grows with the dataset and may exceed browser limits for very large histories.

## Publishing and Verification

Publish the four runtime files and this README. No historical files or dependencies need to be deployed.

Local-file and HTTP loading were tested in Chrome and Edge on Windows, including responsive layouts down to 320px. The code uses platform-independent browser APIs; Safari, Firefox, macOS, and Linux have not been separately verified.


## License

Distributed under the repository's MIT License. See [LICENSE](../LICENSE).

### Validation of character records

New exports include kingdom `king_id` and village `leader_id`. The parser checks these against observed characters, roles, affiliations, and recording boundaries. It also reports multiple office claims, unresolved current affiliations, character/home-village disagreements, missing character coverage, ancestry cycles, and inconsistent population totals. Original annual rows remain untouched; derived character records withhold contradictory offices and kingdom affiliations. They do not guess a replacement ruler or recover an unrecorded appointment. Older exports without appointment IDs remain readable with an explicit validation limitation.

The war Historical observations chart offers one Casualties measure with Total, Attackers, Defenders, and optional same-type global-average keys. World observations use the selected measure name as the key and only the combined Casualties measure. Serialized `_deaths` field names remain unchanged for compatibility.

The file picker accepts exactly two files together: one overview JSON and one annual history. More than two clears the selection with an explanation; an incomplete or mismatched pair cannot load. Successful loading clears the picker and retains refresh restoration. Earlier map-update exports with the former village count-field spelling are read as structures without changing their source files.
