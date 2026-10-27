import { useCallback } from "react"
import { useActiveNoteActions } from "@/contexts/use-active-note"
import { usePreferences } from "@/contexts/use-preferences"
import { useNoteMoves } from "./note-dnd-state"
import { getTaskStep, type Step } from "./note-steps"

/**
 * One step of a task among its siblings, for the keyboard (Alt+Up / Alt+Down). Reads the tree lazily when called, so the
 * list does not re-render with every change of the note. Resolves to whether the task moved (false at the edge of the list).
 */
export function useTaskStepMove(taskId: number): (step: Step) => Promise<boolean> {
    const { getNoteTree } = useActiveNoteActions()
    const { hideCompletedTasks } = usePreferences()
    const { moveTaskTo } = useNoteMoves()
    return useCallback(async (step: Step) => {
        const tree = getNoteTree()
        const target = tree ? getTaskStep(tree, taskId, step, hideCompletedTasks) : null
        if (!target) return false
        await moveTaskTo(taskId, target)
        return true
    }, [getNoteTree, hideCompletedTasks, moveTaskTo, taskId])
}
