# HistoryBox — Viewer

HistoryBox Viewer is a standalone browser application for exploring world histories recorded by [Box](../Box/README.md).

The Viewer presents population, resources, civilizations, wars, alliances, relationships, and historical changes. Historical files are processed locally in the browser.

## Requirements

- A modern browser with JavaScript, SVG, the File API, and IndexedDB.
- `overview.json` and `annual.jsonl` from the same HistoryBox world-history directory.

WorldBox, Unity, a backend, accounts, and application dependencies are not required. There is no build step.

## Opening the Viewer

1. Download the repository.
2. Open `Viewer/index.html` in a browser.
3. Select the world's `overview.json` and `annual.jsonl` files.
4. Select **Open world**.

Keep `index.html`, `styles.css`, `theme.js`, `parser.js`, `select-menu.js`, and `viewer.js` together. The same files can be served by any static web host. The repository-root entry point redirects to `/Viewer/` while sharing its loading screen and theme; for hosting this directory directly, its entry point is `index.html`.

The Viewer makes no network requests to load scripts, fonts, chart libraries, or historical data. The HistoryBox logo opens the public repository in a new tab only when clicked.

### Restoring a World

The browser stores the most recently opened files in IndexedDB and saves viewing preferences locally. Refresh restores the world, route, selected year, age, window, and available view settings without displaying the loader first. Browser storage is specific to the local-file location or hosting origin and may be unavailable or cleared in private browsing.

**Load world** opens the file selection screen. **Return to current world** returns to the existing dataset. Successful loading clears the file inputs; a failed replacement leaves the previous world available. Clearing the site's browser storage removes its saved history and preferences.

Entity links use fragments such as `#/kingdom/123`. Opening one in a new tab restores that entity when the corresponding world is available in browser storage. Links do not contain or transfer the historical files. Back and Forward restore page scroll positions within the session.

## Navigation and Timeline

The top manager contains World overview, Entity browser, and the world name. Entity-type buttons remain visible while browsing entities; the current entity name appears beside them.

The bottom manager contains the timeline controls:

- **Year** — The slider and arrow buttons select recorded observations. Keyboard arrows step through observations; Home and End select the first and last observations in the selected window.
- **Playback** — Play advances through observations and loops within the selected window. Speeds are ½×, 1×, 2×, and 4×; 1× advances one observation per second. Chart dragging pauses playback.
- **Window** — Choose All ages, a historical age, or Custom. All ages and named ages set their bounds automatically. Custom enables the Start and End inputs.
- **Start / End** — Inclusive bounds of a custom window. Start 50 and End 70 display years 50–70. Values are clamped to available history and cannot cross; equal bounds select a single year.

View lifespan sets Custom bounds from an entity’s start/end, using the outer bounds of uncertain dates and the latest observation for an open end, clipped to the recorded history. All ages and named ages lock Start and End. Custom initially retains the current bounds and enables editing. The slider, arrow buttons, keyboard selection, and playback are confined to recorded observations between Start and End; changing bounds brings the selected year inside the window. A window containing no observations disables year selection. Exact age boundaries are used where available; uncertain boundaries use their confidently established interior, clipped to available history.

Historical charts use the window; the Ages chronology always shows the complete recorded history. Hover a plot to inspect values, or click and drag to select the nearest recorded year. A translucent cursor line previews selection and a thicker opaque line marks the selected year. Focused plots also support arrow keys, Home, and End.

Chart keys identify series and, where applicable, include visibility checkboxes and a select/deselect-all button. Hovering line or population keys emphasizes their series. Timeline row labels already align with their bars and do not trigger highlighting. Dropdowns show at most ten options with internal scrolling, keyboard navigation, and type-ahead. Tooltips flip near viewport edges and scroll internally when their contents exceed the viewport.

## World Overview

**Snapshot** groups selected-year civilization counts, quantities, and species populations into dynamic cards. When character data is present, Characters counts only enrolled characters with an observation that year; it is not a census.

**Ages** shows static period statistics for the selected age. Kingdoms/villages observed counts identify entities first recorded during the period; they do not claim founding dates. History counts distinct wars, alliances, and characters observed during the period. Age names link to the timeline manager. Repeated names use numeric ordinals (1st, 2nd, 3rd, 10th, 21st, and so on); unique names remain unchanged.

**Statistics** contains two charts:

1. **Population** — Lines, Stacked, Percentage, and Population pie views. Lines includes Global alongside Human, Elf, Orc, and Dwarf, with independent visibility checkboxes. The global total is excluded from stacked and percentage calculations to avoid double counting.
2. **Historical observations** — Army, territory, houses, food, coins, ratios, and per-resident measures, followed by world-specific kingdom/village/war counts and casualty totals. Population counts belong exclusively to Population.

Chronology groups Ages, Kingdoms, Villages, Wars, and Alliances. Rankings includes the four non-character entity types. Each ranking chart shows the selected year. Characters are available through the entity browser instead. Every chronology chart has a search field, species filter when relevant, a one-word foreground title, and no appended ledger or sorting controls. Historical milestones appear last. Timelines retain fixed-height scrolling regions.

## Entity Browser

**All history** displays the complete catalog with lifetime metrics. **Selected year** displays observed entities and confidently established alliances at the selected year.

Search by name, ID, or related entity. Filters group relationships, dates, and measure bounds into separate rows; wars also support type and involvement role. Columns controls visible fields. Re-enabled columns return to their original position. Filter and column editors remain open when switching entity types, and active filters are counted against their defaults.

The browser shows up to 100 entities per page. Selected-year columns include Age, calculated from an exact start year. Column headings change sorting in both the catalog and comparison table. An unavailable value (`—`) sorts below every number, including negative values: first ascending and last descending. Uncertain dates sort by their lower boundary. Static tables do not highlight rows on hover.

Select any number of entities for comparison using their catalog checkboxes. These are the only entity visibility controls for the comparison chart. A Global checkbox appears when a meaningful global counterpart exists. Lines are solid. Tooltips omit unavailable numerical series. Kingdom/village identities use founding-species colors; characters use their recorded species. War/alliance identities use off-white. Characters have no global counterpart. Legend links carry entity type and ID, so duplicate names retain their correct destinations.

## Entity Pages

Every entity page follows the same structure:

1. Identity record, dates, View lifespan, and age links.
2. Snapshot.
3. Highlights.
4. Statistics: Population (except characters) and Historical observations.
5. Chronology.
6. Family for characters.
7. Historical milestones.

Population uses the same four views as World overview. Lines includes a white Total and its species series. Historical observations excludes population counts and offers shared quantity/ratio measures followed by type-specific measures. War observations compare Total, Attackers, and Defenders; casualties and participant counts are measures of the same chart. Attackers use off-white and defenders brown. Every identity record includes links to the ages it overlaps.

Historical observations includes a checkbox below the chart for the global average of the same entity type. World and owner-peer baselines are not offered. Alliance averages use active-alliance snapshots. Character counts are available for global, kingdom, village, war, and alliance observations; participant totals count characters associated with the participating kingdoms. Missing character coverage stays unavailable.

Specialized views include:

- **Kingdoms** — Village ownership, capitals, kings, and Wars and Alliances chronology charts.
- **Villages** — Village leaders and kingdom allegiance. Repeated ownership uses distinct intervals on the same kingdom row.
- **Characters** — Role, kingdom, and home-village histories, plus recorded family relationships.
- **Wars** — Participation intervals, with side-specific measurements in Historical observations.
- **Alliances** — Membership intervals and lifetime membership statistics.

Lifetime highlights retain their exact values and observation-year links. Bounded percentage measures, including army/population and population shares, use proportion rings. Values outside 0–100% remain in a ledger rather than being clipped into a misleading pie. Nonnegative quantity highlights use small bars on a shared within-measure scale. Negative or unavailable values remain textual. Static data never uses dynamic snapshot cards.

Entity links include a star for kingdoms, an upward triangle for villages, a head-and-shoulders silhouette for characters, a thick X for wars, and a hollow circle for alliances. Kingdom/village identities use founding species; characters use their recorded species. Population totals remain white. Hovering an entity or age link for 500 milliseconds shows only its start and end years, preserving uncertain date ranges and an em dash for an unknown end. Ordinary Year columns appear first; their buttons retain a fixed column width and scroll horizontally for unusually long years.

### Characters, Family, and Leadership

Characters appear between Villages and Wars in the manager. Both all-history and selected-year browsing support species, gender, role, kingdom, home village, date, and numeric filters. All-history role/association filters match recorded observations; selected-year filters match that year only. Character comparisons offer level, personal coins, and cumulative kills.

Character birth years are exact and distinct from enrollment. Annual state remains unavailable before the first recorded appearance. The page follows the shared record, snapshot, lifetime highlights, observations, specialized history, and milestones structure; it omits population charts because an individual is not a population. Historical observations can include the global character average at each observation. Personal coins never contribute to settlement or world resource totals. Changes are shown in snapshot cards, not as selectable chart or table measures.

Recorded parents, siblings, and children come from cumulative `p`, `s`, and `c` lists. Family is a fixed-order two-column table: spouse, grandparent, parent, sibling, child, aunt, uncle, cousin, extended. Other parents of recorded children are listed as spouses; this is a co-parent relationship, not a recorded marriage event. More distant relatives are grouped as extended. Missing relatives remain unknown.

Kingdom/village snapshots identify tracked kings/leaders from the corresponding annual role and association, checking appointment IDs when present and withholding contradictory affiliations or office claims. Timelines show observed service periods without joining gaps. Kingdom capitals come from the first entry of the annual cities array; display sorting never changes that array.

Older paired histories without a character collection still load. Missing annual character arrays mean character coverage is unavailable for that observation. Those older rows do not establish capital ordering, so the Viewer does not guess a capital from their first village.

## Cards, Milestones, and Settings

Dynamic cards use white borders and values. Their miniature history graphs show the configured trailing timespan, ending at the selected year. Values normalize within each card; missing observations are not interpolated. Changes from the previous calendar year use green for increases, red for decreases, and gray for no change or unavailable comparisons. Constant-rate values such as entity age omit graphs. Graphs disappear after an entity ends while preserving card height.

World milestones omit characters. Office milestones appear on the corresponding kingdom/village page; character pages retain role and affiliation milestones. Milestones describe first observations, endings, ownership changes, participation, and character role/association changes. Dates appear in year buttons rather than being repeated in descriptions. Statistical peaks, population leadership changes, rank changes, percentage thresholds, and routine casualty increments are excluded. Each event has a type icon and a year button. Long entry text scrolls horizontally within its row without a visible horizontal scrollbar. Vertical milestone scrolling continues into normal page scrolling at the list boundaries.

Settings provides:

- **Animation** — Enabled by default. Charts reveal and actual numerical data count up on first viewing. Dates, labels, axes, and timeline changes do not animate. The browser's reduced-motion preference is respected.
- **Grid card timespan** — 10–100 years, default 50.
- **Reset defaults** — Restores both defaults.

Number animations use the browser locale for intermediate and final values. Playback preserves interactive elements so chart tooltips and button hover states remain usable.

## Historical Accuracy

### Dates

The supported schema uses `start_year` and `end_year` throughout.

- An integer is an exact recorded transition year.
- A range such as `"100-150"` places a transition after observation 100 and by observation 150.
- A null end is open, not a known final date.

Activity intervals include the start and exclude the end. Uncertain boundaries remain uncertain, and exact duration requires two exact dates. Civilization and relationship starts are presented as observations; character start dates are exact births, with enrollment shown separately. Milestone dates name the first confirmed new-state year. Original transition ranges remain available in timelines and relationship records.

Entity age requires an exact start and a selected year inside the confidently known lifespan. Ownership segments show consecutive observed ownership and preserve gaps. Charts do not interpolate missing years or convert missing values into zero. An em dash means unavailable; genuine zero remains zero.

### Calculations

- Kingdom totals sum villages whose annual ownership agrees with the kingdom's village list. Contradictions make affected totals unavailable.
- War and alliance totals aggregate canonical statistics for confidently established participating kingdoms. Wars also expose side-specific aggregates. Uncertain membership or missing member observations prevents complete affected totals; recorded casualty data remains independently usable.
- Ratios use aggregated numerators and denominators, not sums of member ratios. Denominators must be available and positive. Loyalty is not summed.
- Global population and species populations come from world observations. Global resource and territory quantities come from village observations.
- Species percentages use all species counts, including hidden series. Population shares use recorded global population.
- War casualties are cumulative. Decreasing counters are flagged rather than interpreted as negative deaths. World casualty histories retain each war's latest recorded total, including ended wars; these are not assumed final totals.
- Lifetime highlights remain lifetime values when changing age. Age statistics use confidently assigned observations.
- Rankings exclude unavailable values and give ties equal ranks. Overlapping alliance memberships mean alliance totals/averages need not partition the world.

Resources represent holdings, not production or income. Ownership changes do not establish conquests. Side-wide casualties cannot be assigned to individual kingdoms.

### Validation and Additional Fields

Data notes reports invalid measurements, unresolved references, ownership contradictions, interval problems, and decreasing casualty totals. At most 2,000 warning messages are displayed, alongside the full count. overview.json.metadata must exactly match the single metadata header at the beginning of annual.jsonl. Both identify the world (id), name, slot, and last recorded year. The last observation must match metadata.year; duplicate, out-of-order, repeated-header, or mismatched files are rejected. Legacy unpaired metadata.json histories require a new export from the updated Box.

Original additional fields remain in the data model. New entity types or specialized measures require presentation support; they are not automatically exposed as raw JSON in the interface.

## Source Layout and Customization

- `parser.js` — Parsing, validation, indexes, historical queries, aggregates, and calculations. Independent of the DOM and selected UI state.
- `select-menu.js` — Bounded, keyboard-accessible dropdowns that preserve native select values and change events.
- `viewer.js` — Navigation, persistence, controls, SVG charts, tables, and interactions.
- `theme.js` — The shared palette for the Viewer and repository-root loading screen.
- `styles.css` — Layout, responsive behavior, and visual styles using palette variables.
- `index.html` — The application shell, local scripts/styles, loader, managers, and dialogs.

Edit the grouped `THEME` object in `theme.js` to change colors. It supplies CSS variables and SVG colors for species, global/non-species data, war sides, gains/losses, surfaces, controls, markers, warnings, and shadows. Eight-digit hex values include transparency. Refresh after editing.

The parser exposes `HistoryBox.parse`, `HistoryBox.prepare`, and dataset queries including `snapshot`, `series`, `warSideSeries`, `stats`, `rankings`, `ownership`, `memberships`, `summary`, `period`, `milestones`, `family`, `observationRuns`, and `rulers`.

JSONL ingestion and preparation yield between batches. Cached queries, virtualized milestones, paginated tables, and fixed-height scrolling regions keep large histories navigable. Charts limit dense point markers while retaining full-resolution hover values. Memory usage still grows with the dataset and may exceed browser limits for very large histories.

## Publishing and Verification

Publish the six runtime files and this README. Exclude `Tests/`, which contains development scripts, user-supplied fixtures, benchmarks, a recorder harness, and generated screenshots. The application does not depend on that directory. No historical files or dependencies need to be deployed.

Local-file and HTTP loading were tested in Chrome and Edge on Windows, including responsive layouts down to 320px. The code uses platform-independent browser APIs; Safari, Firefox, macOS, and Linux have not been separately verified.

Where the local development tests are retained, run parser checks with `node --test Viewer/Tests/parser.test.cjs`. Browser checks require Playwright as a development-only dependency and can select a browser executable through `HISTORYBOX_BROWSER`.

## License

Distributed under the repository's MIT License. See [LICENSE](../LICENSE).

### Validation of character records

New exports include kingdom `king_id` and village `leader_id`. The parser checks these against observed characters, roles, affiliations, and lifespan metadata. It also reports multiple office claims, unresolved current affiliations, character/home-village disagreements, missing character coverage, impossible parent chronology, and inconsistent population totals. Original annual rows remain untouched; derived character records withhold contradictory offices and kingdom affiliations. They do not guess a replacement ruler or recover an unrecorded appointment. Older exports without appointment IDs remain readable with an explicit validation limitation.

The war Historical observations chart offers one Casualties measure with Total, Attackers, Defenders, and optional same-type global-average keys. World observations use the Global key and only the combined Casualties measure. Serialized `_deaths` field names remain unchanged for compatibility.
