/** The listener set of a store: `subscribe` (returns the unsubscribe) and `emit` (calls every listener). */
export type Emitter = {
    subscribe: (listener: () => void) => () => void
    emit: () => void
}

export const createEmitter = (): Emitter => {
    const listeners = new Set<() => void>()
    return {
        subscribe: listener => {
            listeners.add(listener)
            return () => { listeners.delete(listener) }
        },
        emit: () => listeners.forEach(listener => listener()),
    }
}
