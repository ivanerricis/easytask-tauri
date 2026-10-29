# EasyTask

[![CI](https://github.com/ivanerricis/easytask-tauri/actions/workflows/ci.yml/badge.svg)](https://github.com/ivanerricis/easytask-tauri/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/ivanerricis/easytask-tauri/graph/badge.svg)](https://codecov.io/gh/ivanerricis/easytask-tauri)
[![Release](https://img.shields.io/github/v/release/ivanerricis/easytask-tauri)](https://github.com/ivanerricis/easytask-tauri/releases/latest)
[![License: MIT](https://img.shields.io/github/license/ivanerricis/easytask-tauri)](LICENSE)

An **advanced todo list** based on **Workspaces**, inspired by tools like Notion, Obsidian and Trello.
Each Workspace is fully customizable and supports hierarchical management of elements, with the ability to color any object.
Everything is stored locally on your computer.

**Documentation:** [ivanerricis.github.io/easytask-tauri](https://ivanerricis.github.io/easytask-tauri/) (English) · [in italiano](https://ivanerricis.github.io/easytask-tauri/it/). In the app, press `F1` or open **Help > Documentation**.

---

## Key Features

- **Workspaces**, each with its own **Folders** (nestable without limit) and **Notes**
- Notes contain **Groups** of **Sections**; sections contain **Tasks**, and tasks can contain sub-tasks (unlimited nesting). Groups and sections can be left without a name
- **Rename in place**: click a name (or use Rename in its menu, or press Enter on it) and type; no dialog
- **Colors** on any element
- **Drag & drop** to reorder and move elements
- **Trash**: deleted workspaces and deleted items (folders, notes, groups, sections, tasks, audio files, templates) go to the trash, where you can restore them or delete them permanently
- **Archive**: archive folders, notes, groups, sections and tasks to hide them without deleting them; restore them from the archive
- **Automations**: per-note rules that act on tasks and groups by themselves when something happens (e.g. a task is completed)
- **Templates**: save a note as a template and create new notes from it; edit a template like a normal note, in its own tab
- **Tasks with the keyboard**: move between tasks with the arrow keys, `Space` completes, `Enter` renames, `Alt+Up` / `Alt+Down` move, `Shift+Up` / `Shift+Down` select several; a thin "+" line between two tasks adds one in that place
- **Duplicate** a note (with all its content, audio files excluded) or a section (with its tasks) from its menu; the copy is named "... (copy)" and undoable
- **Audio**: attach audio files to a note and play them in the app; the player can be pinned, repeat a track, resume where you left off, and remembers the playback speed
- **Undo / redo** with `Ctrl+Z` / `Ctrl+Y` (`Ctrl+Shift+Z` also redoes)
- **Split workspace**: open two notes side by side, each area with its own tabs; drag a tab from one bar to the other, or use "Open on the right" / "Open on the left" in the note menu
- **Search notes** with `Ctrl+K`
- **Customizable keyboard shortcuts** (Settings > Shortcuts); press `?` to see the list
- **Settings search**: type in the Settings dialog to find an option by its name
- **Italian and English** interface: choose the language in Settings, the default follows the system language
- **Light, dark or system theme**, accent color (with a contrast warning and a suggested color), color intensity, sidebar size and animation speed (normal, slow or off)
- **Text size and font**: scale the whole app from 12 to 24 px (`Ctrl+Plus`, `Ctrl+Minus`, `Ctrl+0`) and pick Inter, Lora, JetBrains Mono, Atkinson Hyperlegible or OpenDyslexic, bundled with the app
- **Task list options**: new tasks at the top or at the bottom, completed tasks at the bottom, list density, spell check on or off
- **Open at startup**: the home page, the last workspace, or always a workspace you choose
- **Window**: remember its position and size, keep it on top, turn hardware acceleration off if you see graphics problems
- **Start with Windows** and **close to the notification area** (Settings > System, both off by default)
- **Trash auto-empty**: optionally delete for good the items trashed more than a chosen number of days ago
- **Automatic backups** at startup with a chosen frequency and an optional folder of your choice (5 kept by default), manual backups and one-click restore; a separate copy is kept before every database update (the last 10)
- **Export / import** a workspace as an `.easytask.json` file
- **Update check** at startup (can be turned off) and from Settings > About

Default shortcuts (all but the fixed ones can be changed in Settings > Shortcuts):

| Shortcut | Action |
| --- | --- |
| `Ctrl+N` | New note (new workspace on the home page) |
| `Ctrl+M` | New folder |
| `Alt+N` | New group |
| `Ctrl+K` | Search notes |
| `Ctrl+L` / `Ctrl+T` | Close the current note / close all notes |
| `Ctrl+PageDown` / `Ctrl+PageUp` | Next / previous open note (also `Ctrl+Tab` / `Ctrl+Shift+Tab`) |
| `Ctrl+\` | Split into two areas / close the split |
| `Ctrl+Alt+→` (also `Ctrl+Alt+←`) | Move the active note to the other area |
| `Ctrl+Alt+\` | Move the focus to the other area |
| `Ctrl+Plus` / `Ctrl+Minus` / `Ctrl+0` | Make the text bigger / smaller / back to the normal size |
| `Ctrl+B` | Toggle the sidebar |
| `Ctrl+Shift+B` | Toggle the right sidebar |
| `Ctrl+Shift+H` | Hide / show completed tasks |
| `Alt+P` | Play / pause the audio (while the player is open) |
| `Ctrl+H` | Go to the home page |
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo (not active while typing in a text field) |
| `F1` | Open the documentation |
| `?` | Show all the shortcuts |

---

## Installation (for users)

Download the latest build from the [Releases page](https://github.com/ivanerricis/easytask-tauri/releases).

| Platform | File | Notes |
| --- | --- | --- |
| Windows | Installer (NSIS, `.exe`) | Installs the app; the in-app updater can update it |
| Windows | `EasyTask_<version>_x64_portable.zip` | No installation: unzip and run `EasyTask.exe` |
| Linux | `.deb` | Debian/Ubuntu and derivatives |
| Linux | `.AppImage` | Already portable: make it executable and run it |

macOS builds are not provided.

**Windows SmartScreen.** The Windows binaries (the installer and the portable `EasyTask.exe`) are not code-signed yet,
so SmartScreen may show "Windows protected your PC" the first time you run them. This does not mean the file is harmful:
Windows only warns about programs from publishers it does not know.
To continue, click **More info** and then **Run anyway**. You can download the files only from the
[Releases page](https://github.com/ivanerricis/easytask-tauri/releases) of this repository. Code signing is planned.

**Portable version (Windows).** The zip contains `EasyTask.exe`, `portable.txt` and a short readme.
Requirements: 64-bit Windows 10/11 with the Microsoft Edge WebView2 Runtime (already included in Windows 11 and recent Windows 10).
While `portable.txt` sits next to the exe, all data lives in the `data` folder beside it, so you can keep the app on a USB drive.
To update, close the app and replace `EasyTask.exe` with the new one; the `data` folder is kept.
The portable app does not update itself: the update check shows a notice and a link to the Releases page.

### Updates

The installed app checks for a new version a few seconds after startup (can be disabled in Settings > About) and shows a notice;
from Settings > About you can check manually, then download, install and restart.
Updates are signed and verified before installation.

### Where your data is

| Mode | Location |
| --- | --- |
| Installed | `Documents/EasyTask` |
| Portable | `data` folder next to `EasyTask.exe` |
| Custom | the folder in the `EASYTASK_DATA_DIR` environment variable (mostly used by the e2e tests; it is portable mode only if `portable.txt` exists) |

The folder holds the SQLite database (`easytask.db`), settings, `backups/` and `logs/`.
Settings > Data has a button that opens it in the file manager, plus the backup, restore, export and import controls.

> **Database from an older version.** The database migrations were squashed into a single initial schema.
> A database file created before that change is not compatible: at startup the app stops with the message
> "Database di una versione precedente non compatibile" instead of touching it. To start over,
> close the app and delete `easytask.db` in the data folder (also `easytask.db-wal` and `easytask.db-shm` if present;
> the `easytask.backup-v*.db` copies are no longer created), then start the app again: a new empty database is created.
> This permanently deletes the data stored in the old database.

---

## Technologies Used

- [Tauri 2](https://v2.tauri.app/) (Rust backend, SQLite via `tauri-plugin-sql`)
- [React 19](https://react.dev/) + **TypeScript**
- [Vite](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com) and [shadcn/ui](https://ui.shadcn.com/) (Radix UI)
- [@dnd-kit](https://dndkit.com/) for drag & drop
- [i18next](https://www.i18next.com/) / react-i18next for localization
- [Vitest](https://vitest.dev/) and Testing Library for unit tests; [WebdriverIO](https://webdriver.io/) + `tauri-driver` for end-to-end tests
- [ESLint](https://eslint.org/) with TypeScript and React configurations

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS; CI uses 24)
- [Rust](https://www.rust-lang.org/tools/install) via `rustup`
- On Windows: MSVC C++ build tools and WebView2; on Linux: the WebKitGTK packages (see the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/))

### Setup and commands

```bash
git clone https://github.com/ivanerricis/easytask-tauri
cd easytask-tauri
npm install
```

| Command | What it does |
| --- | --- |
| `npm run tauri:dev` | Run the desktop app in development |
| `npm run build` | Type-check (`tsc -b`) and build the frontend |
| `npm run tauri:build` | Build the installers (NSIS, deb, AppImage) |
| `npm test` | Unit tests (Vitest) |
| `npm run test:coverage` | Unit tests with a coverage report |
| `npm run lint` | ESLint |
| `npm run e2e` | End-to-end tests (needs `tauri-driver`, see `e2e/wdio.conf.ts`) |
| `npm run release:check` | Check that the version files agree |
| `npm run docs:screenshots` | Regenerate the screenshots of the documentation site (`docs/screenshots/`) |

The documentation site is a [VitePress](https://vitepress.dev/) project in `docs/` with its own dependencies: `cd docs && npm install && npm run dev`. It is published to GitHub Pages by the `Docs` workflow on every push to `master` that touches `docs/`.

Coverage thresholds (enforced by `test:coverage`): 89% statements, 83% branches, 87% functions, 91% lines.

The e2e suite builds a debug app and runs it against a temporary data folder (`EASYTASK_DATA_DIR`), so it never touches your real data.

### Continuous integration

On pushes to `master` and on pull requests, GitHub Actions runs:

- version check (`package.json`, `Cargo.toml` and `tauri.conf.json` must agree)
- frontend: ESLint, TypeScript, tests, coverage (uploaded to [Codecov](https://codecov.io/gh/ivanerricis/easytask-tauri) for the badge, never blocking), build
- backend (Windows and Linux): `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test`
- audit (blocking): `npm audit` (high/critical, production dependencies), `cargo audit`, `cargo deny`
- e2e on Linux (**not blocking** for now); the Windows run starts manually (`workflow_dispatch`), because the hosted runner cannot attach the driver to the app, while the suite passes on a Windows machine (`npm run e2e`)

Releases are built by a separate workflow, see [RELEASING.md](RELEASING.md).

---

## App Structure

```
Workspace
 ├── Folders (nestable)
 │    └── Notes
 └── Notes
      └── Groups
           └── Sections
                └── Tasks
                     └── Sub-tasks (nestable)
```

---

## License

EasyTask is released under the [MIT License](LICENSE).
