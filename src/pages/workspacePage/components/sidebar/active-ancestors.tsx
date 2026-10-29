/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react"
import { useActiveNoteSelector } from "@/contexts/use-tabs"
import { createExternalStore, useStoreSelector, type ExternalStore } from "@/lib/external-store"
import { getAncestorFolderIds } from "./note-path"
import type { TreeData } from "./tree-dnd"

type AncestorsStore = ExternalStore<ReadonlySet<number>>

const NO_ANCESTORS: ReadonlySet<number> = new Set()
const AncestorsContext = createContext<AncestorsStore | null>(null)
const noAncestorsStore: AncestorsStore = createExternalStore(NO_ANCESTORS)

const ancestorsOf = (tree: TreeData, noteId: number | null): ReadonlySet<number> =>
    noteId === null ? NO_ANCESTORS : new Set(getAncestorFolderIds(tree, { type: "note", id: noteId }))

/**
 * Keeps in a store the ids of the folders above the note open in the active tab, computed once per tab switch or tree change.
 * Each folder reads only whether it is in the set, so a tab switch re-renders just the folders whose answer changes.
 */
export const ActiveAncestorsProvider = ({ tree, children }: { tree: TreeData, children: ReactNode }) => {
    const activeId = useActiveNoteSelector(id => id)
    const ancestors = useMemo(() => ancestorsOf(tree, activeId), [tree, activeId])
    const [store] = useState(() => createExternalStore(ancestors))
    useLayoutEffect(() => { store.set(ancestors) }, [store, ancestors])
    return <AncestorsContext.Provider value={store}>{children}</AncestorsContext.Provider>
}

/**
 * Whether a collapsed folder hides the note open in the active tab (somewhere inside it); always false for an open folder
 * and without an ActiveAncestorsProvider.
 */
export const useFolderHoldsActiveNote = (folderId: number, isOpen: boolean): boolean =>
    useStoreSelector(useContext(AncestorsContext) ?? noAncestorsStore, ancestors => !isOpen && ancestors.has(folderId))
