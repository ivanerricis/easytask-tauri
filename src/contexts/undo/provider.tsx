import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { useShortcut } from "@/hooks/use-shortcut"
import { useWorkspace } from "../use-workspace"
import { useActiveNoteActions } from "../use-active-note"
import { useWorkspaceActions } from "../workspace-data"
import { createUndoCommands, createUndoRecorder } from "./commands"
import { UndoContext, type UndoContextType } from "./context"
import { runHistory, runHistoryTo } from "./run-history"
import { createUndoHistory } from "./stack"

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
    const [history] = useState(() => createUndoHistory())
    const workspaceId = currentWorkspace?.id ?? null
    const workspaceIdRef = useRef(workspaceId)

    // The history belongs to one workspace
    useEffect(() => {
        workspaceIdRef.current = workspaceId
        history.clear()
    }, [workspaceId, history])

    const snapshot = useSyncExternalStore(history.subscribe, history.getSnapshot)

    // The commands read the ref only when they run (never during render)
    const recorder = useMemo(() => createUndoRecorder(
        // eslint-disable-next-line react-hooks/refs
        createUndoCommands({ getWorkspaceId: () => workspaceIdRef.current, workspace: workspaceActions, note: noteActions }),
        history.record,
    ), [history, workspaceActions, noteActions])

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
        () => ({ ...snapshot, entries, undo, redo, undoTo, redoTo, clear, recorder }),
        [snapshot, entries, clear, undo, redo, undoTo, redoTo, recorder],
    )

    return <UndoContext.Provider value={value}>{children}</UndoContext.Provider>
}
