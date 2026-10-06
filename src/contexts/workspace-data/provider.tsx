import i18n from "@/i18n"
import { useCallback, useMemo, useRef, useState } from "react"
import type { Folder, WorkspaceDataTree } from "@/types/types"
import { getDBWorkspaceData } from "@/db/queries/workspace"
import { reportError } from "@/lib/report-error"
import { buildWorkspaceTree } from "../tree-builders"
import { flattenTree } from "../workspace-tree-ops"
import { TabsProvider } from "../tabs-context"
import { ActiveNoteProvider } from "../active-note-context"
import { WorkspaceActionsContext, WorkspaceLoadingContext, WorkspaceStateContext } from "./context"
import { useTreeActions } from "./tree"
import { useNoteContentActions } from "./note-content"
import { useTaskActions } from "./tasks"
import { useTrashActions } from "./trash"
import { useArchiveActions } from "./archive"
import { useTemplateActions } from "./templates"
import type { Runtime, TabsBridge, WorkspaceActionsType, WorkspaceStateType } from "./types"

/** Refetches of a reload whose response was overtaken by an optimistic update. */
const MAX_RELOAD_RETRIES = 3

export function WorkspaceDataProvider({ children }: { children: React.ReactNode }) {

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [workspaceDataTree, setTreeState] = useState<WorkspaceDataTree | null>(null)
    const [loadedWorkspaceId, setLoadedWorkspaceId] = useState<number | null>(null)

    const [currentFolder, setCurrentFolder] = useState<Folder | null>(null)

    const [trashVersion, setTrashVersion] = useState(0)
    const [archiveVersion, setArchiveVersion] = useState(0)
    const [audioVersion, setAudioVersion] = useState(0)
    const [templatesVersion, setTemplatesVersion] = useState(0)

    // The flat lists follow the tree: they change identity only when the tree does
    const { folders, notes } = useMemo(
        () => workspaceDataTree ? flattenTree(workspaceDataTree) : { folders: [], notes: [] },
        [workspaceDataTree])
    const bumpAudioVersion = useCallback(() => setAudioVersion(version => version + 1), [])

    // The tree is also kept in a ref, so consecutive optimistic updates chain on the latest one even before a render
    const treeRef = useRef<WorkspaceDataTree | null>(null)
    const loadedWorkspaceRef = useRef<number | null>(null)
    // Bumped by every optimistic update: a reload that started before it is stale and must not overwrite it
    const optimisticSeq = useRef(0)
    // Bumped by every reload request: only the latest one applies its response
    const reloadSeq = useRef(0)
    const pendingOps = useRef(0)
    const tabsBridge = useRef<TabsBridge | null>(null)

    /**
     * Runs an async operation and keeps isLoading true while any operation is in flight.
     * @param operation The operation to run.
     * @returns The result of the operation.
     * @category WorkspaceData Context
     */
    const withLoading = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
        pendingOps.current += 1
        setIsLoading(true)
        try {
            return await operation()
        } finally {
            pendingOps.current -= 1
            setIsLoading(pendingOps.current > 0)
        }
    }, [])

    /**
     * Runs an operation that can change the trash content and bumps trashVersion once it succeeds.
     * archiveVersion moves with it: an archived item that goes to the trash (or comes back from it) changes the archive too.
     * @param operation The operation to run.
     * @returns The result of the operation.
     * @category WorkspaceData Context
     */
    const withTrashChange = useCallback(<T,>(operation: () => Promise<T>): Promise<T> => withLoading(async () => {
        const result = await operation()
        setTrashVersion(version => version + 1)
        setArchiveVersion(version => version + 1)
        return result
    }), [withLoading])

    /**
     * Runs an operation that can change the archive content and bumps archiveVersion once it succeeds.
     * @param operation The operation to run.
     * @returns The result of the operation.
     * @category WorkspaceData Context
     */
    const withArchiveChange = useCallback(<T,>(operation: () => Promise<T>): Promise<T> => withLoading(async () => {
        const result = await operation()
        setArchiveVersion(version => version + 1)
        return result
    }), [withLoading])

    /**
     * Sets the tree (the flat folders/notes are derived from it).
     * @category WorkspaceData Context
     */
    const setWorkspaceDataTree = useCallback((tree: WorkspaceDataTree) => {
        treeRef.current = tree
        setTreeState(tree)
    }, [])

    /* ------------------------------------------------------------------------------------ */

    /**
     * Retrieves the workspace data for a given workspace ID.
     * @param workspaceID The ID of the workspace to get data for.
     * @throws Will throw an error if the workspace data cannot be retrieved.
     * @category Workspace Data Context
     */
    const getWorkspaceData = useCallback((workspaceID: number) => withLoading(async () => {
        // Only the latest request applies: an older response that arrives late must not overwrite a newer one
        const requestSeq = ++reloadSeq.current
        try {
            for (let attempt = 0; ; attempt++) {
                const seq = optimisticSeq.current
                const data = await getDBWorkspaceData(workspaceID)
                if (requestSeq !== reloadSeq.current) return
                // An optimistic update of the same workspace arrived meanwhile: this response predates it, so fetch again
                // (a bounded number of times: the last response is applied anyway, it is the freshest one)
                if (optimisticSeq.current !== seq && loadedWorkspaceRef.current === workspaceID && attempt < MAX_RELOAD_RETRIES) continue
                const tree = buildWorkspaceTree(data?.folders || [], data?.notes || [])
                treeRef.current = tree
                loadedWorkspaceRef.current = workspaceID
                setTreeState(tree)
                setLoadedWorkspaceId(workspaceID)
                setError(null)
                return
            }
        } catch (error) {
            if (requestSeq === reloadSeq.current) setError(i18n.t("errors.loadWorkspaceData"))
            throw error
        }
    }), [withLoading])

    const getTree = useCallback(() => treeRef.current, [])

    const applyTree = useCallback<Runtime["applyTree"]>((forward, inverse) => {
        const previous = treeRef.current
        if (!previous) return null
        const next = forward(previous)
        if (next === previous) return null
        optimisticSeq.current += 1
        setWorkspaceDataTree(next)

        return () => {
            const current = treeRef.current
            optimisticSeq.current += 1
            if (current === next) setWorkspaceDataTree(previous)
            else if (current && inverse) setWorkspaceDataTree(inverse(current))
            else if (loadedWorkspaceRef.current !== null) getWorkspaceData(loadedWorkspaceRef.current).catch(error => reportError(error, i18n.t("errors.refreshWorkspaceData")))
        }
    }, [setWorkspaceDataTree, getWorkspaceData])

    /**
     * Clears the workspace state (this also closes every tab, since the tabs follow the loaded workspace).
     * @category Workspace Data Context
     */
    const resetData = useCallback(() => {
        setCurrentFolder(null)
        loadedWorkspaceRef.current = null
        setLoadedWorkspaceId(null)
    }, [])

    /* ------------------------------------------------------------------------------------ */

    const runtime: Runtime = {
        tabsBridge, withLoading, withTrashChange, withArchiveChange, bumpAudioVersion, setCurrentFolder, setTemplatesVersion, getWorkspaceData, getTree, applyTree,
    }
    const treeActions = useTreeActions(runtime)
    const noteContentActions = useNoteContentActions(runtime)
    const taskActions = useTaskActions(runtime)
    const trashActions = useTrashActions(runtime)
    const archiveActions = useArchiveActions(runtime)
    const templateActions = useTemplateActions(runtime)

    const state = useMemo<WorkspaceStateType>(() => ({
        folders, notes, workspaceDataTree, currentFolder, error, trashVersion, archiveVersion, audioVersion, templatesVersion, loadedWorkspaceId
    }), [folders, notes, workspaceDataTree, currentFolder, error, trashVersion, archiveVersion, audioVersion, templatesVersion, loadedWorkspaceId])

    // Every group of actions is memoized on stable callbacks, so this object is created once
    const actions = useMemo<WorkspaceActionsType>(() => ({
        setCurrentFolder,
        getWorkspaceData,
        setWorkspaceDataTree,
        ...treeActions,
        ...noteContentActions,
        ...taskActions,
        ...trashActions,
        ...archiveActions,
        ...templateActions,
        resetData,
    }), [getWorkspaceData, setWorkspaceDataTree, resetData, treeActions, noteContentActions, taskActions, trashActions, archiveActions, templateActions])

    return (
        <WorkspaceLoadingContext.Provider value={isLoading}>
            <WorkspaceStateContext.Provider value={state}>
                <WorkspaceActionsContext.Provider value={actions}>
                    <TabsProvider notes={notes} workspaceId={loadedWorkspaceId} bridgeRef={tabsBridge}>
                        <ActiveNoteProvider>
                            {children}
                        </ActiveNoteProvider>
                    </TabsProvider>
                </WorkspaceActionsContext.Provider>
            </WorkspaceStateContext.Provider>
        </WorkspaceLoadingContext.Provider>
    )
}
