# Changelog

All notable changes to EasyTask are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.11.0] - 2026-10-22

### Added

- Settings: a search box finds an option by its name. Esc, the X button or choosing a category clears it.
- Settings > System (new): start EasyTask with Windows, and close it to the notification area. When this option is on, closing the window hides it and the icon in the notification area opens it again or quits. Both options are off by default.
- Settings > Data: the trash can empty itself of items deleted more than a chosen number of days ago (checked when the app starts). The automatic backup has a frequency and can be saved in a folder of your choice.
- Settings > Notes: new tasks can be added at the top or at the bottom, the task list has a density setting, and the spell check can be turned off.

### Changed

- Faster with large notes and workspaces: dragging tasks, sections and sidebar items, switching notes and tabs, playing audio and exporting a workspace do much less work.
- Settings are laid out as cards in a wider dialog.
- Sidebar rows no longer show the folder and note icons.

### Fixed

- "No color" removes the color of folders and notes in the sidebar again.
- The tooltip of a sidebar row no longer comes back after its right-click menu closes.
- Ctrl, Alt or Shift with the arrow keys no longer switch notes from the tab bar.
- Long error messages in the delete dialogs wrap instead of overflowing.
- Security: `rustls-webpki` 0.103.16 and `webpki-root-certs` 1.0.10 fix two certificate advisories (RUSTSEC-2026-0382 and 0383).


## [0.10.1] - 2026-10-16

### Fixed

- App icon: it is back on a dark rounded tile with a larger symbol. The transparent version showed white shapes that disappeared on light backgrounds (light taskbar, file explorer, installer), leaving only the orange pill.
- Security: `rustls` is updated to 0.23.46, which fixes four advisories in its TLS handling (RUSTSEC-2026-0346, 0347, 0348 and 0349).

### Changed

- Updated the dependencies: the Tauri plugins and the other Rust crates, the npm packages, the GitHub Actions and the audio tag reader (`lofty` 0.25). Tags and the year of the audio files are read as before.


## [0.10.0] - 2026-10-13

### Added

- Automations: four "state" triggers (a section or a group has no open tasks / has at least one open task) that set a color. Two rules are enough to turn a group or a section green when nothing is left to do and red otherwise. They apply silently, with no notification and no undo entry, and are re-evaluated whenever the tasks of the note change and when the rules are saved.
- Automations: an empty-state screen with an example and a single "New automation" button.

### Changed

- Palette: six colors (Yellow, Cyan, Lime, Pink, Lavender, Beige) are darker so the text stays readable in both themes; colors already assigned do not change. The swatches are squares, and a test guards the contrast.
- Automations: the sentence of a rule names its color, lists are joined with "and", the steps are checked, Enter moves forward, and the notification shows a short title with one line per rule.
- Update dialog and Settings share the same parts: focus on "Update now", release notes you can scroll with the keyboard and with links, progress and a hint.
- Menus of sections, groups and tasks are reordered with separators; the color submenu has "No color" instead of "Delete"; "Move to…" is polished.
- Buttons for creating things have a "+" and are filled when a list is empty. The checkboxes of subtasks are aligned with the text of their parent, and the audio player and Settings > Audio are aligned.

### Fixed

- Text context menu: wrong position, undo and redo, read-only and number or email fields; the text of a task keeps the task menu.
- The "When" selector of the automation editor no longer cuts its text.

### Notes

- Going back to an older version ignores the new state rules without errors.

## [0.9.1] - 2026-10-13

### Added

- Right click on the empty space of the sidebar tree: a menu to create a note or a folder in the root of the workspace, create a note from a template, import, and collapse or expand all the folders.
- Settings > Appearance > Animations: a new "System" value, now the default, that follows the animation setting of the operating system (in Windows: Settings > Accessibility > Visual effects > Animation effects) and changes with it. Whoever chose a speed before keeps it.

### Changed

- Folders open and close with a sliding animation, and their arrow turns smoothly (it follows the animation setting).
- Sidebar: the rows have no border until they are hovered; the open or selected note has an accent border all around, and a collapsed folder that holds the open note a fainter one. The icon of a note sits under the icon of its folder, and the buttons at the top are grouped (create, files, view) by dividers.
- Settings > Appearance > Animations: a shorter description.

### Fixed

- Dragging groups, sections and tasks in a note, and notes and folders in the sidebar, is smooth also with hundreds of tasks: only the row concerned is redrawn when the pointer changes target (in a note with 213 tasks, the frames of a drag went from up to 100 ms to 17 ms).
- The focus ring of the last item of a folder was cut at the bottom.

## [0.9.0] - 2026-10-12

### Added

- An empty note shows a "New group" button in the middle, besides the shortcut hints.
- Settings > About: a button copies the path of the database.
- Settings > Appearance: the colors under Color intensity are labeled "Preview".

### Changed

- Confirmations of actions that cannot be undone (empty the trash, delete permanently, restore or delete a backup, delete or discard an automation) have a solid red button. The other red buttons have a more visible border.
- The note search (Ctrl+O) lists the notes first: Enter right after opening it no longer undoes the last action.
- Settings: the reset button of a row is always on the right of its control and only shows when the value was changed, so the controls line up. In Italian, "Ripristina" is used for backups, trash and archive only; resetting a setting is now "Reimposta".
- Settings > Data: the backups are listed in a box, with a clock icon to restore them and the unit next to the number to keep.
- The focus ring of buttons and fields uses the accent color.
- The shortcuts dialog scrolls inside, with a fade at the bottom while there is more below.
- Templates: a clearer icon for "Update from note", Delete set apart from the other buttons, and the dialog is only as tall as its list.
- The color button of the new folder and new note dialogs shows a palette icon until a color is chosen.
- The selected task has an accent bar on its left; the templates count in the sidebar is a neutral badge; the note menu is split into groups.
- Home: square buttons, the recent workspaces box is only as tall as its content, and long names and dates are truncated.
- The audio player is moved by its header, which only holds the close button; the title has its own row.
- While a section is dragged, the "New group" column itself is the drop area.
- Success messages disappear after 3 seconds; errors stay for 8.

### Fixed

- Narrow window: the sidebar and the side panel no longer cover the button that hides them.
- The Details tab no longer cuts the task description: the Audio part takes only the space it needs.
- A group name no longer shrinks to "…" next to the progress bar and the counts.
- Settings > About: the database path wraps only after a folder separator.

## [0.8.1] - 2026-10-12

### Changed

- The tabs of the open notes are narrower, and only the open note shows its close button (the others on hover).
- While an item is dragged the pointer is a closed hand everywhere, and a dragged folder, note, group, section or task is slightly tilted.
- The sliders in Settings (color intensity, size and opacity of the audio player) follow the pointer smoothly and apply the value when released.
- Settings > Appearance: the preview of the size of folders and notes was removed.

### Fixed

- Windows: the media controls of the system (volume flyout, lock screen) show EasyTask instead of "Unknown app" while the audio player plays. The previous/next buttons there skip back and forward by 15 seconds.
- The horizontal guide line of a subtask was 1px below the center of its checkbox.

## [0.8.0] - 2026-10-09

### Added

- Rename in place: Rename in the menu of a workspace, folder, note, group or section turns its name into a text field with the whole name selected (Enter saves, Esc cancels). Audio files and templates keep the dialog.
- Sections can have no name, like groups. A group or section without a name shows no text in its header, and Settings > Notes can show its default name (e.g. Group 1) in gray instead.
- Settings > Notes: rename a group, section or task with a click on its name (on by default; when off, Enter still renames) and color the background of a colored task, besides its side bar (on by default).
- Settings > Appearance: animation speed (None, Normal, Slow). Normal, the default, is faster than the animations of the previous versions, which are now Slow.
- Choosing an accent color with too little contrast with the background shows a warning and proposes a close color that can be read.
- Before a database upgrade a copy of the database is kept apart from the automatic backups (the last 10), and is listed in Settings > Backups.
- Loading placeholders (skeletons) for the notes, the home page, the trash, the archive and the templates when the data takes a moment to arrive.

### Changed

- Groups and sections are created like tasks: a single text field, Enter creates, Esc or a click outside cancels (the + and X buttons are gone). The "New group" and "New section" buttons have a dashed border and a label.
- Dialog buttons stay at the bottom of the dialog. In Settings, Trash and Archive the side list of categories takes the whole height of the dialog, and the close button no longer covers "Reset all". "Empty trash" sits next to "Close".
- Trash, Archive, Templates, Settings and the other dialogs open at once (the first opening waited about half a second), and Trash and Archive no longer animate their layout when they open.
- Tooltips are closer to their element, open at once when moving to a neighbouring button, and in the dark theme they are gray with a border instead of white.
- The theme menu in Settings has icons.

### Fixed

- Typing in a text field no longer shows the clear button (X) of the system.

## [0.7.0] - 2026-10-09

### Added

- Automations for the tasks of a note: rules like "when a task is completed in Doing, move it to Done". They react when a task is completed, reopened, created, moved into a section, or when all its subtasks are completed, and they can move the task, mark it completed or to do, add or remove its priority, color it or complete its subtasks. They are managed from the note and section menus (Automations…); every run shows a toast and is undone like any other action. Groups too: when all the tasks of a group are completed, the group can be archived, colored or moved to the top or the bottom of the note, also from the group menu. Rules are kept when a note is duplicated, exported or imported.
- A text menu in the title bar (File, Edit, View, Help), also reachable with Alt or F10, with an icon on every entry.
- The color of the open note can be changed from the Details panel, like the one of a task.
- Tasks can be archived from their menu, with their subtasks: they leave the note without going to the trash, and the Archive has a Tasks tab to restore them (their archived parent tasks come back too).
- Importing a workspace, a note or a folder first shows the names it will get (a free name is proposed) and lets you change them.
- Keyboard: the item menus (…) work with the arrow keys, the note tabs are navigated with the arrows and can be moved left or right from their menu, and the task menu has Rename.

### Changed

- The default accent is a deeper orange, so the text on buttons is white. A color chosen by the user keeps the automatic black or white text.
- The keyboard focus is visible everywhere, click targets are larger, and selects, tabs, toggles and sliders look and behave the same across the app (settings, trash, archive, right panel, audio player).
- While a task is dragged, the section that will receive it is outlined as a whole. The "Add task" button is just a "+". The marker of the selected category in the settings is on the left, and the settings categories never scroll horizontally.
- The compact sidebar opens as a panel over the content and closes with Esc.
- Export workspace left the left sidebar: it is in File and in Settings > Data.
- Long names no longer widen dialogs, groups or tabs: they are truncated or wrap.
- Clearer and consistent wording: "New note", "Collapse", error messages, dates, and "…" everywhere.
- The update check starts 3 seconds after startup.
- The database is upgraded on the first start (a safety copy is taken first).

### Fixed

- Deleting a workspace from the home removes it from the list at once (it stayed there until the page was reloaded).
- Dialogs taller than the window scroll instead of being cut off.
- Toasts follow the theme of the app instead of the one of the system.
- Trash, Archive, Templates and New note from template work from the menu also with the left sidebar closed.
- The workspace grid of the home page no longer scrolls sideways.
- Screen readers: task checkboxes, progress bars, the sidebar tree and the note tabs have proper names and roles.

## [0.6.0] - 2026-10-07

### Added

- A color palette in the creation dialogs: the "Add color" button of the new workspace, folder and note dialogs is now a "+" button next to the name that opens the same palette of the menus (with "Pick another color" for any other color).
- Trash and Archive are divided in tabs by kind of item (folders, notes, groups, sections...), each with its own count and a message when a kind is empty.
- A confirmation toast when an item is moved to the trash.

### Changed

- Folders, notes, groups, sections and tasks are dragged from the whole row or header: the grip handles are gone. The preview shown while dragging has the color of the item.
- A tab can be dropped at either end of the tab bar.
- The close button of the toasts is inside the toast, on the right.
- Automatic backups keep 5 copies by default (it was 7). The value chosen in Settings is not changed.

## [0.5.0] - 2026-10-06

### Added

- Archive: folders, notes, groups and sections can be archived from their menu (or several at once from the multiple selection of the left sidebar). An archived item disappears from the note and the sidebar, with everything inside it, without going to the trash. The "Archive" button next to the Trash lists the archived items divided by kind (folders, notes, groups, sections): from there they can be restored or moved to the trash. Archiving and restoring can be undone, and archived items are kept by the workspace export and import.
- Information about audio files: the Details tab of the right sidebar is split in two, and the lower half shows the audio file that is playing, or the one chosen with "Information" in its menu: cover, title, artist, album and the other tags, duration, format and codec, bitrate, sample rate, bit depth, channels, size and modification date.

### Fixed

- The audio player no longer starts partly outside the window: its position is computed from its real size (it was taken as much shorter than it is).
- "Color content" of a folder can be undone.
- The name of an imported workspace that clashes with an existing one gets the suffix in the language of the app ("(imported)"; it was always "(importato)"), and the errors of the backups and of the import are translated.
- Editing a note with many tasks is lighter: a change to a task no longer redraws every task that has subtasks.

### Changed

- A section without tasks no longer shows its progress bar ("100 %"), as already happens for groups.

## [0.4.0] - 2026-10-06

### Fixed

- Opening a note with many tasks no longer freezes the app: every task text was sized by a script that forced a layout per task (a note with 400 tasks took half a minute, one with 3000 never finished). The webview now sizes the text boxes itself (`field-sizing: content`), and a note with 250 tasks opens in under a second.
- The volume slider of the audio player is smooth: while it is dragged only the player updates, and the volume preference (which re-rendered the whole app and was written to disk on every step) is saved once on release.
- The tree lines of deeply nested subtasks: the line of a subtask that is not the last of its level was hidden when one of its ancestors was the last, so the lines looked broken.
- The description field of the right sidebar has a fixed minimum height.
- One rule for the text on the accent color (buttons, selected options, the tick): the dark or white `--primary-foreground`, also as the light theme starts, before it is computed from the accent.
- Opening a sidebar no longer shows its content squeezed (text in vertical) for a moment: the content keeps its final width while the panel slides open.
- The text of primary buttons (and of other things on the accent color) is dark or white as the accent requires: it was always white, 1.8:1 on the default orange.
- The border of an empty checkbox and of text fields reaches 3:1 in the dark theme (it was 2.8:1).
- Ctrl+Z right after "Move up/down" (or a drag) undoes it: it used to do nothing until the move was saved.
- The modification date of a workspace is updated by any change inside it (add, edit, move, delete or restore of folders, notes, groups, sections, tasks, audio files): it only changed when the workspace itself was renamed or recolored. The start page lists the workspaces by that date.
- Esc works in the fields that create a new task, group or section (it closes them and drops the text), and after Esc the title of a section is no longer saved when the field loses focus. The rename and task description dialogs forget what was typed when they are closed with Esc.
- In the compact size of the sidebar the note and folder rows no longer show scroll bars.
- "Empty the trash" closes the trash dialog when it succeeds.
- Completed tasks that are hidden no longer take their open subtasks with them: a completed task with an open subtask stays visible until everything under it is done.
- The accent color picker no longer lags: while the color is dragged only the preview changes; the preference is stored once, when the picker rests.
- The note search (Ctrl+O) shows the whole path of a note: a note in a subfolder showed only the last folder.
- The buttons in the header of the left sidebar wrap onto a second row when the sidebar is narrow, instead of disappearing.
- Errors of the delete, trash and rename dialogs and of the inline editing of tasks, groups and sections are shown next to the field instead of in a toast.

### Added

- The color bar on the left of a task is twice as wide (4 px instead of 2).
- A button in the header of the left sidebar to create a note from a template: choose the template (with a search box), then the name and folder of the note. The sidebar can no longer be narrower than 224 px (it was 200) so that the six header buttons fit.
- The release notes in the update dialog and in Settings > About are shown in the language of the app (English or Italian). They come from `CHANGELOG.md` and the new `CHANGELOG.it.md`, which the release checks require for every version.
- Export and import of notes and folders. "Export" is in the menu of every note and folder (a folder with everything in it). "Import" is a button in the header of the left sidebar (it imports into the root of the workspace) and "Import here" is in the menu of a folder. The file has the format of a workspace export; names that clash are renamed, missing audio files are skipped, and the import can be undone.
- Multiple selection in the left sidebar: Ctrl+click (Cmd on macOS) adds or removes an item, Shift+click selects a range, Esc clears it. For several items at once: delete, move (by dragging or from the menu), change color and export, each as a single step of the history.
- The note open in the active tab is highlighted in the sidebar (and a collapsed folder that holds it is marked), and the active tab has side borders and a line under the other tabs, so it opens onto the note.
- Sort of the workspaces on the start page: last edit, creation date or name, ascending or descending; the choice is remembered.
- The number of audio files of a group in its header (Settings > Notes), and lines between the groups of a note (off by default).
- A limit for the history of undoable actions (25 to 500, default 50) in Settings > Data.
- Shortcuts to move between the open notes: Ctrl+PageDown / Ctrl+PageUp (can be changed) and Ctrl+Tab / Ctrl+Shift+Tab.
- A button to reset the accent color, next to the picker.
- A backup of the database is taken before it is migrated to a new version of the schema (the copy is in the backups folder; if it fails the app starts anyway).

### Changed

- The default accent color is a stronger orange (#f97316): the pale one was hard to see on a light background.
- Settings: the buttons of the shortcuts are icons only, the Data page has sections (import and export, data folder, backup, history) and so does the Notes page.
- The header of the left sidebar, the note tabs and the tabs of the right panel have the same height, and the tree lines of the sidebar are centered under the folder arrows and a little more visible.

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

[Unreleased]: https://github.com/ivanerricis/easytask-tauri/compare/v0.11.0...HEAD
[0.11.0]: https://github.com/ivanerricis/easytask-tauri/compare/v0.10.1...v0.11.0
[0.10.1]: https://github.com/ivanerricis/easytask-tauri/compare/v0.10.0...v0.10.1
[0.10.0]: https://github.com/ivanerricis/easytask-tauri/compare/v0.9.1...v0.10.0
[0.9.1]: https://github.com/ivanerricis/easytask-tauri/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/ivanerricis/easytask-tauri/compare/v0.8.1...v0.9.0
[0.8.1]: https://github.com/ivanerricis/easytask-tauri/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/ivanerricis/easytask-tauri/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/ivanerricis/easytask-tauri/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/ivanerricis/easytask-tauri/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/ivanerricis/easytask-tauri/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/ivanerricis/easytask-tauri/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/ivanerricis/easytask-tauri/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ivanerricis/easytask-tauri/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ivanerricis/easytask-tauri/releases/tag/v0.1.0
