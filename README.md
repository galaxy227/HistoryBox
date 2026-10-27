# Welcome to HistoryBox

Record your WorldBox world's history, then explore its people, kingdoms, villages, wars, and alliances.

1. **Install:** Download the HistoryBox release for your computer from [Releases](https://github.com/galaxy227/HistoryBox/releases). Close WorldBox and follow the release's installation instructions. On Windows, place `HistoryBox.dll` in the game's `worldbox_Data/StreamingAssets/Mods/` folder. Enable **Experimental Mode** in WorldBox settings and restart.
2. **Record:** Open your world and switch **Activator ON** in the top-right HistoryBox panel. Play normally. Switch it OFF before copying your history files.
3. **Find your history:** Open the matching world folder inside `HistoryBox` at the location below. Take **overview.json** and **annual.jsonl** from that same folder.
4. **Explore:** Visit the [HistoryBox Viewer](https://galaxy227.github.io/HistoryBox/), select both files, and choose **Open world**. Your files stay in your browser.

| Computer | Usual history location |
| --- | --- |
| Windows | `%USERPROFILE%\AppData\LocalLow\mkarpenko\WorldBox\HistoryBox` |
| macOS | `~/Library/Application Support/mkarpenko/WorldBox/HistoryBox` |
| Linux | `~/.config/unity3d/mkarpenko/WorldBox/HistoryBox` |

## Notes

- Recording must be ON to capture history; earlier years cannot be recovered. **Duplicator ON** keeps a separate history when saving into another slot.
- Use your platform's release instructions; mod support and installation locations can vary. Linux may use `$XDG_CONFIG_HOME` instead of `~/.config`; older macOS installations can use a different [save-data location](https://docs.unity3d.com/ScriptReference/Application-persistentDataPath.html).
- Downloaded this repository? Open its `index.html` in a modern browser to use the Viewer locally.
- More detail: [recording and installation](Box/README.md) · [using the Viewer](Viewer/README.md).
