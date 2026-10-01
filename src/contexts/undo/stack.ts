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
        const next = buildSnapshot()
        const same = next.canUndo === snapshot.canUndo && next.canRedo === snapshot.canRedo &&
            next.undoLabel === snapshot.undoLabel && next.redoLabel === snapshot.redoLabel
        if (same) return
        snapshot = next
        listeners.forEach(listener => listener())
    }

    const trim = () => {
        if (undoStack.length > limit) undoStack = undoStack.slice(undoStack.length - limit)
    }

    const record = (command: UndoCommand) => {
        if (running) return
        undoStack.push(command)
        trim()
        redoStack = []
        emit()
    }

    const execute = (direction: "undo" | "redo"): Promise<UndoOutcome> => {
        const task = async (): Promise<UndoOutcome> => {
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
        const result = queue.then(task, task)
        queue = result
        return result
    }

    return {
        record,
        undo: () => execute("undo"),
        redo: () => execute("redo"),
        clear: () => {
            generation += 1
            undoStack = []
            redoStack = []
            emit()
        },
        getSnapshot: () => snapshot,
        subscribe: (listener: () => void) => {
            listeners.add(listener)
            return () => { listeners.delete(listener) }
        },
    }
}

export type UndoHistory = ReturnType<typeof createUndoHistory>
