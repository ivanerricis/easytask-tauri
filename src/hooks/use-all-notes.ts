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
        const map = new Map<number, NoteWithPath>()
        notes?.forEach(note => map.set(note.id, { note, path: "" }))
        const walk = (list: Folder[], parentPath: string) => list.forEach(folder => {
            const path = parentPath ? `${parentPath} / ${folder.name}` : folder.name
            folder.notes.forEach(note => map.set(note.id, { note, path }))
            walk(folder.subfolders ?? [], path)
        })
        walk(folders ?? [], "")
        return Array.from(map.values())
    }, [notes, folders])
}
