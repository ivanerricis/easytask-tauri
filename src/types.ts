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
    workspaceId: number | null
    folderId: number | null
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
    workspaceId: number | null
    folderId: number | null
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
    noteId: number
    position: number
    sections: Section[]
}

export type Section = {
    id: number
    groupId: number
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
    sectionId: number | null
    taskId: number | null
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