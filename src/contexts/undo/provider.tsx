import { useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { PreferencesContext } from "../preferences-context-object"
import { useShortcut } from "@/hooks/use-shortcut"
import { useWorkspace } from "../use-workspace"
import { useActiveNoteActions } from "../use-active-note"
import { useWorkspaceActions } from "../workspace-data"
import { createUndoCommands, createUndoRecorder } from "./commands"
import { UndoContext, type UndoContextType } from "./context"
import { runHistory, runHistoryTo } from "./run-history"
import { UNDO_LIMIT, createUndoHistory, type UndoCommand } from "./stack"

/**
 * Keeps the undo/redo history of the open workspace (it is emptied when the workspace changes) and binds the
 * `undo`/`redo` shortcuts. It must be inside the WorkspaceDataProvider (it uses the workspace and active note actions).
 * Undo and redo show a toast with the action and the button to go the other way.
 * @category Undo
 */
export function UndoProvider({ children }: { children: React.ReactNode }) {
    const { currentWorkspace } = useWorkspace()
    const workspaceActions = useWorkspaceActions()
    const noteActions = useActiveNoteActions()
    // Optional: without preferences the default limit applies
    const undoLimit = useContext(PreferencesContext)?.undoLimit ?? UNDO_LIMIT
    const [history] = useState(() => createUndoHistory(undoLimit))
    const workspaceId = currentWorkspace?.id ?? null
    const workspaceIdRef = useRef(workspaceId)

    // The history belongs to one workspace
    useEffect(() => {
        workspaceIdRef.current = workspaceId
        history.clear()
    }, [workspaceId, history])

    // The limit can change in the settings: the history is trimmed at once
    useEffect(() => { history.setLimit(undoLimit) }, [history, undoLimit])

    const snapshot = useSyncExternalStore(history.subscribe, history.getSnapshot)

    // The commands read the ref only when they run (never during render)
    const recorder = useMemo(() => createUndoRecorder(
        // eslint-disable-next-line react-hooks/refs
        createUndoCommands({ getWorkspaceId: () => workspaceIdRef.current, workspace: workspaceActions, note: noteActions }),
        history.record,
        history.track,
    ), [history, workspaceActions, noteActions])

    const isLatest = useCallback((command: UndoCommand) => history.isLatest(command), [history])
    const clear = useCallback(() => history.clear(), [history])
    const undo = useCallback(() => runHistory(history, "undo"), [history])
    const redo = useCallback(() => runHistory(history, "redo"), [history])
    const undoTo = useCallback((index: number) => runHistoryTo(history, "undo", index), [history])
    const redoTo = useCallback((index: number) => runHistoryTo(history, "redo", index), [history])

    // Not active in text fields (the fields have their own undo)
    useShortcut("undo", () => { void undo() })
    useShortcut("redo", () => { void redo() })
    useShortcut("redo-alt", () => { void redo() })

    const entries = useSyncExternalStore(history.subscribe, history.getEntries)

    const value = useMemo<UndoContextType>(
        () => ({ ...snapshot, entries, undo, redo, undoTo, redoTo, isLatest, clear, recorder }),
        [snapshot, entries, isLatest, clear, undo, redo, undoTo, redoTo, recorder],
    )

    return <UndoContext.Provider value={value}>{children}</UndoContext.Provider>
}
