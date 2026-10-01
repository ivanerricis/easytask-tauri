import { createContext } from "react"
import type { NoteDataTree } from "@/types/types"
import type { NoteOptimisticActions } from "./note-optimistic"

export type ActiveNoteContextType = {
    /** Data of the active note (null while it is loaded for the first time, or without active note). */
    noteDataTree: NoteDataTree | null
}

export type ActiveNoteActionsType = NoteOptimisticActions & {
    /** Reloads the data of the active note from the database (rejects if the query fails). */
    refreshActiveNote: () => Promise<void>
    /** Reloads the data of an open note from the database and updates its cache entry (rejects if the query fails). */
    getNoteData: (noteId: number) => Promise<void>
    /** Replaces the cached data of the active note (optimistic updates). */
    setNoteDataTree: (tree: NoteDataTree | null) => void
    /** The cached data of the active note right now (not the render snapshot), null without active note or cached data. */
    getNoteTree: () => NoteDataTree | null
}

export const ActiveNoteContext = createContext<ActiveNoteContextType | null>(null)
export const ActiveNoteActionsContext = createContext<ActiveNoteActionsType | null>(null)
