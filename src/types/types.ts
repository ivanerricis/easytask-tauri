export type Workspace = {
    id: number
    name: string
    color?: string
    creation_date: string
    creation_time: string
    edit_date: string
    edit_time: string
    deleted_at?: string | null
}

export type Folder = {
    id: number
    workspaceID: number | null
    folderID: number | null
    name: string
    position: number
    creation_date: string
    creation_time: string
    edit_date: string
    edit_time: string
    deleted_at?: string | null
    color?: string
    subfolders: Folder[]
    notes: Note[]
}


export type Note = {
    id: number
    workspaceID: number | null
    folderID: number | null
    name: string
    position: number
    creation_date: string
    creation_time: string
    edit_date: string
    edit_time: string
    deleted_at?: string | null
    color?: string
    groups: Group[]
}

export type Group = {
    id: number
    noteID: number
    position: number
    sections: Section[]
}

export type Section = {
    id: number
    groupID: number
    title: string
    position: number
    creation_date: string
    creation_time: string
    edit_date: string
    edit_time: string
    deleted_at?: string | null
    color?: string | null
    archived: boolean
    tasks: Task[]
}

export type Task = {
    id: number
    sectionID: number | null
    taskID: number | null
    position: number
    creation_date: string
    creation_time: string
    edit_date: string
    edit_time: string
    deleted_at?: string | null
    color?: string | null
    text: string
    completed: boolean
    archived: boolean
    priority: boolean
    description: string
    subtasks: Task[]
}

/**
 * An item moved to the trash, as returned by getDBTrash.
 * `context` is the parent folder name or "Nota X › Sezione Y", empty string for root items.
 */
export type TrashItem = {
    type: "workspace" | "folder" | "note" | "section_group" | "section" | "task"
    id: number
    name: string
    context: string
    deleted_at: string
}

export type WorkspaceDataTree = {
    rootFolders: Folder[]
    rootNotes: Note[]
}

export type NoteDataTree = {
    groups: Group[]
}

export type AudioPlayerPosition = {
    x: number,
    y: number,
    scaleX: number,
    scaleY: number
}