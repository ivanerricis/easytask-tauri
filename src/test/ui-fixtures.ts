import type { Group, Note, Section, Task, Workspace } from "@/types/types"

const dates = {
    creation_date: "2026-01-01",
    creation_time: "10:00:00",
    edit_date: "2026-01-01",
    edit_time: "10:00:00",
}

export const makeWorkspace = (over: Partial<Workspace> = {}): Workspace => ({
    id: 1,
    name: "Workspace 1",
    ...dates,
    ...over,
})

export const makeNote = (over: Partial<Note> = {}): Note => ({
    id: 1,
    workspaceID: 1,
    folderID: null,
    name: "Note 1",
    position: 0,
    groups: [],
    ...dates,
    ...over,
})

export const makeGroup = (over: Partial<Group> = {}): Group => ({
    id: 1,
    noteID: 1,
    position: 0,
    sections: [],
    ...over,
})

export const makeSection = (over: Partial<Section> = {}): Section => ({
    id: 1,
    groupID: 1,
    title: "Section 1",
    position: 0,
    archived: false,
    tasks: [],
    ...dates,
    ...over,
})

export const makeTask = (over: Partial<Task> = {}): Task => ({
    id: 1,
    sectionID: 1,
    taskID: null,
    position: 0,
    text: "Task 1",
    completed: false,
    archived: false,
    priority: false,
    description: "",
    subtasks: [],
    ...dates,
    ...over,
})
