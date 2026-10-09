import { useEffect, useState } from "react"

/** How long a load must last before its skeleton is shown: a faster one would only make it flash. */
export const SKELETON_DELAY_MS = 150

/**
 * True once `active` has stayed true for `delay` ms, false again as soon as it turns false.
 * Used to show a loading skeleton only for loads that are slow enough to be noticed.
 * @category Hooks
 */
export function useDelayedFlag(active: boolean, delay = SKELETON_DELAY_MS): boolean {
    const [shown, setShown] = useState(false)
    useEffect(() => {
        if (!active) return
        const timer = setTimeout(() => setShown(true), delay)
        return () => {
            clearTimeout(timer)
            setShown(false)
        }
    }, [active, delay])
    return active && shown
}
