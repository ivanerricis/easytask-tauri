import { createContext } from "react"
import type { UndoRecorder } from "./commands"
import type { UndoSnapshot } from "./stack"

export type UndoContextType = UndoSnapshot & {
    /** Undoes the last action (a toast tells the outcome); resolves once it is done. Never rejects. */
    undo: () => Promise<void>
    /** Redoes the last undone action. Never rejects. */
    redo: () => Promise<void>
    /** Records the actions as they are done by the user. Stable: it never changes identity. */
    recorder: UndoRecorder
}

export const UndoContext = createContext<UndoContextType | null>(null)
