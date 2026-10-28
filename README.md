# Welcome to HistoryBox

Record your WorldBox world's history, then explore its people, kingdoms, villages, wars, and alliances in your browser.

## Install

1. Download your computer's archive from [Releases](https://github.com/galaxy227/HistoryBox/releases): **HistoryBox-Windows.zip**, **HistoryBox-macOS.zip**, or **HistoryBox-Linux.zip**. Extract it to find `HistoryBox.dll`.
2. Close WorldBox. In Steam, right-click **WorldBox → Manage → Browse local files** to open the game folder. For a non-Steam copy, open its installation folder.
3. Copy `HistoryBox.dll` into the folder for your computer:

   | Computer | Where to place the file |
   | --- | --- |
   | Windows | Open `worldbox_Data`, then `StreamingAssets`, then `mods`. |
   | macOS | Right-click `worldbox.app` → **Show Package Contents**, then open `Contents/Resources/Data/StreamingAssets/mods`. |
   | Linux | Open `worldbox_Data`, then `StreamingAssets`, then `mods`. |

   Use the existing `mods` folder, keeping its capitalization; create it if absent.
4. Open WorldBox, enable **Experimental Mode** in Settings, then restart the game. These steps apply to all three platforms.

## Record

Open your world and switch **Activator ON** in the top-right HistoryBox panel. Play normally. Switch it **OFF** before copying your history files.

If an **ERROR** panel appears, its last-recorded year shows the latest successful recording. Recording keeps retrying; you can dismiss the panel, and another error will bring it back.

## Find Your History

Open your world's folder inside the location below. Copy **overview.json** and **annual.jsonl** together from that same folder.

| Computer | How to open the history location |
| --- | --- |
| Windows | Press **Win+R**, paste `%USERPROFILE%\AppData\LocalLow\mkarpenko\WorldBox\HistoryBox`, then press Enter. |
| macOS | In Finder, choose **Go → Go to Folder**, then enter `~/Library/Application Support/mkarpenko/WorldBox/HistoryBox`. |
| Linux | In your file manager, press **Ctrl+L** and enter `~/.config/unity3d/mkarpenko/WorldBox/HistoryBox`. |

## Explore

Visit the [HistoryBox Viewer](https://galaxy227.github.io/HistoryBox/), select both files from the same recording, and choose **Open world**. Your files stay in your browser.

## Notes

- Recording starts when Activator is ON; earlier years cannot be recovered. **Duplicator ON** keeps a separate history when saving into another slot.
- Downloaded this repository? Open its `index.html` in a modern browser to use the Viewer locally.
- Linux may use `$XDG_CONFIG_HOME` instead of `~/.config`; older macOS installations may use another [save-data location](https://docs.unity3d.com/ScriptReference/Application-persistentDataPath.html).
- More detail: [recording and installation](Box/README.md) · [using the Viewer](Viewer/README.md).
