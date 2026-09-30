import { useEffect, useRef } from "react"
import { useShortcutsContext, type ShortcutEntry } from "@/contexts/shortcuts-context"

type UseShortcutOptions = {
    enabled?: boolean
    // Fire even when the event comes from an input, textarea, select or contenteditable
    allowInInputs?: boolean
}

/**
 * Runs `handler` when the effective binding of the shortcut `id` is pressed.
 * The provider owns the single keydown listener; the event is preventDefault-ed when handled.
 * @category Shortcuts
 */
export function useShortcut(id: string, handler: (e: KeyboardEvent) => void, { enabled = true, allowInInputs = false }: UseShortcutOptions = {}) {
    const { register } = useShortcutsContext()
    const entry = useRef<ShortcutEntry>({ handler, enabled, allowInInputs })

    // Kept fresh on every render so the registration never has to change
    useEffect(() => {
        entry.current = { handler, enabled, allowInInputs }
    })

    useEffect(() => register(id, entry), [id, register])
}
