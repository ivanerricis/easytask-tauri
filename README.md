# EasyTask

An **advanced todo list** based on **Workspaces**, inspired by systems like Notion, Obsidian, and task management apps.

Each Workspace is fully customizable and supports hierarchical management of elements with the ability to color any object.

---

## Key Features

- ✅ Create and manage **Workspaces**  
- ✅ Each Workspace can contain **Folders** and **Files**  
- ✅ Folders can be nested (infinite tree structure)  
- ✅ Files contain **Sections**  
- ✅ Sections can contain other Sections and **Tasks**  
- ✅ Tasks can contain sub-Tasks (infinite nesting)  
- ✅ Each element can be customized with **colors**  
- ✅ Drag & Drop between elements  
- ✅ Modern UI (React + Tailwind CSS + shadcn/ui)  

---

## Technologies Used

- **Tauri**
- **React** + **TypeScript**
- **Vite**
- **Tailwind CSS**
- **shadcn/ui**
- **@hello-pangea/dnd** for drag & drop functionality
- **ESLint** with TypeScript and React configurations

---

## Local Installation


# 1. Clone the repository
```bash
git clone https://github.com/ivanerricis/easytask-tauri.
```


# 2. Navigate to the project directory
```bash
cd your-repo
```

# 3. Install dependencies
```bash
npm install
```

# 4. Start the development server
```bash
npm run dev
```
---

## App Structure

```
Workspace
 ├── Folder
 │    ├── Folder
 │    └── File
 │         └── Sections
 │              ├── Sub-sections
 │              └── Tasks
 │                   └── Sub-tasks
 └── File
      └── Sections
```

---

## Customization
Each element can be:

- Colored with custom colors

- Reordered via drag & drop

- Collapsed/expanded for easier navigation