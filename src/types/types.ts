export type Workspace = {
    id: number
    name: string
    color?: string
    creation_date: string
    creation_time: string
    edit_date: string
    edit_time: string
}

export type Folder = {
    id: number
    workspaceID: number | null
    folderID: number | null
    name: string
    creation_date: string
    creation_time: string
    edit_date: string
    edit_time: string
    color?: string
    subfolders: Folder[]
    notes: Note[]
}


export type Note = {
    id: number
    workspaceID: number | null
    folderID: number | null
    name: string
    creation_date: string
    creation_time: string
    edit_date: string
    edit_time: string
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
    creation_date: string
    creation_time: string
    edit_date: string
    edit_time: string
    color?: string | null
    isArchived: boolean
    tasks: Task[]
}

export type Task = {
    id: number
    sectionID: number | null
    taskID: number | null
    creation_date: string
    creation_time: string
    edit_date: string
    edit_time: string
    color?: string | null
    text: string
    completed: boolean
    isArchived: boolean
    priority: boolean
    description: string
    subtasks: Task[]
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