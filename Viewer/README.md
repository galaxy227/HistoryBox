# HistoryBox — Viewer

HistoryBox Viewer is a standalone browser application for exploring world histories recorded by [Box](../Box/README.md).

The Viewer presents population, resources, civilizations, wars, alliances, relationships, and historical changes. Historical files are processed locally in the browser.

## Requirements

- A modern browser with JavaScript, SVG, the File API, and IndexedDB.
- `metadata.json` and `annual.jsonl` from the same HistoryBox world-history directory.

WorldBox, Unity, a backend, accounts, and application dependencies are not required. There is no build step.

## Opening the Viewer

1. Download the repository.
2. Open `Viewer/index.html` in a browser.
3. Select the world's `metadata.json` and `annual.jsonl` files.
4. Select **Open world**.

Keep `index.html`, `styles.css`, `parser.js`, and `viewer.js` together. The same files can be served by any static web host. For repository-root hosting, the Viewer is available under `/Viewer/`; for hosting this directory directly, its entry point is `index.html`.

The Viewer makes no network requests to load scripts, fonts, chart libraries, or historical data. The HistoryBox logo opens the public repository in a new tab only when clicked.

### Restoring a World

The browser stores the most recently opened files in IndexedDB and saves viewing preferences locally. Refresh restores the world, route, selected year, age, window, and available view settings without displaying the loader first. Browser storage is specific to the local-file location or hosting origin and may be unavailable or cleared in private browsing.

**Load world** opens the file selection screen. **Return to current world** returns to the existing dataset. A failed replacement leaves the previous world available. Clearing the site's browser storage removes its saved history and preferences.

Entity links use fragments such as `#/kingdom/123`. Opening one in a new tab restores that entity when the corresponding world is available in browser storage. Links do not contain or transfer the historical files. Back and Forward restore page scroll positions within the session.

## Navigation and Timeline

The top manager contains World overview, Entity browser, and the world name. Entity-type buttons remain visible while browsing entities; the current entity name appears beside them.

The bottom manager contains the timeline controls:

- **Year** — The slider and arrow buttons select recorded observations. Keyboard arrows step through observations; Home and End select the first and last observations in the selected window.
- **Playback** — Play advances through observations and loops within the selected window. Speeds are ½×, 1×, 2×, and 4×; 1× advances one observation per second. Chart dragging pauses playback.
- **Window** — Choose All ages, a historical age, or Custom. All ages and named ages set their bounds automatically. Custom enables the Start and End inputs.
- **Start / End** — Inclusive bounds of a custom window. Start 50 and End 70 display years 50–70. Values are clamped to available history and cannot cross; equal bounds select a single year.

All ages and named ages lock Start and End. Custom initially retains the current bounds and enables editing. The slider, arrow buttons, keyboard selection, and playback are confined to recorded observations between Start and End; changing bounds brings the selected year inside the window. A window containing no observations disables year selection. Exact age boundaries are used where available; uncertain boundaries use their confidently established interior, clipped to available history.

Historical charts use the window; the Historical ages chronology always shows the complete recorded history. Hover a plot to inspect values, or click and drag to select the nearest recorded year. A translucent cursor line previews selection and a thicker opaque line marks the selected year. Focused plots also support arrow keys, Home, and End.

Chart keys identify series and, where applicable, include visibility checkboxes and a select/deselect-all button. Hovering line or population keys emphasizes their series. Timeline row labels already align with their bars and do not trigger highlighting. Tooltips flip near viewport edges and scroll internally when their contents exceed the viewport.

## World Overview

**World snapshot** groups selected-year civilization counts, quantities, and species populations into dynamic cards.

**Age analysis** shows static period statistics, peak kingdom/village tables, and the full Historical ages chronology. Exact metadata start dates determine founded counts. Uncertain or unverified starts have separate observed counts. Age names link to the timeline manager. The peak tables retain their allocated height when fewer entries are available.

**World statistics** contains three charts:

1. **Population** — Lines, Stacked, Percentage, and Population pie views. Lines includes Global alongside Human, Elf, Orc, and Dwarf, with independent visibility checkboxes. The global total is excluded from stacked and percentage calculations to avoid double counting.
2. **Historical observations** — Army, territory, houses, food, coins, ratios, and per-resident measures, followed by world-specific kingdom/village/war counts and casualty totals. Population counts belong exclusively to Population.
3. **Changes between observations** — Absolute or percentage changes for the combined Population and Historical observations measure sets. Changes compare successive recorded observations, not assumed annual production.

Civilization lifespans, selected-year kingdom/village rankings, War chronology, Alliance chronology, and Historical milestones follow. These timelines have fixed-height scrolling regions.

## Entity Browser

**All history** displays the complete catalog with lifetime metrics. **Selected year** displays observed entities and confidently established alliances at the selected year.

Search by name, ID, or related entity. Filters group relationships, dates, and measure bounds into separate rows; wars also support type and involvement role. Columns controls visible fields. Re-enabled columns return to their original position. Filter and column editors remain open when switching entity types, and active filters are counted against their defaults.

Column headings change sorting. An unavailable value (`—`) sorts below every number, including negative values: first ascending and last descending. Uncertain dates sort by their lower boundary. Static tables do not highlight rows on hover.

Select any number of entities for comparison using their catalog checkboxes. These are the only entity visibility controls for the comparison chart. A Global checkbox appears when a meaningful global counterpart exists. Comparison lines are solid and colored by the entity's founding species, independently of the selected measure. Legend links carry entity type and ID, so duplicate names retain their correct destinations.

## Entity Pages

Every entity page follows the same structure:

1. Identity record and dates.
2. Selected-year kingdom, village, war, or alliance snapshot.
3. Lifetime recorded highlights.
4. Population.
5. Historical observations.
6. Context comparison.
7. Type-specific charts and relationships.
8. Historical milestones.

Population uses the same four views as World overview. Lines includes the entity Total and its species series. Historical observations excludes population counts and offers shared quantity/ratio measures followed by type-specific measures. War observations compare Combined, Attackers, and Defenders for the chosen measure.

Context comparison offers World and the corresponding entity-type average. Villages additionally offer other villages of the selected-year owner. Alliance averages use active-alliance snapshots; they are not village averages.

Specialized views include:

- **Kingdoms** — Recorded rankings, village ownership, and separate Wars and Alliances sections.
- **Villages** — Recorded rankings and kingdom allegiance. Repeated ownership uses distinct intervals on the same kingdom row.
- **Wars** — War casualties, Participants, and participation intervals. Casualties and participant counts remain separate from the shared historical measures.
- **Alliances** — Membership intervals and lifetime membership statistics.

Lifetime highlights retain their exact values and observation-year links. Bounded percentage measures, including army/population and population shares, use proportion rings. Values outside 0–100% remain in a ledger rather than being clipped into a misleading pie. Nonnegative quantity highlights and age peak tables use small bars on a shared within-measure scale. Negative or unavailable values remain textual. Static data never uses dynamic snapshot cards.

Entity links include a star for kingdoms, an upward triangle for villages, a thick X for wars, and a hollow circle for alliances. Species entities use founding-species colors; war/alliance entities use the non-species color.

## Cards, Milestones, and Settings

Dynamic cards use white borders and values. Their miniature history graphs show the configured trailing timespan, ending at the selected year. Values normalize within each card; missing observations are not interpolated. Changes from the previous calendar year use green for increases, red for decreases, and gray for no change or unavailable comparisons. Constant-rate values such as entity age omit graphs. Graphs disappear after an entity ends while preserving card height.

Milestones describe founding/beginning, observations, endings, ownership changes, and participation. Statistical peaks, leadership changes, rank changes, percentage thresholds, and routine casualty increments are excluded. Each event has a type icon and a year button. Long entry text scrolls horizontally within its row without a visible horizontal scrollbar. Vertical milestone scrolling continues into normal page scrolling at the list boundaries.

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

Activity intervals include the start and exclude the end. Uncertain boundaries remain uncertain, and exact duration requires two exact dates. Exact starts use Founded or Began; uncertain or unverified starts use Observed. Milestone dates name the first confirmed new-state year. Original transition ranges remain available in timelines and relationship records.

Entity age requires an exact start and a selected year inside the confidently known lifespan. Ownership segments show consecutive observed ownership and preserve gaps. Charts do not interpolate missing years or convert missing values into zero. An em dash means unavailable; genuine zero remains zero.

### Calculations

- Kingdom totals sum villages whose annual ownership agrees with the kingdom's village list. Contradictions make affected totals unavailable.
- War and alliance totals aggregate canonical statistics for confidently established participating kingdoms. Wars also expose side-specific aggregates. Uncertain membership or missing member observations prevents complete affected totals; recorded casualty data remains independently usable.
- Ratios use aggregated numerators and denominators, not sums of member ratios. Denominators must be available and positive. Loyalty is not summed.
- Global population and species populations come from world observations. Global resource and territory quantities come from village observations.
- Species percentages use all species counts, including hidden series. Population shares use recorded global population.
- War casualties are cumulative. Decreasing counters are flagged rather than interpreted as negative deaths. World casualty histories retain each war's latest recorded total, including ended wars; these are not assumed final totals.
- Lifetime highlights remain lifetime values when changing age. Age statistics use confidently assigned observations; casualty changes require both observations within the period.
- Rankings exclude unavailable values and give ties equal ranks. Overlapping alliance memberships mean alliance totals/averages need not partition the world.

Resources represent holdings, not production or income. Ownership changes do not establish conquests. Side-wide casualties cannot be assigned to individual kingdoms.

### Validation and Additional Fields

Data notes reports invalid measurements, unresolved references, ownership contradictions, interval problems, and decreasing casualty totals. At most 2,000 warning messages are displayed, alongside the full count. Both files must originate from the same history folder; annual records have no independent world GUID for verifying that pairing.

Original additional fields remain in the data model. New entity types or specialized measures require presentation support; they are not automatically exposed as raw JSON in the interface.

## Source Layout and Customization

- `parser.js` — Parsing, validation, indexes, historical queries, aggregates, and calculations. Independent of the DOM and selected UI state.
- `viewer.js` — Navigation, persistence, controls, SVG charts, tables, interactions, and the palette.
- `styles.css` — Layout, responsive behavior, and visual styles using palette variables.
- `index.html` — The application shell, local scripts/styles, loader, managers, and dialogs.

Edit the grouped `THEME` object at the beginning of `viewer.js` to change colors. It supplies CSS variables and SVG colors for species, global/non-species data, gains/losses, surfaces, controls, markers, warnings, and shadows. Eight-digit hex values include transparency. Refresh after editing.

The parser exposes `HistoryBox.parse`, `HistoryBox.prepare`, and dataset queries including `snapshot`, `series`, `warSideSeries`, `stats`, `rankings`, `ownership`, `memberships`, `summary`, `period`, and `milestones`.

JSONL ingestion and preparation yield between batches. Cached queries, virtualized milestones, paginated tables, and fixed-height scrolling regions keep large histories navigable. Charts limit dense point markers while retaining full-resolution hover values. Memory usage still grows with the dataset and may exceed browser limits for very large histories.

## Publishing and Verification

Publish the four runtime files and this README. The Viewer-local `.gitignore` excludes `Tests/`, which contains development scripts, user-supplied fixtures, benchmarks, and generated screenshots. The application does not depend on that directory. No historical files or dependencies need to be deployed.

Local-file and HTTP loading were tested in Chrome and Edge on Windows, including responsive layouts down to 320px. The code uses platform-independent browser APIs; Safari, Firefox, macOS, and Linux have not been separately verified.

Where the local development tests are retained, run parser checks with `node --test Viewer/Tests/parser.test.cjs`. Browser checks require Playwright as a development-only dependency and can select a browser executable through `HISTORYBOX_BROWSER`.

## License

Distributed under the repository's MIT License. See [LICENSE](../LICENSE).
