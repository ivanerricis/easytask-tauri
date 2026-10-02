/**
 * One undoable user action. `undo` and `redo` are the inverse of each other: they only use stable ids
 * (a soft delete keeps the ids) and reject when the operation could not be applied.
 * @category Undo
 */
export type UndoCommand = {
    /** Translated description of the action, shown in the toasts and in the menus. */
    label: string
    undo: () => Promise<void>
    redo: () => Promise<void>
}

export type UndoOutcome =
    | { status: "empty" }
    | { status: "done", label: string }
    | { status: "failed", label: string, error: unknown }

/** Outcome of undoing/redoing several actions in a row: `executed` is how many were applied (also on failure). */
export type UndoManyOutcome =
    | { status: "empty", executed: 0 }
    | { status: "done", executed: number, label: string }
    | { status: "failed", executed: number, label: string, error: unknown }

/** Labels of the actions, each list ordered starting from the one the next undo/redo would apply. */
export type UndoEntries = {
    undo: string[]
    redo: string[]
}

export type UndoSnapshot = {
    canUndo: boolean
    canRedo: boolean
    undoLabel: string | null
    redoLabel: string | null
}

export const UNDO_LIMIT = 50

/**
 * The history of the undoable actions: an undo stack and a redo stack (framework independent).
 * - at most `limit` actions are kept (the oldest is dropped);
 * - a new action empties the redo stack;
 * - while an undo/redo runs, `record` is ignored (the inverse operations must not create history);
 * - undo/redo requests are serialized, so quick repeated shortcuts apply in order;
 * - a command that fails is dropped (its state can no longer be trusted) and the error is returned, never thrown;
 * - `clear` also discards the effect of a command that was running meanwhile.
 * @category Undo
 */
export function createUndoHistory(limit = UNDO_LIMIT) {
    let undoStack: UndoCommand[] = []
    let redoStack: UndoCommand[] = []
    let running = false
    let generation = 0
    let queue: Promise<unknown> = Promise.resolve()
    const listeners = new Set<() => void>()

    const buildSnapshot = (): UndoSnapshot => ({
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        undoLabel: undoStack.at(-1)?.label ?? null,
        redoLabel: redoStack.at(-1)?.label ?? null,
    })
    let snapshot = buildSnapshot()
    const emit = () => {
        const entriesChanged = refreshEntries()
        const next = buildSnapshot()
        const same = next.canUndo === snapshot.canUndo && next.canRedo === snapshot.canRedo &&
            next.undoLabel === snapshot.undoLabel && next.redoLabel === snapshot.redoLabel
        if (same && !entriesChanged) return
        if (!same) snapshot = next
        listeners.forEach(listener => listener())
    }

    const buildEntries = (): UndoEntries => ({
        undo: undoStack.map(c => c.label).reverse(),
        redo: redoStack.map(c => c.label).reverse(),
    })
    let entries = buildEntries()
    const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((label, i) => label === b[i])
    const refreshEntries = () => {
        const next = buildEntries()
        if (sameList(next.undo, entries.undo) && sameList(next.redo, entries.redo)) return false
        entries = next
        return true
    }

    const trim =() => {
        if (undoStack.length > limit) undoStack = undoStack.slice(undoStack.length - limit)
    }

    const record = (command: UndoCommand) => {
        if (running) return
        undoStack.push(command)
        trim()
        redoStack = []
        emit()
    }

    const runOne = async (direction: "undo" | "redo"): Promise<UndoOutcome> => {
        {
            const from = direction === "undo" ? undoStack : redoStack
            const command = from.at(-1)
            if (!command) return { status: "empty" }
            const startedAt = generation
            running = true
            try {
                await command[direction]()
            } catch (error) {
                // A failed command is dropped: its state can no longer be trusted
                if (startedAt === generation) {
                    from.pop()
                    emit()
                }
                return { status: "failed", label: command.label, error }
            } finally {
                running = false
            }
            // When the history was cleared meanwhile (workspace change) the command does not belong to it any more
            if (startedAt === generation) {
                from.pop()
                if (direction === "undo") redoStack.push(command)
                else {
                    undoStack.push(command)
                    trim()
                }
                emit()
            }
            return { status: "done", label: command.label }
        }
    }

    const enqueue = <T,>(task: () => Promise<T>): Promise<T> => {
        const result = queue.then(task, task)
        queue = result
        return result
    }

    /** Writes that will record a command when they finish: an undo/redo asked meanwhile waits for them. */
    const pending = new Set<Promise<unknown>>()
    const track = <T,>(write: Promise<T>): Promise<T> => {
        pending.add(write)
        const done = () => { pending.delete(write) }
        write.then(done, done)
        return write
    }
    const settled = () => Promise.allSettled([...pending])

    const execute = (direction: "undo" | "redo"): Promise<UndoOutcome> => enqueue(() => (pending.size > 0 ? settled().then(() => runOne(direction)) : runOne(direction)))

    /** Applies `index + 1` actions in sequence as one queued task (nothing can interleave); stops at the first failure. */
    const executeTo = (direction: "undo" | "redo", index: number): Promise<UndoManyOutcome> => enqueue(async (): Promise<UndoManyOutcome> => {
        if (pending.size > 0) await settled()
        const available = () => (direction === "undo" ? undoStack : redoStack).length
        if (!Number.isInteger(index) || index < 0 || available() === 0) return { status: "empty", executed: 0 }
        const target = Math.min(index + 1, available())
        const startedAt = generation
        let executed = 0
        let label = ""
        while (executed < target && startedAt === generation) {
            const outcome = await runOne(direction)
            if (outcome.status === "empty") break
            if (outcome.status === "failed") return { status: "failed", executed, label: outcome.label, error: outcome.error }
            executed += 1
            label = outcome.label
        }
        return executed === 0 ? { status: "empty", executed: 0 } : { status: "done", executed, label }
    })

    return {
        record,
        track,
        undo: () => execute("undo"),
        redo: () => execute("redo"),
        undoTo: (index: number) => executeTo("undo", index),
        redoTo: (index: number) => executeTo("redo", index),
        clear: () => {
            generation += 1
            undoStack = []
            redoStack = []
            emit()
        },
        getSnapshot: () => snapshot,
        getEntries: () => entries,
        subscribe: (listener: () => void) => {
            listeners.add(listener)
            return () => { listeners.delete(listener) }
        },
    }
}

export type UndoHistory = ReturnType<typeof createUndoHistory>
