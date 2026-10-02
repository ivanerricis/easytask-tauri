# Changelog

All notable changes to EasyTask are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Subtasks hang from tree guide lines under the checkbox of their parent (no more stepped separators), with a slightly smaller checkbox, and a task with subtasks shows how many are done (e.g. `1/3`).
- Settings > Notes has a switch to show or hide the number of completed subtasks of a task.
- Group names are always shown in full on one line: the group grows to fit the name instead of truncating it.
- New versions are announced in a dialog at startup (what's new, "Update now", "Later", "Skip this version") instead of a toast that disappeared after 15 seconds.

### Fixed

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

[Unreleased]: https://github.com/ivanerricis/easytask-tauri/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/ivanerricis/easytask-tauri/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ivanerricis/easytask-tauri/releases/tag/v0.1.0
