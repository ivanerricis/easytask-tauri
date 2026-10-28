/**
 * Work that must finish before the window closes (for example saving the template drafts that are open).
 * The handlers only save: they never delete anything, because the open tabs are restored at the next start.
 * @category Lifecycle
 */
type BeforeCloseHandler = () => Promise<unknown> | unknown

const handlers = new Set<BeforeCloseHandler>()

/**
 * Registers a function to run when the app is closing.
 * @param handler The function; it may be async.
 * @returns The function that unregisters it.
 */
export function registerBeforeClose(handler: BeforeCloseHandler): () => void {
    handlers.add(handler)
    return () => { handlers.delete(handler) }
}

/**
 * Runs the registered functions together and waits for all of them. A failing handler never stops the others:
 * the errors are handed to `onError`.
 * @param onError Called with the error of each handler that fails.
 */
export async function runBeforeClose(onError: (error: unknown) => void = () => {}): Promise<void> {
    await Promise.all([...handlers].map(async handler => {
        try {
            await handler()
        } catch (error) {
            onError(error)
        }
    }))
}
