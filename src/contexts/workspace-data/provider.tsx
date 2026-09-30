import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Folder, Note, WorkspaceDataTree } from "@/types/types"
import { getDBWorkspaceData } from "@/db/queries/workspace"
import { buildWorkspaceTree } from "../tree-builders"
import { flattenTree } from "../workspace-tree-ops"
import { TabsProvider } from "../tabs-context"
import { ActiveNoteProvider } from "../active-note-context"
import { WorkspaceActionsContext, WorkspaceLoadingContext, WorkspaceStateContext } from "./context"
import { useTreeActions } from "./tree"
import { useNoteContentActions } from "./note-content"
import { useTaskActions } from "./tasks"
import { useTrashActions } from "./trash"
import { useTemplateActions } from "./templates"
import type { Runtime, WorkspaceActionsType, WorkspaceStateType } from "./types"

export function WorkspaceDataProvider({ children }: { children: React.ReactNode }) {

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [folders, setFolders] = useState<Folder[]>([])
    const [notes, setNotes] = useState<Note[]>([])
    const [workspaceDataTree, setTreeState] = useState<WorkspaceDataTree | null>(null)
    const [loadedWorkspaceId, setLoadedWorkspaceId] = useState<number | null>(null)

    const [currentFolder, setCurrentFolder] = useState<Folder | null>(null)

    const [trashVersion, setTrashVersion] = useState(0)
    const [templatesVersion, setTemplatesVersion] = useState(0)

    // Latest data for the stable actions (deleteItem) without making them depend on it
    const latest = useRef({ folders, currentFolder })
    useEffect(() => {
        latest.current = { folders, currentFolder }
    }, [folders, currentFolder])

    // The tree is also kept in a ref, so consecutive optimistic updates chain on the latest one even before a render
    const treeRef = useRef<WorkspaceDataTree | null>(null)
    const loadedWorkspaceRef = useRef<number | null>(null)
    // Bumped by every optimistic update: a reload that started before it is stale and must not overwrite it
    const optimisticSeq = useRef(0)
    const pendingOps = useRef(0)

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
     * @param operation The operation to run.
     * @returns The result of the operation.
     * @category WorkspaceData Context
     */
    const withTrashChange = useCallback(<T,>(operation: () => Promise<T>): Promise<T> => withLoading(async () => {
        const result = await operation()
        setTrashVersion(version => version + 1)
        return result
    }), [withLoading])

    /**
     * Sets the tree; the flat folders/notes are derived from it when it does not come from a full load.
     * @category WorkspaceData Context
     */
    const setWorkspaceDataTree = useCallback((tree: WorkspaceDataTree) => {
        treeRef.current = tree
        const flat = flattenTree(tree)
        setFolders(flat.folders)
        setNotes(flat.notes)
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
        const seq = optimisticSeq.current
        try {
            const data = await getDBWorkspaceData(workspaceID)
            // An optimistic update of the same workspace arrived meanwhile: this response predates it
            if (optimisticSeq.current !== seq && loadedWorkspaceRef.current === workspaceID) return
            const loadedFolders = data?.folders || []
            const loadedNotes = data?.notes || []
            const tree = buildWorkspaceTree(loadedFolders, loadedNotes)
            treeRef.current = tree
            loadedWorkspaceRef.current = workspaceID
            setFolders(loadedFolders)
            setNotes(loadedNotes)
            setTreeState(tree)
            setLoadedWorkspaceId(workspaceID)
        } catch (error) {
            setError('Errore caricamento dati del Workspace')
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
            else if (loadedWorkspaceRef.current !== null) getWorkspaceData(loadedWorkspaceRef.current).catch(console.error)
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
        withLoading, withTrashChange, latest, setCurrentFolder, setTemplatesVersion, getWorkspaceData, getTree, applyTree,
    }
    const treeActions = useTreeActions(runtime)
    const noteContentActions = useNoteContentActions(runtime)
    const taskActions = useTaskActions(runtime)
    const trashActions = useTrashActions(runtime)
    const templateActions = useTemplateActions(runtime)

    const state = useMemo<WorkspaceStateType>(() => ({
        folders, notes, workspaceDataTree, currentFolder, error, trashVersion, templatesVersion
    }), [folders, notes, workspaceDataTree, currentFolder, error, trashVersion, templatesVersion])

    // Every group of actions is memoized on stable callbacks, so this object is created once
    const actions = useMemo<WorkspaceActionsType>(() => ({
        setCurrentFolder,
        getWorkspaceData,
        setWorkspaceDataTree,
        ...treeActions,
        ...noteContentActions,
        ...taskActions,
        ...trashActions,
        ...templateActions,
        resetData,
    }), [getWorkspaceData, setWorkspaceDataTree, resetData, treeActions, noteContentActions, taskActions, trashActions, templateActions])

    return (
        <WorkspaceLoadingContext.Provider value={isLoading}>
            <WorkspaceStateContext.Provider value={state}>
                <WorkspaceActionsContext.Provider value={actions}>
                    <TabsProvider notes={notes} workspaceId={loadedWorkspaceId}>
                        <ActiveNoteProvider>
                            {children}
                        </ActiveNoteProvider>
                    </TabsProvider>
                </WorkspaceActionsContext.Provider>
            </WorkspaceStateContext.Provider>
        </WorkspaceLoadingContext.Provider>
    )
}
