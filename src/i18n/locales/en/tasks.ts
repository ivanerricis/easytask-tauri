import type { Translation } from "../it"

export const tasks: Translation["tasks"] = {
    subtaskProgress: "{{done}} of {{total}} subtasks completed",
    subtaskProgressHidden: "{{done}} of {{total}} subtasks completed (subtasks hidden)",
    hiddenCompleted_one: "{{count}} completed task hidden",
    hiddenCompleted_other: "{{count}} completed tasks hidden",
    errors: {
        createSubtask: "Could not create the subtask",
        createTask: "Could not create the task",
        priority: "Could not change the priority",
        update: "Could not change the task: {{message}}",
        rename: "Could not change the task text: {{message}}",
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
    placeholder: "New task…",
    insertLine: {
        insertHere: "Add a task here",
        label: "New task",
        placeholder: "New task…",
    },
    menu: {
        collapseSubtasks: "Collapse subtasks",
        expandSubtasks: "Expand subtasks",
        addDescription: "Add description",
        removeDescription: "Remove description",
        addPriority: "Add priority",
        removePriority: "Remove priority",
    },
    selection: {
        delete: "Delete {{count}} tasks",
        archive: "Archive {{count}} tasks",
        count_one: "{{count}} selected",
        count_other: "{{count}} selected",
        color: "Color",
        move: "Move to…",
        directTasks: "Direct tasks",
        deleteDescription_one: "{{count}} task will be moved to the trash along with its subtasks. You can restore it later.",
        deleteDescription_other: "{{count}} tasks will be moved to the trash along with their subtasks. You can restore them later.",
        deleteConfirm: "Move {{count}} tasks to the trash",
        deleteError: "Could not move all the tasks to the trash ({{done}} of {{total}} moved): {{message}}",
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
    namesTitle: "Import",
    namesDescription: "Check the names before importing: you can change them.",
    names: {
        workspace: "Workspace name",
        folder: "Folder name",
        note: "Note name",
    },
    importAction: "Import",
}

export const duplicate: Translation["duplicate"] = {
    suffix: "copy",
    noteDone: "Note duplicated",
    sectionDone: "Section duplicated",
}
