import { useEffect, useRef, useState } from "react"
import { reportError } from "@/lib/report-error"

type StoredSwitchOptions = {
    /** Value shown until `get` answers (default false). */
    initial?: boolean
    /** When saving fails, the switch goes back to the previous value. */
    revertOnError?: boolean
    /** What to do when saving fails (default: report the error). Runs after the revert. */
    onError?: (error: unknown, value: boolean) => void
}

/**
 * State of a switch of the settings whose value is stored somewhere (preferences, the system): read when the row mounts
 * (`ready` is true once the answer arrived; a failed read is reported and the switch keeps `initial`), changed at once
 * (optimistic) and saved with `save`.
 * `change` starts the save (synchronously) and returns its promise, which never rejects.
 */
export function useStoredSwitch(
    get: () => Promise<boolean>,
    save: (value: boolean) => Promise<unknown>,
    { initial = false, revertOnError = false, onError }: StoredSwitchOptions = {},
) {
    const [checked, setChecked] = useState(initial)
    const [ready, setReady] = useState(false)

    // Read once, when the row mounts (the latest `get` is used, so it may be an inline function)
    const getRef = useRef(get)
    useEffect(() => { getRef.current = get })

    useEffect(() => {
        let cancelled = false
        getRef.current().then(value => {
            if (cancelled) return
            setChecked(value)
            setReady(true)
        }).catch(error => reportError(error))
        return () => { cancelled = true }
    }, [])

    const change = async (value: boolean) => {
        setChecked(value)
        try {
            await save(value)
        } catch (error) {
            if (revertOnError) setChecked(!value)
            if (onError) onError(error, value)
            else reportError(error)
        }
    }

    return { checked, ready, change }
}
