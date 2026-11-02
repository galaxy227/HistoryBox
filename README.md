# Welcome to HistoryBox

Record your [WorldBox](https://www.superworldbox.com/) world’s history, then explore it in the [HistoryBox Viewer](https://galaxy227.github.io/HistoryBox/).

## Install

1. Download **HistoryBox-v1.0.0.zip** from [Releases](https://github.com/galaxy227/HistoryBox/releases). Extract the compressed folder to find `HistoryBox.dll`.
2. Copy `HistoryBox.dll` into the following path, relative to your WorldBox installation directory:

   | Computer | File path |
   | --- | --- |
   | Windows | `worldbox_Data/StreamingAssets/mods/` |
   | macOS | `worldbox.app/Contents/Resources/Data/StreamingAssets/mods/` |
   | Linux | `worldbox_Data/StreamingAssets/mods/` |

   Be sure to use the existing `mods` folder, or if not already present, create a new `mods` folder preserving the expected capitalization.
3. Start WorldBox, enable **Experimental Mode** in Settings, then restart the game. These steps apply to all three platforms.

## Record Your History

Open your world and you will see two buttons in the top-right HistoryBox panel, `Activator` and `Duplicator`.

### Activator

`Activator` controls when HistoryBox records your world's history:

**Activator ON:** As you continue to play normally, each completed year will be automatically recorded once the next year begins.

**Activator OFF:** No history will be recorded. HistoryBox will simply omit unrecorded gaps in history.

### Duplicator

Each HistoryBox recording is associated with its respective WorldBox save slot. With **Activator ON**, `Duplicator` controls what happens when you save your world to a different slot:

- **Duplicator ON:** Copies the existing HistoryBox output to a new folder for the new save slot, preserving the original history while continuing to record independently of your original world. Think of duplicating as starting an alternate timeline of your current world in a new save slot.
- **Duplicator OFF:** Continues recording to the original HistoryBox output without creating a copy. If you later reopen your world from the new save slot and start recording, HistoryBox will create a new output without the original history.

Saving to the same save slot always continues outputting to the current HistoryBox folder. Your world's first save automatically associates its HistoryBox recording to that slot, regardless of `Duplicator`.

## Find Your History

HistoryBox saves each world's history in a separate folder inside the following directory:

| Computer | Folder path |
| --- | --- |
| Windows | `%USERPROFILE%\AppData\LocalLow\mkarpenko\WorldBox\HistoryBox\` |
| macOS | `~/Library/Application Support/mkarpenko/WorldBox/HistoryBox/` |
| Linux | `~/.config/unity3d/mkarpenko/WorldBox/HistoryBox/` |

Open your world's folder within this directory, where you will find both `overview.json` and `annual.jsonl` files to view your history.

Linux may use `$XDG_CONFIG_HOME` instead of `~/.config`; older macOS installations may use another [save-data location](https://docs.unity3d.com/ScriptReference/Application-persistentDataPath.html).

## Explore Your History

Visit the [HistoryBox Viewer](https://galaxy227.github.io/HistoryBox/), upload your **overview.json** and **annual.jsonl** files together, then explore your world! The World Overview gives a collection of global data, the Entity Browser lets you dive into details, and the Map visualizes it all combined.

You may also download this repository and open `index.html` in a modern browser to use the Viewer locally.

## Notes

- HistoryBox is compatible with WorldBox 0.51.2
