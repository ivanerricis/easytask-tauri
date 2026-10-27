import { createContext, useContext } from "react"
import type { Step } from "../note-steps"

export type TaskTreeValue = {
    /** One step of a task among its siblings; resolves to whether it moved. */
    move: (taskId: number, step: Step) => Promise<boolean>
    /** Tells where a moved task ended up (or that it cannot move): the texts live here, once per list, not in every row. */
    announceMoved: (position: number, total: number) => void
    announceCannotMove: () => void
}

export const TaskTreeContext = createContext<TaskTreeValue | null>(null)

/** The tree of the enclosing task list (null for a task rendered alone). */
export const useTaskTree = () => useContext(TaskTreeContext)