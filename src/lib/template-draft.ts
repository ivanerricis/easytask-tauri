/**
 * Save state of a template draft: `idle` (nothing changed since it was opened), `saving`, `saved` or `error`
 * (the last save failed: the draft stays dirty and is saved again at the next change, flush or retry).
 */
export type DraftSaveStatus = "idle" | "saving" | "saved" | "error"

export type DraftAutosaverOptions = {
    /** Writes the current content of the draft `key` into its template. Must be a no-op when nothing changed. */
    save: (key: number) => Promise<void>
    /** Resolves when the writes in flight to the draft have finished (a save must not read a half written note). */
    whenIdle?: () => Promise<void>
    /** Quiet time after the last change before saving, in milliseconds (default 800). */
    delay?: number
}

export type DraftAutosaver = {
    /** The draft `key` changed: a save is scheduled after the quiet time. */
    notify: (key: number) => void
    /** Saves the draft now if it is dirty, and waits for the save in progress. Resolves false when the draft is not saved. */
    flush: (key: number) => Promise<boolean>
    /** Like `flush` for every draft that is known. Resolves false when any is not saved. */
    flushAll: () => Promise<boolean>
    /** Tries again after an error. */
    retry: (key: number) => Promise<boolean>
    /** Forgets the draft (closed): cancels the timer and drops the state. Call `flush` first to keep the changes. */
    forget: (key: number) => void
    getStatus: (key: number) => DraftSaveStatus
    /** True while the draft has changes that are not saved. */
    isDirty: (key: number) => boolean
    subscribe: (listener: () => void) => () => void
}

type DraftState = {
    status: DraftSaveStatus
    dirty: boolean
    timer: ReturnType<typeof setTimeout> | null
    /** The saves of a draft run one after the other. */
    queue: Promise<unknown>
}

export const DRAFT_SAVE_DELAY = 800

/**
 * Creates the autosaver of the template drafts: a debounced save per draft, serialized per draft, that skips the work
 * when nothing changed and keeps the draft dirty when a save fails (so a flush or the next change tries again).
 * @param options The save function and its timing.
 * @category Template drafts
 */
export function createDraftAutosaver({ save, whenIdle, delay = DRAFT_SAVE_DELAY }: DraftAutosaverOptions): DraftAutosaver {
    const drafts = new Map<number, DraftState>()
    const listeners = new Set<() => void>()
    const emit = () => listeners.forEach(listener => listener())

    const stateOf = (key: number) => {
        let state = drafts.get(key)
        if (!state) {
            state = { status: "idle", dirty: false, timer: null, queue: Promise.resolve() }
            drafts.set(key, state)
        }
        return state
    }

    const setStatus = (state: DraftState, status: DraftSaveStatus) => {
        if (state.status === status) return
        state.status = status
        emit()
    }

    const clearTimer = (state: DraftState) => {
        if (state.timer === null) return
        clearTimeout(state.timer)
        state.timer = null
    }

    /** Appends a save to the queue of the draft. A draft that is not dirty any more (saved by an earlier run) is skipped. */
    const run = (key: number, state: DraftState): Promise<boolean> => {
        const next = state.queue.then(async () => {
            if (!state.dirty) return state.status !== "error"
            try {
                await whenIdle?.()
                // Changes made while waiting are part of this save
                state.dirty = false
                setStatus(state, "saving")
                await save(key)
                // A change made during the save schedules its own run
                setStatus(state, state.dirty ? "saving" : "saved")
                return true
            } catch {
                state.dirty = true
                setStatus(state, "error")
                return false
            }
        })
        state.queue = next
        return next
    }

    const flush = (key: number) => {
        const state = drafts.get(key)
        if (!state) return Promise.resolve(true)
        clearTimer(state)
        return run(key, state)
    }

    return {
        notify: key => {
            const state = stateOf(key)
            state.dirty = true
            clearTimer(state)
            state.timer = setTimeout(() => {
                state.timer = null
                void run(key, state)
            }, delay)
        },
        flush,
        flushAll: async () => {
            const results = await Promise.all([...drafts.keys()].map(flush))
            return results.every(Boolean)
        },
        retry: key => flush(key),
        forget: key => {
            const state = drafts.get(key)
            if (!state) return
            clearTimer(state)
            drafts.delete(key)
            emit()
        },
        getStatus: key => drafts.get(key)?.status ?? "idle",
        isDirty: key => drafts.get(key)?.dirty ?? false,
        subscribe: listener => {
            listeners.add(listener)
            return () => { listeners.delete(listener) }
        },
    }
}
