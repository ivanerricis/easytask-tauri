import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"

type UseOpenListOptions<T, S> = {
    isOpen: boolean
    /** Loads the list. The latest function is always used, so it may be recreated on every render. */
    load: () => Promise<T[]>
    /** The first time (and after every reopening) the selection: e.g. the first tab that has something in it. */
    firstSelected?: (list: T[]) => S
    /** The list is reloaded when it changes while the dialog is open (e.g. the id of the workspace). */
    resetKey?: unknown
}

type RunOptions = {
    /** Reload the list when the action ends (default true). */
    reload?: boolean
}

/**
 * The machinery of the dialogs that load a list when they open (trash, archive, templates...): the items, a loading flag
 * (`isLoading` is true from the opening until the first load ends), the error of the load (`loadError`, shown instead of
 * the list, with `reload` to retry) and `run` for the actions on the rows. Everything is reset when the dialog closes.
 *
 * `run(action, successMessage)`: `busy` while it works, the error of the action in `error` (shown under the list), a
 * success toast, and the list reloaded at the end. `action` may return `false` for "nothing was done" (no toast).
 * Returns whether the action succeeded. Calls made while another one is running are ignored.
 */
export function useOpenList<T, S = never>({ isOpen, load, firstSelected, resetKey }: UseOpenListOptions<T, S>) {
    const [items, setItems] = useState<T[]>([])
    const [loaded, setLoaded] = useState(false)
    const [busy, setBusy] = useState(false)
    const busyRef = useRef(false)
    // Error of an action (shown under the list) and error of the load (shown instead of the list)
    const [error, setError] = useState<string | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [selected, setSelected] = useState<S | null>(null)

    // The handlers come from the contexts: keep the latest ones without re-running the load effect
    const loadRef = useRef(load)
    const firstSelectedRef = useRef(firstSelected)
    useEffect(() => {
        loadRef.current = load
        firstSelectedRef.current = firstSelected
    })

    const reload = useCallback(async () => {
        try {
            const list = await loadRef.current()
            setLoadError(null)
            setItems(list)
            const first = firstSelectedRef.current
            if (first) setSelected(current => current ?? first(list))
        } catch (err) {
            setLoadError(getErrorMessage(err))
        }
    }, [])

    useEffect(() => {
        if (!isOpen) return
        let cancelled = false
        // eslint-disable-next-line react-hooks/set-state-in-effect -- load when the dialog opens
        reload().finally(() => { if (!cancelled) setLoaded(true) })
        return () => {
            cancelled = true
            setLoaded(false)
            setSelected(null)
            setLoadError(null)
        }
    }, [isOpen, reload, resetKey])
    const isLoading = isOpen && !loaded

    const run = useCallback(async (action: () => Promise<void | boolean>, successMessage?: string, options?: RunOptions): Promise<boolean> => {
        if (busyRef.current) return false
        busyRef.current = true
        setBusy(true)
        setError(null)
        try {
            const result = await action()
            if (result === false) return false
            if (successMessage) toast.success(successMessage)
            return true
        } catch (err) {
            setError(getErrorMessage(err))
            return false
        } finally {
            if (options?.reload !== false) await reload()
            busyRef.current = false
            setBusy(false)
        }
    }, [reload])

    return { items, isLoading, loadError, reload, run, busy, error, setError, selected, setSelected }
}
