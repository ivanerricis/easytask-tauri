import { useContext } from "react"
import { ActiveNoteActionsContext, ActiveNoteContext } from "./active-note-context-object"

/**
 * The data of the active note.
 * @category ActiveNote Context
 */
export const useActiveNote = () => {
    const context = useContext(ActiveNoteContext)
    if (!context) throw new Error("useActiveNote must be used within an ActiveNoteProvider")
    return context
}

/**
 * The stable actions on the active note (their identity never changes).
 * @category ActiveNote Context
 */
export const useActiveNoteActions = () => {
    const context = useContext(ActiveNoteActionsContext)
    if (!context) throw new Error("useActiveNoteActions must be used within an ActiveNoteProvider")
    return context
}
