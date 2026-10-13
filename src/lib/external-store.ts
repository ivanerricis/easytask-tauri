import { useSyncExternalStore } from "react"

/**
 * A tiny store read with selectors (React `useSyncExternalStore`): a component re-renders only when the value it selects
 * changes. For state that changes at the pace of the pointer (what is dragged over what), where a React context or state
 * would re-render every row of a long list each time.
 */
export type ExternalStore<T> = {
    getState: () => T
    subscribe: (listener: () => void) => () => void
    /** Replaces the state; the listeners are called only when it is another object. */
    set: (next: T) => void
}

export const createExternalStore = <T,>(initial: T): ExternalStore<T> => {
    let state = initial
    const listeners = new Set<() => void>()
    return {
        getState: () => state,
        subscribe: listener => {
            listeners.add(listener)
            return () => { listeners.delete(listener) }
        },
        set: next => {
            if (Object.is(next, state)) return
            state = next
            listeners.forEach(listener => listener())
        },
    }
}

/** Reads a part of the store: the selector must return a primitive (or the same object while nothing changed). */
export function useStoreSelector<T, S>(store: ExternalStore<T>, selector: (state: T) => S): S {
    return useSyncExternalStore(store.subscribe, () => selector(store.getState()))
}
