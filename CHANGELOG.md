# Changelog

All notable changes to EasyTask are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- The description field of the right sidebar has a fixed minimum height.
- One rule for the text on the accent color (buttons, selected options, the tick): the dark or white `--primary-foreground`, also as the light theme starts, before it is computed from the accent.
- Opening a sidebar no longer shows its content squeezed (text in vertical) for a moment: the content keeps its final width while the panel slides open.
- The text of primary buttons (and of other things on the accent color) is dark or white as the accent requires: it was always white, 1.8:1 on the default orange.
- The border of an empty checkbox and of text fields reaches 3:1 in the dark theme (it was 2.8:1).
- Ctrl+Z right after "Move up/down" (or a drag) undoes it: it used to do nothing until the move was saved.

### Added

- The release notes in the update dialog and in Settings > About are shown in the language of the app (English or Italian). They come from `CHANGELOG.md` and the new `CHANGELOG.it.md`, which the release checks require for every version.

## [0.3.0] - 2026-10-02

### Added

- "Move up" / "Move down" in the menu of tasks, subtasks and sections ("Move left" / "Move right" for groups): a keyboard- and pointer-friendly alternative to dragging. Completed tasks that are hidden are jumped over, and the move can be undone.
- Template dialog: a "New template" button to create a template from any note of the workspace (a search box lists the notes with their folder), as an alternative to the menu of the note.
- Audio player: a restart button, a mute button, a playback speed button (0.75x to 2x), `Alt+P` to play or pause from anywhere in the workspace (it can be changed in Settings > Shortcuts), and the title and state shown to the system (media controls of Windows).
- Audio player: buttons to go back and forward by 15 seconds (the seek keys of the system use the same step), and the transport controls on a row of their own.
- Audio files of a group show what they are doing: bars while playing, pause, a stop square when the track ended.
- "Reset all" for the Appearance page (theme, accent color, language, size of folders and notes, color intensity), with a confirmation.

### Changed

- Clicking the audio file that is loaded pauses or resumes it instead of starting it over (the new restart button does that).
- All the confirmations (move to the trash, delete for good, empty the trash, restore or delete a backup, overwrite a template, reset the shortcuts or the appearance, "file not found") are one dialog with the same look: close button, "Cancel" on the left and the action, with an icon, on the right. The title and the button are red only when data is lost. The main buttons of the other dialogs (new folder, note, workspace, rename...) have an icon too.
- The description of a task is an icon next to the subtask counter (and the first icon of the toolbar that shows when the pointer is over the task) instead of a lone icon on a line of its own under the task.
- The window buttons use the text color instead of the accent (unreadable on the light theme), the maximize button becomes "restore" while the window is maximized, closing turns red on hover, and they have tooltips.
- Audio player: the title has a row of its own (two lines at most, the whole name in the tooltip), the handle is the same as the groups, and tracks longer than an hour show hours.
- In the audio player the arrows move the seek bar by 5 seconds (it was 0.1) and Space plays or pauses; the position is read out in words.
- The "Reset all" button of the Settings sections (Appearance, Audio, Shortcuts) is always in the same place: the title row of the section, on the right.
- The Settings dialog is taller (720px, at most 85% of the window).
- Subtasks hang from tree guide lines under the checkbox of their parent (no more stepped separators), with a slightly smaller checkbox, and a task with subtasks shows how many are done (e.g. `1/3`).
- Settings > Notes has a switch to show or hide the number of completed subtasks of a task.
- The subtask guide lines are easier to see (contrast about 2:1, was 1.3:1) and the counter of a task with all subtasks done uses the normal text color instead of the accent color, which was unreadable on the light theme.
- Group names are always shown in full on one line: the group grows to fit the name instead of truncating it.
- New versions are announced in a dialog at startup (what's new, "Update now", "Later", "Skip this version") instead of a toast that disappeared after 15 seconds.

### Fixed

- Text and icons on the accent color (orange buttons, selected options, the check of a completed task) are dark or white depending on the accent, so they stay readable: white on the default orange gave 1.8:1 on the light theme.
- The drag handle of tasks and subtasks is centered on the checkbox and the first line of text, and the horizontal tick of the tree lines fades while the handle is shown instead of running through it.
- Collapsing a group and opening it again no longer makes it shrink for a moment (and the groups next to it jump): the list of its audio files appears at once instead of a moment later.
- The filled part of the sliders (audio player seek bar, volume and the sliders of the Settings) could stop short of the left edge on wide sliders: near the end of a track the first part of the bar was empty.
- Borders of checkboxes, text fields and the track of switches reach about 3:1 contrast on both themes. On the light theme the `--input` color was written in an invalid way, so these borders turned black and the track of an off switch was transparent.
- An empty group no longer shrinks and clips its header.
- Collapsing a group no longer changes its width (it keeps the width it had while open).
- Reloading the page of a workspace (development builds) restores the workspace from the URL instead of leaving a blank screen.
- Development and test builds (and any run with `EASYTASK_DATA_DIR`) can start while the installed app is open: the single-instance lock only applies to release builds on the default data folder.

## [0.2.0] - 2026-10-01

### Added

- Hide completed tasks (`Ctrl+Shift+H`).
- Duplicate notes and sections.
- Warning in Settings > Data when the data folder is synced by OneDrive, which can cause "database is locked" errors or conflicted copies.

### Fixed

- Backup restore: the backup is validated first and swapped in atomically, so a bad file can no longer leave the database half restored.
- Undo/redo no longer acts on a new item that reused the id of an item permanently deleted from the trash (the history is cleared after a purge).
- The sidebar no longer stays out of date when a reload overlaps another change (e.g. undoing a move), and a failed note delete reopens its tab.
- Double submit in the create dialogs (a fast double click or double Enter created two items).
- Keyboard shortcuts and preferences are validated when read, so invalid stored values fall back to the defaults.
- Workspace import fixes or rejects invalid files up front (empty titles, duplicate names, empty colors, non-audio files, size limits) instead of failing halfway with a generic error.
- Deleting an item that is already in the trash again keeps its original deletion time.
- `Escape` while editing a task now cancels the edit.
- Creating a sub-task under a parent deleted in the meantime now shows an error instead of failing silently, and two backups in the same second no longer fail.

### Security

- Stricter Content Security Policy (`object-src`, `base-uri`, `form-action` and `frame-ancestors` are locked down; the dev server is only allowed in development builds).
- Single instance: launching EasyTask a second time focuses the running window instead of opening a second one on the same database.
- All GitHub Actions are pinned to commit SHAs and the release workflow uses least-privilege permissions.
- Portable mode no longer writes outside its folder (no window-state file in the user profile and no settings fallback in the app data folder).
- `EASYTASK_DATA_DIR` must be an absolute path.
- A native error dialog explains why the app cannot start when the data folder cannot be created.

## [0.1.0] - 2026-10-01

First public release.

[Unreleased]: https://github.com/ivanerricis/easytask-tauri/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/ivanerricis/easytask-tauri/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ivanerricis/easytask-tauri/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ivanerricis/easytask-tauri/releases/tag/v0.1.0
