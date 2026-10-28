import { createContext, createElement, useContext, useState, useSyncExternalStore, type ReactNode } from "react"
import { createExternalStore } from "@/lib/external-store"

/**
 * The place where the field of a new task is open: the list (a section or the subtasks of a task) and the task it goes after
 * (null = at the top of the list).
 * @category Tasks
 */
export type InsertSlot = {
    listKey: string
    afterTaskId: number | null
    /** The field open is the one at the bottom of the list (the "new task" button / subtask field), not an inline one. */
    end?: boolean
}

/**
 * Only one insert field is open at a time, so its place lives in a small store: opening it, or moving it after a created
 * task, re-renders just the list involved (and the field), not every row of the note.
 */
export type TaskInsertStore = {
    getState: () => InsertSlot | null
    subscribe: (listener: () => void) => () => void
    /** Opens the field at `slot`; the field open elsewhere is closed (and its text discarded). */
    claim: (slot: InsertSlot) => void
    close: () => void
    /** The field at the bottom of `listKey` (the new task button, the new subtask row) takes the place: any other field closes. */
    claimEnd: (listKey: string) => void
    /** Frees the place if it is held by the bottom field of `listKey` (a field replaced meanwhile by another one stays). */
    releaseEnd: (listKey: string) => void
    /** Moves the open field right after `taskId`, in the same list (no-op when none is open). */
    moveAfter: (taskId: number) => void
}

export const createTaskInsertStore = (): TaskInsertStore => {
    const store = createExternalStore<InsertSlot | null>(null)
    return {
        getState: store.getState,
        subscribe: store.subscribe,
        claim: slot => store.set({ ...slot }),
        close: () => store.set(null),
        claimEnd: listKey => store.set({ listKey, afterTaskId: null, end: true }),
        releaseEnd: listKey => {
            const slot = store.getState()
            if (slot?.end && slot.listKey === listKey) store.set(null)
        },
        moveAfter: taskId => {
            const slot = store.getState()
            if (slot && !slot.end) store.set({ listKey: slot.listKey, afterTaskId: taskId })
        },
    }
}

/** Without a provider nothing can be opened: the store never holds a slot. */
const inertStore: TaskInsertStore = {
    getState: () => null,
    subscribe: () => () => {},
    claim: () => {},
    close: () => {},
    claimEnd: () => {},
    releaseEnd: () => {},
    moveAfter: () => {},
}

const TaskInsertContext = createContext<TaskInsertStore>(inertStore)

/** Holds the insert slot of the open note. */
export function TaskInsertProvider({ children }: { children: ReactNode }) {
    const [store] = useState(createTaskInsertStore)
    return createElement(TaskInsertContext.Provider, { value: store }, children)
}

export const useTaskInsertStore = () => useContext(TaskInsertContext)

/** The open slot when it belongs to `listKey` (the same object until it changes), null otherwise: other lists do not re-render. */
export function useInsertSlot(listKey: string): InsertSlot | null {
    const store = useTaskInsertStore()
    return useSyncExternalStore(store.subscribe, () => {
        const slot = store.getState()
        return slot?.listKey === listKey ? slot : null
    })
}

/** True when another field took the place of the bottom field of `listKey` (so this one must close); a plain boolean, so only a flip re-renders. */
export function useEndFieldReplaced(listKey: string): boolean {
    const store = useTaskInsertStore()
    return useSyncExternalStore(store.subscribe, () => {
        const slot = store.getState()
        return slot !== null && !(slot.end && slot.listKey === listKey)
    })
}
