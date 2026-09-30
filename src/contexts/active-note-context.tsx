import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { reportError } from "@/lib/report-error"
import type { NoteDataTree } from "@/types/types"
import { getDBNoteData } from "@/db/queries/note"
import { useActiveNoteId, useTabs } from "./use-tabs"
import { ActiveNoteActionsContext, ActiveNoteContext, type ActiveNoteActionsType } from "./active-note-context-object"
import { buildNoteTree } from "./tree-builders"
import { createNoteOptimisticActions, type NoteOptimisticActions, type Rollback } from "./note-optimistic"

/* ------------------------------------------------------------------------------------ */

/**
 * External store with the note data of the open tabs, so that a switch to a cached tab is instant
 * and the entries of closed tabs can be evicted without going through React state.
 * @category ActiveNote Context
 */
type NoteCache = {
    get: (noteId: number) => NoteDataTree | undefined
    set: (noteId: number, tree: NoteDataTree) => void
    /** Evicts the entries of the notes that are not in `keep`. */
    retain: (keep: readonly number[]) => void
    subscribe: (listener: () => void) => () => void
}

/**
 * Creates the cache of the note data of the open tabs.
 * @returns The cache.
 * @category ActiveNote Context
 */
function createNoteCache(): NoteCache {
    const entries = new Map<number, NoteDataTree>()
    const listeners = new Set<() => void>()
    const emit = () => listeners.forEach(listener => listener())

    return {
        get: noteId => entries.get(noteId),
        set: (noteId, tree) => {
            entries.set(noteId, tree)
            emit()
        },
        retain: keep => {
            const keepSet = new Set(keep)
            let removed = false
            for (const id of [...entries.keys()]) {
                if (!keepSet.has(id)) {
                    entries.delete(id)
                    removed = true
                }
            }
            if (removed) emit()
        },
        subscribe: listener => {
            listeners.add(listener)
            return () => { listeners.delete(listener) }
        },
    }
}

/* ------------------------------------------------------------------------------------ */

/**
 * Single place that loads the data of the active note. It loads on every activation (effect on the active id),
 * shows the cached data instantly and revalidates in background, and ignores stale responses
 * (a response is used only if no newer request for the same note started and, to be displayed, the note is still active).
 * @category ActiveNote Context
 */
export function ActiveNoteProvider({ children }: { children: React.ReactNode }) {
    const activeId = useActiveNoteId()
    const { openIds } = useTabs()
    const [cache] = useState(createNoteCache)

    const activeIdRef = useRef(activeId)
    const openIdsRef = useRef(openIds)
    const requestSeq = useRef(new Map<number, number>())

    useEffect(() => {
        activeIdRef.current = activeId
        openIdsRef.current = openIds
    }, [activeId, openIds])

    // Evict the cache entries of closed tabs
    useEffect(() => {
        cache.retain(openIds)
    }, [cache, openIds])

    const nextSeq = useCallback((noteId: number) => {
        const seq = (requestSeq.current.get(noteId) ?? 0) + 1
        requestSeq.current.set(noteId, seq)
        return seq
    }, [])

    const loadNote = useCallback(async (noteId: number) => {
        const seq = nextSeq(noteId)
        const data = await getDBNoteData(noteId)
        const tree = buildNoteTree(data?.groups ?? [], data?.sections ?? [], data?.tasks ?? [])
        // Superseded by a newer request/optimistic update, or the tab has been closed meanwhile
        if (requestSeq.current.get(noteId) !== seq || !openIdsRef.current.includes(noteId)) return
        cache.set(noteId, tree)
    }, [cache, nextSeq])

    useEffect(() => {
        if (activeId === null) return
        loadNote(activeId).catch(error => {
            reportError(error, "Impossibile caricare la nota. Riprova.")
        })
    }, [activeId, loadNote])

    const noteDataTree = useSyncExternalStore(
        cache.subscribe,
        () => activeId !== null ? cache.get(activeId) ?? null : null,
    )

    const getActive = useCallback(() => {
        const id = activeIdRef.current
        const tree = id !== null ? cache.get(id) : undefined
        return id !== null && tree ? { id, tree } : null
    }, [cache])

    const commit = useCallback((noteId: number, tree: NoteDataTree) => {
        nextSeq(noteId) // an in-flight reload would overwrite this newer data
        cache.set(noteId, tree)
    }, [cache, nextSeq])

    const refreshActiveNote = useCallback(async () => {
        if (activeIdRef.current !== null) await loadNote(activeIdRef.current)
    }, [loadNote])

    const actions = useMemo<ActiveNoteActionsType>(() => {
        const setNoteDataTree = (tree: NoteDataTree | null) => {
            const id = activeIdRef.current
            if (id === null || !tree) return
            commit(id, tree)
        }
        // The store only reads the ref when an action runs (never during render)
        // eslint-disable-next-line react-hooks/refs
        const base = createNoteOptimisticActions({ active: getActive, get: cache.get, commit })
        // A creation that cannot be applied locally falls back to a background reload (never awaited by the UI)
        const withReload = <A extends unknown[]>(append: (...args: A) => Rollback | null) => (...args: A): Rollback => {
            const rollback = append(...args)
            if (!rollback) refreshActiveNote().catch(error => reportError(error, "Impossibile aggiornare la nota. Riprova."))
            return rollback ?? (() => {})
        }
        const optimistic: NoteOptimisticActions = {
            ...base,
            appendGroup: withReload(base.appendGroup),
            appendSection: withReload(base.appendSection),
            appendTask: withReload(base.appendTask),
            applySectionMoveToNewGroup: withReload(base.applySectionMoveToNewGroup),
        }
        return {
            refreshActiveNote,
            getNoteData: loadNote,
            setNoteDataTree,
            ...optimistic,
        }
    }, [cache, loadNote, refreshActiveNote, getActive, commit])

    const value = useMemo(() => ({ noteDataTree }), [noteDataTree])

    return (
        <ActiveNoteActionsContext.Provider value={actions}>
            <ActiveNoteContext.Provider value={value}>
                {children}
            </ActiveNoteContext.Provider>
        </ActiveNoteActionsContext.Provider>
    )
}
