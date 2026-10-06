/**
 * Runs a write after an optimistic update and undoes the update when the write fails (the error is rethrown).
 * @param rollback What undoes the optimistic update (null/undefined when nothing was applied, e.g. the item is not in the cache).
 * @param write The write to run.
 * @returns The result of the write.
 * @throws The error of the write, after the rollback.
 * @category Contexts
 */
export async function withRollback<T>(rollback: (() => void) | null | undefined, write: () => Promise<T>): Promise<T> {
    try {
        return await write()
    } catch (error) {
        rollback?.()
        throw error
    }
}
