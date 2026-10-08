import type { Translation } from "../it"

export const home: Translation["home"] = {
    loading: "Loading Workspaces…",
    welcome: "Welcome back!",
    import: "Import a Workspace",
    recent: "Open a recent Workspace:",
    viewGrid: "View as grid",
    viewList: "View as list",
    sort: {
        label: "Sort",
        by: "Sort by",
        direction: "Direction",
        edited: "Last edited",
        created: "Creation date",
        name: "Name",
        nameAsc: "A to Z",
        nameDesc: "Z to A",
        dateAsc: "Oldest first",
        dateDesc: "Newest first",
    },
    createWorkspace: {
        title: "Create Workspace",
        name: "Name",
        open: "Create a new Workspace",
    },
    workspace: {
        open: "Open the workspace {{name}}",
        createdOn: "Created on: {{date}} - {{time}}",
        editedOn: "Edited on: {{date}} - {{time}}",
    },
    noWorkspaces: "No workspace found",
}

export const workspace: Translation["workspace"] = {
    loading: "Loading Workspace data…",
    combobox: {
        select: "Select Workspace…",
        search: "Search a Workspace…",
        empty: "No Workspace found.",
    },
    backHome: "Back to Home",
}

export const notes: Translation["notes"] = {
    blank: {
        title: "No open notes",
    },
    hints: {
        allShortcuts: "All shortcuts",
        newGroup: "New group or section",
        search: "Search a note",
    },
    empty: {
        title: "Empty note",
    },
    closeAll: "Close all notes",
    search: {
        placeholder: "Search a note…",
        empty: "No results.",
        suggestions: "Suggestions",
        short: "Search…",
    },
    hideCompleted: "Hide completed tasks",
    closeCurrent: "Close current note",
    close: "Close note",
}

export const groups: Translation["groups"] = {
    defaultLabel: "Group {{index}}",
    collapse: "Collapse group",
    expand: "Expand group",
    nameLabel: "Group name",
    renameError: "Could not change the group name - {{message}}",
    namePlaceholder: "Group name (optional)…",
}

export const sidebar: Translation["sidebar"] = {
    addFolder: "Create a folder",
    addNote: "Create a note",
    addNoteFromTemplate: "Create a note from a template",
    importItems: "Import a note or folder",
    trashBadge_one: "{{count}} item in the trash",
    trashBadge_other: "{{count}} items in the trash",
    archiveBadge_one: "{{count}} item in the archive",
    archiveBadge_other: "{{count}} items in the archive",
    addAudioFirstGroup: "Add audio files to the first group of the note",
    expandAll: "Expand all folders",
    collapseAll: "Collapse all folders",
    info: {
        description: "Description",
        placeholder: "Write something to describe the task…",
    },
    toggle: "Show or hide the sidebar",
    emptyTree: "No folders or files",
}

export const templates: Translation["templates"] = {
    badge_one: "{{count}} template",
    badge_other: "{{count}} templates",
}

export const sections: Translation["sections"] = {
    new: "New section",
    titlePlaceholder: "Section title…",
    titleLabel: "Section title",
    renameError: "Could not change the section title - {{message}}",
    collapse: "Collapse section",
    expand: "Expand section",
}
