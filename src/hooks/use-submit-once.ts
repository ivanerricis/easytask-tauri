import { useCallback, useRef, useState } from "react"

/**
 * Guards an async submit against double triggering (Enter twice, double click).
 * `run` ignores calls while a previous one is still pending (the ref blocks synchronously, before any re-render);
 * `saving` is for the UI (disabled button, read-only input).
 */
export function useSubmitOnce() {
    const [saving, setSaving] = useState(false)
    const savingRef = useRef(false)

    const run = useCallback(async (action: () => Promise<void>) => {
        if (savingRef.current) return
        savingRef.current = true
        setSaving(true)
        try {
            await action()
        } finally {
            savingRef.current = false
            setSaving(false)
        }
    }, [])

    return { saving, run }
}
