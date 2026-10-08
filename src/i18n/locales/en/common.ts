import type { Translation } from "../it"

export const common: Translation["common"] = {
    cancel: "Cancel",
    delete: "Delete",
    save: "Save",
    rename: "Rename",
    system: "System",
    close: "Close",
    loading: "Loading…",
    noResults: "No results",
    counts: {
        group_one: "{{count}} group",
        group_other: "{{count}} groups",
        section_one: "{{count}} section",
        section_other: "{{count}} sections",
        task_one: "{{count}} task",
        task_other: "{{count}} tasks",
    },
    openMenu: "Open menu",
    workspaceRoot: "Workspace root",
    name: "Name",
    addColor: "Add color",
    closePalette: "Close the palette",
    creationDate: "Created: {{date}} {{time}}",
    editDate: "Modified: {{date}} {{time}}",
    add: "Add",
}

export const ui: Translation["ui"] = {
    commandTitle: "Command Palette",
    commandDescription: "Search for a command to run…",
}

export const layout: Translation["layout"] = {
    resizeSidebar: "Resize the sidebar",
    resizeValue: "{{width}} pixels",
    showSidebar: "Show the sidebar",
    hideSidebar: "Hide the sidebar",
}

export const dnd: Translation["dnd"] = {
    unknownItem: "item",
    instructions: {
        keyboard: "To move the item press Space, then use the arrow keys to pick the position and press Space again to drop it. Press Esc to cancel.",
        pointer: "Drag the item with the mouse, or use the \"Move to…\" menu to move it with the keyboard.",
    },
    start: "Picked up {{name}}.",
    over: "{{name}} is over {{target}}.",
    overNone: "{{name}} is not over a valid target.",
    end: "{{name}} was dropped on {{target}}.",
    endNone: "{{name}} was dropped outside a valid target.",
    cancel: "Moving {{name}} cancelled.",
    audioPlayer: "Audio player",
}
