import { useCallback, useRef } from "react"

/**
 * Counts the async operations in flight. `track` runs an operation and calls `onChange` with the new count when it starts and
 * when it ends (however it ends), so a provider can keep `isLoading` true while the count is above zero.
 * @param onChange Called with the count after every change; it must be stable (wrap it in useCallback).
 * @returns `track` (stable) and `getPending` (stable, the current count).
 * @category Loading
 */
export function usePendingCounter(onChange: (pending: number) => void) {
    const pending = useRef(0)

    const track = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
        pending.current += 1
        onChange(pending.current)
        try {
            return await operation()
        } finally {
            pending.current -= 1
            onChange(pending.current)
        }
    }, [onChange])

    const getPending = useCallback(() => pending.current, [])

    return { track, getPending }
}
