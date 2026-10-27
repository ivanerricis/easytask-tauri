import { useCallback, type KeyboardEvent } from "react"
import { useTranslation } from "react-i18next"
import type { Step } from "../note-steps"
import { announce } from "./note-announcer-store"
import { readTaskRows, siblingPosition } from "./task-key-rows"
import { taskKeyAction } from "./task-keyboard"
import { useTaskTree } from "./task-tree-context"

type RowKeysOptions = {
    taskId: number
    subtasksOpen: boolean
    onToggleSubtasks: () => void
    /** Space: completes / reopens the task. */
    onToggleCompleted: () => void
    /** Enter: starts the inline rename. */
    onRename: () => void
}

const rowOf = (id: number | string) => document.querySelector<HTMLElement>(`[role='treeitem'][data-task-id="${id}"]`)

/** Focuses a row that may not be drawn yet (a moved task is drawn again in its new place) and tells where it ended up. */
function focusMoved(taskId: number, message: (position: number, total: number) => string, triesLeft = 20) {
    const row = rowOf(taskId)
    const tree = row?.closest("[role='tree']")
    if (!row || !tree) {
        if (triesLeft > 0) requestAnimationFrame(() => focusMoved(taskId, message, triesLeft - 1))
        return
    }
    // Moving a node in the DOM can drop its focus
    row.focus()
    const place = siblingPosition(readTaskRows(tree), String(taskId))
    if (place) announce(message(place.position, place.total))
}

/**
 * Keydown of a task row (only when the focus is on the row itself, not on a field, button or menu inside it): the arrows
 * move between the rows of the list, Left / Right close / open the subtasks, Space completes, Enter renames, Shift+F10 or
 * the menu key open the menu and Alt+Up / Alt+Down move the task one step.
 */
export function useTaskRowKeys({ taskId, subtasksOpen, onToggleSubtasks, onToggleCompleted, onRename }: RowKeysOptions) {
    const { t } = useTranslation()
    const tree = useTaskTree()

    return useCallback((event: KeyboardEvent<HTMLElement>) => {
        if (event.target !== event.currentTarget) return
        const row = event.currentTarget
        const list = row.closest("[role='tree']")
        if (!list) return
        const action = taskKeyAction(readTaskRows(list), String(taskId), event)
        if (!action) return
        event.preventDefault()

        switch (action.type) {
            case "focus":
            case "focusFirstChild":
            case "focusParent":
                rowOf(action.key)?.focus()
                break
            case "expand":
                if (!subtasksOpen) onToggleSubtasks()
                break
            case "collapse":
                if (subtasksOpen) onToggleSubtasks()
                break
            case "toggle":
                onToggleCompleted()
                break
            case "rename":
                onRename()
                break
            case "menu": {
                // The menu opens where a right click would: at the start of the row
                const box = row.getBoundingClientRect()
                row.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, clientX: box.left + 16, clientY: box.top + box.height / 2 }))
                break
            }
            case "move": {
                const step: Step = action.step
                void (async () => {
                    // A failed write is reported (and rolled back) by the move itself
                    const moved = tree ? await tree.move(taskId, step).catch(() => null) : false
                    if (moved === null) return
                    if (moved) focusMoved(taskId, (position, total) => t("tasks.keyboard.moved", { position, total }))
                    else announce(t("tasks.keyboard.cannotMove"))
                })()
                break
            }
        }
    }, [taskId, subtasksOpen, onToggleSubtasks, onToggleCompleted, onRename, tree, t])
}
