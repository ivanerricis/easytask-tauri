/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Trash2 } from "lucide-react"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useActiveNoteActions } from "@/contexts/use-active-note"
import { useOptionalUndo, useUndoRecorder } from "@/contexts/undo/use-undo"
import { captureTaskPlace, type ColorChange, type ManyItemRef, type TaskMoveStep } from "@/contexts/undo/commands"
import { withRollback } from "@/contexts/with-rollback"
import { useAutomations } from "@/hooks/use-automations"
import { ConfirmDialog } from "@/components/dialogs/dialog-confirm"
import { FormError } from "@/components/form-error"
import { reportError } from "@/lib/report-error"
import { useIsActiveDraft } from "@/contexts/use-template-drafts"
import { toastTrashed } from "@/lib/toast-trashed"
import { getErrorMessage } from "@/lib/utils"
import { END_INDEX } from "../note-dnd"
import { useTaskSelectionStore } from "./task-selection-context"
import { getSelectedTasks, getTopMostTasks, parseTaskKey } from "./task-selection"

export type TaskSelectionActions = {
    /** The tasks the actions apply to: the selected ones without those under another selected task, in tree order. */
    getTargets: () => ManyItemRef[]
    /** Opens the confirmation to move the selection to the trash. */
    requestDelete: () => void
    /** Archives the selection (no confirmation) in one undo step, then clears the selection. */
    archiveSelection: () => Promise<void>
    /** Sets (or, with null, removes) the color of every selected task, subtasks included; one undo step. */
    applyColor: (color: string | null) => Promise<void>
    /** Moves the selection to the end of a section, in the order of the tasks; one undo step. */
    moveTo: (sectionId: number) => Promise<void>
}

const TaskSelectionActionsContext = createContext<TaskSelectionActions | null>(null)

/** The actions on the task multi-selection (null outside a TaskSelectionActionsProvider). */
export const useTaskSelectionActions = () => useContext(TaskSelectionActionsContext)

/**
 * Implements what the menu of a multi-selection of tasks does (delete, archive, color, move) and renders the delete
 * confirmation. Every action is ONE undo step, even if it touches many tasks; the cached note is updated at once and
 * restored if a write fails. It must be inside a TaskSelectionProvider.
 */
export function TaskSelectionActionsProvider({ children }: { children: ReactNode }) {
    const { t } = useTranslation()
    const store = useTaskSelectionStore()
    const { deleteItem, archiveItem, updateItemColor, moveTask } = useWorkspaceActions()
    const { patchTask, removeTask, applyTaskMove, getNoteTree } = useActiveNoteActions()
    const recorder = useUndoRecorder()
    const { dispatch } = useAutomations()
    const undo = useOptionalUndo()?.undo
    const isDraft = useIsActiveDraft()
    const [deleting, setDeleting] = useState<{ items: ManyItemRef[], open: boolean }>({ items: [], open: false })
    const [error, setError] = useState<string | null>(null)
    // Trashed by an earlier attempt of the same confirmation
    const trashed = useRef(new Set<number>())

    const selectedIds = useCallback(
        () => (store?.getOrderedKeys() ?? []).flatMap(key => parseTaskKey(key) ?? []),
        [store],
    )

    const getTargets = useCallback((): ManyItemRef[] => {
        const tree = getNoteTree()
        return tree ? getTopMostTasks(tree, selectedIds()).map(task => ({ itemType: "task", id: task.id, name: task.text })) : []
    }, [getNoteTree, selectedIds])

    const requestDelete = useCallback(() => {
        const items = getTargets()
        if (items.length > 0) setDeleting({ items, open: true })
    }, [getTargets])

    const handleDelete = async () => {
        setError(null)
        const done: ManyItemRef[] = []
        try {
            for (const item of deleting.items) {
                if (trashed.current.has(item.id)) continue
                // Removed from the open note at once (with its subtasks), put back if the write fails
                await withRollback(removeTask(item.id), () => deleteItem("task", item.id))
                trashed.current.add(item.id)
                done.push(item)
            }
            trashed.current.clear()
            toastTrashed(deleting.items.length, undo, isDraft)
            setDeleting(prev => ({ ...prev, open: false }))
        } catch (err) {
            setError(t("tasks.selection.deleteError", { done: trashed.current.size, total: deleting.items.length, message: getErrorMessage(err) }))
        } finally {
            if (done.length > 0) recorder.removeMany(done)
        }
    }

    const archiveSelection = useCallback(async () => {
        // A template draft has no archive
        if (isDraft) return
        const done: ManyItemRef[] = []
        try {
            for (const item of getTargets()) {
                await withRollback(removeTask(item.id), () => archiveItem("task", item.id))
                done.push(item)
            }
        } catch (err) {
            reportError(err, getErrorMessage(err))
        }
        if (done.length > 0) recorder.archiveMany(done)
        store?.reset()
    }, [getTargets, removeTask, archiveItem, recorder, store, isDraft])

    const applyColor = useCallback(async (color: string | null) => {
        const tree = getNoteTree()
        if (!tree) return
        const changes: ColorChange[] = []
        try {
            // Every selected task, also one under a selected task: a color change never touches the subtasks
            for (const task of getSelectedTasks(tree, selectedIds())) {
                if ((task.color ?? null) === color) continue
                await withRollback(patchTask(task.id, { color }), () => updateItemColor("task", task.id, color ?? undefined))
                changes.push({ itemType: "task", id: task.id, name: task.text, before: task.color ?? null, after: color })
            }
        } catch (err) {
            reportError(err, getErrorMessage(err))
        }
        if (changes.length > 0) recorder.colorMany(changes)
    }, [getNoteTree, selectedIds, patchTask, updateItemColor, recorder])

    const moveTo = useCallback((sectionId: number) => recorder.track((async () => {
        const done: TaskMoveStep[] = []
        try {
            // One at a time: each task is appended after the previous one, and its place is read right before its own step
            for (const item of getTargets()) {
                const from = captureTaskPlace(getNoteTree(), item.id)
                if (!from) continue
                const destination = { sectionId, parentTaskId: null }
                await withRollback(applyTaskMove(item.id, destination, END_INDEX), () => moveTask(item.id, destination, END_INDEX))
                done.push({ id: item.id, name: from.name, from, to: { ...destination, index: END_INDEX } })
                if (from.sectionId !== sectionId) void dispatch({ type: "task.moved", taskId: item.id, fromSectionId: from.sectionId })
            }
        } catch (err) {
            reportError(err, getErrorMessage(err))
        }
        if (done.length > 0) recorder.taskMoveMany(done)
    })()), [recorder, getTargets, getNoteTree, applyTaskMove, moveTask, dispatch])

    const value = useMemo<TaskSelectionActions>(
        () => ({ getTargets, requestDelete, archiveSelection, applyColor, moveTo }),
        [getTargets, requestDelete, archiveSelection, applyColor, moveTo],
    )

    return (
        <TaskSelectionActionsContext.Provider value={value}>
            {children}
            <ConfirmDialog
                open={deleting.open}
                onOpenChange={open => {
                    if (!open) {
                        setError(null)
                        trashed.current.clear()
                    }
                    setDeleting(prev => ({ ...prev, open }))
                }}
                destructive
                autoClose={false}
                title={t("dialogs.delete.title")}
                description={t("tasks.selection.deleteDescription", { count: deleting.items.length })}
                confirm={{ label: t("tasks.selection.deleteConfirm", { count: deleting.items.length }), icon: Trash2, onClick: handleDelete }}
            >
                {error && <FormError>{error}</FormError>}
            </ConfirmDialog>
        </TaskSelectionActionsContext.Provider>
    )
}
