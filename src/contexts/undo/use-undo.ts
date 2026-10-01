import { useContext } from "react"
import { NOOP_RECORDER, type UndoRecorder } from "./commands"
import { UndoContext } from "./context"

/**
 * The undo/redo history of the open workspace: state (can undo/redo and their labels) and the undo/redo actions.
 * @category Undo
 */
export const useUndo = () => {
    const context = useContext(UndoContext)
    if (!context) throw new Error("useUndo must be used within an UndoProvider")
    return context
}

/** Like useUndo, but null outside an UndoProvider (menus then simply do not offer undo/redo). */
export const useOptionalUndo = () => useContext(UndoContext)

/**
 * Records user actions in the undo history. Outside an UndoProvider it does nothing, so the components that
 * record actions also work in isolation.
 * @category Undo
 */
export const useUndoRecorder = (): UndoRecorder => useContext(UndoContext)?.recorder ?? NOOP_RECORDER
