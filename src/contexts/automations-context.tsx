import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react"
import { toast } from "sonner"
import i18n from "@/i18n"
import type { NoteDataTree } from "@/types/types"
import { useActiveNoteActions } from "@/contexts/use-active-note"
import { useActiveNoteId } from "@/contexts/use-tabs"
import { useOptionalUndo, useUndoRecorder } from "@/contexts/undo/use-undo"
import type { UndoCommand } from "@/contexts/undo/stack"
import { findSection } from "@/contexts/note-tree-ops"
import { buildNoteTree } from "@/contexts/tree-builders"
import { getDBNoteData } from "@/db/queries/note"
import { applyDBTaskChanges, getDBAutomations } from "@/db/queries/automation"
import { runAutomations } from "@/lib/automations/engine"
import { diffTaskStatements, restoreTasks, taskChanges, type TaskChange } from "@/lib/automations/diff"
import { automationName } from "@/lib/automations/describe"
import type { AutomationEvent } from "@/lib/automations/types"
import { reportError } from "@/lib/report-error"
import { getErrorMessage } from "@/lib/utils"
import { AutomationsContext } from "./automations-context-object"

async function loadNoteTree(noteId: number): Promise<NoteDataTree> {
    const data = await getDBNoteData(noteId)
    return buildNoteTree(data?.groups ?? [], data?.sections ?? [], data?.tasks ?? [])
}

/**
 * Runs the automations of the open note after a user action on a task.
 * `dispatch` is called once the action has been applied (cached note updated and written): the rules run on the
 * cached note, their changes are applied to it at once and written in ONE transaction (the note is reloaded if the
 * write fails). The automation is a separate step of the undo history, so the first undo reverts the automation and
 * the next one the user action. Undo/redo never dispatch, so they do not run the rules again.
 * Mounted once (inside the undo history), so the many task rows only read a stable `dispatch`.
 * @category Automations
 */
export function AutomationsProvider({ children }: { children: ReactNode }) {
    const activeId = useActiveNoteId()
    const activeIdRef = useRef(activeId)
    useEffect(() => { activeIdRef.current = activeId }, [activeId])

    const { getNoteTree, setNoteDataTree, refreshActiveNote } = useActiveNoteActions()
    const recorder = useUndoRecorder()
    const undoContext = useOptionalUndo()
    const undoRef = useRef(undoContext?.undo)
    useEffect(() => { undoRef.current = undoContext?.undo }, [undoContext?.undo])

    /** Gives the tasks of a note what an automation changed on them, as it is in `source`, on the latest data of the note. */
    const restore = useCallback(async (noteId: number, source: NoteDataTree, changes: TaskChange[]) => {
        const cached = activeIdRef.current === noteId ? getNoteTree() : null
        const base = cached ?? await loadNoteTree(noteId)
        const next = restoreTasks(base, source, changes)
        if (cached) setNoteDataTree(next)
        try {
            await applyDBTaskChanges(diffTaskStatements(base, next))
        } catch (error) {
            if (cached) await refreshActiveNote().catch(() => {})
            throw error
        }
    }, [getNoteTree, setNoteDataTree, refreshActiveNote])

    const run = useCallback(async (event: AutomationEvent) => {
        const noteId = activeIdRef.current
        if (noteId === null) return
        const rules = await getDBAutomations(noteId)
        if (!rules.some(rule => rule.enabled)) return
        // The note may have been left while the rules were loading
        const before = activeIdRef.current === noteId ? getNoteTree() : null
        if (!before) return

        const { tree: after, applied, touched } = runAutomations(before, rules, event)
        if (applied.length === 0 || after === before) return

        setNoteDataTree(after)
        try {
            await applyDBTaskChanges(diffTaskStatements(before, after))
        } catch (error) {
            await refreshActiveNote().catch(() => {})
            throw error
        }

        const titleOf = (id: number) => findSection(after, id)?.section.title
        const names = applied.map(rule => automationName(rule, titleOf))
        const changes = taskChanges(before, after, touched)
        const command: UndoCommand = {
            label: i18n.t("automations.undoLabel", { name: names.join(", ") }),
            undo: () => restore(noteId, before, changes),
            redo: () => restore(noteId, after, changes),
        }
        recorder.record(command)
        const undo = undoRef.current
        toast.success(
            names.length === 1 ? i18n.t("automations.ran", { name: names[0] }) : i18n.t("automations.ranMany", { names: names.join(", ") }),
            undo ? { action: { label: i18n.t("undo.undo"), onClick: () => { void undo() } } } : undefined,
        )
    }, [getNoteTree, setNoteDataTree, refreshActiveNote, recorder, restore])

    /** Runs the rules for an event (never rejects: a failure is reported). An undo asked meanwhile waits for it. */
    const dispatch = useCallback((event: AutomationEvent) => recorder.track(run(event).catch(error => {
        reportError(error, getErrorMessage(error))
    })), [recorder, run])

    const value = useMemo(() => ({ dispatch }), [dispatch])
    return <AutomationsContext.Provider value={value}>{children}</AutomationsContext.Provider>
}
