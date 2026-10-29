import { createContext, useContext } from "react"
import { createExternalStore, useStoreSelector, type ExternalStore } from "@/lib/external-store"

/**
 * Counters that only grow: each one is bumped after the operations that can change one list (the trash, the archive, the
 * visible audio files, the templates), so the readers of that list reload it. They live in an external store, apart from the
 * workspace state, so a bump re-renders only the components that read that counter.
 *
 * - trash: after every operation that can change the trash content (delete, restore, purge, empty, moves).
 * - archive: after every operation that can change the archive content: archive, unarchive, and every trash operation
 *   (an archived item can be moved to the trash and back, so the archive list must be reloaded).
 * - audio: after every operation that can change which audio files are visible (delete, restore, purge and empty and
 *   archive/unarchive of groups, notes, folders and audio files). Unlike trash it does not move with a task or section move.
 * - templates: after every operation that can change the templates of the workspace (create, update, delete, restore, purge).
 */
export type WorkspaceVersions = { trash: number, archive: number, audio: number, templates: number }

export type WorkspaceVersionKind = keyof WorkspaceVersions

export type WorkspaceVersionsStore = ExternalStore<WorkspaceVersions>

export const createVersionsStore = (): WorkspaceVersionsStore =>
    createExternalStore<WorkspaceVersions>({ trash: 0, archive: 0, audio: 0, templates: 0 })

/** Adds one to the given counters (a single notification). */
export const bumpVersions = (store: WorkspaceVersionsStore, ...kinds: WorkspaceVersionKind[]) => {
    const next = { ...store.getState() }
    for (const kind of kinds) next[kind] += 1
    store.set(next)
}

export const WorkspaceVersionsContext = createContext<WorkspaceVersionsStore | null>(null)

/**
 * One counter of the workspace data (see WorkspaceVersions): the component re-renders only when that counter changes.
 * @category Workspace Data Context
 */
export const useWorkspaceVersion = (kind: WorkspaceVersionKind): number => {
    const store = useContext(WorkspaceVersionsContext)
    if (!store) throw new Error("useWorkspaceVersion must be used within a WorkspaceDataProvider")
    return useStoreSelector(store, versions => versions[kind])
}
