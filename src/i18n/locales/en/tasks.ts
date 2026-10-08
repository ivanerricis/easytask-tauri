import type { Translation } from "../it"

export const tasks: Translation["tasks"] = {
    subtaskProgress: "{{done}} of {{total}} subtasks completed",
    hiddenCompleted_one: "{{count}} completed task hidden",
    hiddenCompleted_other: "{{count}} completed tasks hidden",
    errors: {
        createSubtask: "Error while creating the subtask",
        createTask: "Error while creating the task",
        priority: "Could not change the priority",
        update: "Could not change the task - {{message}}",
        rename: "Could not change the task text - {{message}}",
    },
    descriptionDialog: {
        title: "Task description",
        label: "Description",
        placeholder: "Write something to describe the task…",
        hint: "Ctrl + Enter to save",
    },
    newSubtaskPlaceholder: "New subtask…",
    newSubtask: "New subtask",
    addSubtask: "Add subtask",
    add: "Add task",
    placeholder: "Write something…",
    menu: {
        addDescription: "Add description",
        removeDescription: "Remove description",
        addPriority: "Add priority",
        removePriority: "Remove priority",
    },
    editText: "Edit the task text",
    toggleCompleted: "Mark as completed: {{text}}",
    showDescription: "Show the description",
}

export const transfer: Translation["transfer"] = {
    exported: "Workspace exported",
    imported: "Workspace imported",
    importedSkipped_one: "Workspace imported · {{count}} audio file skipped",
    importedSkipped_other: "Workspace imported · {{count}} audio files skipped",
    exportedItem: "Exported",
    importedItems: "Imported",
    importedItemsSkipped_one: "Imported · {{count}} audio file skipped",
    importedItemsSkipped_other: "Imported · {{count}} audio files skipped",
    itemsFileName_one: "{{count}} item",
    itemsFileName_other: "{{count}} items",
}

export const duplicate: Translation["duplicate"] = {
    suffix: "copy",
    noteDone: "Note duplicated",
    sectionDone: "Section duplicated",
}
