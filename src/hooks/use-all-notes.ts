import { useMemo } from "react"
import { useWorkspaceState } from "@/contexts/workspace-data"
import type { Folder, Note } from "@/types/types"

/** A note with the path of the folders it is in ("" for a note at the root of the workspace). */
export type NoteWithPath = { note: Note, path: string }

/**
 * Every note of the open workspace once, with the path of its folder ("Progetti / Interni"), so that notes with the
 * same name can be told apart. Used by the note search and by the choice of the note to make a template from.
 * @category Hooks
 */
export function useAllNotes(): NoteWithPath[] {
    const { notes, folders } = useWorkspaceState()

    return useMemo(() => {
        // The folder list of the state is flat (subfolders included) and may also be nested: each folder is
        // collected once with its parent, then the path is built by walking up the parents
        const parents = new Map<number, { folder: Folder, parentId: number | null }>()
        const collect = (list: Folder[], parentId: number | null) => list.forEach(folder => {
            const known = parents.get(folder.id)
            parents.set(folder.id, { folder, parentId: folder.folderID ?? parentId ?? known?.parentId ?? null })
            collect(folder.subfolders ?? [], folder.id)
        })
        collect(folders ?? [], null)

        const paths = new Map<number, string>()
        const pathOf = (id: number, depth = 0): string => {
            const cached = paths.get(id)
            if (cached !== undefined) return cached
            const entry = parents.get(id)
            if (!entry) return ""
            // The depth guard stops a (corrupted) cycle of parents
            const parentPath = entry.parentId !== null && depth < 64 ? pathOf(entry.parentId, depth + 1) : ""
            const path = parentPath ? `${parentPath} / ${entry.folder.name}` : entry.folder.name
            paths.set(id, path)
            return path
        }

        const map = new Map<number, NoteWithPath>()
        notes?.forEach(note => map.set(note.id, { note, path: note.folderID ? pathOf(note.folderID) : "" }))
        parents.forEach(({ folder }) => folder.notes?.forEach(note => map.set(note.id, { note, path: pathOf(folder.id) })))
        return Array.from(map.values())
    }, [notes, folders])
}
