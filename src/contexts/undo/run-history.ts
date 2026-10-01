import i18n from "@/i18n"
import { toast } from "sonner"
import { reportError } from "@/lib/report-error"
import type { UndoHistory, UndoManyOutcome, UndoOutcome } from "./stack"

const TOAST_ID = "undo-redo"

/**
 * Undoes (or redoes) every action from the next one up to the entry `index` (0 = the next one) and tells the outcome with
 * one summary toast, with the button to go back (the same number of actions the other way). A failure is reported like
 * the single one; the actions applied before it are still summarized. Never rejects.
 * @category Undo
 */
export async function runHistoryTo(history: UndoHistory, direction: "undo" | "redo", index: number): Promise<void> {
    const outcome: UndoManyOutcome = await history[direction === "undo" ? "undoTo" : "redoTo"](index)
    const opposite = direction === "undo" ? "redo" : "undo"
    if (outcome.status === "empty") {
        toast.info(i18n.t(direction === "undo" ? "undo.nothingToUndo" : "undo.nothingToRedo"), { id: TOAST_ID })
        return
    }
    if (outcome.status === "failed") {
        reportError(outcome.error, i18n.t(direction === "undo" ? "undo.undoFailed" : "undo.redoFailed", { label: outcome.label }))
    }
    const count = outcome.executed
    if (count > 0) {
        toast(i18n.t(direction === "undo" ? "undo.undoneMany" : "undo.redoneMany", { count }), {
            id: TOAST_ID,
            action: { label: i18n.t(`undo.${opposite}`), onClick: () => { void runHistoryTo(history, opposite, count - 1) } },
        })
    }
}

/**
 * Undoes or redoes the last action and tells the outcome with a toast: a success offers the button to go back
 * (redo after an undo and vice versa), a failure is reported with the stack of the error. Never rejects.
 * @category Undo
 */
export async function runHistory(history: UndoHistory, direction: "undo" | "redo"): Promise<void> {
    const outcome: UndoOutcome = await history[direction]()
    const opposite = direction === "undo" ? "redo" : "undo"
    if (outcome.status === "empty") {
        toast.info(i18n.t(direction === "undo" ? "undo.nothingToUndo" : "undo.nothingToRedo"), { id: TOAST_ID })
    } else if (outcome.status === "failed") {
        reportError(outcome.error, i18n.t(direction === "undo" ? "undo.undoFailed" : "undo.redoFailed", { label: outcome.label }))
    } else {
        toast(i18n.t(direction === "undo" ? "undo.undone" : "undo.redone", { label: outcome.label }), {
            id: TOAST_ID,
            action: { label: i18n.t(`undo.${opposite}`), onClick: () => { void runHistory(history, opposite) } },
        })
    }
}
