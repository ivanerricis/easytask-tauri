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
    /** Optional name of the group; null/undefined = unnamed (shown as "Gruppo N"). */
    name?: string | null
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
 * `summary` describes what the item contained ("2 gruppi · 3 sezioni · 5 task"), empty when there is nothing to say.
 */
export type TrashItem = {
    type: "workspace" | "folder" | "note" | "section_group" | "section" | "task" | "audio_file" | "note_template"
    id: number
    name: string
    context: string
    summary: string
    deleted_at: string
}

/** A trashed workspace with the summary of what it contains (see TrashItem.summary). */
export type TrashedWorkspace = Workspace & { summary: string }

export type WorkspaceDataTree = {
    rootFolders: Folder[]
    rootNotes: Note[]
}

export type NoteDataTree = {
    groups: Group[]
}

/**
 * An audio file attached to a group. Only its path is stored: the file itself stays where the user keeps it.
 */
export type AudioFile = {
    id: number
    section_groupID: number
    name: string
    path: string
    position: number
    creation_date: string
    creation_time: string
}

export type AudioPlayerPosition = {
    x: number,
    y: number,
    scaleX: number,
    scaleY: number
}