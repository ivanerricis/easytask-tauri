# EasyTask

[![CI](https://github.com/ivanerricis/easytask-tauri/actions/workflows/ci.yml/badge.svg)](https://github.com/ivanerricis/easytask-tauri/actions/workflows/ci.yml)

An **advanced todo list** based on **Workspaces**, inspired by systems like Notion, Obsidian, Trello and task management apps.

Each Workspace is fully customizable and supports hierarchical management of elements with the ability to color any object.

---

## Key Features

- ✅ Create and manage **Workspaces**  
- ✅ Each Workspace can contain **Folders** and **Notes**  
- ✅ Folders can be nested (infinite tree structure)  
- ✅ Notes contain **Sections**  
- ✅ Sections can contain **Tasks**  
- ✅ Tasks can contain sub-Tasks (infinite nesting)  
- ✅ Each element can be customized with **colors**  
- ✅ Drag & Drop between elements  
- ✅ Modern UI (React + Tailwind CSS + shadcn/ui)  

---

## Technologies Used

- [Tauri](https://v2.tauri.app/)
- [React](https://react.dev/) + **TypeScript**
- [Vite](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn](https://ui.shadcn.com/)
- [@hello-pangea/dnd](https://dnd.hellopangea.com/?path=/docs/welcome--docs) and [@dnd-kit](https://dndkit.com/) for drag & drop functionality
- [ESLint](https://eslint.org/) with TypeScript and React configurations

---

## Local Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [Rust](https://www.rust-lang.org/tools/install) via `rustup`
- On Windows: MSVC C++ build tools and WebView2 (see the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/))

### Setup

```bash
git clone https://github.com/ivanerricis/easytask-tauri
cd easytask-tauri
npm install
```

### Development

```bash
npm run tauri:dev
```

### Build

```bash
npm run tauri:build
```

### Data

Data is stored in a local SQLite database inside the `Documents/EasyTask` folder.

---

## Testing

Unit tests run with [Vitest](https://vitest.dev/):

```bash
npm test
```

To generate a coverage report:

```bash
npm run test:coverage
```

---

## App Structure

```
Workspace
 ├── Folder
 │    ├── Folder
 │    └── Notes
 │         └── Sections
 │              └── Tasks
 │                   └── Sub-tasks
 └── Notes
      └── Sections
```

---

## Customization
Each element can be:

- Colored with custom colors

- Reordered via drag & drop

- Collapsed/expanded for easier navigation