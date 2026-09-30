import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { toast } from "sonner"
import type { NoteDataTree, Task } from "@/types/types"
import { getDBNoteData } from "@/db/queries/note"
import { useActiveNoteId, useTabs } from "./tabs-context"
import { buildNoteTree } from "./tree-builders"

/* ------------------------------------------------------------------------------------ */

type ActiveNoteContextType = {
    /** Data of the active note (null while it is loaded for the first time, or without active note). */
    noteDataTree: NoteDataTree | null
}

type ActiveNoteActionsType = {
    /** Reloads the data of the active note from the database (rejects if the query fails). */
    refreshActiveNote: () => Promise<void>
    /** Reloads the data of an open note from the database and updates its cache entry (rejects if the query fails). */
    getNoteData: (noteId: number) => Promise<void>
    /** Replaces the cached data of the active note (optimistic updates). */
    setNoteDataTree: (tree: NoteDataTree | null) => void
    /**
     * Optimistically patches a task of the active note.
     * @returns A function that restores the previous values (to call if the persist fails).
     */
    patchTask: (taskId: number, patch: Partial<Task>) => () => void
}

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

/**
 * Applies a change to a task (at any depth) of a note tree.
 * @param tree The note tree.
 * @param taskId The ID of the task.
 * @param change Returns the changed copy of the task.
 * @returns A new tree, or the same one if the task was not found.
 * @category ActiveNote Context
 */
function mapTask(tree: NoteDataTree, taskId: number, change: (task: Task) => Task): NoteDataTree {
    let found = false
    const visit = (tasks: Task[]): Task[] => tasks.map(task => {
        if (task.id === taskId) {
            found = true
            return change(task)
        }
        const subtasks = visit(task.subtasks)
        return subtasks.some((sub, i) => sub !== task.subtasks[i]) ? { ...task, subtasks } : task
    })
    const next = {
        groups: tree.groups.map(group => ({
            ...group,
            sections: group.sections.map(section => ({ ...section, tasks: visit(section.tasks) })),
        })),
    }
    return found ? next : tree
}

const ActiveNoteContext = createContext<ActiveNoteContextType | null>(null)
const ActiveNoteActionsContext = createContext<ActiveNoteActionsType | null>(null)

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
            console.error(error)
            toast.error("Errore caricamento dati nota")
        })
    }, [activeId, loadNote])

    const noteDataTree = useSyncExternalStore(
        cache.subscribe,
        () => activeId !== null ? cache.get(activeId) ?? null : null,
    )

    const actions = useMemo<ActiveNoteActionsType>(() => {
        const setNoteDataTree = (tree: NoteDataTree | null) => {
            const id = activeIdRef.current
            if (id === null || !tree) return
            nextSeq(id) // an in-flight reload would overwrite this newer data
            cache.set(id, tree)
        }
        return {
            refreshActiveNote: async () => {
                if (activeIdRef.current !== null) await loadNote(activeIdRef.current)
            },
            getNoteData: loadNote,
            setNoteDataTree,
            patchTask: (taskId, patch) => {
                const id = activeIdRef.current
                const current = id !== null ? cache.get(id) : undefined
                if (id === null || !current) return () => {}

                const previous: Partial<Task> = {}
                let touched = false
                const patched = mapTask(current, taskId, task => {
                    touched = true
                    for (const key of Object.keys(patch) as (keyof Task)[]) (previous as Record<string, unknown>)[key] = task[key]
                    return { ...task, ...patch }
                })
                if (!touched) return () => {}
                setNoteDataTree(patched)

                return () => {
                    const latest = cache.get(id)
                    if (latest) {
                        nextSeq(id)
                        cache.set(id, mapTask(latest, taskId, task => ({ ...task, ...previous })))
                    }
                }
            },
        }
    }, [cache, loadNote, nextSeq])

    const value = useMemo(() => ({ noteDataTree }), [noteDataTree])

    return (
        <ActiveNoteActionsContext.Provider value={actions}>
            <ActiveNoteContext.Provider value={value}>
                {children}
            </ActiveNoteContext.Provider>
        </ActiveNoteActionsContext.Provider>
    )
}

/* ------------------------------------------------------------------------------------ */

/**
 * The data of the active note.
 * @category ActiveNote Context
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useActiveNote = () => {
    const context = useContext(ActiveNoteContext)
    if (!context) throw new Error("useActiveNote must be used within an ActiveNoteProvider")
    return context
}

/**
 * The stable actions on the active note (their identity never changes).
 * @category ActiveNote Context
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useActiveNoteActions = () => {
    const context = useContext(ActiveNoteActionsContext)
    if (!context) throw new Error("useActiveNoteActions must be used within an ActiveNoteProvider")
    return context
}
