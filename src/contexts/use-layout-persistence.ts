import { useEffect, useRef, useState } from "react"
import type { Dispatch } from "react"
import type { Note } from "@/types/types"
import { initialLayoutState, normalizeLayout, type LayoutAction, type LayoutState } from "@/lib/tabs/layout-reducer"
import type { TabsState } from "@/lib/tabs/tabs-reducer"
import { reportError } from "@/lib/report-error"
import { getReopenNotes } from "@/lib/store/preferences"
import { getWorkspaceTabs, saveWorkspaceTabs } from "@/lib/store/tabs"

/** The tabs of a pane that exist in `existing`, with a valid active id. */
function filterPane(tabs: TabsState, existing: ReadonlySet<number>): TabsState {
    const openIds = tabs.openIds.filter(id => existing.has(id))
    const activeId = tabs.activeId !== null && openIds.includes(tabs.activeId) ? tabs.activeId : (openIds[0] ?? null)
    return { openIds, activeId }
}

/** A cheap serialization of what is persisted of the layout, to skip saving an unchanged one. */
const layoutKey = (workspaceId: number, { left, right, focused }: LayoutState): string =>
    JSON.stringify([workspaceId, left.openIds, left.activeId, right && [right.openIds, right.activeId], focused])

/**
 * Restores the layout saved for the workspace (resetting it on a workspace change) and persists every later change.
 * The layout is never saved before the saved one has been read (it would be overwritten), and a restore that has been
 * superseded by a newer one is ignored.
 * @param state The layout state.
 * @param dispatch The layout dispatcher.
 * @param workspaceId The ID of the loaded workspace (null when none).
 * @param notes The live notes, to drop the saved tabs of notes that no longer exist.
 * @returns Whether the layout of the current workspace has been restored.
 * @category Tabs
 */
export function useLayoutPersistence(
    state: LayoutState,
    dispatch: Dispatch<LayoutAction>,
    workspaceId: number | null,
    notes: Note[],
): boolean {
    const [restoredTick, setRestoredTick] = useState(0)
    const [restoredFor, setRestoredFor] = useState<number | null>(null)

    const notesRef = useRef(notes)
    const restoredRef = useRef(false)
    const restoreToken = useRef(0)
    const lastWorkspaceId = useRef<number | null>(null)
    const lastSavedKey = useRef<string | null>(null)

    useEffect(() => {
        notesRef.current = notes
    }, [notes])

    // Reset on workspace change, then restore the layout saved for that workspace
    useEffect(() => {
        restoredRef.current = false
        const token = ++restoreToken.current
        if (lastWorkspaceId.current !== workspaceId) {
            lastWorkspaceId.current = workspaceId
            dispatch({ type: "restore", state: initialLayoutState })
        }
        if (workspaceId === null) return

        const restore = async () => {
            try {
                if (!await getReopenNotes()) return
                const saved = await getWorkspaceTabs(workspaceId)
                if (token !== restoreToken.current) return
                const existing = new Set(notesRef.current.map(note => note.id))
                // A saved right pane whose notes are all gone is dropped (an empty one that was saved empty is kept)
                const right = saved.right ? filterPane(saved.right, existing) : null
                dispatch({
                    type: "hydrate",
                    state: normalizeLayout({
                        left: filterPane(saved.left, existing),
                        right: right && (right.openIds.length > 0 || saved.right?.openIds.length === 0) ? right : null,
                        focused: saved.focused,
                    }),
                })
            } catch (error) {
                reportError(error)
            } finally {
                if (token === restoreToken.current) {
                    restoredRef.current = true
                    setRestoredTick(tick => tick + 1)
                    setRestoredFor(workspaceId)
                }
            }
        }
        restore()
    }, [workspaceId, dispatch])

    // Persist the layout of the workspace (only once the saved one has been read, or it would be overwritten)
    useEffect(() => {
        if (workspaceId === null || !restoredRef.current) return
        const key = layoutKey(workspaceId, state)
        if (key === lastSavedKey.current) return
        lastSavedKey.current = key
        saveWorkspaceTabs(workspaceId, state)
            .catch(error => {
                lastSavedKey.current = null
                reportError(error)
            })
    }, [state, workspaceId, restoredTick])

    return workspaceId !== null && restoredFor === workspaceId
}
