import type { Folder, Group, Note, NoteDataTree, Section, Task } from "@/types/types"

/**
 * Builds a tree structure for the workspace, organizing folders and notes.
 * @param folders The list of folders to include in the tree.
 * @param notes The list of notes to include in the tree.
 * @returns The root folders and notes for the workspace.
 * @category WorkspaceData Context
 */
export function buildWorkspaceTree(folders: Folder[], notes: Note[]) {
    const folderMap = new Map<number, Folder>()

    folders.forEach(folder => {
        folder.subfolders = []
        folder.notes = []
        folderMap.set(folder.id, folder)
    })

    folders.forEach(folder => {
        if (folder.folderID != null) {
            const parent = folderMap.get(folder.folderID)
            if (parent) {
                parent.subfolders.push(folder)
            }
        }
    })

    notes.forEach(note => {
        if (note.folderID != null) {
            const parent = folderMap.get(note.folderID)
            if (parent) {
                parent.notes.push(note)
            }
        }
    })

    const rootFolders = folders.filter(folder => folder.folderID == null)
    const rootNotes = notes.filter(note => note.folderID == null)

    return {
        rootFolders,
        rootNotes
    }
}

/**
 * Builds a tree structure for a note, organizing groups, sections, and tasks.
 * The input arrays are expected in position order (getDBNoteData sorts them), which the tree preserves.
 * @param groups The list of groups to include in the note tree.
 * @param sections The list of sections to include in the note tree.
 * @param tasks The list of tasks to include in the note tree.
 * @returns The structured note data tree.
 * @category WorkspaceData Context
 */
export function buildNoteTree(groups: Group[], sections: Section[], tasks: Task[]): NoteDataTree {
    // Grouped once (O(n)), the insertion order keeps the position order of the input
    const sectionsByGroup = new Map<number, Section[]>()
    for (const section of sections) {
        const list = sectionsByGroup.get(section.groupID)
        if (list) list.push(section)
        else sectionsByGroup.set(section.groupID, [section])
    }

    const rootTasksBySection = new Map<number, Task[]>()
    const childrenByTask = new Map<number, Task[]>()
    for (const task of tasks) {
        if (task.taskID === null) {
            if (task.sectionID == null) continue
            const list = rootTasksBySection.get(task.sectionID)
            if (list) list.push(task)
            else rootTasksBySection.set(task.sectionID, [task])
        } else if (task.taskID != null) {
            const list = childrenByTask.get(task.taskID)
            if (list) list.push(task)
            else childrenByTask.set(task.taskID, [task])
        }
    }

    function buildTasks(list: Task[] | undefined): Task[] {
        return (list ?? []).map(task => ({
            ...task,
            subtasks: buildTasks(childrenByTask.get(task.id)),
        }))
    }

    return {
        groups: groups.map(group => ({
            ...group,
            sections: (sectionsByGroup.get(group.id) ?? []).map(section => ({
                ...section,
                tasks: buildTasks(rootTasksBySection.get(section.id)),
            })),
        })),
    }
}
