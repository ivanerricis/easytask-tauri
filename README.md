# EasyTask

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
- [hello-pangea/dnd](https://dnd.hellopangea.com/?path=/docs/welcome--docs) for drag & drop functionality
- [ESLint](https://eslint.org/) with TypeScript and React configurations

---

## Local Installation


# 1. Clone the repository
```bash
git clone https://github.com/ivanerricis/easytask-tauri.
```


# 2. Navigate to the project directory
```bash
cd easytask-tauri
```

# 3. Install dependencies
```bash
npm install
```

# 4. Start the development server
```bash
npm run tauri dev
```
Make sure you have Rust and Tauri prerequisites installed on your system.
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